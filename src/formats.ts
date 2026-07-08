export interface PandocFormat {
  /** stable id used in settings + command ids */
  id: string;
  /** button label */
  label: string;
  /** pandoc writer name (-t). Empty for PDF: pandoc infers it from -o. */
  to: string;
  /** output file extension, no dot */
  ext: string;
}

export const FORMATS: PandocFormat[] = [
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
  { id: "typst", label: "Typst", to: "typst", ext: "typ" },
];

export const DEFAULT_ENABLED = [
  "docx",
  "pdf",
  "html",
  "epub",
  "latex",
  "odt",
  "rtf",
  "pptx",
];
