/**
 * A faithful copy of what the running service answers for `GET /formats`.
 *
 * This is test data, not application data. The app reads the real response at
 * runtime; this file exists so the tests can stand in for the service, and so
 * that a test can hand the app a *different* matrix and prove that nothing in
 * the app is hard-coded to this one.
 */
import type { FormatsResponse } from "@/lib/contract";

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
          "epub"
        ]
      },
      {
        "extension": ".docm",
        "mediaType": "application/vnd.ms-word.document.macroEnabled.12",
        "family": "writer",
        "targets": [
          "pdf",
          "odt",
          "txt",
          "html",
          "rtf",
          "epub"
        ]
      },
      {
        "extension": ".doc",
        "mediaType": "application/msword",
        "family": "writer",
        "targets": [
          "pdf",
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
          "docx"
        ]
      },
      {
        "extension": ".ods",
        "mediaType": "application/vnd.oasis.opendocument.spreadsheet",
        "family": "calc",
        "targets": [
          "pdf",
          "xlsx"
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
        "extension": ".csv",
        "mediaType": "text/csv",
        "family": "calc",
        "targets": [
          "xlsx",
          "ods",
          "pdf"
        ]
      },
      {
        "extension": ".txt",
        "mediaType": "text/plain",
        "family": "writer",
        "targets": [
          "pdf",
          "docx",
          "odt"
        ]
      },
      {
        "extension": ".html",
        "mediaType": "text/html",
        "family": "writer",
        "targets": [
          "pdf",
          "docx",
          "odt"
        ]
      },
      {
        "extension": ".htm",
        "mediaType": "text/html",
        "family": "writer",
        "targets": [
          "pdf",
          "docx",
          "odt"
        ]
      },
      {
        "extension": ".rtf",
        "mediaType": "application/rtf",
        "family": "writer",
        "targets": [
          "docx",
          "pdf",
          "odt"
        ]
      },
      {
        "extension": ".png",
        "mediaType": "image/png",
        "family": "draw",
        "targets": [
          "pdf"
        ]
      },
      {
        "extension": ".jpg",
        "mediaType": "image/jpeg",
        "family": "draw",
        "targets": [
          "pdf"
        ]
      },
      {
        "extension": ".jpeg",
        "mediaType": "image/jpeg",
        "family": "draw",
        "targets": [
          "pdf"
        ]
      }
    ]
  };
