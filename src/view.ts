import { ItemView, WorkspaceLeaf } from "obsidian";
import type PandocExportPlugin from "./main";

export const VIEW_TYPE_PANDOC_EXPORT = "pandoc-export-buttons";

export class PandocExportView extends ItemView {
  plugin: PandocExportPlugin;

  constructor(leaf: WorkspaceLeaf, plugin: PandocExportPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return VIEW_TYPE_PANDOC_EXPORT;
  }

  getDisplayText(): string {
    return "Pandoc export";
  }

  getIcon(): string {
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
      cls: "pandoc-export-filename",
    });

    const grid = container.createDiv({ cls: "pandoc-export-grid" });
    for (const fmt of this.plugin.enabledFormats()) {
      const btn = grid.createEl("button", { cls: "pandoc-export-btn" });
      btn.createSpan({ text: fmt.label, cls: "pandoc-export-btn-label" });
      btn.createSpan({ text: `.${fmt.ext}`, cls: "pandoc-export-btn-ext" });
      btn.disabled = !mdFile || this.plugin.exporting;
      btn.addEventListener("click", () => {
        const current = this.app.workspace.getActiveFile();
        if (!current || current.extension !== "md") return;
        void this.plugin.exportFile(current, fmt);
      });
    }

    if (this.plugin.enabledFormats().length === 0) {
      grid.createEl("p", {
        text: "No formats enabled — turn some on in the plugin settings.",
        cls: "pandoc-export-empty",
      });
    }
  }
}
