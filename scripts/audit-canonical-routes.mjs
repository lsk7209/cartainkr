import { readFileSync } from "node:fs";

const config = JSON.parse(readFileSync("vercel.json", "utf8"));
const canonicalArchiveRedirect = config.redirects?.find(
  (entry) => entry.source === "/blog" && entry.destination === "/magazine",
);

if (!canonicalArchiveRedirect?.permanent) {
  console.error("canonical route audit failed: /blog must permanently redirect to /magazine.");
  process.exit(1);
}

console.log("canonical route audit ok: /magazine is the sole crawlable article archive.");
