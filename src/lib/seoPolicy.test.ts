import { describe, expect, it } from "vitest";
import {
  getMagazineSeoPolicy,
  normalizeMagazinePage,
  resolveRobotsDirective,
} from "./seoPolicy";

describe("magazine SEO policy", () => {
  it("keeps internal search results out of the index", () => {
    const policy = getMagazineSeoPolicy("https://cartain.kr", " 전기차 ", 4);
    expect(policy.isSearch).toBe(true);
    expect(policy.robots).toBe("noindex, follow");
    expect(policy.canonicalUrl).toBe("https://cartain.kr/magazine");
    expect(policy.title).toContain("전기차");
  });

  it("gives archive pages a stable self canonical", () => {
    const policy = getMagazineSeoPolicy("https://cartain.kr", "", 3);
    expect(policy.robots).toContain("index, follow");
    expect(policy.canonicalUrl).toBe("https://cartain.kr/magazine?page=3");
  });

  it("recovers from invalid pages and stale noindex state", () => {
    expect(normalizeMagazinePage("not-a-page")).toBe(1);
    expect(resolveRobotsDirective(undefined)).toContain("index, follow");
  });
});
