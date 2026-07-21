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

## What makes this one different

Desktop is a **horizontal** landing. The first three sections sit on one
viewport-tall track that scrolls sideways, over a single background image that
pans with it, and vertical scrolling is locked until the last panel hands off to
the rest of the page. Mobile drops all of that and stacks normally.

## Structure

```
index.html                 the landing
competitors-landing.css    self-contained styles, no build step
competitors-landing.js     horizontal track, card swap, modals, tracking
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
| P1 | Hero | horizontal panel 1; mobile gets its own portrait art and a scroll cue |
| P2 | What to compare | six folder-tab cards; desktop turns them into a 3D swap stack |
| P3 | The quality of our work | four self-performed services + four quality pillars |
| — | FAQ + lead form | vertical from here down |
| — | Footer | legal links open in modals, nothing leaves the landing |

## Interaction notes

- **Horizontal track** (≥901px): one panel per wheel gesture. Incrementing
  `scrollLeft` fights `scroll-snap-type: x mandatory`, so navigation is a snap to
  a panel index with a short lock, not a continuous scroll.
- **Scroll lock**: the page scrolls on `<html>`, not `<body>`, so the lock class
  goes on `document.documentElement`.
- **Card swap** (P2, desktop, motion-safe): a vanilla port of React Bits'
  `<CardSwap>`. JS only writes `--slot-t` / `--slot-z`; the CSS applies the
  transform *inside* the media query, so the breakpoint stays authoritative and
  no cleanup is needed below it. Wheel and tab clicks both drive it.
- **Request modal**: every CTA opens the same modal, which morphs out of the
  element that was pressed (FLIP). The page has exactly one lead form, so it is
  moved into the modal and put back on close rather than duplicated — a second
  embed would mean a second iframe and a second conversion tag.
- **Legal modals**: same component as the striping and concrete landings.

## Legal documents

`legal/*.html` are flattened local copies, not the live pages. Fetching
`welovepaving.com` directly fails twice over: it is cross-origin anywhere but
production, and those pages are GenerateBlocks builds whose text lives inside
collapsed accordions that would render here as headings that open nothing.

Regenerate them with `tools/extract-legal.js` whenever Legal edits a page. If a
fetch fails at runtime the modal falls back to the real link, which was never
removed from the `href`.

## Placeholders to replace before launch

- **Tracking phone number.** `(888) 273-0077` is the main line. Swap it for the
  comparison-campaign tracking number in the header, hero, sticky bar and footer.
- **Canonical / og:url.** Both point at
  `/lp/commercial-paving-comparison/`. Update if the final path differs.
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
