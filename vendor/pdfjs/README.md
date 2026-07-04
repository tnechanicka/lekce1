# pdf.js (vendored)

Files `pdf.min.mjs` and `pdf.worker.min.mjs` are the built browser output of
[pdfjs-dist](https://www.npmjs.com/package/pdfjs-dist) v4.10.38 (Mozilla's
[pdf.js](https://github.com/mozilla/pdf.js) project), licensed under
Apache-2.0. Vendored here (instead of loaded from a CDN) so the app has no
runtime dependency on a third-party host.

Used by `pdf-import.js` to parse an uploaded Lidl flyer PDF into structured
data client-side — nothing is uploaded anywhere.

To update: `npm pack pdfjs-dist@<version>` and copy `build/pdf.min.mjs` and
`build/pdf.worker.min.mjs` from the extracted tarball over these files.
