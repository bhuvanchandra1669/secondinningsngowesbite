/* ==========================================================================
   Second Innings — interaction & motion
   --------------------------------------------------------------------------
   Design principle: the site must be fully readable and usable with zero
   JavaScript. Everything below is enhancement. If GSAP fails to load (bad
   network, blocked CDN, offline), we fall back to IntersectionObserver and
   the site still works — just with simpler transitions.
   ========================================================================== */

(function () {
  'use strict';

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isDesktop = () => window.matchMedia('(min-width: 901px)').matches;
  const hasGSAP = () => typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';

  // Google Apps Script Web App URLs that log form submissions into a Sheet,
  // alongside the FormSubmit email each form already sends — one independent
  // script + deployment per form, not one shared script routing between them.
  // Leave any of these blank until that form's script is deployed; the form
  // still works fine without it, it just skips the extra copy. See
  // SHEET-LOGGING-SETUP.md.
  const SHEET_LOGGER_URLS = {
    'Contact': '',
    'Donate Gear': '',
    'Request Equipment': '',
    'Get Involved': ''
  };

  /* ------------------------------------------------------------------ */
  /* Preloader                                                           */
  /* ------------------------------------------------------------------ */

  function initPreloader() {
    const pre = document.querySelector('.preloader');
    if (!pre) { document.body.classList.remove('is-loading'); heroIn(); return; }

    const bar = pre.querySelector('.preloader__bar span');
    const count = pre.querySelector('[data-preloader-count]');
    let done = false;
    let w = 0;
    let tickId = null;

    const paint = (val) => {
      w = val;
      if (bar) bar.style.width = w + '%';
      if (count) count.textContent = String(Math.round(w));
    };

    const finish = () => {
      if (done) return;
      done = true;
      // The 90%-climb interval below stops itself once it reaches 90, but
      // if finish() fires first (a fast load, or the safety timeout), that
      // interval is still armed. Without clearing it here, one more tick
      // can land right after paint(100) and clamp it straight back down to
      // 90 — Math.min(100 + jitter, 90) is still 90 — where it then stops,
      // silently freezing the counter one digit short of complete.
      if (tickId) { clearInterval(tickId); tickId = null; }
      if (bar) bar.style.transition = 'width .35s ease';
      paint(100);

      const exitDelay = prefersReduced ? 0 : 320;
      setTimeout(() => {
        // Curtain-rise exit: the panel slides up and off rather than
        // fading in place. Skipped under reduced motion — straight to
        // hidden, no transform to sit through.
        if (prefersReduced) {
          pre.style.visibility = 'hidden';
        } else {
          pre.classList.add('is-leaving');
          pre.addEventListener('transitionend', () => { pre.style.visibility = 'hidden'; }, { once: true });
        }
        document.body.classList.remove('is-loading');
        heroIn();
      }, exitDelay);
    };

    // Climb toward 90% while we wait for real load; finish() takes it the
    // rest of the way so the count never visibly stalls mid-number.
    if (!prefersReduced) {
      tickId = setInterval(() => {
        paint(Math.min(w + Math.random() * 16, 90));
        if (w >= 90 && tickId) { clearInterval(tickId); tickId = null; }
      }, 130);
    }

    window.addEventListener('load', finish);
    // Never let a slow asset hold the page hostage.
    setTimeout(finish, prefersReduced ? 200 : 1300);
  }

  /* ------------------------------------------------------------------ */
  /* Hero entrance — masked lines slide up                               */
  /* ------------------------------------------------------------------ */

  function heroIn() {
    const items = document.querySelectorAll('[data-hero] .line-mask > span, [data-hero] [data-hero-fade]');
    items.forEach((el, i) => {
      el.style.transition = 'transform 1s cubic-bezier(.16,1,.3,1) ' + (i * 0.085 + 0.1) + 's, opacity .9s ease ' + (i * 0.085 + 0.1) + 's';
      el.style.transform = 'translateY(0)';
      el.style.opacity = '1';
    });
  }

  // data-hero-fade elements start hidden
  document.querySelectorAll('[data-hero] [data-hero-fade]').forEach((el) => {
    if (!prefersReduced) { el.style.opacity = '0'; el.style.transform = 'translateY(18px)'; }
  });

  /* ------------------------------------------------------------------ */
  /* Navigation — stick, auto-hide, mobile menu                          */
  /* ------------------------------------------------------------------ */

  function initNav() {
    const nav = document.querySelector('.nav');
    const burger = document.querySelector('.nav__burger');
    const menu = document.querySelector('.mobile-menu');
    const progress = document.querySelector('.scroll-progress');
    if (!nav) return;

    let lastY = 0;

    const onScroll = () => {
      const y = window.scrollY;

      nav.classList.toggle('is-stuck', y > 40);
      // Auto-hide only once we're well past the hero, and never with the menu open
      if (!document.body.classList.contains('nav-open')) {
        nav.classList.toggle('is-hidden', y > lastY && y > 400);
      }
      lastY = y;

      if (progress) {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        progress.style.transform = 'scaleX(' + (max > 0 ? y / max : 0) + ')';
      }
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    if (burger && menu) {
      // Stagger index per link, consumed by the --i custom property in the
      // CSS transition-delay — works for any number of nav items, not just
      // however many nth-child rules happen to be written in the stylesheet.
      menu.querySelectorAll('li a').forEach((a, i) => {
        a.style.setProperty('--i', String(i));
      });

      const toggle = (open) => {
        document.body.classList.toggle('nav-open', open);
        burger.setAttribute('aria-expanded', String(open));
        menu.setAttribute('aria-hidden', String(!open));
      };
      burger.addEventListener('click', () => toggle(!document.body.classList.contains('nav-open')));
      menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => toggle(false)));
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && document.body.classList.contains('nav-open')) toggle(false);
      });
    }
  }

  /* ------------------------------------------------------------------ */
  /* Per-character nav hover                                             */
  /*                                                                     */
  /* Splits each desktop nav label into one <span> per visible character */
  /* so :hover can run a staggered wave across it via animation-delay.   */
  /* Skipped entirely on touch (no hover to trigger it) and reduced-      */
  /* motion (a wave is motion for its own sake, not information).        */
  /* ------------------------------------------------------------------ */

  function initNavCharSplit() {
    if (prefersReduced) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    document.querySelectorAll('.nav__links a').forEach((link) => {
      // NOTE: guard attribute is deliberately NOT "data-split" — that
      // attribute name is already used by initSplitHeadings() to select
      // [data-split] elements. Reusing it here made these links match that
      // selector too, and initSplitHeadings (which runs later in boot)
      // clobbered these .ch spans with its own word-split markup.
      if (link.dataset.charSplit === 'done') return;
      const text = link.textContent;
      let i = 0;
      link.innerHTML = text
        .split('')
        .map((ch) => {
          if (ch === ' ') return ' ';
          const span = `<span class="ch" style="--i:${i}">${ch}</span>`;
          i += 1;
          return span;
        })
        .join('');
      link.dataset.charSplit = 'done';
    });
  }

  /* ------------------------------------------------------------------ */
  /* Magnetic buttons                                                     */
  /*                                                                     */
  /* While the pointer is within a button's bounds, the button drifts a   */
  /* few px toward it — a small, springy pull rather than a hard snap.    */
  /* Desktop/fine-pointer only; the effect has no meaning on touch.       */
  /* ------------------------------------------------------------------ */

  function initMagnetic() {
    if (prefersReduced) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    const MAX_PULL = 10;
    const STRENGTH = 0.32;

    document.querySelectorAll('.btn').forEach((btn) => {
      btn.classList.add('btn--magnetic');

      btn.addEventListener('pointermove', (e) => {
        const r = btn.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        const px = Math.max(-MAX_PULL, Math.min(MAX_PULL, dx * STRENGTH));
        const py = Math.max(-MAX_PULL, Math.min(MAX_PULL, dy * STRENGTH));
        btn.style.transform = `translate(${px}px, ${py}px)`;
      });

      btn.addEventListener('pointerleave', () => {
        btn.style.transform = '';
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Reveal on scroll                                                    */
  /* ------------------------------------------------------------------ */

  function initReveals() {
    const els = document.querySelectorAll('[data-reveal], .figure');
    if (!els.length) return;

    if (prefersReduced || !('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('is-in'));
      return;
    }

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const delay = parseFloat(el.dataset.revealDelay || 0);
        setTimeout(() => el.classList.add('is-in'), delay * 1000);
        io.unobserve(el);
      });
      // threshold 0 (not a ratio) so that elements taller than the viewport —
      // long forms, tall cards — still trigger. A ratio-based threshold can
      // leave those permanently invisible on short screens.
    }, { threshold: 0, rootMargin: '0px 0px -10% 0px' });

    els.forEach((el) => io.observe(el));
  }

  /* ------------------------------------------------------------------ */
  /* Scroll-scrubbed "big moments"                                       */
  /*                                                                     */
  /* A small, hand-picked set of elements (marked [data-scrub] in the     */
  /* HTML, not applied broadly) whose opacity/position/scale are tied     */
  /* directly to scroll progress via GSAP ScrollTrigger's scrub option,   */
  /* rather than firing once on entry like [data-reveal]. Deliberately   */
  /* rare — see the CSS comment above [data-scrub] for why.               */
  /*                                                                     */
  /* Without GSAP, on touch, or under reduced-motion, these elements get */
  /* the exact same one-shot fade as [data-reveal] instead — continuous  */
  /* scrub is a desktop-only refinement, not something worth a fallback  */
  /* animation loop for.                                                 */
  /* ------------------------------------------------------------------ */

  function initScrubReveals() {
    const els = document.querySelectorAll('[data-scrub]');
    if (!els.length) return;

    const canScrub = hasGSAP() && isDesktop() && !prefersReduced;

    if (!canScrub) {
      if (prefersReduced || !('IntersectionObserver' in window)) {
        els.forEach((el) => el.classList.add('is-in'));
        return;
      }
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        });
      }, { threshold: 0, rootMargin: '0px 0px -10% 0px' });
      els.forEach((el) => io.observe(el));
      return;
    }

    els.forEach((el) => {
      el.classList.add('is-scrubbing');
      gsap.fromTo(el,
        { opacity: 0, y: 70, scale: 0.94 },
        {
          opacity: 1, y: 0, scale: 1, ease: 'none',
          scrollTrigger: { trigger: el, start: 'top 88%', end: 'top 45%', scrub: 0.6 }
        }
      );
    });
  }

  /* Stagger children automatically inside [data-reveal-group] */
  function initRevealGroups() {
    document.querySelectorAll('[data-reveal-group]').forEach((group) => {
      const step = parseFloat(group.dataset.revealGroup) || 0.09;
      Array.from(group.children).forEach((child, i) => {
        if (!child.hasAttribute('data-reveal')) child.setAttribute('data-reveal', '');
        child.dataset.revealDelay = (i * step).toFixed(2);
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Counters                                                            */
  /* ------------------------------------------------------------------ */

  function initCounters() {
    const nums = document.querySelectorAll('[data-count]');
    if (!nums.length) return;

    const run = (el) => {
      const target = parseFloat(el.dataset.count);
      const dur = 1700;
      const start = performance.now();

      if (prefersReduced) { el.textContent = format(target, el); return; }

      // A small pop on the number's immediate wrapper (.stat__num, or the
      // <strong> in the hero stat row) right as counting begins — the
      // count-up alone reads as a UI detail; the pop makes it read as a
      // moment.
      if (el.parentElement) el.parentElement.classList.add('is-counting');

      const frame = (now) => {
        const p = Math.min((now - start) / dur, 1);
        // easeOutExpo — fast then settles, reads as "counting up"
        const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
        el.textContent = format(target * eased, el);
        if (p < 1) requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    };

    const format = (v, el) => {
      const dec = parseInt(el.dataset.countDecimals || 0, 10);
      const n = dec ? v.toFixed(dec) : Math.round(v);
      return el.dataset.countPlain === 'true' ? String(n) : Number(n).toLocaleString('en-IN');
    };

    if (!('IntersectionObserver' in window)) { nums.forEach(run); return; }

    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        run(e.target);
        io.unobserve(e.target);
      });
    }, { threshold: 0.5 });

    nums.forEach((n) => io.observe(n));
  }

  /* ------------------------------------------------------------------ */
  /* Marquee — duplicate the track so the loop is seamless               */
  /* ------------------------------------------------------------------ */

  function initMarquee() {
    document.querySelectorAll('.marquee').forEach((m) => {
      const track = m.querySelector('.marquee__track');
      if (!track) return;
      const clone = track.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      m.appendChild(clone);
    });
  }

  /* ------------------------------------------------------------------ */
  /* FAQ accordion                                                       */
  /* ------------------------------------------------------------------ */

  function initFaq() {
    document.querySelectorAll('.faq__item').forEach((item) => {
      const btn = item.querySelector('.faq__q');
      const panel = item.querySelector('.faq__a');
      if (!btn || !panel) return;

      btn.addEventListener('click', () => {
        const open = item.classList.contains('is-open');

        // Close siblings — one open at a time reads calmer
        item.parentElement.querySelectorAll('.faq__item.is-open').forEach((sib) => {
          if (sib === item) return;
          sib.classList.remove('is-open');
          sib.querySelector('.faq__q').setAttribute('aria-expanded', 'false');
          sib.querySelector('.faq__a').style.height = '0px';
        });

        item.classList.toggle('is-open', !open);
        btn.setAttribute('aria-expanded', String(!open));
        panel.style.transition = 'height .5s cubic-bezier(.16,1,.3,1)';
        panel.style.height = open ? '0px' : panel.scrollHeight + 'px';
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* The Journey — scroll-driven story                                   */
  /* ------------------------------------------------------------------ */

  function initJourney() {
    const section = document.querySelector('[data-journey]');
    if (!section) return;

    const object = section.querySelector('.journey__object');
    const steps = Array.from(section.querySelectorAll('.journey__step'));
    const railItems = Array.from(section.querySelectorAll('.journey__rail li'));
    if (!object || !steps.length) return;

    let current = -1;

    const setStage = (i) => {
      if (i === current) return;
      current = i;
      object.setAttribute('data-stage', String(i + 1));
      railItems.forEach((li, n) => {
        li.classList.toggle('is-active', n === i);
        li.classList.toggle('is-done', n < i);
      });
    };

    setStage(0);

    // Preferred path: ScrollTrigger gives us a smooth scrubbed rotation
    // alongside discrete stage changes.
    if (hasGSAP() && isDesktop() && !prefersReduced) {
      // The rings sit alongside the object, not inside it
      const inner = section.querySelector('.journey__spin');

      steps.forEach((step, i) => {
        ScrollTrigger.create({
          trigger: step,
          start: 'top center',
          end: 'bottom center',
          onEnter: () => setStage(i),
          onEnterBack: () => setStage(i)
        });
      });

      if (inner) {
        gsap.to(inner, {
          rotation: 360,
          ease: 'none',
          scrollTrigger: {
            trigger: section.querySelector('.journey__steps'),
            start: 'top center',
            end: 'bottom center',
            scrub: 1.1
          }
        });
      }
      return;
    }

    // Fallback: plain IntersectionObserver, works everywhere including mobile
    if (!('IntersectionObserver' in window)) { setStage(steps.length - 1); return; }

    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) setStage(steps.indexOf(e.target));
      });
    }, { threshold: 0.4, rootMargin: '-20% 0px -20% 0px' });

    steps.forEach((s) => io.observe(s));
  }

  /* ------------------------------------------------------------------ */
  /* Gentle parallax on anything with [data-parallax]                    */
  /* ------------------------------------------------------------------ */

  function initParallax() {
    if (prefersReduced || !hasGSAP() || !isDesktop()) return;

    document.querySelectorAll('[data-parallax]').forEach((el) => {
      const amount = parseFloat(el.dataset.parallax) || 60;
      gsap.fromTo(el, { y: amount * -0.5 }, {
        y: amount * 0.5,
        ease: 'none',
        scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Split heading reveal on scroll                                      */
  /* ------------------------------------------------------------------ */

  function initSplitHeadings() {
    if (prefersReduced) return;

    document.querySelectorAll('[data-split]').forEach((h) => {
      const words = h.textContent.trim().split(/\s+/);
      h.textContent = '';
      words.forEach((w, i) => {
        const outer = document.createElement('span');
        outer.style.cssText = 'display:inline-block;overflow:hidden;vertical-align:top;';
        const inner = document.createElement('span');
        inner.style.cssText =
          'display:inline-block;transform:translateY(105%);transition:transform .85s cubic-bezier(.16,1,.3,1) ' +
          (i * 0.045) + 's;';
        inner.textContent = w;
        outer.appendChild(inner);
        h.appendChild(outer);
        if (i < words.length - 1) h.appendChild(document.createTextNode(' '));
      });

      if (!('IntersectionObserver' in window)) {
        h.querySelectorAll('span span').forEach((s) => (s.style.transform = 'none'));
        return;
      }

      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.querySelectorAll('span span').forEach((s) => (s.style.transform = 'none'));
          io.unobserve(e.target);
        });
      }, { threshold: 0.3 });
      io.observe(h);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Member modal                                                        */
  /*                                                                     */
  /* Uses the native <dialog>, which gives us the top layer, ::backdrop  */
  /* and Esc-to-close for free. We only add: scroll lock, backdrop-click */
  /* to dismiss, and returning focus to the card that opened it.         */
  /* ------------------------------------------------------------------ */

  function initModals() {
    const openers = document.querySelectorAll('[data-open-modal]');
    if (!openers.length) return;

    let lastFocused = null;

    const close = (dialog) => {
      if (dialog.classList.contains('modal--inline')) {
        dialog.removeAttribute('open');
        dialog.classList.remove('modal--inline');
        document.body.style.overflow = '';
        return;
      }
      if (dialog.open) dialog.close();
    };

    openers.forEach((btn) => {
      btn.addEventListener('click', () => {
        const dialog = document.getElementById(btn.dataset.openModal);
        if (!dialog) return;

        // <dialog> is unsupported on pre-15.4 Safari. Rather than sending the
        // user to a dead anchor, reveal the panel inline where it already sits
        // in the document and scroll to it.
        if (typeof dialog.showModal !== 'function') {
          dialog.setAttribute('open', '');
          dialog.classList.add('modal--inline');
          dialog.scrollIntoView({ block: 'center', behavior: 'smooth' });
          return;
        }

        lastFocused = btn;
        dialog.showModal();
        document.body.style.overflow = 'hidden';
      });
    });

    document.querySelectorAll('dialog.modal').forEach((dialog) => {
      dialog.querySelectorAll('[data-close-modal]').forEach((btn) => {
        btn.addEventListener('click', () => close(dialog));
      });

      // Click outside the panel dismisses. The dialog element itself fills
      // the viewport, so anything not inside .modal__panel is "outside".
      dialog.addEventListener('click', (e) => {
        if (!e.target.closest('.modal__panel')) close(dialog);
      });

      dialog.addEventListener('close', () => {
        document.body.style.overflow = '';
        if (lastFocused) { lastFocused.focus(); lastFocused = null; }
      });
    });

    // Deep link: arriving at team.html#m-ops opens that person straight away,
    // which is what the cards on the About page link to.
    const hash = window.location.hash.slice(1);
    if (hash) {
      const target = document.getElementById(hash);
      if (target && target.matches('dialog.modal') && typeof target.showModal === 'function') {
        target.showModal();
        document.body.style.overflow = 'hidden';
      }
    }
  }

  /* ------------------------------------------------------------------ */
  /* Image loading states                                                */
  /*                                                                     */
  /* Any <img> inside .img-hold gets a shimmering plate until it decodes. */
  /* Handles the cached case too, where load has already fired.           */
  /* ------------------------------------------------------------------ */

  function initImageLoading() {
    document.querySelectorAll('.img-hold').forEach((hold) => {
      const img = hold.querySelector('img');
      if (!img) { hold.classList.add('is-loaded'); return; }

      const done = () => hold.classList.add('is-loaded');

      if (img.complete && img.naturalWidth > 0) { done(); return; }
      img.addEventListener('load', done, { once: true });
      // A broken src should still clear the shimmer — an endless spinner is
      // worse than a visible gap.
      img.addEventListener('error', done, { once: true });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Hero cursor-reveal                                                  */
  /*                                                                     */
  /* A worn bat sits underneath; the pointer opens a spotlight onto the   */
  /* same bat refurbished. The revealing circle is lerped toward the      */
  /* pointer each frame for a soft, slightly-lagging feel rather than      */
  /* snapping straight to the cursor.                                     */
  /*                                                                       */
  /* Three paths: fine pointer (desktop) gets the live drag; coarse       */
  /* pointer (touch) gets a slow automatic CSS sweep — nobody can hover    */
  /* a phone, so a static circle would just look unfinished; reduced      */
  /* motion gets a fixed partial reveal with no animation loop at all.    */
  /* ------------------------------------------------------------------ */

  function initHeroMark() {
    const orb = document.querySelector('[data-hero-mark]');
    if (!orb) return;

    const glow = orb.querySelector('.hero__logo-glow');
    const img = orb.querySelector('.hero__logo-img');
    const hasFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    // Static mark, no glow/tilt chase: reduced-motion, or no fine pointer
    // to drive it (touch devices just get the plain logo).
    if (prefersReduced || !hasFinePointer) return;

    let w = orb.clientWidth, h = orb.clientHeight;
    let targetGX = w / 2, targetGY = h / 2, targetOpacity = 0;
    let curGX = targetGX, curGY = targetGY, curOpacity = 0;
    let targetTiltX = 0, targetTiltY = 0;
    let curTiltX = 0, curTiltY = 0;
    let raf = null;

    const paint = () => {
      if (glow) {
        glow.style.left = curGX + 'px';
        glow.style.top = curGY + 'px';
        glow.style.opacity = curOpacity;
      }
      if (img) {
        img.style.transform = `perspective(600px) rotateX(${curTiltX}deg) rotateY(${curTiltY}deg)`;
      }
    };

    const tick = () => {
      // Exponential smoothing so the glow trails the pointer and the tilt
      // eases toward it, rather than snapping to a constant-speed step.
      curGX += (targetGX - curGX) * 0.15;
      curGY += (targetGY - curGY) * 0.15;
      curOpacity += (targetOpacity - curOpacity) * 0.15;
      curTiltX += (targetTiltX - curTiltX) * 0.12;
      curTiltY += (targetTiltY - curTiltY) * 0.12;
      paint();
      const settled = Math.abs(targetGX - curGX) < 0.3 && Math.abs(targetGY - curGY) < 0.3 &&
        Math.abs(targetOpacity - curOpacity) < 0.01 && Math.abs(targetTiltX - curTiltX) < 0.05 &&
        Math.abs(targetTiltY - curTiltY) < 0.05;
      raf = settled ? null : requestAnimationFrame(tick);
    };

    const nudge = () => { if (!raf) raf = requestAnimationFrame(tick); };

    orb.addEventListener('pointermove', (e) => {
      const r = orb.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      targetGX = x;
      targetGY = y;
      targetOpacity = 1;
      // -0.5..0.5 offset from centre drives a few degrees of tilt toward
      // the pointer — horizontal offset rotates around the vertical axis
      // and vice versa, so the mark leans into wherever the cursor is.
      const nx = x / r.width - 0.5;
      const ny = y / r.height - 0.5;
      targetTiltY = nx * 16;
      targetTiltX = -ny * 16;
      nudge();
    });

    orb.addEventListener('pointerleave', () => {
      targetOpacity = 0;
      targetTiltX = 0;
      targetTiltY = 0;
      nudge();
    });

    window.addEventListener('resize', () => {
      w = orb.clientWidth; h = orb.clientHeight;
    });
  }

  /* ------------------------------------------------------------------ */
  /* Submit spinner                                                      */
  /*                                                                     */
  /* The real forms POST to FormSubmit and the browser navigates away.   */
  /* Without this the button looks dead for a second or two on 4G.       */
  /* ------------------------------------------------------------------ */

  function initSubmitState() {
    document.querySelectorAll('form[action]').forEach((form) => {
      form.addEventListener('submit', () => {
        if (!form.checkValidity()) return;
        const btn = form.querySelector('[type="submit"]');
        if (!btn || btn.classList.contains('is-busy')) return;

        btn.classList.add('is-busy');
        btn.setAttribute('aria-busy', 'true');
        const label = btn.querySelector('.btn__label') || btn;
        btn.insertAdjacentHTML('afterbegin', '<span class="spinner" aria-hidden="true"></span>');
        if (label !== btn) label.textContent = 'Sending…';

        // Fire a second, silent copy of the submission at that form's own
        // Sheet-logging script — fire-and-forget, never awaited, so a slow
        // or failed request here can't delay or block the real FormSubmit
        // submission the browser is about to carry out on its own. `no-cors`
        // because the Apps Script response isn't readable cross-origin
        // anyway; we only care that the request goes out, not what it
        // replies. Each form has its own independent script + deployment,
        // looked up by its formType hidden field.
        const formType = form.querySelector('[name="formType"]');
        const loggerUrl = formType && SHEET_LOGGER_URLS[formType.value];
        if (loggerUrl) {
          try {
            fetch(loggerUrl, { method: 'POST', mode: 'no-cors', body: new FormData(form) });
          } catch (err) { /* the real submission still goes through regardless */ }
        }
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Current year in the footer                                          */
  /* ------------------------------------------------------------------ */
  /* Page transition — deliberate skeleton screen between pages           */
  /*                                                                       */
  /* Every internal link click is intercepted: the skeleton overlay shows */
  /* immediately, and the real navigation only happens after a fixed ~1s  */
  /* beat. This is a considered pause, not a performance workaround —     */
  /* the delay is intentional even once the browser could navigate         */
  /* instantly.                                                            */
  /*                                                                       */
  /* Left untouched: modified clicks (cmd/ctrl/shift/middle-click, which   */
  /* open a new tab), external links, mailto/tel/hash links, and download  */
  /* links — none of those should be delayed or hijacked.                  */
  /* ------------------------------------------------------------------ */

  function initPageTransitions() {
    const overlay = document.querySelector('[data-page-transition]');
    if (!overlay) return;

    let navigating = false;

    document.addEventListener('click', (e) => {
      if (navigating) return;
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const link = e.target.closest('a[href]');
      if (!link || link.target === '_blank' || link.hasAttribute('download')) return;

      const href = link.getAttribute('href');
      if (!href || /^(#|mailto:|tel:|javascript:)/.test(href)) return;

      let url;
      try { url = new URL(href, window.location.href); } catch (err) { return; }
      if (url.origin !== window.location.origin) return;
      // Same page (identical path, hash ignored) — nothing will actually
      // navigate, so a skeleton-then-reload would just be a pointless flash.
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;

      e.preventDefault();
      navigating = true;
      overlay.classList.add('is-active');
      setTimeout(() => { window.location.href = href; }, 320);
    });

    // A back/forward restore from bfcache can bring this page back with
    // .is-active still set from the instant the user navigated away —
    // without this the overlay would be stuck covering the page.
    window.addEventListener('pageshow', (e) => {
      if (e.persisted) { overlay.classList.remove('is-active'); navigating = false; }
    });
  }

  /* ------------------------------------------------------------------ */

  function initYear() {
    document.querySelectorAll('[data-year]').forEach((el) => {
      el.textContent = String(new Date().getFullYear());
    });
  }

  /* ------------------------------------------------------------------ */
  /* Boot                                                                */
  /* ------------------------------------------------------------------ */

  function boot() {
    if (hasGSAP()) gsap.registerPlugin(ScrollTrigger);

    // Clearing the splash screen goes first: if anything below it threw, the
    // page would otherwise sit behind a preloader that never lifts.
    // Reveals go second for the same reason — content visibility before polish.
    const steps = [
      initPreloader,
      initRevealGroups,
      initReveals,
      initScrubReveals,
      initNav,
      initNavCharSplit,
      initMagnetic,
      initCounters,
      initMarquee,
      initFaq,
      initJourney,
      initParallax,
      initSplitHeadings,
      initModals,
      initImageLoading,
      initHeroMark,
      initSubmitState,
      initPageTransitions,
      initYear
    ];

    // One broken feature shouldn't take the rest of the page down with it.
    steps.forEach((step) => {
      try {
        step();
      } catch (err) {
        console.error('[second-innings] ' + step.name + ' failed:', err);
      }
    });

    if (hasGSAP()) {
      // Recalculate after fonts land, or pinned sections land in the wrong place.
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => ScrollTrigger.refresh());
      }
      window.addEventListener('load', () => ScrollTrigger.refresh());
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
