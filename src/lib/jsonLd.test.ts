import { describe, expect, it } from "vitest";
import { serializeJsonLd } from "./jsonLd";

describe("serializeJsonLd", () => {
  it("prevents a value from closing the JSON-LD script element", () => {
    const serialized = serializeJsonLd({ headline: "</script><script>alert(1)</script>" });
    expect(serialized).not.toContain("<");
    expect(serialized).toContain("\\u003c/script");
  });

  it("preserves valid JSON semantics", () => {
    expect(JSON.parse(serializeJsonLd({ name: "카테인 & 자동차" }))).toEqual({ name: "카테인 & 자동차" });
  });
});
