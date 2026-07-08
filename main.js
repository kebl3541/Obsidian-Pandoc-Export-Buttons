var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => PandocExportPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian2 = require("obsidian");
var import_child_process = require("child_process");
var import_electron = require("electron");
var import_fs = require("fs");
var os = __toESM(require("os"));
var path = __toESM(require("path"));

// src/formats.ts
var FORMATS = [
  { id: "docx", label: "Word", to: "docx", ext: "docx" },
  { id: "pdf", label: "PDF", to: "", ext: "pdf" },
  { id: "html", label: "HTML", to: "html", ext: "html" },
  { id: "epub", label: "EPUB", to: "epub", ext: "epub" },
  { id: "latex", label: "LaTeX", to: "latex", ext: "tex" },
  { id: "odt", label: "ODT", to: "odt", ext: "odt" },
  { id: "rtf", label: "RTF", to: "rtf", ext: "rtf" },
  { id: "pptx", label: "PowerPoint", to: "pptx", ext: "pptx" },
  { id: "plain", label: "Plain text", to: "plain", ext: "txt" },
  { id: "gfm", label: "GitHub MD", to: "gfm", ext: "md" },
  { id: "rst", label: "reST", to: "rst", ext: "rst" },
  { id: "org", label: "Org", to: "org", ext: "org" },
  { id: "mediawiki", label: "MediaWiki", to: "mediawiki", ext: "wiki" },
  { id: "docbook", label: "DocBook", to: "docbook", ext: "xml" },
  { id: "ipynb", label: "Jupyter", to: "ipynb", ext: "ipynb" },
  { id: "typst", label: "Typst", to: "typst", ext: "typ" }
];
var DEFAULT_ENABLED = [
  "docx",
  "pdf",
  "html",
  "epub",
  "latex",
  "odt",
  "rtf",
  "pptx"
];

// src/view.ts
var import_obsidian = require("obsidian");
var VIEW_TYPE_PANDOC_EXPORT = "pandoc-export-buttons";
var PandocExportView = class extends import_obsidian.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
  }
  getViewType() {
    return VIEW_TYPE_PANDOC_EXPORT;
  }
  getDisplayText() {
    return "Pandoc export";
  }
  getIcon() {
    return "file-output";
  }
  async onOpen() {
    this.refresh();
  }
  refresh() {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass("pandoc-export-view");
    const active = this.app.workspace.getActiveFile();
    const mdFile = active && active.extension === "md" ? active : null;
    const header = container.createDiv({ cls: "pandoc-export-header" });
    header.createDiv({ text: "Export with pandoc", cls: "pandoc-export-title" });
    header.createDiv({
      text: mdFile ? mdFile.basename : "Open a markdown note to export it.",
      cls: "pandoc-export-filename"
    });
    const grid = container.createDiv({ cls: "pandoc-export-grid" });
    for (const fmt of this.plugin.enabledFormats()) {
      const btn = grid.createEl("button", { cls: "pandoc-export-btn" });
      btn.createSpan({ text: fmt.label, cls: "pandoc-export-btn-label" });
      btn.createSpan({ text: `.${fmt.ext}`, cls: "pandoc-export-btn-ext" });
      btn.disabled = !mdFile || this.plugin.exporting;
      btn.addEventListener("click", () => {
        const current = this.app.workspace.getActiveFile();
        if (!current || current.extension !== "md")
          return;
        void this.plugin.exportFile(current, fmt);
      });
    }
    if (this.plugin.enabledFormats().length === 0) {
      grid.createEl("p", {
        text: "No formats enabled \u2014 turn some on in the plugin settings.",
        cls: "pandoc-export-empty"
      });
    }
  }
};

// src/main.ts
var DEFAULT_SETTINGS = {
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
  cslPath: ""
};
var EXTRA_BIN_DIRS = [
  "/opt/homebrew/bin",
  "/usr/local/bin",
  "/opt/local/bin",
  "/usr/bin"
];
var PDF_ENGINE_CANDIDATES = [
  "tectonic",
  "xelatex",
  "lualatex",
  "pdflatex",
  "typst",
  "wkhtmltopdf",
  "weasyprint"
];
var CHROMIUM_ENGINE = "chromium";
var IMAGE_EXTS = /* @__PURE__ */ new Set(["png", "jpg", "jpeg", "gif", "svg", "webp", "bmp", "tiff"]);
var MAX_EMBED_DEPTH = 5;
var EMBED_RE = /!\[\[([^\]|#]+?)(?:#([^\]|]+))?(?:\|([^\]]*))?\]\]/g;
var CODE_REGION_RE = /```[\s\S]*?(?:```|$)|~~~[\s\S]*?(?:~~~|$)|`[^`\n]+`/g;
var COMMENT_RE = /%%[\s\S]*?%%/g;
var CITATION_RE = /(^|[\s([;])@[a-zA-Z0-9_][\w:.#$%&+?<>~/-]*/m;
function findInExtraDirs(name) {
  for (const dir of EXTRA_BIN_DIRS) {
    const p = path.join(dir, name);
    if ((0, import_fs.existsSync)(p))
      return p;
  }
  return null;
}
function parseArgs(s) {
  const out = [];
  let cur = "";
  let quote = null;
  let sawQuote = false;
  for (const ch of s) {
    if (quote) {
      if (ch === quote)
        quote = null;
      else
        cur += ch;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      sawQuote = true;
    } else if (/\s/.test(ch)) {
      if (cur.length > 0 || sawQuote)
        out.push(cur);
      cur = "";
      sawQuote = false;
    } else {
      cur += ch;
    }
  }
  if (cur.length > 0 || sawQuote)
    out.push(cur);
  return out;
}
var PandocExportPlugin = class extends import_obsidian2.Plugin {
  constructor() {
    super(...arguments);
    this.exporting = false;
  }
  async onload() {
    await this.loadSettings();
    this.registerView(VIEW_TYPE_PANDOC_EXPORT, (leaf) => new PandocExportView(leaf, this));
    this.addRibbonIcon("file-output", "Pandoc export", () => this.activateView());
    this.addCommand({
      id: "open-panel",
      name: "Open export panel",
      callback: () => this.activateView()
    });
    for (const fmt of FORMATS) {
      this.addCommand({
        id: `export-${fmt.id}`,
        name: `Export current note to ${fmt.label} (.${fmt.ext})`,
        checkCallback: (checking) => {
          const file = this.app.workspace.getActiveFile();
          if (!file || file.extension !== "md")
            return false;
          if (!checking)
            void this.exportFile(file, fmt);
          return true;
        }
      });
    }
    this.addSettingTab(new PandocExportSettingTab(this.app, this));
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", () => this.refreshViews())
    );
  }
  onunload() {
  }
  async loadSettings() {
    var _a;
    const stored = (_a = await this.loadData()) != null ? _a : {};
    this.settings = Object.assign({}, DEFAULT_SETTINGS, stored);
  }
  async saveSettings() {
    await this.saveData(this.settings);
    this.refreshViews();
  }
  refreshViews() {
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_PANDOC_EXPORT)) {
      const view = leaf.view;
      if (view instanceof PandocExportView)
        view.refresh();
    }
  }
  async activateView() {
    const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE_PANDOC_EXPORT);
    if (existing.length > 0) {
      await this.app.workspace.revealLeaf(existing[0]);
      return;
    }
    const leaf = this.app.workspace.getRightLeaf(false);
    if (!leaf)
      return;
    await leaf.setViewState({ type: VIEW_TYPE_PANDOC_EXPORT, active: true });
    await this.app.workspace.revealLeaf(leaf);
  }
  enabledFormats() {
    return FORMATS.filter((f) => this.settings.enabledFormats.includes(f.id));
  }
  resolvePandoc() {
    const configured = this.settings.pandocPath.trim();
    if (configured)
      return (0, import_fs.existsSync)(configured) ? configured : null;
    return findInExtraDirs("pandoc");
  }
  /** Returns an engine path, the chromium sentinel, or null (= use chromium). */
  resolvePdfEngine() {
    var _a;
    const configured = this.settings.pdfEngine.trim();
    if (configured === CHROMIUM_ENGINE)
      return CHROMIUM_ENGINE;
    if (configured) {
      if (path.isAbsolute(configured))
        return (0, import_fs.existsSync)(configured) ? configured : null;
      return (_a = findInExtraDirs(configured)) != null ? _a : configured;
    }
    for (const name of PDF_ENGINE_CANDIDATES) {
      const p = findInExtraDirs(name);
      if (p)
        return p;
    }
    return null;
  }
  vaultBasePath() {
    const adapter = this.app.vault.adapter;
    return adapter instanceof import_obsidian2.FileSystemAdapter ? adapter.getBasePath() : null;
  }
  /** Resolve a settings path that may be absolute or vault-relative. */
  resolveConfigPath(p, vaultRoot) {
    const trimmed = p.trim();
    if (!trimmed)
      return null;
    const abs = path.isAbsolute(trimmed) ? trimmed : path.join(vaultRoot, trimmed);
    return (0, import_fs.existsSync)(abs) ? abs : null;
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
  async expandContent(content, sourcePath, vaultRoot, visited, depth) {
    var _a, _b;
    let result = "";
    let last = 0;
    for (const m of content.matchAll(CODE_REGION_RE)) {
      result += await this.expandSegment(
        content.slice(last, (_a = m.index) != null ? _a : 0),
        sourcePath,
        vaultRoot,
        visited,
        depth
      );
      result += m[0];
      last = ((_b = m.index) != null ? _b : 0) + m[0].length;
    }
    result += await this.expandSegment(content.slice(last), sourcePath, vaultRoot, visited, depth);
    return result;
  }
  async expandSegment(segment, sourcePath, vaultRoot, visited, depth) {
    var _a, _b;
    const content = segment.replace(COMMENT_RE, "");
    let result = "";
    let last = 0;
    for (const m of content.matchAll(EMBED_RE)) {
      result += content.slice(last, (_a = m.index) != null ? _a : 0);
      last = ((_b = m.index) != null ? _b : 0) + m[0].length;
      result += await this.renderEmbed(m[0], m[1], m[2], m[3], sourcePath, vaultRoot, visited, depth);
    }
    result += content.slice(last);
    return result;
  }
  async renderEmbed(whole, target, anchor, alias, sourcePath, vaultRoot, visited, depth) {
    var _a, _b;
    const dest = this.app.metadataCache.getFirstLinkpathDest(target.trim(), sourcePath);
    if (!dest)
      return whole;
    const ext = dest.extension.toLowerCase();
    if (IMAGE_EXTS.has(ext)) {
      const abs = path.join(vaultRoot, dest.path);
      return `![${alias != null ? alias : ""}](<${abs}>)`;
    }
    if (ext !== "md")
      return whole;
    if (depth >= MAX_EMBED_DEPTH || visited.has(dest.path))
      return alias != null ? alias : dest.basename;
    const raw = await this.app.vault.cachedRead(dest);
    const cache = this.app.metadataCache.getFileCache(dest);
    let text;
    if (anchor) {
      const section = this.extractAnchor(raw, cache, anchor);
      if (section === null)
        return alias != null ? alias : whole;
      text = section;
    } else {
      text = raw;
      const fmEnd = (_b = (_a = cache == null ? void 0 : cache.frontmatterPosition) == null ? void 0 : _a.end) == null ? void 0 : _b.offset;
      if (fmEnd !== void 0)
        text = text.slice(fmEnd).replace(/^\s+/, "");
    }
    const expanded = await this.expandContent(
      text,
      dest.path,
      vaultRoot,
      /* @__PURE__ */ new Set([...visited, dest.path]),
      depth + 1
    );
    return `

${expanded.trim()}

`;
  }
  /** Extract a #Heading section or #^block from a note using its metadata cache. */
  extractAnchor(raw, cache, anchor) {
    var _a, _b;
    if (!cache)
      return null;
    if (anchor.startsWith("^")) {
      const block = (_a = cache.blocks) == null ? void 0 : _a[anchor.slice(1)];
      if (!block)
        return null;
      return raw.slice(block.position.start.offset, block.position.end.offset).replace(/\s*\^\S+\s*$/, "");
    }
    const headings = (_b = cache.headings) != null ? _b : [];
    const wanted = anchor.trim().toLowerCase();
    const idx = headings.findIndex((h) => h.heading.trim().toLowerCase() === wanted);
    if (idx === -1)
      return null;
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
  outputDir(file, vaultRoot) {
    var _a, _b, _c, _d;
    switch (this.settings.outputMode) {
      case "vault-folder":
        return path.join(vaultRoot, this.settings.vaultFolder || "pandoc-exports");
      case "custom":
        return this.settings.customFolder || path.join(vaultRoot, (_b = (_a = file.parent) == null ? void 0 : _a.path) != null ? _b : "");
      default:
        return path.join(vaultRoot, (_d = (_c = file.parent) == null ? void 0 : _c.path) != null ? _d : "");
    }
  }
  wantsCitations(content) {
    switch (this.settings.citations) {
      case "always":
        return true;
      case "off":
        return false;
      default:
        return CITATION_RE.test(content) || /^bibliography\s*:/m.test(content);
    }
  }
  async runPandoc(pandoc, args, stdinContent, cwd) {
    var _a;
    const env = {
      ...process.env,
      PATH: [(_a = process.env.PATH) != null ? _a : "", ...EXTRA_BIN_DIRS].join(path.delimiter)
    };
    await new Promise((resolve2, reject) => {
      var _a2, _b, _c;
      const child = (0, import_child_process.execFile)(
        pandoc,
        args,
        { cwd, env, maxBuffer: 10 * 1024 * 1024, timeout: 12e4 },
        (err, _stdout, stderr) => {
          if (err)
            reject(new Error((stderr == null ? void 0 : stderr.trim()) || err.message));
          else
            resolve2();
        }
      );
      (_a2 = child.stdin) == null ? void 0 : _a2.on("error", () => {
      });
      (_b = child.stdin) == null ? void 0 : _b.write(stdinContent);
      (_c = child.stdin) == null ? void 0 : _c.end();
    });
  }
  /** Render standalone HTML to PDF with Obsidian's own Chromium (no install). */
  async chromiumPdf(htmlPath, outPath) {
    var _a;
    const BrowserWindow = (_a = import_electron.remote) == null ? void 0 : _a.BrowserWindow;
    if (!BrowserWindow) {
      throw new Error(
        "Built-in PDF renderer unavailable \u2014 install a PDF engine (brew install tectonic) or set one in settings."
      );
    }
    const win = new BrowserWindow({
      show: false,
      webPreferences: { sandbox: true, nodeIntegration: false, contextIsolation: true }
    });
    try {
      await win.loadFile(htmlPath);
      const data = await win.webContents.printToPDF({
        printBackground: true,
        pageSize: "A4"
      });
      (0, import_fs.writeFileSync)(outPath, data);
    } finally {
      win.destroy();
    }
  }
  async exportFile(file, fmt) {
    var _a, _b;
    if (this.exporting) {
      new import_obsidian2.Notice("Pandoc: an export is already running.");
      return false;
    }
    const pandoc = this.resolvePandoc();
    if (!pandoc) {
      new import_obsidian2.Notice(
        "Pandoc not found. Install it (brew install pandoc) or set its path in the plugin settings.",
        8e3
      );
      return false;
    }
    const vaultRoot = this.vaultBasePath();
    if (!vaultRoot) {
      new import_obsidian2.Notice("Pandoc export only works in local vaults.");
      return false;
    }
    const mdView = this.app.workspace.getActiveViewOfType(import_obsidian2.MarkdownView);
    if ((mdView == null ? void 0 : mdView.file) === file)
      await mdView.save();
    const noteDir = path.join(vaultRoot, (_b = (_a = file.parent) == null ? void 0 : _a.path) != null ? _b : "");
    const outDir = this.outputDir(file, vaultRoot);
    try {
      (0, import_fs.mkdirSync)(outDir, { recursive: true });
    } catch (e) {
      new import_obsidian2.Notice(`Pandoc: cannot create output folder ${outDir}`, 8e3);
      return false;
    }
    let outPath = path.join(outDir, `${file.basename}.${fmt.ext}`);
    const inputAbs = path.join(vaultRoot, file.path);
    if (path.resolve(outPath) === path.resolve(inputAbs)) {
      outPath = path.join(outDir, `${file.basename}.export.${fmt.ext}`);
    }
    const raw = await this.app.vault.read(file);
    const content = await this.expandContent(
      raw,
      file.path,
      vaultRoot,
      /* @__PURE__ */ new Set([file.path]),
      0
    );
    const args = [
      "-f",
      "markdown+wikilinks_title_after_pipe",
      "--standalone",
      "--resource-path",
      [noteDir, vaultRoot].join(path.delimiter)
    ];
    if (this.wantsCitations(content)) {
      args.push("--citeproc");
      const bib = this.resolveConfigPath(this.settings.bibliographyPath, vaultRoot);
      if (bib)
        args.push("--bibliography", bib);
      const csl = this.resolveConfigPath(this.settings.cslPath, vaultRoot);
      if (csl)
        args.push("--csl", csl);
    }
    let chromiumHtml = null;
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
      if (fmt.to)
        args.push("-t", fmt.to);
    }
    if (this.settings.extraArgs.trim())
      args.push(...parseArgs(this.settings.extraArgs));
    this.exporting = true;
    this.refreshViews();
    const started = new import_obsidian2.Notice(`Pandoc: exporting to ${fmt.label}\u2026`, 0);
    try {
      await this.runPandoc(pandoc, args, content, noteDir);
      if (chromiumHtml) {
        try {
          await this.chromiumPdf(chromiumHtml, outPath);
        } finally {
          try {
            (0, import_fs.unlinkSync)(chromiumHtml);
          } catch (e) {
          }
        }
      }
      started.hide();
      new import_obsidian2.Notice(`Exported: ${path.basename(outPath)}`);
      if (this.settings.revealInFolder)
        import_electron.shell.showItemInFolder(outPath);
      else if (this.settings.openAfterExport)
        await import_electron.shell.openPath(outPath);
      return true;
    } catch (e) {
      started.hide();
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[pandoc-export-buttons]", msg);
      new import_obsidian2.Notice(`Pandoc failed: ${msg.slice(0, 300)}`, 12e3);
      return false;
    } finally {
      this.exporting = false;
      this.refreshViews();
    }
  }
};
var PandocExportSettingTab = class extends import_obsidian2.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    const detected = this.plugin.resolvePandoc();
    new import_obsidian2.Setting(containerEl).setName("Pandoc path").setDesc(
      detected ? `Leave empty to auto-detect (found: ${detected})` : "Pandoc was not auto-detected \u2014 set the absolute path here."
    ).addText(
      (t) => t.setPlaceholder("/opt/homebrew/bin/pandoc").setValue(this.plugin.settings.pandocPath).onChange(async (v) => {
        this.plugin.settings.pandocPath = v;
        await this.plugin.saveSettings();
      })
    );
    const engine = this.plugin.resolvePdfEngine();
    new import_obsidian2.Setting(containerEl).setName("PDF engine").setDesc(
      engine && engine !== "chromium" ? `Engine Pandoc uses for PDF. Leave empty to auto-detect (found: ${engine}). Set to "chromium" to force the built-in renderer.` : "No LaTeX engine found \u2014 PDF uses the built-in renderer. Install tectonic (brew install tectonic) for LaTeX-quality typesetting."
    ).addText(
      (t) => t.setPlaceholder("Auto-detect").setValue(this.plugin.settings.pdfEngine).onChange(async (v) => {
        this.plugin.settings.pdfEngine = v;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian2.Setting(containerEl).setName("Output location").setDesc("Where exported files are written.").addDropdown(
      (d) => d.addOption("note-folder", "Same folder as the note").addOption("vault-folder", "Folder inside the vault").addOption("custom", "Custom absolute folder").setValue(this.plugin.settings.outputMode).onChange(async (v) => {
        this.plugin.settings.outputMode = v;
        await this.plugin.saveSettings();
        this.display();
      })
    );
    if (this.plugin.settings.outputMode === "vault-folder") {
      new import_obsidian2.Setting(containerEl).setName("Vault folder").setDesc("Vault-relative folder for exports (created if missing).").addText(
        (t) => t.setPlaceholder("Folder name").setValue(this.plugin.settings.vaultFolder).onChange(async (v) => {
          this.plugin.settings.vaultFolder = v;
          await this.plugin.saveSettings();
        })
      );
    }
    if (this.plugin.settings.outputMode === "custom") {
      new import_obsidian2.Setting(containerEl).setName("Custom folder").setDesc("Absolute path for exports (created if missing).").addText(
        (t) => t.setPlaceholder("Absolute path to a folder").setValue(this.plugin.settings.customFolder).onChange(async (v) => {
          this.plugin.settings.customFolder = v;
          await this.plugin.saveSettings();
        })
      );
    }
    new import_obsidian2.Setting(containerEl).setName("Open file after export").addToggle(
      (t) => t.setValue(this.plugin.settings.openAfterExport).onChange(async (v) => {
        this.plugin.settings.openAfterExport = v;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian2.Setting(containerEl).setName("Reveal file instead of opening it").addToggle(
      (t) => t.setValue(this.plugin.settings.revealInFolder).onChange(async (v) => {
        this.plugin.settings.revealInFolder = v;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian2.Setting(containerEl).setName("Extra pandoc arguments").setDesc('Appended to every export, e.g. --toc --number-sections --csl "chicago.csl"').addText(
      (t) => t.setPlaceholder("--toc").setValue(this.plugin.settings.extraArgs).onChange(async (v) => {
        this.plugin.settings.extraArgs = v;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian2.Setting(containerEl).setName("Citations").setDesc(
      "Auto: turn on citation processing when the note uses [@key] syntax or declares a bibliography in frontmatter."
    ).addDropdown(
      (d) => d.addOption("auto", "Auto-detect").addOption("always", "Always").addOption("off", "Off").setValue(this.plugin.settings.citations).onChange(async (v) => {
        this.plugin.settings.citations = v;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian2.Setting(containerEl).setName("Bibliography file").setDesc(
      "Absolute or vault-relative path to a .bib/.json/.yaml bibliography. Leave empty if notes declare their own in frontmatter."
    ).addText(
      (t) => t.setPlaceholder("references.bib").setValue(this.plugin.settings.bibliographyPath).onChange(async (v) => {
        this.plugin.settings.bibliographyPath = v;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian2.Setting(containerEl).setName("Citation style file").setDesc("Absolute or vault-relative path to a .csl citation style.").addText(
      (t) => t.setPlaceholder("Path to a .csl file").setValue(this.plugin.settings.cslPath).onChange(async (v) => {
        this.plugin.settings.cslPath = v;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian2.Setting(containerEl).setName("Buttons").setDesc("Choose which format buttons appear in the export panel.").setHeading();
    for (const fmt of FORMATS) {
      new import_obsidian2.Setting(containerEl).setName(`${fmt.label} (.${fmt.ext})`).addToggle(
        (t) => t.setValue(this.plugin.settings.enabledFormats.includes(fmt.id)).onChange(async (v) => {
          const set = new Set(this.plugin.settings.enabledFormats);
          if (v)
            set.add(fmt.id);
          else
            set.delete(fmt.id);
          this.plugin.settings.enabledFormats = FORMATS.map((f) => f.id).filter(
            (id) => set.has(id)
          );
          await this.plugin.saveSettings();
        })
      );
    }
  }
};
