/*
 * Deep JSON Response Pruning & uBlock-style Property Traps for Pears Music Desktop
 * Derived from uBlock Origin scriptlets: json-prune & set-constant
 */

import type { ContextBridge } from 'electron';

interface PrunableResponse {
  [key: string]: unknown;
}

type PropertyOwner = Record<string, unknown>;

interface TrapHandler {
  v: unknown;
  init(value: unknown): boolean;
  getter(): unknown;
  setter(value: unknown): void;
}

let injected = false;

export const isJsonPrunerInjected = (): boolean => injected;

const TARGET_AD_KEYS = new Set([
  'playerAds',
  'adPlacements',
  'adSlots',
  'adBreaks',
  'adSlotData',
  'mealbarPromos',
  'promotions',
  'auxiliaryUi',
]);

export const pruneObject = <T>(obj: T, visited = new WeakSet()): T => {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (visited.has(obj as object)) {
    return obj;
  }
  visited.add(obj as object);

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      obj[i] = pruneObject(obj[i], visited);
    }
    return obj;
  }

  const record = obj as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (TARGET_AD_KEYS.has(key)) {
      delete record[key];
    } else {
      record[key] = pruneObject(record[key], visited);
    }
  }

  return obj;
};

export const injectJsonPruner = (contextBridge: ContextBridge): void => {
  if (injected) return;
  injected = true;

  contextBridge.exposeInMainWorld('_pruner', (o: PrunableResponse) =>
    pruneObject(o),
  );

  const chains = [
    {
      chain: 'playerResponse.adPlacements',
      cValue: 'undefined',
    },
    {
      chain: 'playerResponse.playerAds',
      cValue: 'undefined',
    },
    {
      chain: 'playerResponse.adSlots',
      cValue: 'undefined',
    },
    {
      chain: 'playerResponse.adBreaks',
      cValue: 'undefined',
    },
    {
      chain: 'ytInitialPlayerResponse.playerAds',
      cValue: 'undefined',
    },
    {
      chain: 'ytInitialPlayerResponse.adPlacements',
      cValue: 'undefined',
    },
    {
      chain: 'ytInitialPlayerResponse.adSlots',
      cValue: 'undefined',
    },
    {
      chain: 'ytInitialPlayerResponse.adBreaks',
      cValue: 'undefined',
    },
    {
      chain: 'ytInitialPlayerResponse.mealbarPromos',
      cValue: 'undefined',
    },
  ];

  chains.forEach(({ chain, cValue: rawValue }) => {
    const thisScript = document.currentScript;
    let cValue: unknown;
    switch (rawValue) {
      case 'null': {
        cValue = null;
        break;
      }

      case "''": {
        cValue = '';
        break;
      }

      case 'true': {
        cValue = true;
        break;
      }

      case 'false': {
        cValue = false;
        break;
      }

      case 'undefined': {
        cValue = undefined;
        break;
      }

      case 'noopFunc': {
        cValue = () => {};
        break;
      }

      case 'trueFunc': {
        cValue = () => true;
        break;
      }

      case 'falseFunc': {
        cValue = () => false;
        break;
      }

      default: {
        if (/^\d+$/.test(rawValue)) {
          const numericValue = Number.parseFloat(rawValue);
          if (Number.isNaN(numericValue)) {
            return;
          }

          if (Math.abs(numericValue) > 0x7f_ff) {
            return;
          }

          cValue = numericValue;
        } else {
          return;
        }
      }
    }

    let aborted = false;
    const mustAbort = (v: unknown): boolean => {
      if (aborted) {
        return true;
      }

      aborted =
        v !== undefined &&
        v !== null &&
        cValue !== undefined &&
        cValue !== null &&
        typeof v !== typeof cValue;
      return aborted;
    };

    const trapProp = (
      owner: PropertyOwner,
      prop: string,
      configurable: boolean,
      handler: TrapHandler,
    ) => {
      if (!handler.init(owner[prop])) {
        return;
      }

      const odesc = Object.getOwnPropertyDescriptor(owner, prop);
      let previousGetter: (() => unknown) | undefined;
      let previousSetter: ((value: unknown) => void) | undefined;
      if (odesc instanceof Object) {
        if (odesc.configurable === false) {
          return;
        }

        if (odesc.get instanceof Function) {
          // oxlint-disable-next-line typescript/unbound-method
          previousGetter = odesc.get;
        }

        if (odesc.set instanceof Function) {
          // oxlint-disable-next-line typescript/unbound-method
          previousSetter = odesc.set;
        }
      }

      Object.defineProperty(owner, prop, {
        configurable,
        get() {
          if (previousGetter !== undefined) {
            previousGetter();
          }

          return handler.getter();
        },
        set(a: unknown) {
          if (previousSetter !== undefined) {
            previousSetter(a);
          }

          handler.setter(a);
        },
      });
    };

    const trapChain = (owner: PropertyOwner, chain: string) => {
      const pos = chain.indexOf('.');
      if (pos === -1) {
        trapProp(owner, chain, false, {
          v: undefined,
          getter() {
            return document.currentScript === thisScript ? this.v : cValue;
          },
          setter(a) {
            if (!mustAbort(a)) {
              return;
            }

            cValue = a;
          },
          init(v) {
            if (mustAbort(v)) {
              return false;
            }

            this.v = v;
            return true;
          },
        });
        return;
      }

      const prop = chain.slice(0, pos);
      const v = owner[prop];

      const remainingChain = chain.slice(pos + 1);
      if (v instanceof Object || (typeof v === 'object' && v !== null)) {
        trapChain(v as PropertyOwner, remainingChain);
        return;
      }

      trapProp(owner, prop, true, {
        v: undefined,
        getter() {
          return this.v;
        },
        setter(a) {
          this.v = a;
          if (a instanceof Object) {
            trapChain(a as PropertyOwner, remainingChain);
          }
        },
        init(v) {
          this.v = v;
          return true;
        },
      });
    };

    trapChain(window as unknown as PropertyOwner, chain);
  });
};
