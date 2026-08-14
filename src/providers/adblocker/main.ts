import fs, { promises } from 'node:fs';
import path from 'node:path';

import { ElectronBlocker } from '@ghostery/adblocker-electron';
import { app, net, type BrowserWindow, type Session } from 'electron';
import * as z from 'zod';

import * as config from '@/config';

import { blockers, type AdBlockerConfig } from './types';

let blocker: ElectronBlocker | undefined;

const TbSourcesSchema = z.object({
  tb: z.array(z.string()),
});

const DEFAULT_FALLBACK_LISTS = [
  'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/filters.txt',
  'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/privacy.txt',
  'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/badware.txt',
];

export const loadTrackerBlockerEngine = async (
  session?: Session,
  cache: boolean = true,
  additionalBlockLists: string[] = [],
  disableDefaultLists: boolean | unknown[] = false,
) => {
  const cacheDirectory = path.join(app.getPath('userData'), 'tb_cache');
  if (!fs.existsSync(cacheDirectory)) {
    fs.mkdirSync(cacheDirectory, { recursive: true });
  }
  const cachingOptions =
    cache && additionalBlockLists.length === 0
      ? {
          path: path.join(cacheDirectory, 'tb-engine.bin'),
          read: promises.readFile,
          write: promises.writeFile,
        }
      : undefined;

  let defaultLists: string[] = DEFAULT_FALLBACK_LISTS;

  try {
    const response = await net.fetch(
      'https://raw.githubusercontent.com/organization/tb-list/refs/heads/main/tb.json',
      { signal: AbortSignal.timeout(5000) },
    );

    if (response.ok) {
      const data = await response.json();
      const tbSources = TbSourcesSchema.safeParse(data);
      if (tbSources.success && tbSources.data.tb.length > 0) {
        defaultLists = tbSources.data.tb;
      }
    }
  } catch (error) {
    console.warn(
      'AdBlocker: Unable to fetch online filter list, utilizing fallback blocklists.',
      error,
    );
  }

  const lists = [
    ...((disableDefaultLists && !Array.isArray(disableDefaultLists)) ||
    (Array.isArray(disableDefaultLists) && disableDefaultLists.length > 0)
      ? []
      : defaultLists),
    ...additionalBlockLists,
  ];

  try {
    blocker = await ElectronBlocker.fromLists(
      (url: string) => net.fetch(url),
      lists,
      {
        enableCompression: true,
        loadNetworkFilters: session !== undefined,
      },
      cachingOptions,
    );
    if (session) {
      blocker.enableBlockingInSession(session);
    }
  } catch (error) {
    console.error('Error loading AdBlocker engine', error);
  }
};

export const unloadTrackerBlockerEngine = (session: Session) => {
  if (blocker) {
    blocker.disableBlockingInSession(session);
  }
};

export const isBlockerEnabled = (session: Session) =>
  blocker !== undefined && blocker.isBlockingEnabled(session);

export const setupAdblocker = async (window: BrowserWindow): Promise<void> => {
  const adBlockerConfig = (config.get('options.adblocker') || {}) as Partial<AdBlockerConfig>;
  const isEnabled = adBlockerConfig.enabled ?? true;

  if (!isEnabled) {
    return;
  }

  const strategy = adBlockerConfig.blocker ?? blockers.InPlayer;

  if (strategy === blockers.WithBlocklists) {
    await loadTrackerBlockerEngine(
      window.webContents.session,
      adBlockerConfig.cache ?? true,
      adBlockerConfig.additionalBlockLists ?? [],
      adBlockerConfig.disableDefaultLists ?? false,
    );
  }
};
