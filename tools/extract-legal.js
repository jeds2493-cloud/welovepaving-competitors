/* Extracts the readable legal text out of the saved WordPress pages and writes
   clean semantic fragments the landing can open in a modal.

   The source pages are GenerateBlocks builds, not documents: the copy lives
   inside collapsed .gb-accordion__content, wrapped in ~200 layout divs, next to
   sales CTAs and a PDF iframe. Fetching them live would inject accordions with
   no JS behind them, i.e. dead headings. So we flatten instead of embed. */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

// Folder holding the saved live pages. No default: it is machine-specific, and
// a checked-in absolute path would only ever be right on one laptop.
const SRC_ARG = process.env.WLP_LEGAL_SRC || process.argv[2];
if (!SRC_ARG) {
  console.error('Usage: WLP_LEGAL_SRC=<folder with the saved pages> node extract-legal.js\n' +
                '   or: node extract-legal.js <folder with the saved pages>');
  process.exit(1);
}
const SRC = SRC_ARG.endsWith('/') || SRC_ARG.endsWith('\\') ? SRC_ARG : SRC_ARG + '/';
const OUT = path.join(__dirname, '..', 'legal') + '/';

const DOCS = [
  { key: 'privacy-policy',         file: 'Privacy Policy - WE LOVE PAVING.html',
    url: 'https://www.welovepaving.com/privacy-policy/' },
  { key: 'terms-and-conditions',   file: 'Terms and Conditions - WE LOVE PAVING.html',
    url: 'https://www.welovepaving.com/terms-and-conditions/' },
  { key: 'panda-pledge',           file: 'Guarantees and Warranty - WE LOVE PAVING.html',
    url: 'https://www.welovepaving.com/guarantees-and-warranty/' },
];

// Anything that renders as a sales control rather than as the document's prose.
const CTA_TEXT = /^(request|view full pledge|get |start |call |book |schedule )/i;

const KEEP = new Set(['H1','H2','H3','H4','H5','H6','P','UL','OL','LI','STRONG','EM','A','BR']);

/* GenerateBlocks picks heading tags for their looks, not for structure, so the
   source hierarchy is unusable as-is: warranty list items are <h2>, and spec
   cells like "Max Load: 35,000 lbs" are <h6>. Rebuild real semantics. */
function normalizeHeadings(root, d) {
  // The page <h1> duplicates the modal's own title bar.
  root.querySelectorAll('h1').forEach(el => el.remove());

  /* "01. Potholes and base failure…" — clauses GB numbered decoratively and
     marked as headings. The zero-padding is the tell: Terms numbers its real
     sections "1." … "11." unpadded, so keying on any digit would dissolve every
     section title in that document into a one-item list. Padded ⇒ decorative. */
  const numbered = el => /^\s*0\d\.\s+\S/.test(el.textContent || '');
  [...root.querySelectorAll('h2, h3, h4')].forEach(el => {
    // parentNode, not isConnected: this tree is a detached clone, so every node
    // in it reports isConnected === false and the guard would eat every match.
    if (!el.parentNode || !numbered(el)) return;
    const items = [];
    let cur = el;
    while (cur && /^H[2-4]$/.test(cur.tagName || '') && numbered(cur)) {
      items.push(cur);
      cur = cur.nextElementSibling;
    }
    if (items.length < 2) return; // a lone "01." is a heading, not a list
    const ul = d.createElement('ul');
    items.forEach(h => {
      const li = d.createElement('li');
      li.textContent = h.textContent.replace(/^\s*0\d\.\s+/, '').replace(/\s+/g, ' ').trim();
      ul.appendChild(li);
    });
    items[0].before(ul);
    items.forEach(h => h.remove());
  });

  // Spec-table cells: h6 carries no section meaning here.
  root.querySelectorAll('h6').forEach(el => {
    const p = d.createElement('p');
    const s = d.createElement('strong');
    s.textContent = el.textContent.replace(/\s+/g, ' ').trim();
    p.appendChild(s);
    el.replaceWith(p);
  });

  /* Each document starts at a different level (privacy h3, terms h4, pledge h2)
     because GB chose tags for size. The modal supplies its own <h2> title, so
     rebase every document's top level to h3 and keep the relative depth. */
  const levels = [...root.querySelectorAll('h2,h3,h4,h5,h6')]
    .map(el => +el.tagName[1]);
  if (levels.length) {
    const shift = 3 - Math.min(...levels);
    if (shift !== 0) {
      [...root.querySelectorAll('h2,h3,h4,h5,h6')]
        // Renaming can only collide downward, so walk deepest-first.
        .sort((a, b) => (shift > 0 ? +b.tagName[1] - +a.tagName[1] : +a.tagName[1] - +b.tagName[1]))
        .forEach(el => {
          const lvl = Math.min(6, Math.max(3, +el.tagName[1] + shift));
          const h = d.createElement('h' + lvl);
          while (el.firstChild) h.appendChild(el.firstChild);
          el.replaceWith(h);
        });
    }
  }
}

function extract(dom, key) {
  const d = dom.window.document;
  const src = d.querySelector('.entry-content');
  if (!src) throw new Error(key + ': no .entry-content');

  // Work on a clone so we can mutate freely.
  const root = src.cloneNode(true);

  // 1. Drop everything non-prose outright.
  root.querySelectorAll(
    'script, style, link, iframe, noscript, form, nav, header, footer, svg, button, img, figure, video, picture'
  ).forEach(el => el.remove());

  // 2. Flatten GB accordions: the toggle is the section title, the content is
  //    the body. Without GB's JS these would open to nothing.
  root.querySelectorAll('.gb-accordion__item').forEach(item => {
    const toggle = item.querySelector('.gb-accordion__toggle');
    const content = item.querySelector('.gb-accordion__content');
    const frag = d.createDocumentFragment();
    if (toggle) {
      const h = d.createElement('h3');
      h.textContent = toggle.textContent.replace(/\s+/g, ' ').trim();
      frag.appendChild(h);
    }
    if (content) while (content.firstChild) frag.appendChild(content.firstChild);
    item.replaceWith(frag);
  });

  // 3. Kill sales links; keep informational ones.
  root.querySelectorAll('a').forEach(a => {
    const txt = a.textContent.replace(/\s+/g, ' ').trim();
    const href = a.getAttribute('href') || '';
    if (!txt || CTA_TEXT.test(txt) || /^\d{2}$/.test(txt)) { a.remove(); return; }
    // Resolve relative + on-page links against the live document.
    if (href.startsWith('/') || href.startsWith('#') || href === '') {
      a.setAttribute('href', new URL(href || '#', 'https://www.welovepaving.com/').href);
    }
    if (/^https?:/.test(a.getAttribute('href'))) {
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener');
    }
    [...a.attributes].forEach(at => {
      if (!['href','target','rel'].includes(at.name)) a.removeAttribute(at.name);
    });
  });

  // 4. Unwrap layout divs/spans, keeping only prose elements.
  const unwrap = (el) => {
    for (const child of [...el.children]) unwrap(child);
    if (!KEEP.has(el.tagName) && el !== root) {
      el.replaceWith(...el.childNodes);
    }
  };
  unwrap(root);

  // 5. Rebuild heading semantics — only now are the headings actually siblings.
  //    Before the unwrap each one sat in its own GB div, so a run of numbered
  //    clauses had no nextElementSibling to walk.
  normalizeHeadings(root, d);

  // 6. Strip every leftover attribute (GB class soup would style nothing here).
  root.querySelectorAll('*').forEach(el => {
    if (el.tagName === 'A') return;
    [...el.attributes].forEach(at => el.removeAttribute(at.name));
  });

  // 7. Drop empties and tidy stray breaks left where blocks were removed.
  root.querySelectorAll('p, li, h2, h3, h4, h5, h6, strong, em').forEach(el => {
    if (!el.textContent.replace(/\s+/g, ' ').trim()) el.remove();
  });
  root.querySelectorAll('p').forEach(p => {
    while (p.firstChild && p.firstChild.nodeName === 'BR') p.firstChild.remove();
    while (p.lastChild && p.lastChild.nodeName === 'BR') p.lastChild.remove();
  });
  // Bare text left floating between blocks reads as a broken paragraph.
  [...root.childNodes].forEach(n => {
    if (n.nodeType === 3 && n.textContent.trim()) {
      const p = d.createElement('p');
      p.textContent = n.textContent.replace(/\s+/g, ' ').trim();
      n.replaceWith(p);
    } else if (n.nodeType === 3) {
      n.remove();
    }
  });

  let html = root.innerHTML
    .replace(/\s+/g, ' ')
    .replace(/>\s+</g, '>\n<')
    .replace(/<(p|h2|h3|h4|h5|h6|ul|ol|li)>/g, '\n<$1>')
    .replace(/\n{2,}/g, '\n')
    .trim();

  return html;
}

fs.mkdirSync(OUT, { recursive: true });
const report = [];
for (const doc of DOCS) {
  const dom = new JSDOM(fs.readFileSync(SRC + doc.file, 'utf8'));
  const html = extract(dom, doc.key);
  const check = new JSDOM('<body>' + html + '</body>');
  const text = check.window.document.body.textContent.replace(/\s+/g, ' ').trim();
  fs.writeFileSync(OUT + doc.key + '.html', html + '\n', 'utf8');
  report.push({
    key: doc.key,
    bytes: html.length,
    textChars: text.length,
    headings: check.window.document.querySelectorAll('h2,h3,h4,h5,h6').length,
    paras: check.window.document.querySelectorAll('p').length,
    links: [...check.window.document.querySelectorAll('a')].map(a => a.getAttribute('href')),
    leftoverDivs: check.window.document.querySelectorAll('div, span, img, svg, button, iframe').length,
  });
}
console.table(report.map(r => ({ ...r, links: r.links.length })));
console.log(JSON.stringify(report.map(r => ({ key: r.key, links: r.links })), null, 2));
