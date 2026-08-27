import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CONSENT_STORAGE_KEY,
  getStoredMeasurementConsent,
  hasMeasurementConsent,
  initializeAnalytics,
  storeMeasurementConsent,
  trackPageView,
} from "./analytics";

type FakeScript = { id?: string; async?: boolean; src?: string };

function installBrowser(options: { stored?: string | null; throwStorage?: boolean } = {}) {
  let stored = options.stored ?? null;
  const scripts = new Map<string, FakeScript>();
  const appended: FakeScript[] = [];
  const localStorage = {
    getItem: vi.fn(() => {
      if (options.throwStorage) throw new DOMException("blocked", "SecurityError");
      return stored;
    }),
    setItem: vi.fn((_key: string, value: string) => {
      if (options.throwStorage) throw new DOMException("blocked", "SecurityError");
      stored = value;
    }),
  };
  const fakeWindow = { localStorage, dataLayer: [] as unknown[], gtag: undefined };
  const fakeDocument = {
    getElementById: (id: string) => scripts.get(id) ?? null,
    createElement: () => ({} as FakeScript),
    head: {
      appendChild: (script: FakeScript) => {
        appended.push(script);
        if (script.id) scripts.set(script.id, script);
      },
    },
  };

  Object.defineProperty(globalThis, "window", { configurable: true, value: fakeWindow });
  Object.defineProperty(globalThis, "document", { configurable: true, value: fakeDocument });
  return { appended, localStorage, fakeWindow };
}

afterEach(() => {
  Reflect.deleteProperty(globalThis, "window");
  Reflect.deleteProperty(globalThis, "document");
});

describe("measurement consent storage", () => {
  it("defaults to denied when browser storage throws", () => {
    const { appended } = installBrowser({ throwStorage: true });

    expect(() => getStoredMeasurementConsent()).not.toThrow();
    expect(hasMeasurementConsent()).toBe(false);
    expect(storeMeasurementConsent(true)).toBe(false);
    expect(() => initializeAnalytics()).not.toThrow();
    expect(appended).toHaveLength(0);
  });

  it("loads analytics once only after persisted consent", () => {
    const { appended, localStorage } = installBrowser();

    initializeAnalytics();
    expect(appended).toHaveLength(0);

    expect(storeMeasurementConsent(true)).toBe(true);
    expect(localStorage.setItem).toHaveBeenCalledWith(CONSENT_STORAGE_KEY, "1");
    initializeAnalytics();
    initializeAnalytics();

    expect(appended).toHaveLength(1);
    expect(appended[0]?.src).toContain("www.googletagmanager.com/gtag/js");
  });

  it("emits a page view only after consent", () => {
    const { appended, fakeWindow } = installBrowser();

    trackPageView("/calculator?mode=compare");
    expect(appended).toHaveLength(0);
    expect(fakeWindow.dataLayer).toHaveLength(0);

    expect(storeMeasurementConsent(true)).toBe(true);
    trackPageView("/calculator?mode=compare");

    expect(appended).toHaveLength(1);
    expect(fakeWindow.dataLayer).toContainEqual([
      "config",
      "G-N7JJFW6007",
      { page_path: "/calculator?mode=compare" },
    ]);
  });
});
