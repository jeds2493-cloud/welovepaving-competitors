/* ============================================================
   WLP — Competitor Comparison landing
   Horizontal panel navigation: vertical wheel is translated to sideways
   scroll and arrow keys move between panels. On mobile or under
   reduced motion the layout degrades to a normal vertical page and this stays
   inert.
   ============================================================ */

window.dataLayer = window.dataLayer || [];
const track = (event, params = {}) => window.dataLayer.push({ event, ...params });

const hTrack = document.querySelector('[data-h-track]');
const horizontalMQ = window.matchMedia('(min-width: 901px)');
const reducedMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
const isHorizontal = () => horizontalMQ.matches && !reducedMQ.matches;

const panels = () => [...hTrack.querySelectorAll('.panel')];
const panelIndex = () => Math.round(hTrack.scrollLeft / hTrack.clientWidth);

function goToPanel(i) {
  const max = panels().length - 1;
  const clamped = Math.min(Math.max(i, 0), max);
  hTrack.scrollTo({ left: clamped * hTrack.clientWidth, behavior: reducedMQ.matches ? 'auto' : 'smooth' });
}

/* ---------- Wheel -> advance one panel ----------
   Incremental scrollLeft fights `scroll-snap-type: x mandatory` (small deltas snap
   straight back), so a wheel gesture instead steps to the next/previous panel. A
   short lock keeps a single trackpad flick from skipping several panels. */
if (hTrack) {
  let wheelLock = false;
  hTrack.addEventListener('wheel', (e) => {
    if (!isHorizontal()) return;
    // Only capture while the hero zone fills the viewport (page scrolled to top).
    if (window.scrollY > 1) return;
    const delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    if (Math.abs(delta) < 4) return;
    const i = panelIndex();
    const last = panels().length - 1;
    // At the last panel pushing forward: unlock and drop into the vertical FAQ.
    if (delta > 0 && i >= last) {
      e.preventDefault();
      document.documentElement.classList.remove('h-locked');
      if (postHero) postHero.scrollIntoView({ behavior: reducedMQ.matches ? 'auto' : 'smooth' });
      return;
    }
    if (delta < 0 && i <= 0) return;   // nothing before the first panel
    e.preventDefault();
    if (wheelLock) return;
    wheelLock = true;
    goToPanel(i + (delta > 0 ? 1 : -1));
    setTimeout(() => { wheelLock = false; }, 620);
  }, { passive: false });
}

/* ---------- Keyboard arrows ---------- */
document.addEventListener('keydown', (e) => {
  if (!isHorizontal()) return;
  if (window.scrollY > 1) return;   // only while the hero zone is in view
  const tag = (e.target.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
  if (e.key === 'ArrowRight' || e.key === 'PageDown') { goToPanel(panelIndex() + 1); e.preventDefault(); }
  if (e.key === 'ArrowLeft' || e.key === 'PageUp') { goToPanel(panelIndex() - 1); e.preventDefault(); }
});

/* ---------- Utility-bar marquee (mobile) ----------
   The four badges do not fit one phone-width row, so on mobile the bar scrolls
   them past instead of wrapping to a 2x2 block. Duplicating the list gives the
   CSS a seamless loop: the track holds two identical copies and slides left by
   exactly one copy's width, so the second takes the first's place with no jump.
   On desktop the track is display:contents and the clone is hidden, so the bar
   stays the centred row it always was. */
const utilityEl = document.querySelector('.utility-bar');
if (utilityEl) {
  const list = utilityEl.querySelector('ul');
  if (list) {
    const utilTrack = document.createElement('div');
    utilTrack.className = 'util-track';
    const clone = list.cloneNode(true);
    clone.classList.add('util-clone');
    clone.setAttribute('aria-hidden', 'true');   // the copy is decorative
    list.replaceWith(utilTrack);
    utilTrack.append(list, clone);
  }
}

/* ---------- Publish the chrome's real height ----------
   The mobile hero art starts below the utility bar and header (see .scene-bg in
   the mobile block), so those two heights have to be measured, not guessed: the
   utility bar is one row on mobile and two on desktop, and the header grows with
   the logo. Both reads happen before either write, so this never forces a reflow
   between them. */
const headerEl = document.querySelector('.site-header');
if (headerEl || utilityEl) {
  const publishChromeHeights = () => {
    const uh = utilityEl ? utilityEl.offsetHeight : 0;
    const hh = headerEl ? headerEl.offsetHeight : 0;
    const root = document.documentElement.style;
    root.setProperty('--utility-h', uh + 'px');
    root.setProperty('--header-h', hh + 'px');
  };
  publishChromeHeights();
  let queued = false;
  window.addEventListener('resize', () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; publishChromeHeights(); });
  });
}

/* ---------- Shared scene pan ----------
   One background image spans the whole track. As the track scrolls right, the
   scene pans left (by its horizontal slack) so the panda travels from the right
   of the hero toward the left on later panels — a single seamless backdrop. */
const stage = document.querySelector('.stage');
const sceneImg = document.querySelector('[data-scene] img');
const postHero = document.querySelector('.post-hero');

/* ---------- Vertical scroll lock over the three horizontal sections ----------
   While the horizontal region is on screen the body is locked (no vertical scroll)
   so only the track moves sideways. The lock drops when the reader pushes past the
   last panel, and re-engages when they scroll back to the very top. */
const lockV = (on) => document.documentElement.classList.toggle('h-locked', on);
function refreshLock() {
  if (!isHorizontal()) { lockV(false); return; }
  if (window.scrollY <= 1) lockV(true);
}
/* Offset the post-hero backdrop by the panel height so its asphalt continues from
   exactly where P3's leaves off — one unbroken image across the handoff. */
function alignPostHeroBg() {
  if (!postHero || !stage) return;
  if (isHorizontal()) postHero.style.setProperty('--posthero-bg-y', (-Math.round(stage.clientHeight)) + 'px');
  else postHero.style.removeProperty('--posthero-bg-y');
}

function updateScene() {
  if (!sceneImg || !hTrack || !stage) return;
  if (!isHorizontal()) { sceneImg.style.removeProperty('--scene-x'); return; }
  const slack = sceneImg.offsetWidth - stage.clientWidth;      // pannable width (~50%)
  // Complete the pan across the first panel width (hero -> comparison) and hold it
  // there; later panels are opaque, so the scene stays put behind them.
  const cw = hTrack.clientWidth;
  const frac = cw > 0 ? Math.min(Math.max(hTrack.scrollLeft / cw, 0), 1) : 0;
  sceneImg.style.setProperty('--scene-x', (-frac * slack).toFixed(1) + 'px');
}

/* ---------- Chrome state: reveal the header CTA past the hero ----------
   The header's "Request a Project Review" button is hidden on the hero and slides
   in once the user reaches the second panel (horizontal) or scrolls the hero mostly
   out of view (vertical). */
const heroPanel = document.querySelector('.panel--hero');
function updateChrome() {
  let past = false;
  if (isHorizontal()) {
    past = hTrack.scrollLeft > hTrack.clientWidth * 0.5;
  } else if (heroPanel) {
    past = heroPanel.getBoundingClientRect().bottom < window.innerHeight * 0.5;
  }
  document.body.classList.toggle('past-hero', past);
}

if (hTrack) {
  let raf = 0;
  hTrack.addEventListener('scroll', () => {
    if (raf) return;
    raf = requestAnimationFrame(() => { updateScene(); updateChrome(); raf = 0; });
  }, { passive: true });
}
window.addEventListener('scroll', () => {
  updateChrome();                                        // vertical (mobile) mode
  if (isHorizontal() && window.scrollY <= 1) lockV(true);  // re-lock at the top
}, { passive: true });

/* ---------- The handoff band is all-or-nothing ----------
   The hero zone is one viewport tall and the vertical page starts right under it,
   so anywhere between scrollY 0 and the zone's height you are looking at half of
   each. Coming back up from the last section it was easy to stop right there and
   see the bottom of P3 stacked on the top of the FAQ. This turns that band into a
   gate: a gesture inside it commits to whichever side you were heading for. */
const heroZone = document.querySelector('.hero-zone');
if (heroZone && postHero) {
  const bandTop = () => 1;
  const bandBottom = () => heroZone.offsetHeight - 1;
  let settling = false;

  const settle = (toTop) => {
    if (settling) return;
    settling = true;
    window.scrollTo({
      top: toTop ? 0 : heroZone.offsetHeight,
      behavior: reducedMQ.matches ? 'auto' : 'smooth',
    });
    // Landing at 0 re-locks the horizontal track through the scroll listener above.
    setTimeout(() => { settling = false; }, 600);
  };

  // A modal owns the scroll while it is open; the band must not fight it.
  const modalOpen = () =>
    document.documentElement.classList.contains('svc-open') ||
    !!document.querySelector('dialog[open]');

  const inBand = () =>
    isHorizontal() && !modalOpen() &&
    window.scrollY > bandTop() && window.scrollY < bandBottom();

  window.addEventListener('wheel', (e) => {
    if (!inBand()) return;
    const d = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    if (Math.abs(d) < 4) return;
    e.preventDefault();
    settle(d < 0);
  }, { passive: false });

  /* Touch and keyboard end up in the band too, and they never fire wheel. There
     is no gesture direction to read once it is over, so this settles to whichever
     side is closer. */
  let idle = 0;
  window.addEventListener('scroll', () => {
    if (settling || !inBand()) return;
    clearTimeout(idle);
    idle = setTimeout(() => {
      if (!inBand()) return;
      settle(window.scrollY < heroZone.offsetHeight / 2);
    }, 140);
  }, { passive: true });
}
window.addEventListener('resize', () => { updateScene(); updateChrome(); alignPostHeroBg(); refreshLock(); });
horizontalMQ.addEventListener('change', () => { updateScene(); updateChrome(); alignPostHeroBg(); refreshLock(); });
updateScene();
updateChrome();
alignPostHeroBg();
refreshLock();

/* ---------- Scroll parallax on the stacked hero (mobile) ----------
   The scene layer is fixed, so by default it does not move at all while the copy
   scrolls over it: the two travel at 0 and 1, which reads as a static backdrop.
   Drifting it up at a fraction of the scroll puts a real speed difference between
   the art and the text. It is clamped to the hero's height so the image settles
   instead of creeping through the rest of the page. */
const SCENE_PARALLAX = 0.32;
if (sceneImg && heroPanel) {
  let sceneRaf = 0;
  const paintSceneY = () => {
    if (isHorizontal()) { sceneImg.style.removeProperty('--scene-y'); return; }
    const limit = heroPanel.offsetHeight;
    const y = Math.min(Math.max(window.scrollY, 0), limit);
    sceneImg.style.setProperty('--scene-y', (-y * SCENE_PARALLAX).toFixed(1) + 'px');
  };
  window.addEventListener('scroll', () => {
    if (sceneRaf) return;
    sceneRaf = requestAnimationFrame(() => { sceneRaf = 0; paintSceneY(); });
  }, { passive: true });
  horizontalMQ.addEventListener('change', paintSceneY);
  paintSceneY();
}

/* ---------- One-time view event per [data-view] panel ----------
   Fires the panel's analytics event the first time it's at least half in view
   (works in both horizontal and vertical/stacked modes via the viewport root). */
document.querySelectorAll('[data-view]').forEach((el) => {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting && en.intersectionRatio >= 0.5) {
        track(el.dataset.view);
        io.disconnect();
      }
    });
  }, { threshold: 0.5 });
  io.observe(el);
});

/* ---------- Hero asterisk -> the Panda Pledge modal ----------
   It used to scroll to a footer paragraph; the disclaimer is a modal now, so the
   asterisk just clicks that link and the user never leaves the panel. */
document.querySelectorAll('.terms-ref').forEach((el) => {
  el.addEventListener('click', (e) => {
    const link = document.getElementById('pledge-terms');
    if (!link) return;
    e.preventDefault();
    link.click();
  });
});

/* ---------- FAQ accordion ---------- */
document.querySelectorAll('.faq-q').forEach((btn) => {
  btn.addEventListener('click', () => {
    const panel = document.getElementById(btn.getAttribute('aria-controls'));
    const open = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!open));
    if (panel) panel.hidden = open;
    if (!open) track('faq_open', { question: btn.textContent.trim().slice(0, 80) });
  });
});

/* ---------- "Keep scrolling" cue -> next panel, or out to the vertical page ----------
   It now lives on the LAST horizontal panel, so the normal case is the handoff:
   release the lock and drop into the post-hero section, same as the wheel does. */
document.querySelectorAll('[data-goto-next]').forEach((el) => {
  el.addEventListener('click', () => {
    const smooth = reducedMQ.matches ? 'auto' : 'smooth';
    const panel = el.closest('.panel');
    if (!isHorizontal()) {
      // Stacked: whatever is next in the flow, which for the hero cue is P2.
      const next = panel?.nextElementSibling || postHero;
      if (next) next.scrollIntoView({ behavior: smooth, block: 'start' });
    } else if (panelIndex() < panels().length - 1) {
      goToPanel(panelIndex() + 1);
    } else {
      document.documentElement.classList.remove('h-locked');
      if (postHero) postHero.scrollIntoView({ behavior: smooth });
    }
    track('goto_next', { source: panel?.dataset.view || 'hero' });
  });
});

/* ---------- Click to call ---------- */
document.querySelectorAll('[data-track-call]').forEach((link) => {
  link.addEventListener('click', () => track('click_to_call', { link_location: link.dataset.trackCall }));
});

/* ---------- Legal modals ----------
   Ported from the striping landing. Reads a flattened copy of each document from
   legal/, not the live page: fetching welovepaving.com fails twice over, being
   cross-origin anywhere but production, and those pages are GenerateBlocks builds
   whose text lives inside collapsed accordions that would render here as headings
   that open nothing. The copies come from tools/extract-legal.js and have to be
   regenerated when Legal edits a page. Any failure falls back to the real link,
   which was never removed from the href. */
const legalModal = document.getElementById('legalModal');
if (legalModal && typeof legalModal.showModal === 'function') {
  const legalTitle = document.getElementById('legalTitle');
  const legalBody = document.getElementById('legalBody');
  const legalCache = new Map();

  const showFallback = (href) => {
    legalBody.innerHTML =
      '<p>This document could not be loaded here. ' +
      '<a href="' + href + '" target="_blank" rel="noopener">Open it in a new tab</a>.</p>';
  };

  const render = (html) => {
    legalBody.innerHTML = html;
    legalBody.scrollTop = 0;
    legalBody.focus();
  };

  document.querySelectorAll('[data-legal]').forEach((link) => {
    link.addEventListener('click', async (e) => {
      e.preventDefault();
      const src = link.dataset.legalSrc;
      legalTitle.textContent = link.dataset.legal;
      legalModal.showModal();
      track('legal_open', { document: link.dataset.legal });

      // Reopening a document shouldn't flash a loading state at a cached hit.
      if (legalCache.has(src)) { render(legalCache.get(src)); return; }
      legalBody.innerHTML = '<p class="legal-loading">Loading…</p>';

      try {
        if (!src) throw new Error('no data-legal-src');
        const res = await fetch(src);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
        // Pre-flattened, but still untrusted markup as far as this page is
        // concerned — strip anything executable before it reaches the DOM.
        doc.body.querySelectorAll('script, style, link, iframe, form, noscript, object, embed')
          .forEach((el) => el.remove());
        if (!doc.body.textContent.trim()) throw new Error('empty document');
        // Guard against a stale response landing after the user moved on.
        if (legalTitle.textContent !== link.dataset.legal) return;
        legalCache.set(src, doc.body.innerHTML);
        render(doc.body.innerHTML);
      } catch (err) {
        showFallback(link.href);
      }
    });
  });

  legalModal.querySelector('.legal-close').addEventListener('click', () => legalModal.close());
  legalModal.addEventListener('click', (e) => { if (e.target === legalModal) legalModal.close(); });
  legalModal.addEventListener('close', () => { legalBody.innerHTML = ''; });
}

/* ---------- Scrolling browser-tab title ---------- */
if (!reducedMQ.matches) {
  const marqueeTitle = document.title + '   •   ';
  let titlePos = 0;
  setInterval(() => {
    titlePos = (titlePos + 1) % marqueeTitle.length;
    document.title = marqueeTitle.slice(titlePos) + marqueeTitle.slice(0, titlePos);
  }, 280);
}

/* ---------- Light scene parallax on pointer (desktop pointer only) ----------
   Drifts the shared scene a few pixels opposite the cursor (the CSS folds --px/--py
   into the scene's transform alongside the scroll pan, and nudges the hero copy the
   other way). Set on .stage so both the scene image and the copy inherit it. */
const fineMQ = window.matchMedia('(hover: hover) and (pointer: fine)');
if (stage && fineMQ.matches && !reducedMQ.matches) {
  stage.addEventListener('pointermove', (e) => {
    const r = stage.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width - 0.5;   // -0.5..0.5
    const ny = (e.clientY - r.top) / r.height - 0.5;
    stage.style.setProperty('--px', (nx * -22).toFixed(1) + 'px');
    stage.style.setProperty('--py', (ny * -16).toFixed(1) + 'px');
  });
  stage.addEventListener('pointerleave', () => {
    stage.style.setProperty('--px', '0px');
    stage.style.setProperty('--py', '0px');
  });
}

/* ---------- Border glow on the P2 comparison cards ----------
   Same effect as the other landings' Panda Pledge cards (React Bits <BorderGlow>):
   pointer proximity to the nearest edge + angle around the card centre drive the
   CSS glow layers. .edge-light (the outer glow) is injected here, so with JS off
   or on touch the cards stay plain. */
if (fineMQ.matches && !reducedMQ.matches) {
  document.querySelectorAll('.glow-card').forEach((card) => {
    if (!card.querySelector('.edge-light')) {
      const layer = document.createElement('span');
      layer.className = 'edge-light';
      layer.setAttribute('aria-hidden', 'true');
      card.prepend(layer);
    }
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const cx = r.width / 2, cy = r.height / 2;
      const dx = (e.clientX - r.left) - cx;
      const dy = (e.clientY - r.top) - cy;
      // Edge proximity: 0 at centre, 1 at the nearest edge.
      const kx = dx !== 0 ? cx / Math.abs(dx) : Infinity;
      const ky = dy !== 0 ? cy / Math.abs(dy) : Infinity;
      const edge = Math.min(Math.max(1 / Math.min(kx, ky), 0), 1);
      let deg = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
      if (deg < 0) deg += 360;
      card.style.setProperty('--edge-proximity', (edge * 100).toFixed(2));
      card.style.setProperty('--cursor-angle', deg.toFixed(2) + 'deg');
    });
    card.addEventListener('pointerleave', () => {
      card.style.setProperty('--edge-proximity', '0');
    });
  });
}

/* ---------- Service card -> morphing request modal ----------
   The card is the origin of a FLIP: measure it, open the panel, then play the
   panel from the card's rect to its own. The page has exactly one lead form, so
   it is moved into the panel and put back on close rather than duplicated (a
   second embed would mean a second iframe and a second conversion tag). */
const svcModal = document.querySelector('[data-svc-modal]');
if (svcModal) {
  const panel = svcModal.querySelector('[data-svc-panel]');
  const scrim = svcModal.querySelector('.svc-modal__scrim');
  const host = svcModal.querySelector('[data-svc-host]');
  const eyebrow = svcModal.querySelector('[data-svc-eyebrow]');
  const closeBtn = svcModal.querySelector('.svc-modal__close');
  const leadCard = document.getElementById('p3-form');
  /* Keeps the lead card's slot open while it is away, so the page underneath does
     not reflow and the scroll position does not jump when it comes back. */
  const slot = document.createElement('div');
  let lastFocus = null;
  let originCard = null;   // the card the panel morphed out of, so it morphs back into it
  let busy = false;

  const DUR = 420;
  const EASE = 'cubic-bezier(0.22, 0.9, 0.24, 1)';
  const contents = [eyebrow, host, closeBtn];

  /* The box and its contents are animated separately. If they share one opacity
     the panel is still ~a third visible when it lands on the card, and the
     shrunken, non-uniformly scaled text smears over it: that is the ghost. The
     box carries the geometry and the contents fade out early, so what reaches
     the card is an empty rectangle that is already gone. */
  const flip = (from, back) => {
    if (reducedMQ.matches || !panel.animate) return null;
    const to = panel.getBoundingClientRect();
    const sx = Math.max(from.width / to.width, 0.05);
    const sy = Math.max(from.height / to.height, 0.05);
    const dx = (from.left + from.width / 2) - (to.left + to.width / 2);
    const dy = (from.top + from.height / 2) - (to.top + to.height / 2);
    const small = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;

    const boxFrames = back
      ? [
          { transform: 'none', opacity: 1, offset: 0 },
          { opacity: 0.9, offset: 0.35 },
          /* Fully transparent well before it lands: any opacity left at the card's
             rect reads as a ghost sitting on top of the card. */
          { opacity: 0, offset: 0.78 },
          { transform: small, opacity: 0, offset: 1 },
        ]
      : [
          { transform: small, opacity: 0, offset: 0 },
          { opacity: 0.92, offset: 0.4 },
          { transform: 'none', opacity: 1, offset: 1 },
        ];
    const contentFrames = back
      ? [{ opacity: 1, offset: 0 }, { opacity: 0, offset: 0.38 }, { opacity: 0, offset: 1 }]
      : [{ opacity: 0, offset: 0 }, { opacity: 0, offset: 0.3 }, { opacity: 1, offset: 1 }];

    contents.forEach((el) => el.animate(contentFrames, { duration: DUR, easing: 'linear', fill: 'both' }));
    return panel.animate(boxFrames, { duration: DUR, easing: EASE, fill: 'both' });
  };

  const open = (trigger) => {
    if (busy || !leadCard) return;
    busy = true;
    lastFocus = trigger;
    /* A service card morphs from the whole card; a plain CTA morphs from the
       button itself, which is the thing the user actually pressed. */
    originCard = trigger.closest('.cond-card') || trigger;
    const from = originCard.getBoundingClientRect();

    const service = trigger.dataset.svcRequest || '';
    eyebrow.textContent = service ? 'Requesting: ' + service : '';
    eyebrow.hidden = !service;
    slot.style.height = leadCard.offsetHeight + 'px';
    leadCard.parentNode.insertBefore(slot, leadCard);
    host.appendChild(leadCard);

    svcModal.hidden = false;
    document.documentElement.classList.add('svc-open');
    if (scrim.animate && !reducedMQ.matches) {
      /* The close animation is filled (it has to hold opacity 0 to the last
         frame). Left uncancelled it wins over this one the moment the new
         animation ends, and the scrim blinks out right after opening. */
      scrim.getAnimations().forEach((a) => a.cancel());
      scrim.animate([{ opacity: 0 }, { opacity: 1 }], { duration: DUR, easing: EASE, fill: 'both' });
    }
    flip(from, false);
    closeBtn.focus();
    track('form_modal_open', {
      service: service,
      source: trigger.dataset.gotoForm || (service ? 'service_card' : 'cta'),
    });
    setTimeout(() => { busy = false; }, DUR);
  };

  const close = () => {
    if (busy || svcModal.hidden) return;
    busy = true;
    const from = originCard ? originCard.getBoundingClientRect() : panel.getBoundingClientRect();
    const anim = flip(from, true);
    if (scrim.animate && !reducedMQ.matches) {
      scrim.animate(
        [{ opacity: 1, offset: 0 }, { opacity: 0, offset: 0.8 }, { opacity: 0, offset: 1 }],
        { duration: DUR, easing: 'linear', fill: 'both' }
      );
    }
    const finish = () => {
      svcModal.hidden = true;
      document.documentElement.classList.remove('svc-open');
      // Put the form back exactly where it was, then drop the spacer.
      if (slot.parentNode) { slot.parentNode.insertBefore(leadCard, slot); slot.remove(); }
      panel.getAnimations().forEach((a) => a.cancel());
      contents.forEach((el) => el.getAnimations().forEach((a) => a.cancel()));
      scrim.getAnimations().forEach((a) => a.cancel());
      if (lastFocus && lastFocus.isConnected) lastFocus.focus();
      busy = false;
    };
    if (anim) anim.finished.then(finish).catch(finish);
    else finish();
  };

  /* Every route to the form is this modal now: the service cards, the header CTA,
     the hero CTA and the sticky bar. The anchors keep their href, so with JS off
     they still jump to the form in the page. */
  document.querySelectorAll('[data-svc-request], [data-goto-form]').forEach((el) => {
    el.addEventListener('click', (e) => { e.preventDefault(); open(el); });
  });
  svcModal.querySelectorAll('[data-svc-close]').forEach((el) => {
    el.addEventListener('click', close);
  });
  document.addEventListener('keydown', (e) => {
    if (svcModal.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key !== 'Tab') return;
    // Minimal focus trap: the embed lives in an iframe, so the only tabbables
    // outside it are the close button and whatever the lead card renders.
    const focusables = [...svcModal.querySelectorAll(
      'button, a[href], input, select, textarea, iframe, [tabindex]:not([tabindex="-1"])'
    )].filter((el) => el.offsetParent !== null);
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
}

/* ---------- P2 · card swap (desktop, motion-safe) ----------
   Vanilla port of the React Bits <CardSwap>: the front card drops out of the
   stack, the ones behind promote a slot forward, and the dropped card slides back
   in at the rear. Same slot maths as the original; the elastic feel comes from an
   overshooting cubic-bezier instead of pulling in an animation library.

   Progressive enhancement: the classes are only added once this runs, so without
   JS, below 901px, or under reduced motion the six cards stay the plain grid. */
const compareGrid = document.querySelector('.compare-grid');
const compareContent = document.querySelector('.compare-content');
const swapMQ = window.matchMedia('(min-width: 901px)');

if (compareGrid && compareContent) {
  const cards = [...compareGrid.querySelectorAll('.compare-card')];
  const N = cards.length;
  /* The reference fans three cards; we fan six, so the step has to be tighter or
     the back of the stack climbs ~270px and collides with the copy above it. */
  const DIST_X = 34;      // x offset per slot
  const DIST_Y = 44;      // y offset per slot — one tab height, so every tab in the
                          // stack stays fully visible and clickable
  const SKEW = 6;         // deg, matches the reference
  const DROP = 660;       // taller cards have to clear the frame before returning
  const DELAY = 5200;     // slower cadence: let each card sit long enough to read
  const DUR = 1500;       // must stay in sync with the CSS transition

  const comparePanel = compareGrid.closest('.panel');

  let order = cards.map((_, i) => i);
  let timer = null;
  let active = false;
  /* Every move here is two-phase (something leaves, then the rest settle), so a
     new move starting while an old one still has a deferred half pending would
     place cards from a stale order. All the deferred halves go through here and
     are dropped the moment another move begins. */
  let pending = [];
  const later = (fn, ms) => { pending.push(setTimeout(fn, ms)); };
  const clearPending = () => { pending.forEach(clearTimeout); pending = []; };

  const slot = (i) => ({ x: i * DIST_X, y: -i * DIST_Y, z: -i * DIST_X * 1.5, zi: N - i });
  /* Write the slot into custom properties, never into `transform` directly. Inline
     styles ignore media queries, so a directly-set transform would survive below
     901px and leave the cards skewed in the mobile grid if a resize event ever
     went missing. The CSS applies these only inside the desktop media query, so
     the breakpoint is authoritative and no cleanup is required. */
  const place = (el, s, dropY = 0) => {
    el.style.setProperty('--slot-z', s.zi);
    el.style.setProperty('--slot-t',
      `translate(-50%, -50%) translate3d(${s.x}px, ${s.y + dropY}px, ${s.z}px) skewY(${SKEW}deg)`);
  };

  /* Only the front card is "read mode": the others get the hover lift and the
     pointer cursor on their tab. */
  const markFront = () => cards.forEach((c, i) => c.classList.toggle('is-front', i === order[0]));

  const step = () => {
    clearPending();
    const [front, ...rest] = order;
    place(cards[front], slot(0), DROP);          // front card drops away
    later(() => {
      rest.forEach((idx, i) => place(cards[idx], slot(i)));  // the rest promote
      place(cards[front], slot(N - 1));                      // dropped one returns to the back
      order = [...rest, front];
      markFront();
    }, DUR * 0.55);                                          // overlap, so it reads as one move
  };

  /* Reverse of step: the card at the back of the stack rises into the front slot
     while the others demote one place. It is parked below the front slot without
     a transition first, so it reads as coming up from underneath. */
  const stepBack = () => {
    if (order.length < 2) return;
    clearPending();
    const last = order[order.length - 1];
    const rest = order.slice(0, -1);
    const el = cards[last];
    el.style.transition = 'none';
    place(el, slot(0), DROP);
    void el.offsetWidth;
    el.style.transition = '';
    rest.forEach((idx, i) => place(cards[idx], slot(i + 1)));
    place(el, slot(0));
    order = [last, ...rest];
    markFront();
  };

  /* Clicking a tab promotes that card straight to the front. Everything behind it
     keeps its relative order, so the stack reads as a rotation, not a reshuffle:
     the cards you skipped past go to the back, exactly as if you had stepped
     forward that many times. */
  /* Clicking a tab plays the card out and back in, never a cut. It leaves
     downward from whatever slot it is in (behind the cards ahead of it, so it
     slides out from under them), and only once it is below the frame does it
     move across to the front slot and rise. Without the exit leg it read as the
     card blinking out of the stack on click. */
  const EXIT = 520;
  const EXIT_EASE = 'cubic-bezier(0.4, 0, 1, 1)';   // accelerates away

  const bringToFront = (idx) => {
    if (order[0] === idx) return;              // already the front card
    clearPending();
    const el = cards[idx];
    const at = order.indexOf(idx);
    const rest = order.filter((id) => id !== idx);

    // 1. exit: straight down out of its own slot
    el.style.transition = `transform ${EXIT}ms ${EXIT_EASE}`;
    place(el, slot(at), DROP);

    // 2. the cards ahead of it demote one slot, overlapping the exit
    later(() => rest.forEach((id, i) => place(cards[id], slot(i + 1))), EXIT * 0.55);

    // 3. below the frame, slide across to the front slot with no transition, then
    //    rise on the stack's own elastic curve
    later(() => {
      el.style.transition = 'none';
      place(el, slot(0), DROP);
      void el.offsetWidth;
      el.style.transition = '';
      place(el, slot(0));
    }, EXIT);

    order = [idx, ...rest];
    markFront();
  };

  const run = () => { clearInterval(timer); timer = setInterval(step, DELAY); };

  const start = () => {
    if (active) return;
    active = true;
    clearPending();
    compareContent.classList.add('has-swap');
    comparePanel?.classList.add('has-swap');
    compareGrid.classList.add('card-swap');
    // Place without transitions first, or the cards visibly fly in from the grid.
    cards.forEach((c) => { c.style.transition = 'none'; });
    order = cards.map((_, i) => i);
    order.forEach((idx, i) => place(cards[idx], slot(i)));
    markFront();
    void compareGrid.offsetHeight;
    cards.forEach((c) => { c.style.transition = ''; });
    run();
  };

  const stop = () => {
    if (!active) return;
    active = false;
    clearPending();
    clearInterval(timer);
    timer = null;
    compareContent.classList.remove('has-swap');
    comparePanel?.classList.remove('has-swap');
    compareGrid.classList.remove('card-swap');
    cards.forEach((c) => {
      c.style.removeProperty('--slot-t');
      c.style.removeProperty('--slot-z');
      c.style.transition = '';
      c.classList.remove('is-front');
    });
  };

  const sync = () => (swapMQ.matches && !reducedMQ.matches ? start() : stop());
  sync();
  swapMQ.addEventListener('change', sync);
  reducedMQ.addEventListener('change', sync);
  /* Do not rely on the media-query change event alone: the inline transforms this
     writes are not scoped by media queries, so if a resize slips past, the cards
     stay skewed and offset in the mobile grid. resize always fires. */
  window.addEventListener('resize', sync);

  // Rotating copy is unreadable if it moves while you are reading it, so hovering
  // pauses the carousel and hands control to the reader.
  compareGrid.addEventListener('pointerenter', () => clearInterval(timer));
  compareGrid.addEventListener('pointerleave', () => { if (active) run(); });

  /* Tab clicks. Throttled to the transition length so a rage-click cannot queue
     up half a dozen rotations. The auto-rotation is already paused while the
     pointer is over the stack, so a chosen card stays put until you leave. */
  let clickLock = false;
  cards.forEach((card, i) => {
    card.querySelector('.card-tab')?.addEventListener('click', () => {
      if (!active || clickLock) return;
      if (order[0] === i) return;
      clickLock = true;
      bringToFront(i);
      // Covers the exit leg; the rise can be interrupted by the next choice.
      setTimeout(() => { clickLock = false; }, EXIT + 180);
    });
  });

  /* Over the stack the wheel drives the cards instead of the panel track. The
     event has to stop here, or the track would also advance a whole panel. The
     auto-rotation stays paused (pointerenter cleared it) so the reader is in
     control until the pointer leaves. */
  let wheelLock = false;
  compareGrid.addEventListener('wheel', (e) => {
    if (!active) return;
    const d = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    if (Math.abs(d) < 4) return;
    e.preventDefault();
    e.stopPropagation();
    if (wheelLock) return;
    wheelLock = true;
    if (d > 0) step(); else stepBack();
    setTimeout(() => { wheelLock = false; }, 520);
  }, { passive: false });
}
