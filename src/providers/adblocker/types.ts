export const blockers = {
  WithBlocklists: 'With Blocklists',
  InPlayer: 'In-Player AdBlock',
} as const;

export type BlockerType = (typeof blockers)[keyof typeof blockers];

export interface AdBlockerConfig {
  /**
   * Whether to enable the built-in adblocker.
   * @default true
   */
  enabled: boolean;
  /**
   * When enabled, the network blocker will cache the blocklists locally.
   * @default true
   */
  cache: boolean;
  /**
   * Which blocker engine strategy to use.
   * @default blockers.InPlayer
   */
  blocker: BlockerType;
  /**
   * Additional custom filter list URLs.
   * @default []
   */
  additionalBlockLists: string[];
  /**
   * Disable the default blocklists.
   * @default false
   */
  disableDefaultLists: boolean;
  /**
   * Auto fast-forward and skip video ads (16x speed + mute + auto click).
   * @default true
   */
  skipVideoAds: boolean;
  /**
   * Hide cosmetic banners and Premium promotion elements.
   * @default true
   */
  hideCosmeticPromos: boolean;
  /**
   * Bypass Anti-Adblock experiment flags and modals.
   * @default true
   */
  bypassAntiAdblock: boolean;
}
