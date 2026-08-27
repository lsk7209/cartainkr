import { afterEach, describe, expect, it } from "vitest";
import { CONSENT_STORAGE_KEY } from "@/lib/analytics";
import { ensureAdSenseScript } from "@/lib/adScripts";

function installBrowser(consent: "1" | "0" | null) {
  const scripts = new Map<string, { id?: string; src?: string }>();
  const appended: Array<{ id?: string; src?: string }> = [];
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) => (key === CONSENT_STORAGE_KEY ? consent : null),
      },
    },
  });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      getElementById: (id: string) => scripts.get(id) ?? null,
      createElement: () => ({}),
      head: {
        appendChild: (script: { id?: string; src?: string }) => {
          appended.push(script);
          if (script.id) scripts.set(script.id, script);
        },
      },
    },
  });
  return appended;
}

afterEach(() => {
  Reflect.deleteProperty(globalThis, "window");
  Reflect.deleteProperty(globalThis, "document");
});

describe("ensureAdSenseScript", () => {
  it("does not create a request before consent or on blocked routes", () => {
    expect(ensureAdSenseScript("/calculator")).toBe(false);
    expect(installBrowser("0")).toEqual([]);
    expect(ensureAdSenseScript("/calculator")).toBe(false);
    expect(ensureAdSenseScript("/privacy")).toBe(false);
  });

  it("loads exactly once on an eligible route after consent", () => {
    const appended = installBrowser("1");

    expect(ensureAdSenseScript("/magazine/example")).toBe(true);
    expect(ensureAdSenseScript("/magazine/example")).toBe(false);
    expect(appended).toHaveLength(1);
    expect(appended[0]?.src).toContain("pagead2.googlesyndication.com");
  });
});
