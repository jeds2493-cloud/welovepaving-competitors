/* ============================================================
   WLP — Competitor Comparison landing
   One vertical page: the hero carries the scene art and everything below it is
   a normal stacked section.
   ============================================================ */

window.dataLayer = window.dataLayer || [];
const track = (event, params = {}) => window.dataLayer.push({ event, ...params });

const reducedMQ = window.matchMedia('(prefers-reduced-motion: reduce)');

/* ---------- Last input modality ----------
   Whether the reader is driving with a keyboard or a pointer. Dialogs need it to
   decide where focus goes on close: putting it back on the trigger is how a
   keyboard user keeps their place, but after a click it just leaves a ring on a
   button nobody focused. Reading `:focus-visible` at the moment of the click is
   not enough — a script-driven focus does not match it. */
let usingKeyboard = false;
window.addEventListener('keydown', (e) => {
  if (e.key === 'Tab' || e.key === 'Enter' || e.key === ' ' || e.key.startsWith('Arrow')) usingKeyboard = true;
}, true);
window.addEventListener('pointerdown', () => { usingKeyboard = false; }, true);

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

/* ---------- Publish the hero's height, and where the sections below it start ----
   --hero-h sizes the scene art: the layer spans the whole stage, so the art cannot
   just be `height: 100%`, and a viewport calc left a strip of bare layer whenever
   the hero grew past it on its own copy.

   --sections-top parks the shared backdrop at the hero's bottom, so one image and
   one veil cover the comparison, the quality section and the FAQ/form/footer with
   no restart at either handoff. Both come from the same measurement. */
function publishHeroMetrics() {
  if (!heroPanel) return;
  const h = heroPanel.offsetHeight;
  const top = Math.round(heroPanel.getBoundingClientRect().top + window.scrollY);
  const root = document.documentElement.style;
  root.setProperty('--hero-h', h + 'px');
  root.setProperty('--sections-top', (top + h) + 'px');
}
publishHeroMetrics();
if (heroPanel) new ResizeObserver(publishHeroMetrics).observe(heroPanel);
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

  /* Built with DOM calls, not a concatenated string: the href is ours today, but
     a template that interpolates a URL into markup is the shape of an injection
     and there is no reason to keep one around. */
  const showFallback = (href) => {
    legalBody.replaceChildren();
    const p = document.createElement('p');
    p.append('This document could not be loaded here. ');
    const a = document.createElement('a');
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = 'Open it in a new tab';
    p.append(a, '.');
    legalBody.append(p);
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
        /* Pre-flattened, but still untrusted markup as far as this page is
           concerned. Elements that can execute are removed outright; inline
           handlers and javascript: URLs survive element-level stripping, so they
           are taken off every remaining node too. */
        doc.body.querySelectorAll('script, style, link, iframe, form, noscript, object, embed')
          .forEach((el) => el.remove());
        doc.body.querySelectorAll('*').forEach((el) => {
          [...el.attributes].forEach((attr) => {
            const name = attr.name.toLowerCase();
            const value = attr.value.replace(/\s/g, '').toLowerCase();
            if (name.startsWith('on') || (/^(href|src|xlink:href)$/.test(name) && value.startsWith('javascript:'))) {
              el.removeAttribute(attr.name);
            }
          });
        });
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
  let openedByKeyboard = false;
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
    openedByKeyboard = usingKeyboard;
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

    // The embed is loaded on demand; opening the modal is the clearest signal.
    if (typeof window.wlpLoadForms === 'function') window.wlpLoadForms();

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
      if (openedByKeyboard && lastFocus && lastFocus.isConnected) {
        lastFocus.focus({ preventScroll: true });
      } else if (document.activeElement && svcModal.contains(document.activeElement)) {
        // The panel is about to be hidden; do not leave focus inside it.
        document.activeElement.blur();
      }
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

/* ---------- The hero is all or nothing ----------
   Scroll snapping is `proximity`, which is right for the rest of the page but
   lets the hero be nudged a few pixels at a time. A wheel gesture anywhere in the
   hero commits to the next section instead. Only the hero: below it the reader is
   reading, and hijacking the wheel there would fight them. */
const desktopMQ = window.matchMedia('(min-width: 901px)');
if (heroPanel) {
  let gateLock = false;
  const chromeH = () => {
    const root = getComputedStyle(document.documentElement);
    return (parseFloat(root.getPropertyValue('--utility-h')) || 0) +
           (parseFloat(root.getPropertyValue('--header-h')) || 0);
  };
  const modalIsOpen = () =>
    document.documentElement.classList.contains('svc-open') ||
    !!document.querySelector('dialog[open]');

  window.addEventListener('wheel', (e) => {
    if (gateLock || !desktopMQ.matches || reducedMQ.matches || modalIsOpen()) return;
    if (e.deltaY <= 0) return;                       // downward gestures only
    const top = chromeH();
    const heroBottom = Math.round(heroPanel.getBoundingClientRect().bottom + window.scrollY);
    // Anywhere in the hero, including its very last pixels.
    if (window.scrollY >= heroBottom - top - 4) return;
    e.preventDefault();
    gateLock = true;
    const target = heroBottom - top;
    const from = window.scrollY;
    window.scrollTo({ top: target, behavior: 'smooth' });
    /* The gesture was swallowed, so the jump has to happen even where smooth
       scrolling is a no-op — otherwise preventDefault would strand the reader in
       the hero with a wheel that does nothing. */
    setTimeout(() => {
      if (Math.abs(window.scrollY - from) < 2) window.scrollTo({ top: target, behavior: 'auto' });
    }, 260);
    setTimeout(() => { gateLock = false; }, 700);
  }, { passive: false });
}

/* ---------- Side rays (hero) ----------
   Vanilla WebGL port of React Bits' <SideRays>. The original leans on ogl and
   React; this landing has no build step and no dependencies, so the shader is
   driven directly: one full-screen triangle, a handful of uniforms and a rAF
   loop. Same fragment shader, same maths.

   It is a decoration, so everything about it is conditional: no WebGL, no rays;
   reduced motion, the clock never advances; off screen, the loop stops. */
const RAYS = {
  speed: 1.6,
  color1: '#F2C230',        // WLP yellow
  color2: '#FFE9A8',        // pale gold — the original's blue fights the palette
  intensity: 2.4,
  spread: 1.8,
  origin: 'top-left',
  tilt: 0,
  saturation: 1.25,
  blend: 0.55,
  falloff: 1.35,          // shallower than the default: a wider, softer glow
  opacity: 0.95,
};

/* Desktop only: on a phone the rays land on the art rather than beside the copy,
   and a WebGL context running a rAF loop is not worth the battery for a
   decoration nobody asked for there. Set up once — this does not need to follow
   a resize, and tearing a live context down on one would be worse than either
   state. */
const raysHost = document.querySelector('[data-side-rays]');
if (raysHost && window.matchMedia('(min-width: 901px)').matches) initSideRays(raysHost, RAYS);

function initSideRays(host, opt) {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: false });
  if (!gl) return;                                  // no WebGL: the div stays empty

  const hexToRgb = (hex) => {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return m ? [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255] : [1, 1, 1];
  };
  const flipFor = (origin) => ({
    'top-left': [1, 0], 'bottom-right': [0, 1], 'bottom-left': [1, 1],
  }[origin] || [0, 0]);

  const VERT = `
    attribute vec2 position;
    void main() { gl_Position = vec4(position, 0.0, 1.0); }`;

  const FRAG = `precision highp float;
    uniform float iTime;
    uniform vec2 iResolution;
    uniform float iSpeed;
    uniform vec3 iRayColor1;
    uniform vec3 iRayColor2;
    uniform float iIntensity;
    uniform float iSpread;
    uniform float iFlipX;
    uniform float iFlipY;
    uniform float iTilt;
    uniform float iSaturation;
    uniform float iBlend;
    uniform float iFalloff;
    uniform float iOpacity;

    float rayStrength(vec2 raySource, vec2 rayRefDirection, vec2 coord, float seedA, float seedB, float speed) {
      vec2 sourceToCoord = coord - raySource;
      float cosAngle = dot(normalize(sourceToCoord), rayRefDirection);
      return clamp(
        (0.45 + 0.15 * sin(cosAngle * seedA + iTime * speed)) +
        (0.3 + 0.2 * cos(-cosAngle * seedB + iTime * speed)),
        0.0, 1.0) *
        clamp((iResolution.x - length(sourceToCoord)) / iResolution.x, 0.5, 1.0);
    }

    void main() {
      vec2 fragCoord = gl_FragCoord.xy;
      if (iFlipX > 0.5) fragCoord.x = iResolution.x - fragCoord.x;
      if (iFlipY > 0.5) fragCoord.y = iResolution.y - fragCoord.y;

      vec2 coord = vec2(fragCoord.x, iResolution.y - fragCoord.y);
      vec2 rayPos = vec2(iResolution.x * 1.1, -0.5 * iResolution.y);

      float tiltRad = iTilt * 3.14159265 / 180.0;
      float cs = cos(tiltRad);
      float sn = sin(tiltRad);
      vec2 rel = coord - rayPos;
      vec2 tiltedCoord = vec2(rel.x * cs - rel.y * sn, rel.x * sn + rel.y * cs) + rayPos;

      float halfSpread = iSpread * 0.275;
      vec2 rayRefDir1 = normalize(vec2(cos(0.785398 + halfSpread), sin(0.785398 + halfSpread)));
      vec2 rayRefDir2 = normalize(vec2(cos(0.785398 - halfSpread), sin(0.785398 - halfSpread)));

      vec4 rays1 = vec4(iRayColor1, 1.0) * rayStrength(rayPos, rayRefDir1, tiltedCoord, 36.2214, 21.11349, iSpeed);
      vec4 rays2 = vec4(iRayColor2, 1.0) * rayStrength(rayPos, rayRefDir2, tiltedCoord, 22.3991, 18.0234, iSpeed * 0.2);

      vec4 color = rays1 * (1.0 - iBlend) * 0.9 + rays2 * iBlend * 0.9;

      float distanceToLight = length(fragCoord.xy - vec2(rayPos.x, iResolution.y - rayPos.y)) / iResolution.y;
      float brightness = iIntensity * 0.4 / pow(max(distanceToLight, 0.001), iFalloff);
      color.rgb *= brightness;

      float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
      color.rgb = mix(vec3(gray), color.rgb, iSaturation);

      color.a = max(color.r, max(color.g, color.b)) * iOpacity;
      gl_FragColor = color;
    }`;

  const compile = (type, src) => {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    return gl.getShaderParameter(sh, gl.COMPILE_STATUS) ? sh : null;
  };
  const vs = compile(gl.VERTEX_SHADER, VERT);
  const fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return;

  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);

  // One oversized triangle covers the viewport with no seam down the diagonal.
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'position');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  const u = (n) => gl.getUniformLocation(prog, n);
  const uTime = u('iTime');
  const uRes = u('iResolution');
  const [flipX, flipY] = flipFor(opt.origin);
  gl.uniform1f(u('iSpeed'), opt.speed);
  gl.uniform3fv(u('iRayColor1'), hexToRgb(opt.color1));
  gl.uniform3fv(u('iRayColor2'), hexToRgb(opt.color2));
  gl.uniform1f(u('iIntensity'), opt.intensity);
  gl.uniform1f(u('iSpread'), opt.spread);
  gl.uniform1f(u('iFlipX'), flipX);
  gl.uniform1f(u('iFlipY'), flipY);
  gl.uniform1f(u('iTilt'), opt.tilt);
  gl.uniform1f(u('iSaturation'), opt.saturation);
  gl.uniform1f(u('iBlend'), opt.blend);
  gl.uniform1f(u('iFalloff'), opt.falloff);
  gl.uniform1f(u('iOpacity'), opt.opacity);

  host.appendChild(canvas);

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(host.clientWidth, 1);
    const h = Math.max(host.clientHeight, 1);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uRes, canvas.width, canvas.height);
  };
  resize();
  new ResizeObserver(resize).observe(host);

  let raf = 0;
  const draw = (t) => {
    // Reduced motion keeps the rays, just frozen: the shape is decoration, the
    // movement is what people ask not to see.
    gl.uniform1f(uTime, reducedMQ.matches ? 0 : t * 0.001);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    raf = requestAnimationFrame(draw);
  };
  const start = () => { if (!raf) raf = requestAnimationFrame(draw); };
  const stop = () => { if (raf) { cancelAnimationFrame(raf); raf = 0; } };

  // Nothing renders while the hero is off screen or the tab is in the background.
  new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()), { threshold: 0.01 }).observe(host);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
}

/* ---------- Card reveals ----------
   The comparison cards slide in from alternating sides, the service cards rise;
   both are driven from here and the shapes live in CSS. The observer disconnects
   on the first hit: this is an entrance, not a toggle. */
document.querySelectorAll('.compare-card, .cond-card, .proposal-strip').forEach((card) => {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      card.classList.add('is-in');
      io.disconnect();
    });
  }, { threshold: 0.25, rootMargin: '0px 0px -8% 0px' });
  io.observe(card);
});

/* ---------- P2 carousel (mobile) ----------
   The six comparison cards become one swipeable deck below 900px. The track and
   the snapping are CSS; this adds the two things scroll snap has no answer for:
   the dots, and the tilt that turns the cards either side of the current one
   away from the reader.

   Ported from the React Bits <Carousel>, minus its drag handler and its infinite
   loop. The drag is what the platform already does better on a touch screen, and
   looping needs cloned cards plus a silent jump at each end, which on a scroll
   container means fighting momentum mid-flight. Six cards and a row of dots do
   not need it. */
const carouselMQ = window.matchMedia('(max-width: 900px)');
const deck = document.querySelector('.compare-grid');

if (deck) {
  const cards = [...deck.querySelectorAll('.compare-card')];
  let dots = null;
  let raf = 0;
  let active = -1;

  /* The React component maps a full card of travel to a quarter turn. Here the
     neighbours are still partly on screen, so it is gentler: an edge-on card
     beside the one being read is a distraction, not depth. */
  const MAX_TILT = 26;

  const paint = () => {
    raf = 0;
    const mid = deck.scrollLeft + deck.clientWidth / 2;
    let nearest = 0;
    let nearestGap = Infinity;

    cards.forEach((card, i) => {
      const cardMid = card.offsetLeft + card.offsetWidth / 2;
      const step = card.offsetWidth + 14;
      const away = (cardMid - mid) / step;
      const gap = Math.abs(cardMid - mid);
      if (gap < nearestGap) { nearestGap = gap; nearest = i; }
      const tilt = Math.max(-1, Math.min(1, away)) * -MAX_TILT;
      card.style.setProperty('--tilt', tilt.toFixed(2) + 'deg');
    });

    if (nearest !== active) {
      active = nearest;
      if (dots) {
        [...dots.children].forEach((dot, i) => {
          dot.setAttribute('aria-current', String(i === active));
        });
      }
    }
  };

  const onScroll = () => { if (!raf) raf = requestAnimationFrame(paint); };

  const enable = () => {
    if (deck.classList.contains('is-carousel')) return;
    deck.classList.add('is-carousel');
    /* A region you can scroll has to be reachable without a pointer. */
    deck.tabIndex = 0;
    deck.setAttribute('role', 'group');
    deck.setAttribute('aria-roledescription', 'carousel');
    deck.setAttribute('aria-label', 'What to compare, one card at a time');

    dots = document.createElement('div');
    dots.className = 'compare-dots';
    cards.forEach((card, i) => {
      const tab = card.querySelector('.card-tab span');
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'compare-dot';
      dot.setAttribute('aria-label', 'Show ' + (tab ? tab.textContent.trim() : 'card ' + (i + 1)));
      dot.addEventListener('click', () => {
        card.scrollIntoView({
          behavior: reducedMQ.matches ? 'auto' : 'smooth',
          inline: 'center',
          block: 'nearest',
        });
      });
      dots.appendChild(dot);
    });
    deck.after(dots);

    deck.addEventListener('scroll', onScroll, { passive: true });
    paint();
  };

  const disable = () => {
    if (!deck.classList.contains('is-carousel')) return;
    deck.classList.remove('is-carousel');
    deck.removeAttribute('tabindex');
    deck.removeAttribute('role');
    deck.removeAttribute('aria-roledescription');
    deck.removeAttribute('aria-label');
    deck.removeEventListener('scroll', onScroll);
    if (dots) { dots.remove(); dots = null; }
    cards.forEach((card) => card.style.removeProperty('--tilt'));
    active = -1;
  };

  const sync = () => (carouselMQ.matches ? enable() : disable());
  sync();
  carouselMQ.addEventListener('change', sync);
}
