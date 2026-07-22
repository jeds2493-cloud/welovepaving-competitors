# We Love Paving · Competitor Comparison (SEM landing)

Standalone, static SEM landing page aimed at people comparing commercial paving
contractors in Northern California. It sells on what sits behind the quote:
written protection, scope clarity, project support and the four trades WLP
self-performs.

**This is the production repo.** The landing ships exactly as it is here, with
this code. It is not rebuilt in a page builder: the HTML, CSS and JS in this repo
are what goes live. Deployment goes through WordPress, but the page is not
reconstructed with GeneratePress or GenerateBlocks.

It lives in its own repo, separate from the main site, so it can be published and
updated without touching anything else.

## Structure

```
index.html                 the landing
competitors-landing.css    self-contained styles, no build step
competitors-landing.js     reveals, modals, parallax, tracking
legal/                     flattened copies of the 3 legal pages, opened in modals
images/                    only the assets this page references
tools/                     build-time only (excluded from deploy via .vercelignore)
vercel.json                security headers (see the caveat below)
```

No build, no dependencies: it is served as-is.

## Running locally

Any static server from the repo root:

```
npx serve .
```

Note: the lead form is a cross-origin iframe from `quote.welovepaving.com`, whose
CSP only allows `welovepaving` domains and `*.vercel.app`. On `localhost` it
renders blank. **This is expected, not a bug**: it loads correctly once deployed
to a welovepaving domain.

## Sections

| # | Section | Notes |
|---|---------|-------|
| P1 | Hero | one screen tall; mobile gets its own portrait art and a scroll cue |
| P2 | The traps | six folder-tab cards, each a trap then what WLP does, all on one screen |
| P3 | The quality of our work | four self-performed services + four quality pillars |
| — | Proposal system | one band, six steps, what they send against what we send |
| — | Compare + lead form | WLP-vs-typical comparison table beside the form |
| — | Proposal audit | the last off ramp: have us read the proposal they already hold |
| — | FAQ | its own section above the footer |
| — | Footer | legal links open in modals, nothing leaves the landing |

## Interaction notes

- **Card reveal** (P2): the six cards slide in from alternating sides as they
  reach the viewport, on the shared elastic curve. The observer disconnects on
  the first hit — it is an entrance, not a toggle — and the whole thing is gated
  on `prefers-reduced-motion: no-preference`.
- **Fixed chrome** (≤900px): the utility bar and header are `position: fixed`,
  not sticky, because both live inside `.hero-zone` and a sticky element stops
  sticking once its own container scrolls past. The sections carry a
  `scroll-margin-top` of the chrome's height so `scrollIntoView` stops at its
  edge rather than under it.
- **`overflow-x: clip`, not `hidden`**, on `body`: `hidden` computes `overflow-y`
  to `auto` and makes body its own scroll container, which throws
  `scrollIntoView` off by exactly the scroll-margin.
- **Viewport units**: `svh`, not `dvh`. `dvh` tracks the mobile browser toolbars,
  so every time Chrome hid or showed its bottom bar the layout resized and the
  page jumped.
- **Request modal**: every CTA opens the same modal, which morphs out of the
  element that was pressed (FLIP). The page has exactly one lead form, so it is
  moved into the modal and put back on close rather than duplicated — a second
  embed would mean a second iframe and a second conversion tag.
- **Legal modals**: same component as the striping and concrete landings.
- **One screen for P2**: the six cards have to fit under the chrome without
  scrolling. Their rows are sized by content rather than by an even split of the
  leftover height, which packed every card to its last pixel; below 900px of
  viewport height a separate step drops the type and spacing a notch, because two
  rows of this much copy plus the heading do not fit there at the full sizes.
- **The 15-year term never appears without its conditions.** The hero headline,
  the hero bullets, the first P2 card, the comparison table and the transfer line
  in the proposal strip all carry the same `.terms-ref` asterisk, which opens the
  Panda Pledge disclaimer. Keep that pairing on any new copy that states the term.
- **Nothing scrolls sideways.** The root clips its horizontal axis and refuses
  horizontal overscroll, and `.panel` clips its own, because the P2 cards enter
  translated 48px and that offset would otherwise count as document width.

## Performance

The form embed is **not** loaded on page load. It pulls ~1.3MB — a `panda.png`
alone — plus a third-party analytics script, which on a throttled phone was more
than half the page's bytes competing with the hero for bandwidth. It is fetched at
the first sign someone is heading for the form: any real interaction, the lead
card coming within a screen of the viewport, or a CTA opening the modal. The
inline loader exposes `window.wlpLoadForms()` for that last case.

Images are sized to what they are actually displayed at, not to the source. If
you regenerate one, keep the `width`/`height` attributes in step — they reserve
the box and stop the layout shifting.

The Google Fonts request only asks for the weights the CSS uses. Adding a
`font-weight` that is not in that list gets a synthesised face, not a real one.

## Legal documents

`legal/*.html` are flattened local copies, not the live pages. Fetching
`welovepaving.com` directly fails twice over: it is cross-origin anywhere but
production, and those pages are GenerateBlocks builds whose text lives inside
collapsed accordions that would render here as headings that open nothing.

Regenerate them with `tools/extract-legal.js` whenever Legal edits a page. If a
fetch fails at runtime the modal falls back to the real link, which was never
removed from the `href`.

## Copy conventions

- **"Paving Advisor"**, never "project advisor" or "sales rep".
- **No em dashes** anywhere in the landing copy.
- Claims about competitors are written about the typical pattern, never about a
  named company, and stay on what the visitor will experience rather than on any
  one contractor's conduct.

## Placeholders to replace before launch

- **Tracking phone number.** `(888) 273-0077` is the main line. Swap it for the
  comparison-campaign tracking number in the header, hero, sticky bar and footer.
- **Canonical / og:url.** Both point at
  `/lp/commercial-paving-comparison/`. Update if the final path differs.
- **Proposal strip illustrations.** The six drawings in that band are inline SVG,
  not captures of a real proposal, so nothing there states a price, a quantity or
  a client. If real screenshots are cleared for use, an `<img>` drops into
  `.proposal-media` and nothing else changes.
- **The "only company" claim.** The hero headline states an absolute: the only
  company with a 15-year warranty. Everywhere else the page says "up to 15 years"
  on qualifying work. Legal should sign off on the exclusivity claim before this
  runs as paid traffic.
- **`og:image`** points at `https://www.welovepaving.com/images/hero-bg.webp`,
  which has to exist at that URL for link previews to work.

## SEO

`<meta name="robots" content="noindex, follow">` is set on purpose: this is a
paid-traffic landing and it should not compete with the site's own pages. If it
is published through WordPress, set the same value in Rank Math — the plugin
writes its own robots tag and would otherwise override this one.

## Security

Nothing in this repo is secret, and it is meant to stay that way. What is
enforced:

- **No credentials, tokens or keys**, in the tree or in the history. There is
  nothing to leak: the page has no backend, no build step and no environment
  variables.
- **No third-party JavaScript** other than the WLP form loader
  (`quote.welovepaving.com/loader.js`) and Google Fonts stylesheets. No tag
  manager, no analytics vendor, no pixel library. Conversion tracking rides
  inside the form embed.
- **No PII in the repo.** The only contact data is corporate: the public phone
  number and the CSLB licence.
- **`innerHTML` is fed only by `legal/`**, and that markup is stripped of
  `script`, `style`, `link`, `iframe`, `form`, `noscript`, `object` and `embed`
  before it reaches the DOM.
- **No `target="_blank"` in the landing itself.** The footer links open modals so
  the visitor never leaves. The few in `legal/` all carry `rel="noopener"`.
- **`<meta name="referrer" content="strict-origin-when-cross-origin">`** so full
  URLs with campaign parameters are not handed to third parties.
- **Response headers** are declared in `vercel.json`:
  `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`,
  `Permissions-Policy` and HSTS.

### Caveat on the headers

`vercel.json` only applies on Vercel. **If this is served from WordPress, those
five headers have to be set again at the edge** (a single Cloudflare Transform
Rule covers the site). The page works either way — they are hardening, not
requirements — but without them the landing inherits whatever the host sends.

HSTS is set without `includeSubDomains` on purpose: it is scoped to the host that
serves this page and must not be widened without checking every subdomain first.
