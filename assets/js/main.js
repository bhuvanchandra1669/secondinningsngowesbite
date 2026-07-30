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

  /* ------------------------------------------------------------------ */
  /* Preloader                                                           */
  /* ------------------------------------------------------------------ */

  function initPreloader() {
    const pre = document.querySelector('.preloader');
    if (!pre) { document.body.classList.remove('is-loading'); heroIn(); return; }

    const bar = pre.querySelector('.preloader__bar span');
    let done = false;

    const finish = () => {
      if (done) return;
      done = true;
      if (bar) bar.style.transition = 'width .4s ease';
      if (bar) bar.style.width = '100%';
      setTimeout(() => {
        pre.style.transition = 'opacity .6s ease, visibility .6s';
        pre.style.opacity = '0';
        pre.style.visibility = 'hidden';
        document.body.classList.remove('is-loading');
        heroIn();
      }, 320);
    };

    // Animate the bar up to 90% while we wait, then complete on load.
    if (bar) {
      let w = 0;
      const tick = setInterval(() => {
        w = Math.min(w + Math.random() * 16, 90);
        bar.style.width = w + '%';
        if (w >= 90) clearInterval(tick);
      }, 130);
    }

    window.addEventListener('load', finish);
    // Never let a slow asset hold the page hostage.
    setTimeout(finish, prefersReduced ? 200 : 2200);
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
  /* Forms                                                               */
  /*                                                                     */
  /* The four real forms POST straight to FormSubmit and are handled by  */
  /* the browser — they carry an `action` and no `data-demo-form`, so    */
  /* none of this runs for them. This handler stays for any form you add */
  /* later that isn't wired to a backend yet: mark it `data-demo-form`   */
  /* and it will validate and show a clearly-labelled fake success.      */
  /* ------------------------------------------------------------------ */

  function initForms() {
    document.querySelectorAll('form[data-demo-form]').forEach((form) => {
      form.addEventListener('submit', (e) => {
        e.preventDefault();

        if (!form.checkValidity()) { form.reportValidity(); return; }

        const btn = form.querySelector('[type="submit"]');
        const original = btn ? btn.innerHTML : '';
        if (btn) { btn.disabled = true; btn.innerHTML = 'Sending…'; }

        setTimeout(() => {
          form.innerHTML =
            '<div style="text-align:center;padding:2.5rem 1rem;">' +
            '<div style="width:64px;height:64px;border-radius:50%;background:rgba(62,158,68,.12);color:#2F7D3A;' +
            'display:grid;place-items:center;margin:0 auto 1.5rem;font-size:1.8rem;">✓</div>' +
            '<h3 style="margin-bottom:.5rem;">Thank you — we&rsquo;ve got it.</h3>' +
            '<p style="color:var(--ink-soft);margin-inline:auto;">Someone from Second Innings will get back to you within 2&ndash;3 days. ' +
            'If it&rsquo;s urgent, email us at <a href="mailto:Manvithreddyyendoti@gmail.com" style="color:var(--accent);">' +
            'Manvithreddyyendoti@gmail.com</a>.</p>' +
            '<p style="margin-top:1.5rem;font-size:.8rem;color:var(--ink-mute);">' +
            '<strong>Developer note:</strong> this form is not connected to anything yet. ' +
            'See README.md &rarr; &ldquo;Connecting the forms&rdquo;.</p>' +
            '</div>';
          if (btn) { btn.disabled = false; btn.innerHTML = original; }
        }, 900);
      });
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
      if (dialog.open) dialog.close();
    };

    openers.forEach((btn) => {
      btn.addEventListener('click', () => {
        const dialog = document.getElementById(btn.dataset.openModal);
        if (!dialog) return;

        // <dialog> is unsupported on some older Androids — fall back to the
        // team page rather than doing nothing at all.
        if (typeof dialog.showModal !== 'function') {
          const href = btn.dataset.fallbackHref;
          if (href) window.location.href = href;
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
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Current year in the footer                                          */
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
      initNav,
      initCounters,
      initMarquee,
      initFaq,
      initJourney,
      initParallax,
      initSplitHeadings,
      initForms,
      initModals,
      initImageLoading,
      initSubmitState,
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
