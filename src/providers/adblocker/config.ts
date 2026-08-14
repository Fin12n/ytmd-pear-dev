import { blockers, type AdBlockerConfig } from './types';

export const defaultAdBlockerConfig: AdBlockerConfig = {
  enabled: true,
  cache: true,
  blocker: blockers.InPlayer,
  additionalBlockLists: [],
  disableDefaultLists: false,
  skipVideoAds: true,
  hideCosmeticPromos: true,
  bypassAntiAdblock: true,
};
