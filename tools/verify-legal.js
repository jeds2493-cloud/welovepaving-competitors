/* Multiset word diff: every word the source has that the extract does not.
   Catches real prose loss that the sentence-chunk diff blurred. */
const fs = require('fs');
const { JSDOM } = require('jsdom');

const PAIRS = [
  ['privacy-policy',       'Privacy Policy - WE LOVE PAVING.html'],
  ['terms-and-conditions', 'Terms and Conditions - WE LOVE PAVING.html'],
  ['panda-pledge',         'Guarantees and Warranty - WE LOVE PAVING.html'],
];
// Folder holding the saved live pages. No default: it is machine-specific, and
// a checked-in absolute path would only ever be right on one laptop.
const SRC = process.env.WLP_LEGAL_SRC || process.argv[2];
if (!SRC) {
  console.error('Usage: WLP_LEGAL_SRC=<folder with the saved pages> node verify-legal.js\n' +
                '   or: node verify-legal.js <folder with the saved pages>');
  process.exit(1);
}
const OUT = require('path').join(__dirname, '..', 'legal') + '/';

const bag = (t) => {
  const m = new Map();
  t.replace(/\s+/g, ' ').toLowerCase().match(/[\p{L}\p{N}''™$%.,–-]+/gu)?.forEach(w => {
    m.set(w, (m.get(w) || 0) + 1);
  });
  return m;
};

const srcDir = SRC.endsWith('/') || SRC.endsWith('\\') ? SRC : SRC + '/';
for (const [key, file] of PAIRS) {
  const srcDoc = new JSDOM(fs.readFileSync(srcDir + file, 'utf8')).window.document;
  const srcEl = srcDoc.querySelector('.entry-content');
  srcEl.querySelectorAll('script, style, svg, noscript').forEach(e => e.remove());

  const A = bag(srcEl.textContent);
  const B = bag(new JSDOM('<body>' + fs.readFileSync(OUT + key + '.html', 'utf8') + '</body>')
    .window.document.body.textContent);

  const lost = [];
  for (const [w, n] of A) {
    const have = B.get(w) || 0;
    if (have < n) lost.push(w + ' (x' + (n - have) + ')');
  }
  console.log('='.repeat(60));
  console.log(key, '| distinct source words:', A.size, '| words short:', lost.length);
  console.log('  ' + (lost.join('  ') || '(nothing lost)'));
}
