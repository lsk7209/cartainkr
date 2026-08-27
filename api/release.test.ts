import { afterEach, describe, expect, it } from "vitest";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import handler from "./release";

const originalRelease = process.env.VERCEL_GIT_COMMIT_SHA;

afterEach(() => {
  if (originalRelease === undefined) {
    delete process.env.VERCEL_GIT_COMMIT_SHA;
  } else {
    process.env.VERCEL_GIT_COMMIT_SHA = originalRelease;
  }
});

const response = () => {
  const headers = new Map<string, string>();
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    setHeader(name: string, value: string) {
      headers.set(name.toLowerCase(), value);
      return this;
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
    end() {
      return this;
    },
  };
  return { res, headers };
};

describe("release endpoint", () => {
  it("returns a cache-free short public commit fingerprint", () => {
    process.env.VERCEL_GIT_COMMIT_SHA =
      "ac12c2879000bc484c7a5a719d3d762eda79fd6d";
    const { res, headers } = response();

    handler(
      { method: "GET" } as VercelRequest,
      res as unknown as VercelResponse,
    );

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ release: "ac12c2879000" });
    expect(headers.get("cache-control")).toBe("no-store");
    expect(headers.get("x-cartain-release")).toBe("ac12c2879000");
  });

  it("does not expose arbitrary environment content", () => {
    process.env.VERCEL_GIT_COMMIT_SHA = "not-a-commit secret";
    const { res } = response();

    handler(
      { method: "GET" } as VercelRequest,
      res as unknown as VercelResponse,
    );

    expect(res.body).toEqual({ release: "unknown" });
  });
});
