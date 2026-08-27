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
const supportedNodeFloor = [22, 12, 0];

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
const readPackageMetadata = async (specifier) => {
  let directory = dirname(require.resolve(specifier));

  while (true) {
    try {
      const metadata = await readJson(join(directory, "package.json"));
      if (metadata.name === specifier) return metadata;
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }

    const parent = dirname(directory);
    if (parent === directory) {
      throw new Error(`Cannot locate package.json for ${specifier}`);
    }
    directory = parent;
  }
};

const projectPackage = await readJson(join(repositoryRoot, "package.json"));
const sanitizerPackage = await readPackageMetadata("sanitize-html");
const parserPackage = await readPackageMetadata("htmlparser2");
const projectRange = projectPackage.engines?.node;

if (!projectRange) throw new Error("The project must declare a Node.js engine");
if (compareVersions(minimumVersion(projectRange), supportedNodeFloor) < 0) {
  throw new Error(
    `Project engine ${projectRange} is older than the supported Vercel Node.js floor`,
  );
}

for (const dependencyRange of [
  sanitizerPackage.engines?.node,
  parserPackage.engines?.node,
].filter(Boolean)) {
  if (
    compareVersions(minimumVersion(projectRange), minimumVersion(dependencyRange)) <
    0
  ) {
    throw new Error(
      `Project engine ${projectRange} is older than dependency ${dependencyRange}`,
    );
  }
}

const parserHasCommonJsExport = Boolean(
  parserPackage.exports?.["."]?.require ||
    parserPackage.main?.includes("commonjs"),
);
if (sanitizerPackage.type !== "module" && !parserHasCommonJsExport) {
  throw new Error(
    "sanitize-html is CommonJS but htmlparser2 has no require export",
  );
}

if (
  compareVersions(
    parseVersion(process.versions.node),
    minimumVersion(projectRange),
  ) < 0
) {
  throw new Error(
    `Verification runtime ${process.versions.node} is older than ${projectRange}`,
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

const rootBuildFiles = new Set([
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "tsconfig.app.json",
  "tsconfig.node.json",
  "vercel.json",
]);

const includedSource = (name) =>
  rootBuildFiles.has(name) || name.startsWith("api/") || name.startsWith("src/");

const allSourceFiles = await glob("**/*", { cwd: repositoryRoot });
const sourceFiles = Object.fromEntries(
  Object.entries(allSourceFiles).filter(([name]) => includedSource(name)),
);

for (const requiredPath of ["package.json", "package-lock.json", ...entries]) {
  if (!sourceFiles[requiredPath]) {
    throw new Error(`Serverless fixture is missing ${requiredPath}`);
  }
}

const readStream = (stream) =>
  new Promise((resolveStream, reject) => {
    const chunks = [];
    stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on("error", reject);
    stream.on("end", () => resolveStream(Buffer.concat(chunks)));
  });

const removeTree = (path) =>
  rm(path, {
    recursive: true,
    force: true,
    maxRetries: 10,
    retryDelay: 200,
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

const createMockResponse = () => ({
  statusCode: 200,
  headers: new Map(),
  body: undefined,
  setHeader(name, value) {
    this.headers.set(name.toLowerCase(), value);
    return this;
  },
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
  send(body) {
    this.body = body;
    return this;
  },
  end() {
    return this;
  },
});

const safeInvocations = {
  "api/admin.ts": {
    request: {
      method: "GET",
      url: "/api/admin/posts",
      headers: { host: "cartain.kr" },
    },
    status: 401,
  },
  "api/posts.ts": {
    request: {
      method: "OPTIONS",
      url: "/api/posts",
      headers: { host: "cartain.kr" },
    },
    status: 204,
  },
  "api/release.ts": {
    request: {
      method: "GET",
      url: "/api/release",
      headers: { host: "cartain.kr" },
    },
    status: 200,
  },
  "api/ssr.ts": {
    request: {
      method: "GET",
      url: "/api/ssr?p=/about",
      headers: { host: "cartain.kr" },
    },
    status: 200,
  },
};

const invokeSafeRoute = async (entry, handler) => {
  const probe = safeInvocations[entry];
  if (!probe) return;
  const response = createMockResponse();
  await handler(probe.request, response);
  if (response.statusCode !== probe.status) {
    throw new Error(
      `${entry} returned ${response.statusCode}; expected ${probe.status}`,
    );
  }
};

const fixtureRoot = await mkdtemp(join(tmpdir(), "cartain-vercel-fixture-"));
if (
  fixtureRoot === repositoryRoot ||
  fixtureRoot.startsWith(`${repositoryRoot}${sep}`)
) {
  throw new Error("Serverless fixture must be outside the source repository");
}

const previousInstallCompleted = process.env.VERCEL_INSTALL_COMPLETED;

try {
  delete process.env.VERCEL_INSTALL_COMPLETED;
  let buildFiles = sourceFiles;

  for (const [index, entry] of entries.entries()) {
    const result = await buildVercelNode({
      files: buildFiles,
      entrypoint: entry,
      workPath: fixtureRoot,
      repoRootPath: fixtureRoot,
      config: {},
      meta: { isDev: false, skipDownload: index > 0 },
    });
    if (index === 0) {
      buildFiles = await glob("**/*", { cwd: fixtureRoot });
      process.env.VERCEL_INSTALL_COMPLETED = "1";
    }
    if (result.output.runtime !== "nodejs22.x") {
      throw new Error(
        `${entry} selected ${result.output.runtime}; expected nodejs22.x`,
      );
    }

    const outputDirectory = await mkdtemp(
      join(tmpdir(), "cartain-serverless-output-"),
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
      await invokeSafeRoute(entry, loaded.default);
      console.log(`Verified ${entry} as ${result.output.runtime}.`);
    } finally {
      await removeTree(outputDirectory);
    }
  }
} finally {
  if (previousInstallCompleted === undefined) {
    delete process.env.VERCEL_INSTALL_COMPLETED;
  } else {
    process.env.VERCEL_INSTALL_COMPLETED = previousInstallCompleted;
  }
  await removeTree(fixtureRoot);
}

console.log(
  `Production-mode serverless verification passed for ${entries.length} entries on Node ${process.versions.node}.`,
);
