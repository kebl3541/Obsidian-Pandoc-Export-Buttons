# Pandoc Export Buttons

One-click buttons that export the current Obsidian note to Word, PDF, HTML, EPUB, LaTeX, ODT, RTF, PowerPoint, and any other format [Pandoc](https://pandoc.org) supports.

![GitHub all releases](https://img.shields.io/github/downloads/kebl3541/Obsidian-Pandoc-Export-Buttons/total?cacheSeconds=3600)

## What it does

- Adds a **Pandoc export panel** in the right sidebar (ribbon icon or command palette): a grid of format buttons. Click one, get the exported file.
- Every format is also a **command**, so you can bind hotkeys (e.g. ⌘⇧W for Word).
- **Transclusions are expanded.** `![[Another note]]`, `![[Note#Heading]]`, and `![[Note#^block]]` embeds are replaced by the embedded content (recursively, cycle-safe), so the export reads like the note does in preview.
- **Exports match preview semantics.** `%%comments%%` are removed (they're hidden in Obsidian), while anything inside code blocks or inline code stays exactly as written.
- **Images survive.** `![[image.png]]` embeds — including ones inside embedded notes — are resolved to real paths before conversion.
- **Citations just work.** Notes using `[@key]` syntax automatically get `--citeproc`; point the settings at your `.bib` file and CSL style once (or declare them in note frontmatter).
- **PDF without installing LaTeX.** With a LaTeX engine (tectonic, xelatex…) installed you get LaTeX typesetting; without one, the plugin renders the PDF with Obsidian's built-in Chromium — no dependencies.
- Choose where exports land: next to the note, in a vault folder, or any folder on disk.
- Extra Pandoc arguments (`--toc`, `--number-sections`, custom templates…) can be set once and apply to every export.

## Requirements

- [Pandoc](https://pandoc.org/installing.html) (`brew install pandoc` on macOS). The plugin auto-detects it in the usual homebrew/system locations; a custom path can be set in settings.
- Optional, for LaTeX-quality PDF: a PDF engine such as [tectonic](https://tectonic-typesetting.github.io) (`brew install tectonic`), xelatex, typst, or wkhtmltopdf — auto-detected. Without one, PDF export falls back to the built-in renderer automatically.

Desktop only (the plugin runs the pandoc executable).

## Formats

Word (docx), PDF, HTML, EPUB, LaTeX, ODT, RTF, PowerPoint (pptx), plain text, GitHub-flavored Markdown, reStructuredText, Org, MediaWiki, DocBook, Jupyter notebook, Typst. Toggle which buttons appear in settings.

## Security and privacy

This plugin needs two capabilities that Obsidian's review process rightly flags, so here is exactly how they are used:

- **Process execution** (`child_process.execFile`): the plugin's sole purpose is to run Pandoc. It executes only the Pandoc binary (auto-detected in standard locations, or the path you set) and, for PDF, the PDF engine. Arguments are passed as an array — no shell is invoked, so note names and settings cannot inject commands. Nothing runs except when you click an export button or run an export command.
- **Filesystem access** (`fs`): note content is read through Obsidian's vault API, never `fs`. Direct filesystem access is limited to: writing the exported file where you chose, writing/deleting one temporary HTML file when the built-in PDF renderer is used, creating the output folder if missing, and checking whether the Pandoc/engine binaries exist during auto-detection.
- **No network access.** The plugin makes no requests, collects nothing, and phones nowhere.

Desktop only, for the reasons above.

## Support

If this plugin is useful to you:

[<img src="https://img.shields.io/badge/Buy%20Me%20a%20Coffee-support-yellow?logo=buymeacoffee" height="28">](https://buymeacoffee.com/philosophizer)
[<img src="https://img.shields.io/badge/PayPal-donate-blue?logo=paypal" height="28">](https://www.paypal.com/donate/?business=berlin.philosophy%40gmail.com&no_recurring=0&currency_code=EUR)

## License

MIT © kebl3541
