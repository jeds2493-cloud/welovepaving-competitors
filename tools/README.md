# Legal modal content

The footer's three legal links open a modal instead of navigating away. The text
they show lives in `../legal/*.html` and is **a copy** — regenerate it whenever
Legal edits one of the live pages, or the landing will show stale terms.

## Why a copy instead of fetching the live page

The live pages are GenerateBlocks builds, not documents:

- The copy sits inside collapsed `.gb-accordion__content`. Injected into our
  modal without GB's own JS, it renders as headings that open nothing.
- `guarantees-and-warranty` is a full sales page — hero CTAs, spec tables,
  images, a PDF flipbook iframe — not a disclaimer.
- Headings are chosen for size, not structure: warranty clauses are `<h2>`,
  spec cells are `<h6>`.
- The fetch is cross-origin anywhere but production, so it can't be previewed.

`extract-legal.js` flattens all of that into clean, attribute-free fragments.

## Regenerating

1. Save each live page (Ctrl+S, "complete") into a folder.
2. Point `SRC` in `extract-legal.js` at it; `OUT` is already `../legal/`.
3. `npm install jsdom` (not vendored — this is a build-time tool only).
4. `node extract-legal.js` — prints a table of bytes, text length and leftovers.
5. `node verify-legal.js` — word-level diff against the source. Anything listed
   as "short" that is **not** a CTA or the page `<h1>` is prose you just dropped;
   fix the extractor rather than accepting it.

## What is intentionally dropped

Sales CTAs ("Request a Quote", "View Full Pledge"), decorative `01.`–`04.`
numbering (kept as list bullets), images, the PDF flipbook widget, and each
page's `<h1>` (the modal supplies its own title). The authoritative
"View Full Warranty (PDF)" link is deliberately kept.

## Gotcha

Terms numbers its real sections `1.` … `11.` unpadded, while the pledge numbers
decorative clauses `01.` … `04.` padded. The extractor keys on the zero-padding
to tell them apart — keying on any digit dissolves every Terms section title
into a one-item list.
