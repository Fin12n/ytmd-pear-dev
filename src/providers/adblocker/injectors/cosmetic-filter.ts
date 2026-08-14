/*
 * Cosmetic Filtering & Anti-Adblock Popup Bypass for Pears Music Desktop
 * Derived from uBlock Origin Cosmetic Injection & Experiment Flag Traps
 */

const COSMETIC_CSS_RULES = `
  ytmusic-mealbar-promo-renderer,
  ytmusic-tab-renderer[tab-id="SPunlimited"],
  .ytp-ad-overlay-container,
  .ytp-ad-message-container,
  ytmusic-guide-entry-renderer:has(a[href*="premium"]),
  tp-yt-paper-dialog:has(ytmusic-mealbar-promo-renderer),
  #masthead-ad,
  .ytd-statement-banner-renderer,
  ytmusic-banner-promo-renderer {
    display: none !important;
  }
`;

export const initCosmeticFilter = (): void => {
  // 1. Inject Cosmetic CSS Rules
  const injectStyles = (): void => {
    if (document.getElementById('peard-adblock-cosmetic')) return;
    const styleEl = document.createElement('style');
    styleEl.id = 'peard-adblock-cosmetic';
    styleEl.textContent = COSMETIC_CSS_RULES;
    (document.head || document.documentElement).appendChild(styleEl);
  };

  // 2. Override YouTube Experiment Flags to bypass Anti-Adblock
  const overrideExperimentFlags = (): void => {
    try {
      const windowRecord = window as unknown as Record<string, unknown>;
      if (windowRecord.yt && typeof windowRecord.yt === 'object') {
        const yt = windowRecord.yt as Record<string, unknown>;
        if (yt.config_ && typeof yt.config_ === 'object') {
          const config = yt.config_ as Record<string, unknown>;
          if (config.EXPERIMENT_FLAGS && typeof config.EXPERIMENT_FLAGS === 'object') {
            const flags = config.EXPERIMENT_FLAGS as Record<string, boolean>;
            flags.ad_shields_ad_block_extension_component = false;
            flags.enable_ad_break_response_handler = false;
          }
        }
      }
    } catch {
      // Ignore errors when overriding flags
    }
  };

  // 3. MutationObserver for dynamic Anti-Adblock modals & backdrop overlays
  const observeModals = (): void => {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLElement) {
            // Check if node is an anti-adblock dialog or mealbar promo
            if (
              node.tagName.toLowerCase() === 'tp-yt-paper-dialog' ||
              node.querySelector('ytmusic-mealbar-promo-renderer')
            ) {
              const textContent = node.textContent || '';
              if (
                textContent.includes("Ad blockers violate YouTube's Terms of Service") ||
                textContent.includes('Music Premium')
              ) {
                node.remove();
                document.body.style.overflow = '';
              }
            }
          }
        }
      }
    });

    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
    });
  };

  const startFilters = (): void => {
    injectStyles();
    overrideExperimentFlags();
    observeModals();

    // Periodically re-apply experiment flag overrides in case yt.config_ is initialized late
    let retries = 0;
    const interval = setInterval(() => {
      overrideExperimentFlags();
      retries++;
      if (retries > 10) clearInterval(interval);
    }, 1000);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startFilters, { once: true });
  } else {
    startFilters();
  }
};
