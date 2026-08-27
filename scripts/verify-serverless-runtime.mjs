import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const repositoryRoot = resolve(import.meta.dirname, "..");
const apiDirectory = join(repositoryRoot, "api");

const parseVersion = (value) => {
  const match = value.match(/(\d+)\.(\d+)\.(\d+)/);
  if (!match) throw new Error(`Cannot parse Node.js version from: ${value}`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
};

const compareVersions = (left, right) => {
  for (let index = 0; index < left.length; index += 1) {
    const difference = left[index] - right[index];
    if (difference !== 0) return difference;
  }
  return 0;
};

const minimumVersion = (range) => {
  const versions = [...range.matchAll(/(\d+)\.(\d+)\.(\d+)/g)].map(
    (match) => [Number(match[1]), Number(match[2]), Number(match[3])],
  );
  if (!versions.length) {
    throw new Error(`Cannot determine the minimum Node.js version from: ${range}`);
  }
  return versions.sort(compareVersions)[0];
};

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));

const projectPackage = await readJson(join(repositoryRoot, "package.json"));
const sanitizerPackagePath = require.resolve("sanitize-html/package.json");
const sanitizerPackage = await readJson(sanitizerPackagePath);
const projectRange = projectPackage.engines?.node;
const sanitizerRange = sanitizerPackage.engines?.node;

if (!projectRange || !sanitizerRange) {
  throw new Error("Both the project and sanitize-html must declare a Node.js engine");
}

const requiredVersion = minimumVersion(sanitizerRange);
if (compareVersions(minimumVersion(projectRange), requiredVersion) < 0) {
  throw new Error(
    `Project engine ${projectRange} advertises a runtime older than sanitize-html ${sanitizerRange}`,
  );
}
if (compareVersions(parseVersion(process.versions.node), requiredVersion) < 0) {
  throw new Error(
    `Verification runtime ${process.versions.node} is older than sanitize-html ${sanitizerRange}`,
  );
}

const vercelNodeEntry = require.resolve("@vercel/node");
const { build: buildVercelNode } = require("@vercel/node");
const buildUtilsPath = require.resolve("@vercel/build-utils", {
  paths: [dirname(vercelNodeEntry)],
});
const { glob } = require(buildUtilsPath);
const entries = (await readdir(apiDirectory, { withFileTypes: true }))
  .filter(
    (entry) =>
      entry.isFile() &&
      entry.name.endsWith(".ts") &&
      !entry.name.endsWith(".test.ts"),
  )
  .map((entry) => `api/${entry.name}`)
  .sort();

if (!entries.length) throw new Error("No serverless TypeScript entries found");

const sourceFiles = await glob("**/*", { cwd: repositoryRoot });
const packageManifest = join(
  repositoryRoot,
  ".vercel",
  "node",
  "package-manifest.json",
);
let previousManifest;
let manifestExisted = true;
try {
  previousManifest = await readFile(packageManifest);
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
  manifestExisted = false;
}

const readStream = (stream) =>
  new Promise((resolveStream, reject) => {
    const chunks = [];
    stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on("error", reject);
    stream.on("end", () => resolveStream(Buffer.concat(chunks)));
  });

const containedPath = (root, relativePath) => {
  if (relativePath.startsWith("/") || /^[A-Za-z]:[\\/]/.test(relativePath)) {
    throw new Error(`Unexpected absolute builder output path: ${relativePath}`);
  }
  const target = resolve(root, relativePath);
  if (target !== root && !target.startsWith(`${root}${sep}`)) {
    throw new Error(`Builder output escaped its staging directory: ${relativePath}`);
  }
  return target;
};

try {
  for (const entry of entries) {
    const result = await buildVercelNode({
      files: sourceFiles,
      entrypoint: entry,
      workPath: repositoryRoot,
      repoRootPath: repositoryRoot,
      config: {},
      meta: { isDev: true, skipDownload: true },
    });
    const outputDirectory = await mkdtemp(
      join(tmpdir(), "cartain-serverless-"),
    );

    try {
      for (const [name, file] of Object.entries(result.output.files ?? {})) {
        const target = containedPath(outputDirectory, name);
        await mkdir(dirname(target), { recursive: true });
        await writeFile(target, await readStream(file.toStream()));
      }

      const handlerPath = containedPath(outputDirectory, result.output.handler);
      const loaded = await import(
        `${pathToFileURL(handlerPath).href}?probe=${encodeURIComponent(entry)}`
      );
      if (typeof loaded.default !== "function") {
        throw new Error(`${entry} did not export a default handler`);
      }
    } finally {
      await rm(outputDirectory, { recursive: true, force: true });
    }
  }
} finally {
  if (manifestExisted) {
    await mkdir(dirname(packageManifest), { recursive: true });
    await writeFile(packageManifest, previousManifest);
  } else {
    await rm(packageManifest, { force: true });
  }
}

console.log(
  `Serverless runtime verification passed for ${entries.length} entries on Node ${process.versions.node}.`,
);
