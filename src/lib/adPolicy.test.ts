import { describe, expect, it } from "vitest";
import { canLoadAds, canLoadAffiliateBanner } from "./adPolicy";

describe("canLoadAds", () => {
  it("allows monetized content routes", () => {
    expect(canLoadAds("/magazine/example-article")).toBe(true);
    expect(canLoadAds("/calculator")).toBe(true);
  });

  it("blocks legal and admin routes", () => {
    expect(canLoadAds("/privacy")).toBe(false);
    expect(canLoadAds("/admin")).toBe(false);
  });

  it("blocks affiliate network requests until consent", () => {
    expect(canLoadAffiliateBanner("/magazine/example-article", false)).toBe(false);
    expect(canLoadAffiliateBanner("/magazine/example-article", true)).toBe(true);
    expect(canLoadAffiliateBanner("/privacy", true)).toBe(false);
  });
});
