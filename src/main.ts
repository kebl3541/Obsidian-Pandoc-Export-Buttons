import {
  App,
  CachedMetadata,
  FileSystemAdapter,
  MarkdownView,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  TFile,
} from "obsidian";
import { shell, remote } from "electron";
import { execFile, fs, os, path, processEnv, SpawnedProcess } from "./platform";
import { FORMATS, DEFAULT_ENABLED, PandocFormat } from "./formats";
import { PandocExportView, VIEW_TYPE_PANDOC_EXPORT } from "./view";

interface PandocExportSettings {
  /** absolute path to pandoc; empty = auto-detect */
  pandocPath: string;
  /** pdf engine name/path; empty = auto-detect; "chromium" = built-in renderer */
  pdfEngine: string;
  outputMode: "note-folder" | "vault-folder" | "custom";
  /** vault-relative folder for vault-folder mode */
  vaultFolder: string;
  /** absolute folder for custom mode */
  customFolder: string;
  openAfterExport: boolean;
  revealInFolder: boolean;
  extraArgs: string;
  enabledFormats: string[];
  /** citation handling: auto-detect [@key] syntax, always on, or off */
  citations: "auto" | "always" | "off";
  /** bibliography file, absolute or vault-relative; empty = rely on note frontmatter */
  bibliographyPath: string;
  /** CSL style file, absolute or vault-relative */
  cslPath: string;
}

const DEFAULT_SETTINGS: PandocExportSettings = {
  pandocPath: "",
  pdfEngine: "",
  outputMode: "note-folder",
  vaultFolder: "pandoc-exports",
  customFolder: "",
  openAfterExport: true,
  revealInFolder: false,
  extraArgs: "",
  enabledFormats: [...DEFAULT_ENABLED],
  citations: "auto",
  bibliographyPath: "",
  cslPath: "",
};

/** Directories where GUI apps on macOS/Linux don't look but CLI tools live. */
const EXTRA_BIN_DIRS = [
  "/opt/homebrew/bin",
  "/usr/local/bin",
  "/opt/local/bin",
  "/usr/bin",
];

const PDF_ENGINE_CANDIDATES = [
  "tectonic",
  "xelatex",
  "lualatex",
  "pdflatex",
  "typst",
  "wkhtmltopdf",
  "weasyprint",
];

/** Sentinel for the built-in Chromium PDF renderer (no install needed). */
const CHROMIUM_ENGINE = "chromium";

const IMAGE_EXTS = new Set(["png", "jpg", "jpeg", "gif", "svg", "webp", "bmp", "tiff"]);

/** How deep note-in-note transclusion is followed before degrading to text. */
const MAX_EMBED_DEPTH = 5;

const EMBED_RE = /!\[\[([^\]|#]+?)(?:#([^\]|]+))?(?:\|([^\]]*))?\]\]/g;

/** Regions that must stay untouched: fenced code and inline code. */
const CODE_REGION_RE = /```[\s\S]*?(?:```|$)|~~~[\s\S]*?(?:~~~|$)|`[^`\n]+`/g;

/** Obsidian comments — hidden in preview, so they don't belong in exports. */
const COMMENT_RE = /%%[\s\S]*?%%/g;

/** Citation syntax: @key preceded by start/whitespace/punctuation (not emails). */
const CITATION_RE = /(^|[\s([;])@[a-zA-Z0-9_][\w:.#$%&+?<>~/-]*/m;

function findInExtraDirs(name: string): string | null {
  for (const dir of EXTRA_BIN_DIRS) {
    const p = path.join(dir, name);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/**
 * Split an extra-args string on whitespace, honoring quotes anywhere in a
 * token — both `--csl "chicago.csl"` and `--metadata title="My Title"`.
 */
function parseArgs(s: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quote: '"' | "'" | null = null;
  let sawQuote = false;
  for (const ch of s) {
    if (quote) {
      if (ch === quote) quote = null;
      else cur += ch;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      sawQuote = true;
    } else if (/\s/.test(ch)) {
      if (cur.length > 0 || sawQuote) out.push(cur);
      cur = "";
      sawQuote = false;
    } else {
      cur += ch;
    }
  }
  if (cur.length > 0 || sawQuote) out.push(cur);
  return out;
}

export default class PandocExportPlugin extends Plugin {
  settings: PandocExportSettings;
  exporting = false;

  async onload() {
    await this.loadSettings();

    this.registerView(VIEW_TYPE_PANDOC_EXPORT, (leaf) => new PandocExportView(leaf, this));

    this.addRibbonIcon("file-output", "Pandoc export", () => this.activateView());

    this.addCommand({
      id: "open-panel",
      name: "Open export panel",
      callback: () => this.activateView(),
    });

    for (const fmt of FORMATS) {
      this.addCommand({
        id: `export-${fmt.id}`,
        name: `Export current note to ${fmt.label} (.${fmt.ext})`,
        checkCallback: (checking) => {
          const file = this.app.workspace.getActiveFile();
          if (!file || file.extension !== "md") return false;
          if (!checking) void this.exportFile(file, fmt);
          return true;
        },
      });
    }

    this.addSettingTab(new PandocExportSettingTab(this.app, this));

    // Keep the panel in sync with the active note.
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", () => this.refreshViews())
    );
  }

  onunload() {}

  async loadSettings() {
    const stored = ((await this.loadData()) ?? {}) as Partial<PandocExportSettings>;
    this.settings = Object.assign({}, DEFAULT_SETTINGS, stored);
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.refreshViews();
  }

  refreshViews() {
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_PANDOC_EXPORT)) {
      const view = leaf.view;
      if (view instanceof PandocExportView) view.refresh();
    }
  }

  async activateView() {
    const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE_PANDOC_EXPORT);
    if (existing.length > 0) {
      await this.app.workspace.revealLeaf(existing[0]);
      return;
    }
    const leaf = this.app.workspace.getRightLeaf(false);
    if (!leaf) return;
    await leaf.setViewState({ type: VIEW_TYPE_PANDOC_EXPORT, active: true });
    await this.app.workspace.revealLeaf(leaf);
  }

  enabledFormats(): PandocFormat[] {
    return FORMATS.filter((f) => this.settings.enabledFormats.includes(f.id));
  }

  resolvePandoc(): string | null {
    const configured = this.settings.pandocPath.trim();
    if (configured) return fs.existsSync(configured) ? configured : null;
    return findInExtraDirs("pandoc");
  }

  /** Returns an engine path, the chromium sentinel, or null (= use chromium). */
  resolvePdfEngine(): string | null {
    const configured = this.settings.pdfEngine.trim();
    if (configured === CHROMIUM_ENGINE) return CHROMIUM_ENGINE;
    if (configured) {
      if (path.isAbsolute(configured)) return fs.existsSync(configured) ? configured : null;
      return findInExtraDirs(configured) ?? configured;
    }
    for (const name of PDF_ENGINE_CANDIDATES) {
      const p = findInExtraDirs(name);
      if (p) return p;
    }
    return null;
  }

  private vaultBasePath(): string | null {
    const adapter = this.app.vault.adapter;
    return adapter instanceof FileSystemAdapter ? adapter.getBasePath() : null;
  }

  /** Resolve a settings path that may be absolute or vault-relative. */
  private resolveConfigPath(p: string, vaultRoot: string): string | null {
    const trimmed = p.trim();
    if (!trimmed) return null;
    const abs = path.isAbsolute(trimmed) ? trimmed : path.join(vaultRoot, trimmed);
    return fs.existsSync(abs) ? abs : null;
  }

  // ---------------------------------------------------------------------
  // Embed expansion: images become absolute-path markdown images; note
  // transclusions (![[Other note]], ![[Note#Heading]], ![[Note#^block]])
  // are replaced by the embedded content, recursively, cycle-safe.
  // ---------------------------------------------------------------------

  /**
   * Code blocks and inline code must come through literally — an embed or a
   * %%comment%% written inside code is content, not markup. Everything else
   * gets comments stripped (they're hidden in preview) and embeds expanded.
   */
  private async expandContent(
    content: string,
    sourcePath: string,
    vaultRoot: string,
    visited: Set<string>,
    depth: number
  ): Promise<string> {
    const codeRegion = new RegExp(CODE_REGION_RE.source, "g");
    let result = "";
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = codeRegion.exec(content)) !== null) {
      result += await this.expandSegment(
        content.slice(last, m.index), sourcePath, vaultRoot, visited, depth
      );
      result += m[0];
      last = m.index + m[0].length;
    }
    result += await this.expandSegment(content.slice(last), sourcePath, vaultRoot, visited, depth);
    return result;
  }

  private async expandSegment(
    segment: string,
    sourcePath: string,
    vaultRoot: string,
    visited: Set<string>,
    depth: number
  ): Promise<string> {
    const content = segment.replace(COMMENT_RE, "");
    const embed = new RegExp(EMBED_RE.source, "g");
    let result = "";
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = embed.exec(content)) !== null) {
      result += content.slice(last, m.index);
      last = m.index + m[0].length;
      result += await this.renderEmbed(m[0], m[1], m[2], m[3], sourcePath, vaultRoot, visited, depth);
    }
    result += content.slice(last);
    return result;
  }

  private async renderEmbed(
    whole: string,
    target: string,
    anchor: string | undefined,
    alias: string | undefined,
    sourcePath: string,
    vaultRoot: string,
    visited: Set<string>,
    depth: number
  ): Promise<string> {
    const dest = this.app.metadataCache.getFirstLinkpathDest(target.trim(), sourcePath);
    if (!dest) return whole;
    const ext = dest.extension.toLowerCase();
    if (IMAGE_EXTS.has(ext)) {
      const abs = path.join(vaultRoot, dest.path);
      return `![${alias ?? ""}](<${abs}>)`;
    }
    if (ext !== "md") return whole;
    // cycle or runaway depth: degrade to the note title instead of looping
    if (depth >= MAX_EMBED_DEPTH || visited.has(dest.path)) return alias ?? dest.basename;

    const raw = await this.app.vault.cachedRead(dest);
    const cache = this.app.metadataCache.getFileCache(dest);
    let text: string;
    if (anchor) {
      const section = this.extractAnchor(raw, cache, anchor);
      if (section === null) return alias ?? whole;
      text = section;
    } else {
      text = raw;
      const fmEnd = cache?.frontmatterPosition?.end?.offset;
      if (fmEnd !== undefined) text = text.slice(fmEnd).replace(/^\s+/, "");
    }
    const expanded = await this.expandContent(
      text,
      dest.path,
      vaultRoot,
      new Set([...visited, dest.path]),
      depth + 1
    );
    // isolate as its own block so surrounding markdown stays valid
    return `\n\n${expanded.trim()}\n\n`;
  }

  /** Extract a #Heading section or #^block from a note using its metadata cache. */
  private extractAnchor(raw: string, cache: CachedMetadata | null, anchor: string): string | null {
    if (!cache) return null;
    if (anchor.startsWith("^")) {
      const block = cache.blocks?.[anchor.slice(1)];
      if (!block) return null;
      return raw
        .slice(block.position.start.offset, block.position.end.offset)
        .replace(/\s*\^\S+\s*$/, "");
    }
    const headings = cache.headings ?? [];
    const wanted = anchor.trim().toLowerCase();
    const idx = headings.findIndex((h) => h.heading.trim().toLowerCase() === wanted);
    if (idx === -1) return null;
    const start = headings[idx].position.start.offset;
    const level = headings[idx].level;
    let end = raw.length;
    for (let i = idx + 1; i < headings.length; i++) {
      if (headings[i].level <= level) {
        end = headings[i].position.start.offset;
        break;
      }
    }
    return raw.slice(start, end);
  }

  // ---------------------------------------------------------------------

  private outputDir(file: TFile, vaultRoot: string): string {
    switch (this.settings.outputMode) {
      case "vault-folder":
        return path.join(vaultRoot, this.settings.vaultFolder || "pandoc-exports");
      case "custom":
        return this.settings.customFolder || path.join(vaultRoot, file.parent?.path ?? "");
      default:
        return path.join(vaultRoot, file.parent?.path ?? "");
    }
  }

  private wantsCitations(content: string): boolean {
    switch (this.settings.citations) {
      case "always":
        return true;
      case "off":
        return false;
      default:
        return CITATION_RE.test(content) || /^bibliography\s*:/m.test(content);
    }
  }

  private async runPandoc(
    pandoc: string,
    args: string[],
    stdinContent: string,
    cwd: string
  ): Promise<void> {
    const env = {
      ...processEnv,
      PATH: [processEnv.PATH ?? "", ...EXTRA_BIN_DIRS].join(path.delimiter),
    };
    await new Promise<void>((resolve, reject) => {
      const child: SpawnedProcess = execFile(
        pandoc,
        args,
        { cwd, env, maxBuffer: 10 * 1024 * 1024, timeout: 120000 },
        (err, _stdout, stderr) => {
          if (err) reject(new Error(stderr?.trim() || err.message));
          else resolve();
        }
      );
      // If pandoc exits before reading stdin (e.g. bad flag), the pipe write
      // raises EPIPE; swallow it — the exec callback reports the real error.
      child.stdin?.on("error", () => {});
      child.stdin?.write(stdinContent);
      child.stdin?.end();
    });
  }

  /** Render standalone HTML to PDF with Obsidian's own Chromium (no install). */
  private async chromiumPdf(htmlPath: string, outPath: string): Promise<void> {
    const BrowserWindow = remote?.BrowserWindow;
    if (!BrowserWindow) {
      throw new Error(
        "Built-in PDF renderer unavailable — install a PDF engine (brew install tectonic) or set one in settings."
      );
    }
    const win = new BrowserWindow({
      show: false,
      webPreferences: { sandbox: true, nodeIntegration: false, contextIsolation: true },
    });
    try {
      await win.loadFile(htmlPath);
      const data = await win.webContents.printToPDF({
        printBackground: true,
        pageSize: "A4",
      });
      fs.writeFileSync(outPath, data);
    } finally {
      win.destroy();
    }
  }

  async exportFile(file: TFile, fmt: PandocFormat): Promise<boolean> {
    if (this.exporting) {
      new Notice("Pandoc: an export is already running.");
      return false;
    }
    const pandoc = this.resolvePandoc();
    if (!pandoc) {
      new Notice(
        "Pandoc not found. Install it (brew install pandoc) or set its path in the plugin settings.",
        8000
      );
      return false;
    }
    const vaultRoot = this.vaultBasePath();
    if (!vaultRoot) {
      new Notice("Pandoc export only works in local vaults.");
      return false;
    }

    // Flush unsaved editor changes so we export what the user sees.
    const mdView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (mdView?.file === file) await mdView.save();

    const noteDir = path.join(vaultRoot, file.parent?.path ?? "");
    const outDir = this.outputDir(file, vaultRoot);
    try {
      fs.mkdirSync(outDir, { recursive: true });
    } catch {
      new Notice(`Pandoc: cannot create output folder ${outDir}`, 8000);
      return false;
    }

    let outPath = path.join(outDir, `${file.basename}.${fmt.ext}`);
    const inputAbs = path.join(vaultRoot, file.path);
    if (path.resolve(outPath) === path.resolve(inputAbs)) {
      // e.g. exporting GitHub-flavored markdown into the note's own folder
      outPath = path.join(outDir, `${file.basename}.export.${fmt.ext}`);
    }

    const raw = await this.app.vault.read(file);
    const content = await this.expandContent(
      raw,
      file.path,
      vaultRoot,
      new Set([file.path]),
      0
    );

    const args: string[] = [
      "-f",
      "markdown+wikilinks_title_after_pipe",
      "--standalone",
      "--resource-path",
      [noteDir, vaultRoot].join(path.delimiter),
    ];

    if (this.wantsCitations(content)) {
      args.push("--citeproc");
      const bib = this.resolveConfigPath(this.settings.bibliographyPath, vaultRoot);
      if (bib) args.push("--bibliography", bib);
      const csl = this.resolveConfigPath(this.settings.cslPath, vaultRoot);
      if (csl) args.push("--csl", csl);
    }

    // PDF routing: external engine when available, otherwise built-in Chromium.
    let chromiumHtml: string | null = null;
    if (fmt.id === "pdf") {
      const engine = this.resolvePdfEngine();
      if (engine && engine !== CHROMIUM_ENGINE) {
        args.push("-o", outPath, `--pdf-engine=${engine}`);
      } else {
        chromiumHtml = path.join(
          os.tmpdir(),
          `pandoc-export-${Date.now()}.html`
        );
        args.push("-o", chromiumHtml, "-t", "html", "--embed-resources", "--mathml");
      }
    } else {
      args.push("-o", outPath);
      if (fmt.to) args.push("-t", fmt.to);
    }

    if (this.settings.extraArgs.trim()) args.push(...parseArgs(this.settings.extraArgs));

    this.exporting = true;
    this.refreshViews();
    const started = new Notice(`Pandoc: exporting to ${fmt.label}…`, 0);
    try {
      await this.runPandoc(pandoc, args, content, noteDir);
      if (chromiumHtml) {
        try {
          await this.chromiumPdf(chromiumHtml, outPath);
        } finally {
          try {
            fs.unlinkSync(chromiumHtml);
          } catch {
            // temp file cleanup is best-effort
          }
        }
      }
      started.hide();
      new Notice(`Exported: ${path.basename(outPath)}`);
      if (this.settings.revealInFolder) shell.showItemInFolder(outPath);
      else if (this.settings.openAfterExport) await shell.openPath(outPath);
      return true;
    } catch (e) {
      started.hide();
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[pandoc-export-buttons]", msg);
      new Notice(`Pandoc failed: ${msg.slice(0, 300)}`, 12000);
      return false;
    } finally {
      this.exporting = false;
      this.refreshViews();
    }
  }
}

class PandocExportSettingTab extends PluginSettingTab {
  plugin: PandocExportPlugin;

  constructor(app: App, plugin: PandocExportPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    const detected = this.plugin.resolvePandoc();
    new Setting(containerEl)
      .setName("Pandoc path")
      .setDesc(
        detected
          ? `Leave empty to auto-detect (found: ${detected})`
          : "Pandoc was not auto-detected — set the absolute path here."
      )
      .addText((t) =>
        t
          .setPlaceholder("/opt/homebrew/bin/pandoc")
          .setValue(this.plugin.settings.pandocPath)
          .onChange(async (v) => {
            this.plugin.settings.pandocPath = v;
            await this.plugin.saveSettings();
          })
      );

    const engine = this.plugin.resolvePdfEngine();
    new Setting(containerEl)
      .setName("PDF engine")
      .setDesc(
        engine && engine !== "chromium"
          ? `Engine Pandoc uses for PDF. Leave empty to auto-detect (found: ${engine}). Set to "chromium" to force the built-in renderer.`
          : 'No LaTeX engine found — PDF uses the built-in renderer. Install tectonic (brew install tectonic) for LaTeX-quality typesetting.'
      )
      .addText((t) =>
        t
          .setPlaceholder("Auto-detect")
          .setValue(this.plugin.settings.pdfEngine)
          .onChange(async (v) => {
            this.plugin.settings.pdfEngine = v;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Output location")
      .setDesc("Where exported files are written.")
      .addDropdown((d) =>
        d
          .addOption("note-folder", "Same folder as the note")
          .addOption("vault-folder", "Folder inside the vault")
          .addOption("custom", "Custom absolute folder")
          .setValue(this.plugin.settings.outputMode)
          .onChange(async (v) => {
            this.plugin.settings.outputMode = v as PandocExportSettings["outputMode"];
            await this.plugin.saveSettings();
            this.display();
          })
      );

    if (this.plugin.settings.outputMode === "vault-folder") {
      new Setting(containerEl)
        .setName("Vault folder")
        .setDesc("Vault-relative folder for exports (created if missing).")
        .addText((t) =>
          t
            .setPlaceholder("Folder name")
            .setValue(this.plugin.settings.vaultFolder)
            .onChange(async (v) => {
              this.plugin.settings.vaultFolder = v;
              await this.plugin.saveSettings();
            })
        );
    }
    if (this.plugin.settings.outputMode === "custom") {
      new Setting(containerEl)
        .setName("Custom folder")
        .setDesc("Absolute path for exports (created if missing).")
        .addText((t) =>
          t
            .setPlaceholder("Absolute path to a folder")
            .setValue(this.plugin.settings.customFolder)
            .onChange(async (v) => {
              this.plugin.settings.customFolder = v;
              await this.plugin.saveSettings();
            })
        );
    }

    new Setting(containerEl)
      .setName("Open file after export")
      .addToggle((t) =>
        t.setValue(this.plugin.settings.openAfterExport).onChange(async (v) => {
          this.plugin.settings.openAfterExport = v;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Reveal file instead of opening it")
      .addToggle((t) =>
        t.setValue(this.plugin.settings.revealInFolder).onChange(async (v) => {
          this.plugin.settings.revealInFolder = v;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Extra pandoc arguments")
      .setDesc('Appended to every export, e.g. --toc --number-sections --csl "chicago.csl"')
      .addText((t) =>
        t
          .setPlaceholder("--toc")
          .setValue(this.plugin.settings.extraArgs)
          .onChange(async (v) => {
            this.plugin.settings.extraArgs = v;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Citations")
      .setDesc(
        "Auto: turn on citation processing when the note uses [@key] syntax or declares a bibliography in frontmatter."
      )
      .addDropdown((d) =>
        d
          .addOption("auto", "Auto-detect")
          .addOption("always", "Always")
          .addOption("off", "Off")
          .setValue(this.plugin.settings.citations)
          .onChange(async (v) => {
            this.plugin.settings.citations = v as PandocExportSettings["citations"];
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Bibliography file")
      .setDesc(
        "Absolute or vault-relative path to a .bib/.json/.yaml bibliography. Leave empty if notes declare their own in frontmatter."
      )
      .addText((t) =>
        t
          .setPlaceholder("references.bib")
          .setValue(this.plugin.settings.bibliographyPath)
          .onChange(async (v) => {
            this.plugin.settings.bibliographyPath = v;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Citation style file")
      .setDesc("Absolute or vault-relative path to a .csl citation style.")
      .addText((t) =>
        t
          .setPlaceholder("Path to a .csl file")
          .setValue(this.plugin.settings.cslPath)
          .onChange(async (v) => {
            this.plugin.settings.cslPath = v;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Buttons")
      .setDesc("Choose which format buttons appear in the export panel.")
      .setHeading();

    for (const fmt of FORMATS) {
      new Setting(containerEl).setName(`${fmt.label} (.${fmt.ext})`).addToggle((t) =>
        t
          .setValue(this.plugin.settings.enabledFormats.includes(fmt.id))
          .onChange(async (v) => {
            const set = new Set(this.plugin.settings.enabledFormats);
            if (v) set.add(fmt.id);
            else set.delete(fmt.id);
            this.plugin.settings.enabledFormats = FORMATS.map((f) => f.id).filter((id) =>
              set.has(id)
            );
            await this.plugin.saveSettings();
          })
      );
    }
  }
}
