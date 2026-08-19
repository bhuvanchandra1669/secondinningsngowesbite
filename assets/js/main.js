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
    'Contact': 'https://script.google.com/macros/s/AKfycbxD6qDFPnuh2gJ9-9V4FfkCkZcxqdjvW4FZEryYXuaCTl8hsORmVv1kcUUGr4YAHZmB/exec',
    'Donate Gear': 'https://script.google.com/macros/s/AKfycbyLDEW83vw0FMmsfn4nj0HULKJ3tEAROXVo6Hc-Db2w_jQj_eA5H_UL8RCn_q2g3N2nlQ/exec',
    'Request Equipment': 'https://script.google.com/macros/s/AKfycbxvnWwrQtwE6IPGCmLdxepd7LkAr0PSYdorJVtyMnXIK-_tj-CuIlNLW_cUGbM2JP2Q/exec',
    'Get Involved': 'https://script.google.com/macros/s/AKfycbxIxkVoXU3ZxrN15u6uOkAQcRoATre_-96EvuuyzXRTRR4UAHOwFd2kU84o86Od8_Mx/exec'
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

    // The markup carries the real figure, not a zero, so a visitor with no
    // JavaScript reads "120 items rescued" rather than "0". Once we know
    // we're going to animate it, reset to zero up front — otherwise the
    // number would sit at its final value and then jump backwards to 0 the
    // moment it scrolled into view. Under reduced motion we leave it alone:
    // run() writes the final value straight in, so there is nothing to
    // count and nothing to hide.
    if (!prefersReduced) {
      nums.forEach((el) => { el.textContent = '0'; });
    }

    const format = (v, el) => {
      const dec = parseInt(el.dataset.countDecimals || 0, 10);
      const n = dec ? v.toFixed(dec) : Math.round(v);
      return el.dataset.countPlain === 'true' ? String(n) : Number(n).toLocaleString('en-IN');
    };

    // Odometer digits — each character gets its own little reel. A digit
    // only gets a fresh element (which is what replays its roll-in
    // keyframe) when its value actually changed since the last render;
    // untouched positions are left alone. That's what keeps this reading
    // as individual digits ticking into place rather than the whole
    // number flickering every frame.
    const reelHTML = (ch) => /[0-9]/.test(ch)
      ? '<span class="digit-reel"><span class="digit-reel__inner">' + ch + '</span></span>'
      : '<span class="digit-reel__static">' + ch + '</span>';

    const renderReels = (el, str) => {
      const prevChars = el.dataset.reelChars ? el.dataset.reelChars.split('') : [];
      const chars = str.split('');
      if (chars.length !== prevChars.length || !el.childElementCount) {
        el.innerHTML = chars.map(reelHTML).join('');
      } else {
        chars.forEach((ch, i) => {
          if (ch === prevChars[i]) return;
          const node = el.children[i];
          if (node) node.outerHTML = reelHTML(ch);
        });
      }
      el.dataset.reelChars = str;
    };

    const run = (el) => {
      const target = parseFloat(el.dataset.count);
      const dur = 1700;
      const start = performance.now();
      let lastRender = 0;

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
        // Throttled to ~70ms so each tick is a visible discrete roll
        // rather than a blur of continuous sub-frame updates.
        if (now - lastRender >= 70 || p === 1) {
          renderReels(el, format(target * eased, el));
          lastRender = now;
        }
        if (p < 1) requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
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

  /* ================================================================== */
  /* CINEMATIC LAYER                                                     */
  /*                                                                     */
  /* Continuous motion — a custom cursor, scroll-reactive skew, tilting  */
  /* cards, a pointer spotlight. All of it is enhancement on top of a    */
  /* site that already reads and works with none of it running.          */
  /*                                                                     */
  /* Everything shares ONE rAF loop. Eight effects each spinning up      */
  /* their own requestAnimationFrame is how a page ends up dropping      */
  /* frames on a laptop; one loop with subscribers stays flat.           */
  /* ================================================================== */

  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const canHover = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  const ticker = (function () {
    const subs = [];
    let running = false;
    let last = 0;

    function frame(now) {
      // Clamped so returning to a backgrounded tab doesn't apply one
      // enormous delta and fling everything across the screen.
      const dt = clamp(now - last || 16, 8, 48);
      last = now;
      // Forward order, over a snapshot. Forward because subscribers are
      // registered in dependency order — the shared scroll/pointer reader
      // goes first so everything after it reads this frame's numbers, not
      // the last one's. The snapshot is so a subscriber that removes
      // itself mid-loop (the scramble does) can't shift the list underneath
      // the iteration.
      const frameSubs = subs.slice();
      for (let i = 0; i < frameSubs.length; i++) {
        try {
          frameSubs[i](dt, now);
        } catch (err) {
          console.error('[second-innings] ticker subscriber failed, dropping it:', err);
          const at = subs.indexOf(frameSubs[i]);
          if (at > -1) subs.splice(at, 1);
        }
      }
      if (running && subs.length) requestAnimationFrame(frame);
      else running = false;
    }

    function start() {
      if (running || !subs.length || document.hidden) return;
      running = true;
      last = performance.now();
      requestAnimationFrame(frame);
    }

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) running = false;
      else start();
    });

    return {
      add(fn) { subs.push(fn); start(); },
      remove(fn) {
        const i = subs.indexOf(fn);
        if (i > -1) subs.splice(i, 1);
      }
    };
  })();

  // Read once per frame, shared by everything downstream, so no two
  // effects disagree about where the pointer is or how fast we're moving.
  const pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const scroll = { y: 0, v: 0 };

  function initCinematicState() {
    if (prefersReduced) return;
    scroll.y = window.scrollY;

    window.addEventListener('pointermove', (e) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
    }, { passive: true });

    // Registered before every other effect, so they all read this frame's
    // numbers rather than last frame's.
    ticker.add(() => {
      const y = window.scrollY;
      scroll.v = y - scroll.y;
      scroll.y = y;
    });
  }

  /* ------------------------------------------------------------------ */
  /* Custom cursor                                                       */
  /*                                                                     */
  /* A dot pinned to the pointer and a ring that trails it on a spring.  */
  /* Both blend in difference mode, so they invert whatever is behind    */
  /* them and stay legible on cream, on navy and over photographs        */
  /* without anyone having to tell them which they're on.                */
  /* ------------------------------------------------------------------ */

  function initCursor() {
    if (prefersReduced || !canHover()) return;

    const dot = document.createElement('div');
    const ring = document.createElement('div');
    dot.className = 'cursor-dot';
    ring.className = 'cursor-ring';
    dot.setAttribute('aria-hidden', 'true');
    ring.setAttribute('aria-hidden', 'true');
    document.body.appendChild(dot);
    document.body.appendChild(ring);
    document.documentElement.classList.add('has-cursor');

    const INTERACTIVE = 'a, button, summary, [role="button"], .card, .door, .member, .faq__q';
    const root = document.documentElement;
    let rx = pointer.x;
    let ry = pointer.y;
    let scale = 1;
    let target = 1;

    const over = () => { root.classList.add('cursor-active'); target = 1.5; };
    const out = () => { root.classList.remove('cursor-active'); target = 1; };

    document.addEventListener('pointerover', (e) => {
      if (e.target.closest && e.target.closest(INTERACTIVE)) over();
    });
    document.addEventListener('pointerout', (e) => {
      if (!e.target.closest || !e.target.closest(INTERACTIVE)) return;
      const to = e.relatedTarget;
      if (to && to.closest && to.closest(INTERACTIVE)) return;
      out();
    });
    document.addEventListener('pointerdown', () => { target *= 0.72; });
    document.addEventListener('pointerup', () => {
      target = root.classList.contains('cursor-active') ? 1.5 : 1;
    });
    root.addEventListener('mouseleave', () => root.classList.add('cursor-out'));
    root.addEventListener('mouseenter', () => root.classList.remove('cursor-out'));

    ticker.add(() => {
      dot.style.transform = 'translate3d(' + pointer.x + 'px,' + pointer.y + 'px,0)';
      rx = lerp(rx, pointer.x, 0.19);
      ry = lerp(ry, pointer.y, 0.19);
      scale = lerp(scale, target, 0.16);
      ring.style.transform =
        'translate3d(' + rx + 'px,' + ry + 'px,0) scale(' + scale + ')';
    });
  }

  /* ------------------------------------------------------------------ */
  /* Scroll-velocity skew                                                */
  /*                                                                     */
  /* Content leans into the direction of travel and settles when the     */
  /* page stops. Applied to the inner .wrap rather than the section, so  */
  /* section backgrounds stay put and no diagonal seams open up between  */
  /* a cream block and the navy one below it.                            */
  /*                                                                     */
  /* Any wrap with something sticky inside is left alone — a transform   */
  /* on an ancestor silently kills position:sticky, which is exactly     */
  /* what the journey scrollytelling is built on.                        */
  /* ------------------------------------------------------------------ */

  function initScrollSkew() {
    if (prefersReduced) return;

    const wraps = [].filter.call(
      document.querySelectorAll('main > section > .wrap'),
      (w) => {
        const kids = w.querySelectorAll('*');
        for (let i = 0; i < kids.length; i++) {
          if (getComputedStyle(kids[i]).position === 'sticky') return false;
        }
        return true;
      }
    );
    if (!wraps.length) return;

    wraps.forEach((w) => w.setAttribute('data-skew', ''));

    let skew = 0;

    ticker.add(() => {
      const target = clamp(scroll.v * 0.05, -2.6, 2.6);
      skew = lerp(skew, target, 0.11);
      if (Math.abs(skew) < 0.005) skew = 0;
      const t = skew === 0 ? '' : 'skewY(' + skew.toFixed(3) + 'deg)';
      for (let i = 0; i < wraps.length; i++) wraps[i].style.transform = t;
    });
  }

  /* ------------------------------------------------------------------ */
  /* Marquee, driven by scroll                                           */
  /*                                                                     */
  /* Takes the belt off its CSS animation and onto the ticker, so the    */
  /* direction you scroll pushes it along and it eases back to a slow    */
  /* drift when you stop.                                                */
  /* ------------------------------------------------------------------ */

  function initMarqueeVelocity() {
    if (prefersReduced) return;

    document.querySelectorAll('.marquee').forEach((m) => {
      const tracks = m.querySelectorAll('.marquee__track');
      // initMarquee clones the track to make the loop seamless. Without
      // that clone there's nothing to wrap around to, so leave it be.
      if (tracks.length < 2) return;

      for (let i = 0; i < tracks.length; i++) {
        tracks[i].style.willChange = 'transform';
      }

      let width = tracks[0].getBoundingClientRect().width;
      let x = 0;
      let boost = 0;
      let hovered = false;
      let tookOver = false;

      m.addEventListener('pointerenter', () => { hovered = true; });
      m.addEventListener('pointerleave', () => { hovered = false; });

      if ('ResizeObserver' in window) {
        new ResizeObserver(() => {
          width = tracks[0].getBoundingClientRect().width;
        }).observe(tracks[0]);
      } else {
        window.addEventListener('resize', () => {
          width = tracks[0].getBoundingClientRect().width;
        });
      }

      ticker.add((dt) => {
        // The CSS animation stays on until the very first frame we
        // actually paint. Killing it up front would leave the belt frozen
        // dead if the ticker never got to run — a tab opened in the
        // background and never looked at, say.
        if (!tookOver) {
          tookOver = true;
          for (let i = 0; i < tracks.length; i++) tracks[i].style.animation = 'none';
        }
        boost = lerp(boost, clamp(scroll.v * 0.85, -16, 16), 0.09);
        // Hovering slows the belt to a crawl instead of stopping it dead,
        // so it never looks like it has broken.
        const drift = hovered ? 0.006 : 0.042;
        x -= drift * dt + boost;
        if (width > 0) {
          if (x <= -width) x += width;
          else if (x > 0) x -= width;
        }
        const t = 'translate3d(' + x.toFixed(2) + 'px,0,0)';
        for (let i = 0; i < tracks.length; i++) tracks[i].style.transform = t;
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* 3D tilt with a moving specular sheen                                */
  /* ------------------------------------------------------------------ */

  function initTilt() {
    if (prefersReduced || !canHover()) return;

    const MAX = 6.5;
    const LIFT = 6;
    const items = [];

    document.querySelectorAll('.card, .door, .member').forEach((el) => {
      if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
      el.classList.add('tilt');

      const glare = document.createElement('span');
      glare.className = 'tilt__glare';
      glare.setAttribute('aria-hidden', 'true');
      el.appendChild(glare);

      const item = { el, glare, rx: 0, ry: 0, lift: 0, tx: 0, ty: 0, tl: 0, live: false };
      items.push(item);

      el.addEventListener('pointerenter', () => {
        item.live = true;
        item.tl = 1;
        el.classList.add('is-tilting');
      });
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        // A zero-sized rect would divide out to NaN and write garbage into
        // the glare's custom properties, which fails silently in CSS.
        if (!r.width || !r.height) return;
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        item.tx = (0.5 - py) * MAX * 2;
        item.ty = (px - 0.5) * MAX * 2;
        glare.style.setProperty('--gx', (px * 100).toFixed(1) + '%');
        glare.style.setProperty('--gy', (py * 100).toFixed(1) + '%');
      });
      el.addEventListener('pointerleave', () => {
        item.live = false;
        item.tx = 0;
        item.ty = 0;
        item.tl = 0;
        el.classList.remove('is-tilting');
      });
    });

    if (!items.length) return;

    ticker.add(() => {
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const settled =
          !it.live &&
          Math.abs(it.rx) < 0.02 && Math.abs(it.ry) < 0.02 && Math.abs(it.lift) < 0.02;

        if (settled) {
          // Hand the element back to CSS so its own :hover rules apply.
          if (it.el.style.transform) it.el.style.transform = '';
          continue;
        }
        it.rx = lerp(it.rx, it.tx, 0.13);
        it.ry = lerp(it.ry, it.ty, 0.13);
        it.lift = lerp(it.lift, it.tl, 0.13);
        it.el.style.transform =
          'perspective(900px) rotateX(' + it.rx.toFixed(2) + 'deg) rotateY(' +
          it.ry.toFixed(2) + 'deg) translateY(' + (-it.lift * LIFT).toFixed(2) + 'px)';
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /* Text scramble                                                       */
  /*                                                                     */
  /* Section labels resolve out of noise, character by character, the    */
  /* first time they're scrolled to. Short uppercase strings only —      */
  /* running this on body copy would just be unreadable.                 */
  /* ------------------------------------------------------------------ */

  function initScramble() {
    if (prefersReduced || !('IntersectionObserver' in window)) return;

    const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#*/\\';
    const DUR = 640;

    const run = (el) => {
      const final = el.textContent;
      const chars = final.split('');
      const started = performance.now();
      el.classList.add('is-scrambling');

      // A finite animation on an endless loop: it takes itself back off
      // the ticker the moment it has resolved.
      const step = (dt, now) => {
        const p = clamp((now - started) / DUR, 0, 1);
        if (p >= 1) {
          el.textContent = final;
          el.classList.remove('is-scrambling');
          ticker.remove(step);
          return;
        }
        let out = '';
        for (let i = 0; i < chars.length; i++) {
          const ch = chars[i];
          if (ch === ' ') { out += ' '; continue; }
          // Each character locks in at its own moment, left to right.
          const lock = (i / chars.length) * 0.7 + 0.3;
          out += p >= lock ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0];
        }
        el.textContent = out;
      };

      ticker.add(step);
    };

    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        run(e.target);
      });
    }, { threshold: 0.9 });

    document.querySelectorAll('.eyebrow').forEach((el) => {
      // Text-only labels, and short enough that scrambling reads as an
      // effect rather than as the page having broken.
      if (el.children.length) return;
      if (el.textContent.trim().length > 28) return;
      io.observe(el);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Pointer spotlight + ambient drift on the dark blocks                */
  /* ------------------------------------------------------------------ */

  function initSpotlight() {
    if (prefersReduced || !canHover()) return;

    document.querySelectorAll('.section--dark').forEach((sec) => {
      const light = document.createElement('div');
      light.className = 'spotlight';
      light.setAttribute('aria-hidden', 'true');
      sec.insertBefore(light, sec.firstChild);

      sec.addEventListener('pointerenter', () => sec.classList.add('is-lit'));
      sec.addEventListener('pointerleave', () => sec.classList.remove('is-lit'));
      sec.addEventListener('pointermove', (e) => {
        const r = sec.getBoundingClientRect();
        if (!r.width || !r.height) return;
        light.style.setProperty('--sx', (((e.clientX - r.left) / r.width) * 100).toFixed(1) + '%');
        light.style.setProperty('--sy', (((e.clientY - r.top) / r.height) * 100).toFixed(1) + '%');
      }, { passive: true });
    });
  }

  function initDrift() {
    if (prefersReduced) return;

    const sections = document.querySelectorAll('.section--dark');
    if (!sections.length) return;

    const all = [];

    sections.forEach((sec) => {
      const layer = document.createElement('div');
      layer.className = 'drift';
      layer.setAttribute('aria-hidden', 'true');

      const motes = [];
      for (let i = 0; i < 7; i++) {
        const solid = i % 3 === 0;
        const size = solid ? 4 + Math.random() * 4 : 30 + Math.random() * 90;
        const el = document.createElement('span');
        el.className = 'drift__mote' + (solid ? ' drift__mote--solid' : '');
        el.style.width = size.toFixed(0) + 'px';
        el.style.height = size.toFixed(0) + 'px';
        layer.appendChild(el);
        motes.push({
          el,
          x: Math.random() * 100,
          y: Math.random() * 100,
          vx: (Math.random() - 0.5) * 0.0045,
          vy: (Math.random() - 0.5) * 0.0045
        });
      }

      sec.insertBefore(layer, sec.firstChild);
      const entry = { motes, visible: false };
      all.push(entry);

      if ('IntersectionObserver' in window) {
        new IntersectionObserver((es) => {
          entry.visible = es[0].isIntersecting;
        }, { threshold: 0 }).observe(sec);
      } else {
        entry.visible = true;
      }
    });

    ticker.add((dt) => {
      for (let s = 0; s < all.length; s++) {
        // Offscreen sections cost nothing — no point animating motes
        // nobody is looking at.
        if (!all[s].visible) continue;
        const motes = all[s].motes;
        for (let i = 0; i < motes.length; i++) {
          const m = motes[i];
          m.x += m.vx * dt;
          m.y += m.vy * dt;
          if (m.x < -20) m.x = 120;
          else if (m.x > 120) m.x = -20;
          if (m.y < -20) m.y = 120;
          else if (m.y > 120) m.y = -20;
          m.el.style.transform =
            'translate3d(' + m.x.toFixed(2) + 'vw,' + m.y.toFixed(2) + '%,0)';
        }
      }
    });
  }

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
      initYear,

      // Cinematic layer. initCinematicState registers the shared
      // pointer/scroll reader first, so every effect after it reads the
      // same frame's numbers.
      initCinematicState,
      initCursor,
      initScrollSkew,
      initMarqueeVelocity,
      initTilt,
      initScramble,
      initSpotlight,
      initDrift
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
