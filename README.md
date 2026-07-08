# Pandoc Export Buttons

[![Downloads](https://img.shields.io/github/downloads/kebl3541/Obsidian-Pandoc-Export-Buttons/total?style=flat&logo=github&label=Downloads&color=success&cacheSeconds=3600)](https://github.com/kebl3541/Obsidian-Pandoc-Export-Buttons/releases)
[![GitHub stars](https://img.shields.io/github/stars/kebl3541/Obsidian-Pandoc-Export-Buttons?style=flat&logo=github&label=Stars&cacheSeconds=7200)](https://github.com/kebl3541/Obsidian-Pandoc-Export-Buttons/stargazers)
[![Latest release](https://img.shields.io/github/v/release/kebl3541/Obsidian-Pandoc-Export-Buttons?style=flat&label=Release&cacheSeconds=3600)](https://github.com/kebl3541/Obsidian-Pandoc-Export-Buttons/releases/latest)

An Obsidian plugin with **one-click buttons that export the current note to Word, PDF, HTML, EPUB, LaTeX**, and any other format [Pandoc](https://pandoc.org) supports.

<p align="center">If this plugin adds value for you and you would like to help support
continued development, please use the buttons below:</p>

<p align="center">
<a href="https://www.paypal.com/donate/?business=berlin.philosophy%40gmail.com&no_recurring=0&currency_code=EUR"><img src="https://www.paypalobjects.com/webstatic/mktg/Logo/pp-logo-200px.png" alt="PayPal" height="42"></a>
&nbsp;&nbsp;
<a href="https://buymeacoffee.com/philosophizer"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy me a coffee" height="52"></a>
</p>

<p align="center"><strong><a href="https://buymeacoffee.com/philosophizer">☕ Buy me a coffee</a></strong>&nbsp;&nbsp;·&nbsp;&nbsp;<strong><a href="https://www.paypal.com/donate/?business=berlin.philosophy%40gmail.com&no_recurring=0&currency_code=EUR">💙 Donate via PayPal</a></strong></p>

<p align="center">If you like this plugin or find it useful, please consider giving it a <a href="https://github.com/kebl3541/Obsidian-Pandoc-Export-Buttons">star</a> <a href="https://github.com/kebl3541/Obsidian-Pandoc-Export-Buttons"><img src="https://img.shields.io/github/stars/kebl3541/Obsidian-Pandoc-Export-Buttons?style=social" alt="GitHub Repo stars"></a> on GitHub!</p>

## What it does

- Adds a **Pandoc export panel** in the right sidebar (ribbon icon or command palette): a grid of format buttons. Click one, get the exported file.
- Every format is also a **command**, so you can bind hotkeys (e.g. ⌘⇧W for Word).
- **Transclusions are expanded.** `![[Another note]]`, `![[Note#Heading]]`, and `![[Note#^block]]` embeds are replaced by the embedded content (recursively, cycle-safe), so the export reads like the note does in preview.
- **Exports match preview semantics.** `%%comments%%` are removed (they're hidden in Obsidian), while anything inside code blocks or inline code stays exactly as written.
- **Images survive.** `![[image.png]]` embeds, including ones inside embedded notes, are resolved to real paths before conversion.
- **Citations just work.** Notes using `[@key]` syntax automatically get `--citeproc`; point the settings at your `.bib` file and CSL style once (or declare them in note frontmatter).
- **PDF without installing LaTeX.** With a LaTeX engine (tectonic, xelatex…) installed you get LaTeX typesetting; without one, the plugin renders the PDF with Obsidian's built-in Chromium, with nothing to install.
- Choose where exports land: next to the note, in a vault folder, or any folder on disk.
- Extra Pandoc arguments (`--toc`, `--number-sections`, custom templates…) can be set once and apply to every export.

## Formats

Word (docx), PDF, HTML, EPUB, LaTeX, ODT, RTF, PowerPoint (pptx), plain text, GitHub-flavored Markdown, reStructuredText, Org, MediaWiki, DocBook, Jupyter notebook, Typst. Toggle which buttons appear in settings.

## Requirements

- [Pandoc](https://pandoc.org/installing.html) (`brew install pandoc` on macOS). The plugin auto-detects it in the usual homebrew/system locations; a custom path can be set in settings.
- Optional, for LaTeX-quality PDF: a PDF engine such as [tectonic](https://tectonic-typesetting.github.io) (`brew install tectonic`), xelatex, typst, or wkhtmltopdf, all auto-detected. Without one, PDF export falls back to the built-in renderer automatically.

Desktop only (the plugin runs the pandoc executable).

## Security and privacy

This plugin needs two capabilities that Obsidian's review process rightly flags, so here is exactly how they are used:

- **Process execution** (`child_process.execFile`): the plugin's sole purpose is to run Pandoc. It executes only the Pandoc binary (auto-detected in standard locations, or the path you set) and, for PDF, the PDF engine. Arguments are passed as an array; no shell is invoked, so note names and settings cannot inject commands. Nothing runs except when you click an export button or run an export command.
- **Filesystem access** (`fs`): note content is read through Obsidian's vault API, never `fs`. Direct filesystem access is limited to: writing the exported file where you chose, writing/deleting one temporary HTML file when the built-in PDF renderer is used, creating the output folder if missing, and checking whether the Pandoc/engine binaries exist during auto-detection.
- **No network access.** The plugin makes no requests, collects nothing, and phones nowhere.

## License

MIT © [kebl3541](https://github.com/kebl3541)
