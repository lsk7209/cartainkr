import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import adminHandler from "./admin";
import postsHandler from "./posts";
import releaseHandler from "./release";
import rssHandler from "./rss";
import sitemapHandler from "./sitemap";
import ssrHandler from "./ssr";

type PackageMetadata = {
  main?: string;
  type?: string;
  engines?: { node?: string };
  exports?: {
    "."?: {
      require?: unknown;
    };
  };
};

type Version = readonly [major: number, minor: number, patch: number];

const readPackageMetadata = (relativePath: string): PackageMetadata =>
  JSON.parse(
    readFileSync(new URL(relativePath, import.meta.url), "utf8"),
  ) as PackageMetadata;

const minimumVersion = (range: string): Version => {
  const versions = [...range.matchAll(/(\d+)\.(\d+)\.(\d+)/g)].map(
    (match) =>
      [Number(match[1]), Number(match[2]), Number(match[3])] as const,
  );
  if (!versions.length) {
    throw new Error(`Cannot determine the minimum Node.js version from: ${range}`);
  }
  return versions.sort((left, right) => compareVersions(left, right))[0];
};

const compareVersions = (left: Version, right: Version): number => {
  for (let index = 0; index < left.length; index += 1) {
    const difference = left[index] - right[index];
    if (difference !== 0) return difference;
  }
  return 0;
};

describe("serverless runtime compatibility", () => {
  it("does not advertise a Node.js runtime older than its parser supports", () => {
    const projectPackage = readPackageMetadata("../package.json");
    const sanitizeHtmlPackage = readPackageMetadata(
      "../node_modules/sanitize-html/package.json",
    );
    const htmlParserPackage = readPackageMetadata(
      "../node_modules/htmlparser2/package.json",
    );
    const projectRange = projectPackage.engines?.node;
    const dependencyRanges = [
      sanitizeHtmlPackage.engines?.node,
      htmlParserPackage.engines?.node,
    ].filter((range): range is string => Boolean(range));

    expect(projectRange).toBeTruthy();
    expect(
      compareVersions(minimumVersion(projectRange!), [22, 12, 0]),
      `${projectRange} must keep the supported Vercel Node.js floor`,
    ).toBeGreaterThanOrEqual(0);
    for (const dependencyRange of dependencyRanges) {
      expect(
        compareVersions(
          minimumVersion(projectRange!),
          minimumVersion(dependencyRange),
        ),
        `${projectRange} includes a runtime older than dependency ${dependencyRange}`,
      ).toBeGreaterThanOrEqual(0);
    }
  });

  it("keeps a CommonJS-compatible parser export for sanitize-html", () => {
    const sanitizeHtmlPackage = readPackageMetadata(
      "../node_modules/sanitize-html/package.json",
    );
    const htmlParserPackage = readPackageMetadata(
      "../node_modules/htmlparser2/package.json",
    );

    const parserHasCommonJsExport = Boolean(
      htmlParserPackage.exports?.["."]?.require ||
        htmlParserPackage.main?.includes("commonjs"),
    );

    if (sanitizeHtmlPackage.type !== "module") {
      expect(
        parserHasCommonJsExport,
        "sanitize-html is CommonJS but htmlparser2 has no require export",
      ).toBe(true);
    }
  });

  it("initializes every serverless entry module", () => {
    expect([
      adminHandler,
      postsHandler,
      releaseHandler,
      rssHandler,
      sitemapHandler,
      ssrHandler,
    ]).toSatisfy((handlers: unknown[]) =>
      handlers.every((handler) => typeof handler === "function"),
    );
  });
});
