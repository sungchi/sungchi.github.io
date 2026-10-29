(() => {
  'use strict';
  // Reuse plan9.kr's GA4 destination; local previews must not enter live reports.
  if (location.protocol !== 'https:' || location.hostname !== 'plan9.kr') return;
  if (document.querySelector('script[data-coupang-analytics]')) return;

  const measurementId = 'G-E9HCEG6CZY';
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', measurementId, {
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });
  // Default GA4 page views also follow the existing stream's history settings.
  // Do not add manual page_view events alongside automatic measurement.
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  script.dataset.coupangAnalytics = measurementId;
  document.head.append(script);
})();
