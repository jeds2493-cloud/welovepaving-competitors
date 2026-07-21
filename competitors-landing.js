/* ============================================================
   WLP — Competitor Comparison landing
   One vertical page: the hero carries the scene art and everything below it is
   a normal stacked section.
   ============================================================ */

window.dataLayer = window.dataLayer || [];
const track = (event, params = {}) => window.dataLayer.push({ event, ...params });

const reducedMQ = window.matchMedia('(prefers-reduced-motion: reduce)');

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

/* ---------- Chrome state: reveal the header CTA past the hero ----------
   The header's "Request a Project Review" button is hidden on the hero and slides
   in once the hero is mostly out of view. */
const heroPanel = document.querySelector('.panel--hero');
const postHero = document.querySelector('.post-hero');
const stage = document.querySelector('.stage');
const pledgePanel = document.querySelector('.panel--pledge');

/* ---------- Continue P3's asphalt into the section below ----------
   Both use the same image at the same scale; offsetting the lower one by P3's
   height makes the crop pick up exactly where P3's leaves off, so the backdrop
   reads as one photo across the handoff. */
function alignPostHeroBg() {
  if (!postHero || !pledgePanel) return;
  postHero.style.setProperty('--posthero-bg-y', (-Math.round(pledgePanel.offsetHeight)) + 'px');
}
alignPostHeroBg();
new ResizeObserver(alignPostHeroBg).observe(pledgePanel || document.body);
function updateChrome() {
  const past = !!heroPanel && heroPanel.getBoundingClientRect().bottom < window.innerHeight * 0.5;
  document.body.classList.toggle('past-hero', past);
}
window.addEventListener('scroll', updateChrome, { passive: true });

/* ---------- Scroll parallax on the hero art ----------
   The art scrolls with the page; this drifts it up a little on top of that, so
   there is a speed difference between it and the copy. Capped, because the art
   sits above the copy: left unbounded the drift would close the gap the layout
   leaves between the characters and the headline. */
const SCENE_PARALLAX = 0.18;
const SCENE_MAX = 40;
const sceneImg = document.querySelector('[data-scene] img');
if (sceneImg && heroPanel) {
  let sceneRaf = 0;
  const paintSceneY = () => {
    const limit = heroPanel.offsetHeight;
    const y = Math.min(Math.max(window.scrollY, 0), limit);
    const drift = Math.min(y * SCENE_PARALLAX, SCENE_MAX);
    sceneImg.style.setProperty('--scene-y', (-drift).toFixed(1) + 'px');
  };
  window.addEventListener('scroll', () => {
    if (sceneRaf) return;
    sceneRaf = requestAnimationFrame(() => { sceneRaf = 0; paintSceneY(); });
  }, { passive: true });
  paintSceneY();
}

/* ---------- One-time view event per [data-view] panel ----------
   Fires the panel's analytics event the first time it's at least half in view
   the first time it is at least half in view. */
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
   Scrolls to whatever section follows the one it sits in. */
document.querySelectorAll('[data-goto-next]').forEach((el) => {
  el.addEventListener('click', () => {
    const smooth = reducedMQ.matches ? 'auto' : 'smooth';
    const panel = el.closest('.panel');
    const next = panel?.nextElementSibling || postHero;
    if (next) next.scrollIntoView({ behavior: smooth, block: 'start' });
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

/* ---------- P2 · card reveal ----------
   Each card slides in from alternating sides as it reaches the viewport. The
   observer disconnects on the first hit: this is an entrance, not a toggle. */
document.querySelectorAll('.compare-card').forEach((card) => {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      card.classList.add('is-in');
      io.disconnect();
    });
  }, { threshold: 0.25, rootMargin: '0px 0px -8% 0px' });
  io.observe(card);
});

