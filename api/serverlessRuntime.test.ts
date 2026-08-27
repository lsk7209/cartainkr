import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import adminHandler from "./admin";
import postsHandler from "./posts";
import rssHandler from "./rss";
import sitemapHandler from "./sitemap";
import ssrHandler from "./ssr";

type PackageMetadata = {
  engines?: { node?: string };
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
  it("does not advertise a Node.js runtime older than sanitize-html supports", () => {
    const projectPackage = readPackageMetadata("../package.json");
    const sanitizeHtmlPackage = readPackageMetadata(
      "../node_modules/sanitize-html/package.json",
    );
    const projectRange = projectPackage.engines?.node;
    const dependencyRange = sanitizeHtmlPackage.engines?.node;

    expect(projectRange).toBeTruthy();
    expect(dependencyRange).toBeTruthy();
    expect(
      compareVersions(
        minimumVersion(projectRange!),
        minimumVersion(dependencyRange!),
      ),
      `${projectRange} includes a runtime older than sanitize-html ${dependencyRange}`,
    ).toBeGreaterThanOrEqual(0);
  });

  it("initializes every serverless entry module", () => {
    expect([
      adminHandler,
      postsHandler,
      rssHandler,
      sitemapHandler,
      ssrHandler,
    ]).toSatisfy((handlers: unknown[]) =>
      handlers.every((handler) => typeof handler === "function"),
    );
  });
});
