// ===== COMPANY PERSONALIZATION =====
// Loaded only by custom.html. Reads ?company=Name from the URL, overrides hero/CTA/personalNote
// from companies.json. index.html (the generic version) never loads this file, so /?company=X
// on the landing page stays fully generic.
(function personalize() {
  function sanitize(s) {
    // Strip characters that could break out of textContent or inject HTML from URL params.
    return String(s).replace(/[<>"'`]/g, '').trim().slice(0, 60);
  }

  function applyWhyHeading(name) {
    const box = document.getElementById('whyBigText');
    if (!box) return;
    const LONG_THRESHOLD = 10;
    if (name.length > LONG_THRESHOLD) {
      // 3-line: brand on its own middle line
      const line1 = document.createElement('div'); line1.className = 'why-big-line'; line1.textContent = 'Why';
      const line2 = document.createElement('div'); line2.className = 'why-big-line why-big-target why-big-target--solo'; line2.textContent = name;
      const line3 = document.createElement('div'); line3.className = 'why-big-line'; line3.textContent = 'should work with me?';
      box.replaceChildren(line1, line2, line3);
    } else {
      // 2-line: brand inline with "Why"
      const line1 = document.createElement('div'); line1.className = 'why-big-line why-big-line--prefix';
      line1.appendChild(document.createTextNode('Why '));
      const target = document.createElement('span'); target.className = 'why-big-target'; target.textContent = name;
      line1.appendChild(target);
      const line2 = document.createElement('div'); line2.className = 'why-big-line'; line2.textContent = 'should work with me?';
      box.replaceChildren(line1, line2);
    }
  }

  function setText(selector, value) {
    const el = document.querySelector(selector);
    if (el && typeof value === 'string') el.textContent = value;
  }

  function setHTML(selector, value) {
    // Safe: values come from companies.json (site-owner-controlled), not from the URL.
    const el = document.querySelector(selector);
    if (el && typeof value === 'string') el.innerHTML = value;
  }

  function applyPersonalNote(cfg) {
    if (!cfg || typeof cfg !== 'object') return;
    const section = document.getElementById('personalNote');
    if (!section) return;

    if (typeof cfg.eyebrow === 'string') setText('#personalNoteEyebrow', cfg.eyebrow);
    if (typeof cfg.title === 'string')   setHTML('#personalNoteTitle',   cfg.title);
    if (typeof cfg.intro === 'string')   setHTML('#personalNoteIntro',   cfg.intro);

    // Three yellow-family tapes (butter / gold / lemon) — stays within the site's palette, no red/orange
    const TAPE_STYLES = [
      { color: 'hsla(48, 95%, 72%, 0.85)', rot: '-4deg' },
      { color: 'hsla(40, 92%, 68%, 0.85)', rot: '3deg'  },
      { color: 'hsla(54, 88%, 74%, 0.85)', rot: '-2deg' }
    ];

    const pointsBox = document.getElementById('personalNotePoints');
    if (pointsBox && Array.isArray(cfg.points)) {
      pointsBox.replaceChildren();
      cfg.points.slice(0, 3).forEach((p, i) => {
        if (!p || typeof p !== 'object') return;
        const card = document.createElement('div');
        card.className = 'personal-note-card';

        const tape = document.createElement('div');
        tape.className = 'polaroid-tape';
        const style = TAPE_STYLES[i % TAPE_STYLES.length];
        tape.style.setProperty('--tape', style.color);
        tape.style.setProperty('--tape-rot', style.rot);

        const num = document.createElement('span');
        num.className = 'personal-note-card-num';
        num.textContent = String(i + 1).padStart(2, '0');

        const title = document.createElement('h3');
        title.className = 'personal-note-card-title';
        if (typeof p.title === 'string') title.innerHTML = p.title;

        const body = document.createElement('p');
        body.className = 'personal-note-card-body';
        if (typeof p.body === 'string') body.innerHTML = p.body;

        card.append(tape, num, title, body);
        pointsBox.appendChild(card);
      });
    }

    document.body.classList.add('has-personal-note');
    section.setAttribute('aria-hidden', 'false');

    // Reveal cards when they scroll into view (stagger handled by CSS :nth-child delays)
    if (pointsBox && 'IntersectionObserver' in window) {
      const obs = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            document.body.classList.add('personal-note-visible');
            obs.disconnect();
          }
        });
      }, { threshold: 0.15 });
      obs.observe(pointsBox);
    } else {
      document.body.classList.add('personal-note-visible');
    }
  }

  try {
    const params = new URLSearchParams(window.location.search);
    const raw = sanitize(params.get('company') || '');
    if (!raw) return;

    // Step 1 — immediate personalization from URL param (works even if JSON fetch fails)
    applyWhyHeading(raw);
    if (document.title && !document.title.includes(raw)) {
      document.title = `Tanya × ${raw}`;
    }

    // Step 2 — async overrides from companies.json.
    // Strip parenthetical suffixes first so "Famyo (via Uplers)" → "famyo" matches the base entry.
    const lookupKey = raw
      .toLowerCase()
      .replace(/\s*\([^)]*\)/g, '')   // drop "(via Uplers)", "(YC W21)" etc.
      .trim()
      .replace(/\s+/g, '-');
    fetch('companies.json', { cache: 'no-cache' })
      .then(res => res.ok ? res.json() : {})
      .then(all => {
        const config = all && all[lookupKey];
        if (!config) return;

        const displayName = typeof config.displayName === 'string' ? config.displayName : raw;
        applyWhyHeading(displayName);
        // Always overwrite with the canonical displayName so "Tanya × Famyo (via Uplers)"
        // becomes "Tanya × Famyo" once the JSON entry loads.
        document.title = `Tanya × ${displayName}`;

        // Hero headline AND subtext are intentionally NOT overridden per company —
        // they stay constant as Tanya's opening line across every page (generic +
        // all company-specific). Per-company customization lives in the "Why I'm
        // writing to you" card and the CTA section only.
        if (config.ctaTitle)    setText('.cta-title',    config.ctaTitle);
        if (config.ctaDesc)     setText('.cta-desc',     config.ctaDesc);

        if (config.personalNote) applyPersonalNote(config.personalNote);
      })
      .catch(() => { /* keep URL-param defaults */ });
  } catch (_) { /* no-op */ }
})();
