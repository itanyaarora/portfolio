// ===== COMPANY PERSONALIZATION =====
// If the URL has ?company=Name, rewrite the "Why you should work with me"
// big background heading. Short names (≤10 chars) keep the 2-line layout
// ("Why Uber" / "should work with me?"); longer names get a 3-line layout
// ("Why" / "California Burrito" / "should work with me?") so the brand name
// has its own line and the design stays balanced.
(function applyCompanyPersonalization() {
  try {
    const params  = new URLSearchParams(window.location.search);
    const company = (params.get('company') || '').trim();
    if (!company) return;

    const box = document.getElementById('whyBigText');
    if (!box) return;

    const LONG_THRESHOLD = 10;
    if (company.length > LONG_THRESHOLD) {
      // 3-line layout: brand on its own middle line
      box.innerHTML = `
        <div class="why-big-line">Why</div>
        <div class="why-big-line why-big-target why-big-target--solo">${company}</div>
        <div class="why-big-line">should work with me?</div>
      `;
    } else {
      // 2-line layout: brand inline with "Why"
      const target = box.querySelector('.why-big-target');
      if (target) target.textContent = company;
    }

    // Update the page title for shared links
    if (document.title && !document.title.includes(company)) {
      document.title = `Tanya × ${company}`;
    }
  } catch (_) { /* no-op */ }
})();

// ===== VIDEO PLAYER =====
const video = document.getElementById('heroVideo');
const videoBtn = document.getElementById('videoBtn');
const videoWrapper = document.getElementById('videoWrapper');
const iconPlay = videoBtn.querySelector('.icon-play');
const iconPause = videoBtn.querySelector('.icon-pause');

// State: 'preview' = silent loop, 'playing' = full audio, 'paused' = user paused
let videoState = 'preview';

function setPlayingUI(active) {
  iconPlay.style.display = active ? 'none' : 'flex';
  iconPause.style.display = active ? 'flex' : 'none';
  videoWrapper.classList.toggle('playing', active);
}

// Auto-start silent looping preview on load
video.muted = true;
video.loop = true;
video.play().catch(() => {}); // browsers allow muted autoplay

videoBtn.addEventListener('click', () => {
  if (videoState === 'preview' || videoState === 'paused') {
    // Start from beginning with audio
    video.loop = false;
    video.currentTime = 0;
    video.muted = false;
    video.volume = 1.0;
    video.play().catch(() => {
      // Fallback: some browsers still need a muted start
      video.muted = true;
      video.play().then(() => { video.muted = false; }).catch(() => {});
    });
    videoState = 'playing';
    setPlayingUI(true);
  } else if (videoState === 'playing') {
    video.pause();
    videoState = 'paused';
    setPlayingUI(false);
  }
});

video.addEventListener('ended', () => {
  // After full audio play ends, go back to silent preview loop
  video.muted = true;
  video.loop = true;
  video.currentTime = 0;
  video.play().catch(() => {});
  videoState = 'preview';
  setPlayingUI(false);
});

// Auto-pause when scrolled away
const aboutSection = document.querySelector('.about');
window.addEventListener('scroll', () => {
  if (!aboutSection) return;
  const aboutTop = aboutSection.getBoundingClientRect().top;
  const videoBottom = videoWrapper.getBoundingClientRect().bottom;
  if (aboutTop < videoBottom && videoState === 'playing') {
    video.pause();
    videoState = 'paused';
    setPlayingUI(false);
  }
}, { passive: true });

// ===== SCROLL FADE-IN ANIMATIONS =====
const fadeElements = document.querySelectorAll(
  '.section-title, .section-eyebrow, .section-subtext, .section-desc, ' +
  '.work-card, .service-column, .about-intro, .about-text, .photo-collage, ' +
  '.testimonial-video-card, .testimonial-quote-card, .cta-box'
);

fadeElements.forEach(el => el.classList.add('fade-in'));

// Hero elements animate in on load
const heroElements = document.querySelectorAll(
  '.hero-greeting, .hero-headline, .hero-subtext, .hero .cta-button, .hero-video'
);
heroElements.forEach((el, i) => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(20px)';
  el.style.transition = `opacity 0.7s ease-out ${i * 0.15}s, transform 0.7s ease-out ${i * 0.15}s`;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    });
  });
});

const fadeObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      fadeObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.05, rootMargin: '0px 0px -20px 0px' });

fadeElements.forEach(el => fadeObserver.observe(el));

// ===== FLOATING CTA =====
const floatCta = document.getElementById('floatCta');
const heroSection = document.querySelector('.hero');

const ctaObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) {
      floatCta.classList.add('visible');
    } else {
      floatCta.classList.remove('visible');
    }
  });
}, { threshold: 0.1 });

ctaObserver.observe(heroSection);

// ===== SCROLL REVEAL =====
const revealEls = document.querySelectorAll('.reveal');

function checkReveals() {
  revealEls.forEach(el => {
    if (el.getBoundingClientRect().top < window.innerHeight * 0.88) {
      el.classList.add('revealed');
    }
  });
}

document.body.addEventListener('scroll', checkReveals, { passive: true });
document.addEventListener(     'scroll', checkReveals, { passive: true });
window.addEventListener(       'scroll', checkReveals, { passive: true });
checkReveals(); // run once on load for anything already in view

// ===== AUDIO =====
const bgMusic      = document.getElementById('bgMusic');
const muteBtn      = document.getElementById('muteBtn');
const ctaFooter    = document.querySelector('.cta-footer');
const dancingGirl  = document.getElementById('dancingGirl');
const GIRL_STATIC  = dancingGirl ? dancingGirl.dataset.static   : null;
const GIRL_ANIMATED = dancingGirl ? dancingGirl.dataset.animated : null;

let songPlayed     = false;
let userPausedHere = false; // user clicked "Shh" while CTA is in view → don't auto-resume until scroll-away

if (bgMusic) bgMusic.volume = 1.0;

function checkMusicTrigger() {
  if (!bgMusic || !ctaFooter) return;
  const rect    = ctaFooter.getBoundingClientRect();
  const inView  = rect.top < window.innerHeight * 0.85 && rect.bottom > 0;

  if (inView) {
    if (!songPlayed) {
      // First time entering — start from the beginning
      songPlayed = true;
      bgMusic.currentTime = 0;
    }
    // Resume (or start) only if not already playing, song hasn't ended,
    // AND the user hasn't explicitly paused while staying in this section.
    if (bgMusic.paused && !bgMusic.ended && !userPausedHere) {
      bgMusic.play().catch(() => {
        songPlayed = false; // reset so it can retry
      });
    }
  } else {
    // Scrolled away — pause without resetting position; clear the user-paused flag
    // so the song can resume naturally when they come back, and hide the button
    // so it doesn't linger outside the CTA section.
    userPausedHere = false;
    if (!bgMusic.paused) bgMusic.pause();
    if (muteBtn) muteBtn.style.display = 'none';
  }
}

// body is the scroll container — listen on body, document and window for full coverage
document.body.addEventListener('scroll', checkMusicTrigger, { passive: true });
document.addEventListener(     'scroll', checkMusicTrigger, { passive: true });
window.addEventListener(       'scroll', checkMusicTrigger, { passive: true });
checkMusicTrigger();

// Music toggle button — click to pause, click again to resume.
// Text + sound-wave animation reflect the current state.
const muteLabel   = muteBtn ? muteBtn.querySelector('.mute-label') : null;
const LABEL_PLAYING = 'Shh, I am in a meeting';
const LABEL_PAUSED  = 'Click me if you wanna hear a song';

if (muteBtn && bgMusic) {
  muteBtn.addEventListener('click', () => {
    if (bgMusic.paused) {
      userPausedHere = false;
      bgMusic.play().catch(() => {});
    } else {
      userPausedHere = true;
      bgMusic.pause();
    }
  });
}

// Dancing girl: animate while music plays, freeze on first frame when paused.
// Party lights + button label + sound-wave rays sync with play/pause state.
const partyLights = document.getElementById('partyLights');
if (bgMusic) {
  bgMusic.addEventListener('play', () => {
    if (muteBtn) {
      muteBtn.style.display = 'flex';
      muteBtn.classList.add('is-playing');
      muteBtn.setAttribute('aria-label', 'Pause music');
    }
    if (muteLabel) muteLabel.textContent = LABEL_PLAYING;
    if (dancingGirl && GIRL_ANIMATED && dancingGirl.getAttribute('src') !== GIRL_ANIMATED) {
      dancingGirl.setAttribute('src', GIRL_ANIMATED);
    }
    if (partyLights) partyLights.classList.add('is-on');
  });
  const pauseUI = () => {
    if (muteBtn) {
      // Keep the button visible while the user is still on this section.
      // checkMusicTrigger hides it (via display:none) only when scrolling away.
      muteBtn.classList.remove('is-playing');
      muteBtn.setAttribute('aria-label', 'Play music');
    }
    if (muteLabel) muteLabel.textContent = LABEL_PAUSED;
    if (dancingGirl && GIRL_STATIC && dancingGirl.getAttribute('src') !== GIRL_STATIC) {
      dancingGirl.setAttribute('src', GIRL_STATIC);
    }
    if (partyLights) partyLights.classList.remove('is-on');
  };
  bgMusic.addEventListener('pause', pauseUI);
  bgMusic.addEventListener('ended', pauseUI);
}

// ===== DISCO BALL (synced to bgMusic) =====
// Drops in from above when music plays, retracts when paused or user scrolls away.
const discoBallWrap = document.getElementById('discoBallWrap');
const discoBallEl   = document.getElementById('discoBall');
let discoAnim = null;

function initDiscoBall() {
  if (!discoBallEl || !window.lottie || discoAnim) return;
  discoAnim = window.lottie.loadAnimation({
    container: discoBallEl,
    renderer:  'svg',
    loop:      true,
    autoplay:  false,
    path:      'discoball.json'
  });
}

// Lottie CDN may load after this script — wait for it if needed.
if (window.lottie) {
  initDiscoBall();
} else {
  window.addEventListener('load', initDiscoBall);
}

if (bgMusic) {
  bgMusic.addEventListener('play', () => {
    initDiscoBall();
    if (discoBallWrap) discoBallWrap.classList.add('is-dropping');
    if (discoAnim)     discoAnim.play();
  });
  bgMusic.addEventListener('pause', () => {
    if (discoBallWrap) discoBallWrap.classList.remove('is-dropping');
    if (discoAnim)     discoAnim.pause();
  });
  bgMusic.addEventListener('ended', () => {
    if (discoBallWrap) discoBallWrap.classList.remove('is-dropping');
    if (discoAnim)     discoAnim.pause();
  });
}

// ===== WHY WORK WITH ME =====
const whySection = document.querySelector('.why-work');
const whyCards   = document.querySelectorAll('.why-card');
function updateWhyCards() {
  if (!whySection || !whyCards.length) return;
  const rect            = whySection.getBoundingClientRect();
  const totalScrollable = whySection.offsetHeight - window.innerHeight;
  if (totalScrollable <= 0) return;

  const scrolled = -rect.top;
  const progress = Math.max(0, Math.min(1, scrolled / totalScrollable));

  // Why-work's scroll budget is split into three zones (see .why-work height):
  //   1. Card reveal  →  1100px  (cards 1–5 slide up)
  //   2. Read pause   →   400px  (all cards visible, nothing moves — reader catches up)
  //   3. Services up  →  100vh   (services rises from below to cover the pinned sticky)
  // Card 5 must arrive at the END of zone 1, which is 1100 / (1100 + 400 + 100vh).
  // With 100vh ≈ 720px: 1100 / 2220 ≈ 0.50, so cardEnd ≈ 0.50.
  const cardStart = 0.05;
  const cardEnd   = 0.50;
  const n = whyCards.length;
  const cardProgress = Math.max(0, Math.min(1, (progress - cardStart) / (cardEnd - cardStart)));

  whyCards.forEach((card, i) => {
    // Even distribution so card 5 arrives at cardProgress = 1 (== end of zone 1).
    // After that the 400px pause gives the reader time before zone 3 begins.
    const threshold = (i + 1) / n;
    if (cardProgress >= threshold - 0.001) {
      card.classList.add('shown');
    } else {
      card.classList.remove('shown');
    }
  });
}

document.body.addEventListener('scroll', updateWhyCards, { passive: true });
document.addEventListener(     'scroll', updateWhyCards, { passive: true });
window.addEventListener(       'scroll', updateWhyCards, { passive: true });
updateWhyCards();

// ===== CAROUSEL BLUR FADE =====
const carouselImgs = document.querySelectorAll('.carousel-track img');

const blurObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    const ratio = entry.intersectionRatio;
    if (ratio >= 0.5) {
      // More than 50% visible — clear blur progressively
      const t = (ratio - 0.5) / 0.5; // 0 at 50%, 1 at 100%
      const blur = 3 * (1 - t);
      const brightness = 0.8 + 0.2 * t;
      const sat = 0.7 + 0.3 * t;
      entry.target.style.filter = `blur(${blur.toFixed(1)}px) brightness(${brightness.toFixed(2)}) saturate(${sat.toFixed(2)})`;
    } else {
      entry.target.style.filter = 'blur(3px) brightness(0.8) saturate(0.7)';
    }
  });
}, { threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0] });

carouselImgs.forEach(img => blurObserver.observe(img));

// ===== JOURNEY — horizontal scroll (smooth, eased) + driving car =====
const journeySection   = document.querySelector('.journey');
const journeyTrack     = document.getElementById('journeyTrack');
const journeyCar       = document.getElementById('journeyCar');
const journeyTrail     = document.getElementById('journeyTrail');
const journeyTitleEl   = document.getElementById('journeyTitle');
const journeyTitleCard = document.getElementById('journeyTitleCard');
const journeyPolaroids = document.getElementById('journeyPolaroids');
const JOURNEY_PANELS   = 3;

// Phase 1 ends at this progress (horizontal scroll done)
// At 450vh total (350vh scrollable), 0.72 = ~252vh horiz, 0.28 = ~98vh for settle + card
const PHASE1_END = 0.72;

// Bell-curve easing: slow → fast → slow (ease in-out sine)
const easeInOutSine = t => -(Math.cos(Math.PI * t) - 1) / 2;

// Lerped targets for buttery-smooth motion
let journeyTarget  = 0;
let journeyCurrent = 0;
let carTargetX     = 0;
let carCurrentX    = 0;
let journeyVertTarget  = 0;
let journeyVertCurrent = 0;
// Polaroid slide-up: 1.0 = fully below viewport, 0.0 = settled at rest
let polaroidTarget  = 1;
let polaroidCurrent = 1;
let lastRawProgress = 0;

// Scroll-activity detection for car idle vs driving
let scrollTimer    = null;
let isScrolling    = false;

function setCarDriving(driving) {
  if (!journeyCar) return;
  if (driving && !isScrolling)  { isScrolling = true;  journeyCar.classList.add('is-driving'); }
  if (!driving && isScrolling)  { isScrolling = false;  journeyCar.classList.remove('is-driving'); }
}

function updateJourney() {
  if (!journeySection || !journeyTrack) return;
  const rect            = journeySection.getBoundingClientRect();
  const totalScrollable = journeySection.offsetHeight - window.innerHeight;
  if (totalScrollable <= 0) return;
  const scrolled    = Math.max(0, -rect.top);
  // Animation budget: only the first portion drives the animation;
  // the rest is dead scroll for the why-work card to slide up over
  const animBudget  = totalScrollable - window.innerHeight; // reserve 100vh for card overlap
  const rawProgress = Math.min(1, Math.max(0, scrolled / Math.max(1, animBudget)));

  // Detect if user is actively scrolling
  if (Math.abs(rawProgress - lastRawProgress) > 0.001) {
    setCarDriving(true);
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => setCarDriving(false), 180);
  }
  lastRawProgress = rawProgress;

  // ── PHASE 1: horizontal scroll (0 → PHASE1_END) ──
  const horizP = Math.min(1, rawProgress / PHASE1_END);
  const eased  = easeInOutSine(horizP);
  journeyTarget = -eased * (100 * (JOURNEY_PANELS - 1) / JOURNEY_PANELS);

  // Car: enters (panel 1), centered (panel 2), drives off (panel 3)
  const viewportW = window.innerWidth;
  const carW      = 300;
  const centerX   = (viewportW - carW) / 2;

  if (horizP <= 0.33) {
    const t = horizP / 0.33;
    carTargetX = t * centerX;
  } else if (horizP <= 0.66) {
    carTargetX = centerX;
  } else {
    const t = (horizP - 0.66) / 0.34;
    carTargetX = centerX + t * (viewportW - centerX + 100);
  }

  // ── PHASE 2: title + track scroll up, polaroids slide up from below ──
  // Everything settles into a fixed layout, then dead scroll for card overlap.
  const phase2P = Math.max(0, (rawProgress - PHASE1_END) / (1 - PHASE1_END));

  // settleT completes 0→1 within first 40% of phase 2 (smooth, not jumpy)
  const settleT = Math.min(1, phase2P / 0.40);

  // Track + title move up by 30% of viewport — enough to push "My journey" fully
  // off screen while keeping "50 Creative Careers" centered below the navbar.
  journeyVertTarget = settleT * window.innerHeight * 0.30;

  // Polaroids slide up from translateY(100%) to translateY(0) in the same window
  polaroidTarget = 1 - settleT;

  if (phase2P > 0) {
    // Hide car once it exits and hide the phase-1 trail (polaroid border-top takes over)
    if (journeyCar) journeyCar.style.visibility = 'hidden';
    if (journeyTrail) journeyTrail.classList.add('is-hidden');
    if (journeyPolaroids) journeyPolaroids.classList.add('is-visible');
  } else {
    // Reset phase 2 styles
    journeyVertTarget = 0;
    polaroidTarget = 1;
    if (journeyCar) journeyCar.style.visibility = '';
    if (journeyTrail) journeyTrail.classList.remove('is-hidden');
    if (journeyPolaroids) journeyPolaroids.classList.remove('is-visible');
  }
}

function animateJourney() {
  // Lerp track horizontal — higher lerp for snappy feel
  const trackGap = Math.abs(journeyTarget - journeyCurrent);
  const trackLerp = trackGap > 5 ? 0.5 : 0.18;
  journeyCurrent += (journeyTarget - journeyCurrent) * trackLerp;

  // Lerp track vertical — smooth scroll up in phase 2
  const vertGap = Math.abs(journeyVertTarget - journeyVertCurrent);
  const vertLerp = vertGap > 20 ? 0.35 : 0.15;
  journeyVertCurrent += (journeyVertTarget - journeyVertCurrent) * vertLerp;

  // Lerp polaroid slide-up (1 → 0)
  const polGap = Math.abs(polaroidTarget - polaroidCurrent);
  const polLerp = polGap > 0.1 ? 0.35 : 0.15;
  polaroidCurrent += (polaroidTarget - polaroidCurrent) * polLerp;

  if (journeyTrack) {
    journeyTrack.style.transform = `translate3d(${journeyCurrent.toFixed(3)}%, ${-journeyVertCurrent.toFixed(1)}px, 0)`;
  }
  // Move the "My journey" title up with the track so it scrolls out of view
  if (journeyTitleEl) {
    journeyTitleEl.style.transform = `translate3d(0, ${-journeyVertCurrent.toFixed(1)}px, 0)`;
  }
  // Slide polaroid stage up from below
  if (journeyPolaroids) {
    journeyPolaroids.style.transform = `translate3d(0, ${(polaroidCurrent * 100).toFixed(2)}%, 0)`;
  }
  // Lerp car
  const carGap = Math.abs(carTargetX - carCurrentX);
  const carLerp = carGap > 100 ? 0.5 : 0.10;
  carCurrentX += (carTargetX - carCurrentX) * carLerp;
  if (journeyCar) {
    journeyCar.style.transform = `translateX(${carCurrentX.toFixed(1)}px)`;
  }
  // Trail follows behind the car (only in phase 1, phase 2 hides it via class)
  if (journeyTrail && journeyVertTarget === 0) {
    journeyTrail.style.width = Math.max(0, carCurrentX).toFixed(1) + 'px';
  }
  requestAnimationFrame(animateJourney);
}
animateJourney();

window.addEventListener('scroll', updateJourney, { passive: true });
document.addEventListener(     'scroll', updateJourney, { passive: true });
window.addEventListener(       'scroll', updateJourney, { passive: true });
updateJourney();

// ===== POLAROID GRID — drag-to-pan (no scroll container) =====
// The grid uses overflow: visible so vertical wheel/trackpad events bubble
// naturally to the window. Horizontal panning is implemented with pointer
// drag + translateX, so no native scroll container is involved.
const careersPolaroidGrid = document.getElementById('careersPolaroidGrid');
if (careersPolaroidGrid) {
  let gridOffset    = 0;
  let dragStartX    = 0;
  let dragStartOff  = 0;
  let isDraggingGrid = false;
  let activePointer = null;

  const getMaxOffset = () => {
    // Cards extend beyond the viewport; compute how far left we can drag.
    // scrollWidth is the full content width; clientWidth is the visible area.
    const overflow = careersPolaroidGrid.scrollWidth - careersPolaroidGrid.clientWidth;
    return -Math.max(0, overflow);
  };

  const applyOffset = () => {
    const maxOff = getMaxOffset();
    if (gridOffset < maxOff) gridOffset = maxOff;
    if (gridOffset > 0) gridOffset = 0;
    careersPolaroidGrid.style.transform = `translate3d(${gridOffset}px, 0, 0)`;
  };

  careersPolaroidGrid.addEventListener('pointerdown', (e) => {
    // Only left-click / touch / pen; ignore right-click etc.
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    isDraggingGrid = true;
    activePointer  = e.pointerId;
    dragStartX     = e.clientX;
    dragStartOff   = gridOffset;
    careersPolaroidGrid.setPointerCapture(e.pointerId);
    careersPolaroidGrid.classList.add('is-dragging');
  });

  careersPolaroidGrid.addEventListener('pointermove', (e) => {
    if (!isDraggingGrid || e.pointerId !== activePointer) return;
    const dx = e.clientX - dragStartX;
    gridOffset = dragStartOff + dx;
    applyOffset();
  });

  const endDrag = (e) => {
    if (!isDraggingGrid) return;
    if (e && e.pointerId !== activePointer) return;
    isDraggingGrid = false;
    activePointer  = null;
    careersPolaroidGrid.classList.remove('is-dragging');
    try { careersPolaroidGrid.releasePointerCapture(e.pointerId); } catch (_) {}
  };
  careersPolaroidGrid.addEventListener('pointerup', endDrag);
  careersPolaroidGrid.addEventListener('pointercancel', endDrag);
  careersPolaroidGrid.addEventListener('pointerleave', endDrag);

  // Horizontal wheel/trackpad panning — consume ONLY horizontal deltas so the
  // vertical scroll-driven animation above keeps working normally. When the
  // grid reaches either edge, let the event bubble so it doesn't feel stuck.
  careersPolaroidGrid.addEventListener('wheel', (e) => {
    // Pick horizontal delta if it dominates (trackpad two-finger swipe, shift+wheel).
    const dx = e.deltaX;
    const dy = e.deltaY;
    if (Math.abs(dx) <= Math.abs(dy)) return; // vertical-dominant → let page scroll
    const maxOff = getMaxOffset();
    const nextOff = gridOffset - dx;
    const atLeft  = gridOffset >= 0       && dx < 0;
    const atRight = gridOffset <= maxOff  && dx > 0;
    if (atLeft || atRight) return; // already at edge → let browser handle
    e.preventDefault();
    gridOffset = nextOff;
    applyOffset();
  }, { passive: false });
}

// ===== POLAROID SLIDE-UP ANIMATION =====
const polaroidCards = document.querySelectorAll('.polaroid-card');
if (polaroidCards.length) {
  const polaroidObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, idx) => {
      if (entry.isIntersecting) {
        // Stagger the slide-up with a delay per card
        const card = entry.target;
        const i = Array.from(polaroidCards).indexOf(card);
        setTimeout(() => card.classList.add('slide-up'), i * 120);
        polaroidObserver.unobserve(card);
      }
    });
  }, { threshold: 0.1 });
  polaroidCards.forEach(card => polaroidObserver.observe(card));
}

// ===== CAREERS REEL — drag-to-scroll =====
const careersTrackWrap = document.querySelector('.careers-reel-track-wrap');

if (careersTrackWrap) {
  let isDragging = false;
  let startX     = 0;
  let scrollLeft = 0;

  careersTrackWrap.addEventListener('mousedown', (e) => {
    isDragging = true;
    careersTrackWrap.classList.add('is-dragging');
    startX     = e.pageX - careersTrackWrap.offsetLeft;
    scrollLeft = careersTrackWrap.scrollLeft;
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
    careersTrackWrap.classList.remove('is-dragging');
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x    = e.pageX - careersTrackWrap.offsetLeft;
    const walk = (x - startX) * 1.4;
    careersTrackWrap.scrollLeft = scrollLeft - walk;
  });
}

// ===== ROLE PILLS =====
const rolePills   = document.querySelectorAll('.role-pill');
const roleDetails = document.querySelectorAll('.role-detail');

rolePills.forEach(pill => {
  pill.addEventListener('click', () => {
    const target = pill.dataset.role;
    rolePills.forEach(p => p.classList.remove('active'));
    roleDetails.forEach(d => d.classList.remove('active'));
    pill.classList.add('active');
    const detail = document.querySelector(`.role-detail[data-detail="${target}"]`);
    if (detail) detail.classList.add('active');
  });
});

// ===== WORK CARD SHRINK ON SCROLL =====
const workCards = document.querySelectorAll('.work-card');
const worksSection = document.querySelector('.works');

function updateWorkCardShrink() {
  if (!worksSection || !workCards.length) return;
  const worksBottom = worksSection.getBoundingClientRect().bottom;
  // Start shrinking when works section bottom is within 300px of viewport bottom
  const triggerZone = 300;
  const shrinkRange = 220;
  const overlap = triggerZone - worksBottom;
  const t = Math.max(0, Math.min(1, overlap / shrinkRange));
  const scale = 1 - t * 0.06; // shrink up to 6%

  workCards.forEach(card => {
    if (t > 0) {
      card.classList.add('shrinking');
      card.style.setProperty('--card-scale', scale.toFixed(4));
    } else {
      card.classList.remove('shrinking');
      card.style.removeProperty('--card-scale');
    }
  });
}

document.body.addEventListener('scroll', updateWorkCardShrink, { passive: true });
document.addEventListener(     'scroll', updateWorkCardShrink, { passive: true });
window.addEventListener(       'scroll', updateWorkCardShrink, { passive: true });
updateWorkCardShrink();

// ===== PARALLAX CHARACTERS =====
window.addEventListener('scroll', () => {
  const scrollY = window.scrollY;
  const left = document.querySelector('.character-left');
  const right = document.querySelector('.character-right');
  if (left) left.style.transform = `translateY(${scrollY * 0.08}px)`;
  if (right) right.style.transform = `translateY(${scrollY * -0.05}px)`;
});
