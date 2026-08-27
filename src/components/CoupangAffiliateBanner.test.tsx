import { afterEach, describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { CONSENT_STORAGE_KEY } from "@/lib/analytics";
import CoupangAffiliateBanner from "./CoupangAffiliateBanner";

function installConsent(consent: "1" | "0" | null) {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) => (key === CONSENT_STORAGE_KEY ? consent : null),
      },
    },
  });
}

function renderBanner(pathname: string) {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[pathname]}>
      <CoupangAffiliateBanner />
    </MemoryRouter>,
  );
}

afterEach(() => {
  Reflect.deleteProperty(globalThis, "window");
});

describe("CoupangAffiliateBanner", () => {
  it("renders no affiliate request URL before consent", () => {
    installConsent("0");
    expect(renderBanner("/magazine/example")).not.toContain("multi-dashboard-one.vercel.app");
  });

  it("renders affiliate image, click and measurement URLs only after consent", () => {
    installConsent("1");
    const html = renderBanner("/magazine/example");

    expect(html).toContain("/api/banner-management/image?");
    expect(html).toContain("/api/banner-management/click?");
    expect(html).toContain("/banner-measurement.js");
  });

  it("stays absent on privacy routes even with consent", () => {
    installConsent("1");
    expect(renderBanner("/privacy")).not.toContain("multi-dashboard-one.vercel.app");
  });
});
