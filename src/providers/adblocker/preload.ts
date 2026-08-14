import { contextBridge } from 'electron';

import { initCosmeticFilter } from './injectors/cosmetic-filter';
import { injectJsonPruner } from './injectors/json-pruner';
import { initVideoAdSkipper } from './injectors/video-ad-skipper';

export const setupPreloadAdblocker = (): void => {
  // 1. Inject JSON Pruner & Property Traps (uBlock set-constant / json-prune)
  injectJsonPruner(contextBridge);

  // 2. Video Ad Fast-Forward & Auto-Skip 16x
  initVideoAdSkipper();

  // 3. Cosmetic Filtering & Anti-Adblock Popup Bypass
  initCosmeticFilter();
};
