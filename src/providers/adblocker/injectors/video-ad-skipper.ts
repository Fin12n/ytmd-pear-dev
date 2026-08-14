/*
 * Video Ad Fast-Forward & Auto-Skip Engine for Pears Music Desktop
 * Derived from uBlock Origin YouTube Video Ad Skipper Scriptlet
 */

const SKIP_BUTTON_SELECTORS = [
  '.ytp-ad-skip-button',
  '.ytp-skip-ad-button',
  '.ytp-ad-skip-button-modern',
  '.ytp-ad-skip-button-slot',
  '.ytp-ad-overlay-close-button',
  'button.ytp-ad-skip-button-text',
  '.ytp-ad-text.ytp-ad-skip-button-text',
];

const AD_CONTAINER_SELECTORS = [
  '.ad-showing',
  '.ad-interrupting',
  '.ytp-ad-player-overlay',
  '.ytp-ad-item-layout',
];

export const initVideoAdSkipper = (): void => {
  let isFastForwarding = false;
  let originalMutedState = false;
  let originalPlaybackRate = 1.0;
  let activeInterval: ReturnType<typeof setInterval> | null = null;
  const attachedVideos = new WeakSet<HTMLVideoElement>();

  const trySkipAdButtons = (): boolean => {
    let skipped = false;
    for (const selector of SKIP_BUTTON_SELECTORS) {
      const buttons = document.querySelectorAll<HTMLElement>(selector);
      for (const btn of buttons) {
        if (btn && typeof btn.click === 'function') {
          btn.click();
          skipped = true;
        }
      }
    }
    return skipped;
  };

  const handleVideoAdState = (video: HTMLVideoElement): void => {
    const isAdShowing = AD_CONTAINER_SELECTORS.some((selector) =>
      document.querySelector(selector),
    );

    if (isAdShowing) {
      if (!isFastForwarding) {
        isFastForwarding = true;
        originalMutedState = video.muted;
        originalPlaybackRate = video.playbackRate > 0 ? video.playbackRate : 1.0;
      }

      // Fast-forward, mute, and skip
      video.muted = true;
      video.playbackRate = 16.0;

      if (Number.isFinite(video.duration) && video.duration > 0) {
        video.currentTime = video.duration;
      }

      trySkipAdButtons();
    } else if (isFastForwarding) {
      // Restore state once ad has completed
      isFastForwarding = false;
      video.muted = originalMutedState;
      video.playbackRate = originalPlaybackRate;
    }
  };

  const checkAndBindVideo = (): void => {
    const video = document.querySelector<HTMLVideoElement>('video');
    if (!video) return;

    handleVideoAdState(video);

    if (!attachedVideos.has(video)) {
      attachedVideos.add(video);
      const events = ['timeupdate', 'ratechange', 'play', 'playing', 'seeked'];
      for (const evt of events) {
        video.addEventListener(evt, () => handleVideoAdState(video), {
          passive: true,
        });
      }
    }
  };

  const startLoop = (): void => {
    checkAndBindVideo();
    if (!activeInterval) {
      activeInterval = setInterval(checkAndBindVideo, 200);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startLoop, { once: true });
  } else {
    startLoop();
  }
};
