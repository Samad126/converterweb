/**
 * A faithful copy of what the running service answers for `GET /formats`.
 *
 * This is test data, not application data. The app reads the real response at
 * runtime; this file exists so the tests can stand in for the service, and so
 * that a test can hand the app a *different* matrix and prove that nothing in
 * the app is hard-coded to this one.
 *
 * Pulled from the live service (converterapi.alakbaroff.com/formats).
 */
import type { FormatsResponse } from "@/lib/api/contract";

export const MATRIX: FormatsResponse = {
  "targets": [
    {
      "id": "pdf",
      "extension": ".pdf",
      "mediaType": "application/pdf",
      "label": "PDF",
      "multiple": false
    },
    {
      "id": "odt",
      "extension": ".odt",
      "mediaType": "application/vnd.oasis.opendocument.text",
      "label": "ODT",
      "multiple": false
    },
    {
      "id": "docx",
      "extension": ".docx",
      "mediaType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "label": "DOCX",
      "multiple": false
    },
    {
      "id": "txt",
      "extension": ".txt",
      "mediaType": "text/plain; charset=utf-8",
      "label": "TXT",
      "multiple": false
    },
    {
      "id": "html",
      "extension": ".html",
      "mediaType": "text/html; charset=utf-8",
      "label": "HTML",
      "multiple": false
    },
    {
      "id": "rtf",
      "extension": ".rtf",
      "mediaType": "application/rtf",
      "label": "RTF",
      "multiple": false
    },
    {
      "id": "epub",
      "extension": ".epub",
      "mediaType": "application/epub+zip",
      "label": "EPUB",
      "multiple": false
    },
    {
      "id": "ods",
      "extension": ".ods",
      "mediaType": "application/vnd.oasis.opendocument.spreadsheet",
      "label": "ODS",
      "multiple": false
    },
    {
      "id": "xlsx",
      "extension": ".xlsx",
      "mediaType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "label": "XLSX",
      "multiple": false
    },
    {
      "id": "csv",
      "extension": ".csv",
      "mediaType": "text/csv; charset=utf-8",
      "label": "CSV",
      "multiple": false
    },
    {
      "id": "odp",
      "extension": ".odp",
      "mediaType": "application/vnd.oasis.opendocument.presentation",
      "label": "ODP",
      "multiple": false
    },
    {
      "id": "pptx",
      "extension": ".pptx",
      "mediaType": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "label": "PPTX",
      "multiple": false
    },
    {
      "id": "png",
      "extension": ".png",
      "mediaType": "image/png",
      "label": "PNG",
      "multiple": true
    },
    {
      "id": "jpg",
      "extension": ".jpg",
      "mediaType": "image/jpeg",
      "label": "JPG",
      "multiple": true
    },
    {
      "id": "tables",
      "extension": ".xlsx",
      "mediaType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "label": "XLSX (tables)",
      "multiple": false
    },
    {
      "id": "layers",
      "extension": ".png",
      "mediaType": "image/png",
      "label": "PNG (layers)",
      "multiple": true
    },
    {
      "id": "pdfa",
      "extension": ".pdf",
      "mediaType": "application/pdf",
      "label": "PDF/A",
      "multiple": false
    },
    {
      "id": "markdown",
      "extension": ".md",
      "mediaType": "text/markdown; charset=utf-8",
      "label": "Markdown",
      "multiple": false
    },
    {
      "id": "zip",
      "extension": ".zip",
      "mediaType": "application/zip",
      "label": "ZIP",
      "multiple": false
    },
    {
      "id": "tar",
      "extension": ".tar",
      "mediaType": "application/x-tar",
      "label": "TAR",
      "multiple": false
    },
    {
      "id": "tar.gz",
      "extension": ".tar.gz",
      "mediaType": "application/gzip",
      "label": "TAR.GZ",
      "multiple": false
    },
    {
      "id": "tar.bz2",
      "extension": ".tar.bz2",
      "mediaType": "application/x-bzip2",
      "label": "TAR.BZ2",
      "multiple": false
    },
    {
      "id": "7z",
      "extension": ".7z",
      "mediaType": "application/x-7z-compressed",
      "label": "7Z",
      "multiple": false
    },
    {
      "id": "cbz",
      "extension": ".cbz",
      "mediaType": "application/vnd.comicbook+zip",
      "label": "CBZ",
      "multiple": false
    },
    {
      "id": "srt",
      "extension": ".srt",
      "mediaType": "application/x-subrip",
      "label": "SRT",
      "multiple": false
    },
    {
      "id": "vtt",
      "extension": ".vtt",
      "mediaType": "text/vtt",
      "label": "VTT",
      "multiple": false
    },
    {
      "id": "ass",
      "extension": ".ass",
      "mediaType": "text/x-ass",
      "label": "ASS",
      "multiple": false
    },
    {
      "id": "ssa",
      "extension": ".ssa",
      "mediaType": "text/x-ssa",
      "label": "SSA",
      "multiple": false
    },
    {
      "id": "tsv",
      "extension": ".tsv",
      "mediaType": "text/tab-separated-values; charset=utf-8",
      "label": "TSV",
      "multiple": false
    },
    {
      "id": "json",
      "extension": ".json",
      "mediaType": "application/json; charset=utf-8",
      "label": "JSON",
      "multiple": false
    },
    {
      "id": "yaml",
      "extension": ".yaml",
      "mediaType": "application/yaml; charset=utf-8",
      "label": "YAML",
      "multiple": false
    },
    {
      "id": "jsonl",
      "extension": ".jsonl",
      "mediaType": "application/jsonl; charset=utf-8",
      "label": "JSONL",
      "multiple": false
    },
    {
      "id": "bmp",
      "extension": ".bmp",
      "mediaType": "image/bmp",
      "label": "BMP",
      "multiple": false
    },
    {
      "id": "gif",
      "extension": ".gif",
      "mediaType": "image/gif",
      "label": "GIF",
      "multiple": false
    },
    {
      "id": "tiff",
      "extension": ".tiff",
      "mediaType": "image/tiff",
      "label": "TIFF",
      "multiple": false
    },
    {
      "id": "webp",
      "extension": ".webp",
      "mediaType": "image/webp",
      "label": "WEBP",
      "multiple": false
    },
    {
      "id": "avif",
      "extension": ".avif",
      "mediaType": "image/avif",
      "label": "AVIF",
      "multiple": false
    },
    {
      "id": "ico",
      "extension": ".ico",
      "mediaType": "image/x-icon",
      "label": "ICO",
      "multiple": false
    },
    {
      "id": "png-image",
      "extension": ".png",
      "mediaType": "image/png",
      "label": "PNG (image)",
      "multiple": false
    },
    {
      "id": "jpg-image",
      "extension": ".jpg",
      "mediaType": "image/jpeg",
      "label": "JPG (image)",
      "multiple": false
    }
  ],
  "sources": [
    {
      "extension": ".docx",
      "mediaType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "family": "writer",
      "targets": [
        "pdf",
        "odt",
        "txt",
        "html",
        "rtf",
        "epub",
        "tables"
      ]
    },
    {
      "extension": ".docm",
      "mediaType": "application/vnd.ms-word.document.macroEnabled.12",
      "family": "writer",
      "targets": [
        "pdf",
        "docx",
        "odt",
        "txt",
        "html",
        "rtf",
        "epub",
        "tables"
      ]
    },
    {
      "extension": ".doc",
      "mediaType": "application/msword",
      "family": "writer",
      "targets": [
        "pdf",
        "docx",
        "odt",
        "txt",
        "html",
        "rtf",
        "epub"
      ]
    },
    {
      "extension": ".dot",
      "mediaType": "application/msword",
      "family": "writer",
      "targets": [
        "pdf",
        "docx",
        "odt",
        "txt",
        "html",
        "rtf",
        "epub"
      ]
    },
    {
      "extension": ".dotx",
      "mediaType": "application/vnd.openxmlformats-officedocument.wordprocessingml.template",
      "family": "writer",
      "targets": [
        "pdf",
        "docx",
        "odt",
        "txt",
        "html",
        "rtf",
        "epub"
      ]
    },
    {
      "extension": ".odt",
      "mediaType": "application/vnd.oasis.opendocument.text",
      "family": "writer",
      "targets": [
        "pdf",
        "docx",
        "txt",
        "html",
        "rtf",
        "epub"
      ]
    },
    {
      "extension": ".ods",
      "mediaType": "application/vnd.oasis.opendocument.spreadsheet",
      "family": "calc",
      "targets": [
        "pdf",
        "xlsx",
        "html",
        "csv"
      ]
    },
    {
      "extension": ".odg",
      "mediaType": "application/vnd.oasis.opendocument.graphics",
      "family": "draw",
      "targets": [
        "pdf"
      ]
    },
    {
      "extension": ".odp",
      "mediaType": "application/vnd.oasis.opendocument.presentation",
      "family": "impress",
      "targets": [
        "pdf",
        "pptx",
        "png",
        "jpg"
      ]
    },
    {
      "extension": ".xlsx",
      "mediaType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "family": "calc",
      "targets": [
        "pdf",
        "ods",
        "csv",
        "html"
      ]
    },
    {
      "extension": ".xls",
      "mediaType": "application/vnd.ms-excel",
      "family": "calc",
      "targets": [
        "pdf",
        "xlsx",
        "ods",
        "csv",
        "html"
      ]
    },
    {
      "extension": ".xlsm",
      "mediaType": "application/vnd.ms-excel.sheet.macroEnabled.12",
      "family": "calc",
      "targets": [
        "pdf",
        "xlsx",
        "ods",
        "csv",
        "html"
      ]
    },
    {
      "extension": ".pptx",
      "mediaType": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "family": "impress",
      "targets": [
        "pdf",
        "odp",
        "png",
        "jpg"
      ]
    },
    {
      "extension": ".ppt",
      "mediaType": "application/vnd.ms-powerpoint",
      "family": "impress",
      "targets": [
        "pdf",
        "pptx",
        "odp",
        "png",
        "jpg"
      ]
    },
    {
      "extension": ".pptm",
      "mediaType": "application/vnd.ms-powerpoint.presentation.macroEnabled.12",
      "family": "impress",
      "targets": [
        "pdf",
        "pptx",
        "odp",
        "png",
        "jpg"
      ]
    },
    {
      "extension": ".pps",
      "mediaType": "application/vnd.ms-powerpoint",
      "family": "impress",
      "targets": [
        "pdf",
        "pptx",
        "odp",
        "png",
        "jpg"
      ]
    },
    {
      "extension": ".ppsx",
      "mediaType": "application/vnd.openxmlformats-officedocument.presentationml.slideshow",
      "family": "impress",
      "targets": [
        "pdf",
        "pptx",
        "odp",
        "png",
        "jpg"
      ]
    },
    {
      "extension": ".pot",
      "mediaType": "application/vnd.ms-powerpoint",
      "family": "impress",
      "targets": [
        "pdf",
        "pptx",
        "odp",
        "png",
        "jpg"
      ]
    },
    {
      "extension": ".potx",
      "mediaType": "application/vnd.openxmlformats-officedocument.presentationml.template",
      "family": "impress",
      "targets": [
        "pdf",
        "pptx",
        "odp",
        "png",
        "jpg"
      ]
    },
    {
      "extension": ".csv",
      "mediaType": "text/csv",
      "family": "calc",
      "targets": [
        "xlsx",
        "ods",
        "pdf",
        "html",
        "tsv",
        "json",
        "yaml",
        "jsonl"
      ]
    },
    {
      "extension": ".txt",
      "mediaType": "text/plain",
      "family": "writer",
      "targets": [
        "pdf",
        "docx",
        "odt",
        "html",
        "rtf",
        "epub"
      ]
    },
    {
      "extension": ".html",
      "mediaType": "text/html",
      "family": "writer",
      "targets": [
        "pdf",
        "docx",
        "odt",
        "txt",
        "rtf",
        "epub"
      ]
    },
    {
      "extension": ".htm",
      "mediaType": "text/html",
      "family": "writer",
      "targets": [
        "pdf",
        "docx",
        "odt",
        "txt",
        "rtf",
        "epub"
      ]
    },
    {
      "extension": ".rtf",
      "mediaType": "application/rtf",
      "family": "writer",
      "targets": [
        "docx",
        "pdf",
        "odt",
        "txt",
        "html",
        "epub"
      ]
    },
    {
      "extension": ".png",
      "mediaType": "image/png",
      "family": "draw",
      "targets": [
        "pdf",
        "bmp",
        "gif",
        "tiff",
        "webp",
        "avif",
        "ico",
        "jpg-image"
      ]
    },
    {
      "extension": ".jpg",
      "mediaType": "image/jpeg",
      "family": "draw",
      "targets": [
        "pdf",
        "bmp",
        "gif",
        "tiff",
        "webp",
        "avif",
        "ico",
        "png-image"
      ]
    },
    {
      "extension": ".jpeg",
      "mediaType": "image/jpeg",
      "family": "draw",
      "targets": [
        "pdf",
        "bmp",
        "gif",
        "tiff",
        "webp",
        "avif",
        "ico",
        "png-image",
        "jpg-image"
      ]
    },
    {
      "extension": ".psd",
      "mediaType": "image/vnd.adobe.photoshop",
      "family": null,
      "targets": [
        "layers"
      ]
    },
    {
      "extension": ".pdf",
      "mediaType": "application/pdf",
      "family": "draw",
      "targets": [
        "pdfa",
        "png",
        "jpg",
        "docx",
        "pptx",
        "xlsx",
        "markdown"
      ]
    },
    {
      "extension": ".md",
      "mediaType": "text/markdown",
      "family": null,
      "targets": [
        "docx",
        "html",
        "odt",
        "rtf",
        "txt"
      ]
    },
    {
      "extension": ".rst",
      "mediaType": "text/x-rst",
      "family": null,
      "targets": [
        "docx",
        "html",
        "odt",
        "rtf",
        "txt",
        "markdown"
      ]
    },
    {
      "extension": ".tex",
      "mediaType": "application/x-tex",
      "family": null,
      "targets": [
        "docx",
        "html",
        "odt",
        "rtf",
        "txt",
        "markdown"
      ]
    },
    {
      "extension": ".textile",
      "mediaType": "text/x-textile",
      "family": null,
      "targets": [
        "docx",
        "html",
        "odt",
        "rtf",
        "txt",
        "markdown"
      ]
    },
    {
      "extension": ".org",
      "mediaType": "text/org",
      "family": null,
      "targets": [
        "docx",
        "html",
        "odt",
        "rtf",
        "txt",
        "markdown"
      ]
    },
    {
      "extension": ".opml",
      "mediaType": "text/x-opml",
      "family": null,
      "targets": [
        "docx",
        "html",
        "odt",
        "rtf",
        "txt",
        "markdown"
      ]
    },
    {
      "extension": ".muse",
      "mediaType": "text/x-muse",
      "family": null,
      "targets": [
        "docx",
        "html",
        "odt",
        "rtf",
        "txt",
        "markdown"
      ]
    },
    {
      "extension": ".ipynb",
      "mediaType": "application/x-ipynb+json",
      "family": null,
      "targets": [
        "docx",
        "html",
        "odt",
        "rtf",
        "txt",
        "markdown"
      ]
    },
    {
      "extension": ".zip",
      "mediaType": "application/zip",
      "family": null,
      "targets": [
        "tar",
        "tar.gz",
        "tar.bz2",
        "7z",
        "cbz"
      ]
    },
    {
      "extension": ".tar",
      "mediaType": "application/x-tar",
      "family": null,
      "targets": [
        "zip",
        "tar.gz",
        "tar.bz2",
        "7z",
        "cbz"
      ]
    },
    {
      "extension": ".tgz",
      "mediaType": "application/gzip",
      "family": null,
      "targets": [
        "zip",
        "tar",
        "tar.bz2",
        "7z",
        "cbz"
      ]
    },
    {
      "extension": ".tbz2",
      "mediaType": "application/x-bzip2",
      "family": null,
      "targets": [
        "zip",
        "tar",
        "tar.gz",
        "7z",
        "cbz"
      ]
    },
    {
      "extension": ".txz",
      "mediaType": "application/x-xz",
      "family": null,
      "targets": [
        "zip",
        "tar",
        "tar.gz",
        "tar.bz2",
        "7z",
        "cbz"
      ]
    },
    {
      "extension": ".gz",
      "mediaType": "application/gzip",
      "family": null,
      "targets": [
        "zip",
        "tar",
        "tar.gz",
        "tar.bz2",
        "7z",
        "cbz"
      ]
    },
    {
      "extension": ".bz2",
      "mediaType": "application/x-bzip2",
      "family": null,
      "targets": [
        "zip",
        "tar",
        "tar.gz",
        "tar.bz2",
        "7z",
        "cbz"
      ]
    },
    {
      "extension": ".xz",
      "mediaType": "application/x-xz",
      "family": null,
      "targets": [
        "zip",
        "tar",
        "tar.gz",
        "tar.bz2",
        "7z",
        "cbz"
      ]
    },
    {
      "extension": ".7z",
      "mediaType": "application/x-7z-compressed",
      "family": null,
      "targets": [
        "zip",
        "tar",
        "tar.gz",
        "tar.bz2",
        "cbz"
      ]
    },
    {
      "extension": ".iso",
      "mediaType": "application/x-iso9660-image",
      "family": null,
      "targets": [
        "zip",
        "tar",
        "tar.gz",
        "tar.bz2",
        "7z",
        "cbz"
      ]
    },
    {
      "extension": ".cbz",
      "mediaType": "application/vnd.comicbook+zip",
      "family": null,
      "targets": [
        "zip",
        "tar",
        "tar.gz",
        "tar.bz2",
        "7z"
      ]
    },
    {
      "extension": ".bmp",
      "mediaType": "image/bmp",
      "family": null,
      "targets": [
        "gif",
        "tiff",
        "webp",
        "avif",
        "ico",
        "png-image",
        "jpg-image"
      ]
    },
    {
      "extension": ".gif",
      "mediaType": "image/gif",
      "family": null,
      "targets": [
        "bmp",
        "tiff",
        "webp",
        "avif",
        "ico",
        "png-image",
        "jpg-image"
      ]
    },
    {
      "extension": ".tiff",
      "mediaType": "image/tiff",
      "family": null,
      "targets": [
        "bmp",
        "gif",
        "webp",
        "avif",
        "ico",
        "png-image",
        "jpg-image"
      ]
    },
    {
      "extension": ".webp",
      "mediaType": "image/webp",
      "family": null,
      "targets": [
        "bmp",
        "gif",
        "tiff",
        "avif",
        "ico",
        "png-image",
        "jpg-image"
      ]
    },
    {
      "extension": ".avif",
      "mediaType": "image/avif",
      "family": null,
      "targets": [
        "bmp",
        "gif",
        "tiff",
        "webp",
        "ico",
        "png-image",
        "jpg-image"
      ]
    },
    {
      "extension": ".ico",
      "mediaType": "image/x-icon",
      "family": null,
      "targets": [
        "bmp",
        "gif",
        "tiff",
        "webp",
        "avif",
        "png-image",
        "jpg-image"
      ]
    },
    {
      "extension": ".srt",
      "mediaType": "application/x-subrip",
      "family": null,
      "targets": [
        "vtt",
        "ass",
        "ssa"
      ]
    },
    {
      "extension": ".vtt",
      "mediaType": "text/vtt",
      "family": null,
      "targets": [
        "srt",
        "ass",
        "ssa"
      ]
    },
    {
      "extension": ".ass",
      "mediaType": "text/x-ass",
      "family": null,
      "targets": [
        "srt",
        "vtt",
        "ssa"
      ]
    },
    {
      "extension": ".ssa",
      "mediaType": "text/x-ssa",
      "family": null,
      "targets": [
        "srt",
        "vtt",
        "ass"
      ]
    },
    {
      "extension": ".tsv",
      "mediaType": "text/tab-separated-values",
      "family": null,
      "targets": [
        "csv",
        "json",
        "yaml",
        "jsonl"
      ]
    },
    {
      "extension": ".json",
      "mediaType": "application/json",
      "family": null,
      "targets": [
        "csv",
        "tsv",
        "yaml",
        "jsonl"
      ]
    },
    {
      "extension": ".yaml",
      "mediaType": "application/yaml",
      "family": null,
      "targets": [
        "csv",
        "tsv",
        "json",
        "jsonl"
      ]
    },
    {
      "extension": ".yml",
      "mediaType": "application/yaml",
      "family": null,
      "targets": [
        "csv",
        "tsv",
        "json",
        "jsonl"
      ]
    },
    {
      "extension": ".jsonl",
      "mediaType": "application/jsonl",
      "family": null,
      "targets": [
        "csv",
        "tsv",
        "json",
        "yaml"
      ]
    }
  ]
};
