(() => {
  const TOTAL   = 5;
  let current   = 0;
  const track   = document.getElementById('track');
  const slides  = document.querySelectorAll('.slide');
  const skipBtn = document.getElementById('skipBtn');

  /* Navigate to a specific index */
  function goTo(idx) {
    if (idx < 0 || idx >= TOTAL) return;

    slides[current].classList.remove('is-active');
    current = idx;
    slides[current].classList.add('is-active');

    // Translate track: each slide is 20% of track width = 100% viewport
    track.style.transform = `translateX(-${current * 20}%)`;

    // Show/hide skip button
    skipBtn.style.visibility = (current === TOTAL - 1) ? 'hidden' : 'visible';
  }

  /* Delegate all button clicks */
  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    if (action === 'next') goTo(current + 1);
    if (action === 'prev') goTo(current - 1);
  });

  /* Talk to parent side panel */
  function postToParent(type) {
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type }, '*');
      }
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.set({ onboardingShown: true });
      }
    } catch (_) { /* standalone mode */ }
  }

  /* Skip — jump to last slide */
  skipBtn.addEventListener('click', () => { goTo(TOTAL - 1); });

  /* Get Started — marks onboarding complete */
  document.getElementById('getStartedBtn').addEventListener('click', () => {
    postToParent('ONBOARDING_COMPLETE');
  });

  /* Go Premium */
  document.getElementById('goPremiumBtn').addEventListener('click', () => {
    postToParent('OPEN_PREMIUM');
  });

  /* Keyboard ← → */
  document.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') goTo(current + 1);
    if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   goTo(current - 1);
  });
})();
