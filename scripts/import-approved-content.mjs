import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const args = process.argv.slice(2);
const valueFor = (flag) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};
const dryRun = args.includes("--dry-run");
const input = valueFor("--input");
if (!input) throw new Error("Use --input <approved-cartain-package.json>");

const records = JSON.parse(fs.readFileSync(path.resolve(input), "utf8"));
if (!Array.isArray(records) || records.length === 0) throw new Error("Input must be a non-empty array");
const issues = [];
const seen = new Set();
for (const record of records) {
  for (const field of ["id", "slug", "title", "content_html", "excerpt", "scheduledAt"]) {
    if (!record[field] || typeof record[field] !== "string") issues.push(`${record.id ?? "unknown"}: ${field}`);
  }
  if (seen.has(record.slug)) issues.push(`${record.id}: duplicate slug ${record.slug}`);
  seen.add(record.slug);
  if (!record.content_html.includes("<h2>")) issues.push(`${record.id}: missing article headings`);
  if (new Date(record.scheduledAt).getTime() <= Date.now()) issues.push(`${record.id}: scheduledAt is not future`);
}
if (issues.length) throw new Error(`Package validation failed:\n${issues.join("\n")}`);

if (dryRun) {
  console.log(JSON.stringify({ mode: "dry-run", mutationPerformed: false, count: records.length, first: records[0].scheduledAt, last: records.at(-1).scheduledAt, slugs: records.map((record) => record.slug) }, null, 2));
  process.exit(0);
}

const token = process.env.CARTAIN_TOKEN || process.env.ADMIN_API_KEY;
if (!token) throw new Error("CARTAIN_TOKEN or ADMIN_API_KEY is required for live import");
const base = process.env.CARTAIN_BASE_URL || "https://cartain.kr";
const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json; charset=utf-8" };
const existingResponse = await fetch(`${base}/api/admin/posts?limit=500`, { headers });
if (!existingResponse.ok) throw new Error(`Could not read existing posts: ${existingResponse.status}`);
const existing = await existingResponse.json();
const existingSlugs = new Set(existing.map((post) => post.slug));
const collisions = records.filter((record) => existingSlugs.has(record.slug));
if (collisions.length) throw new Error(`Existing slug collision: ${collisions.map((record) => record.slug).join(", ")}`);

const results = [];
for (const record of records) {
  const response = await fetch(`${base}/api/admin/posts`, {
    method: "POST",
    headers,
    body: JSON.stringify({ id: crypto.randomUUID(), slug: record.slug, title: record.title, content_html: record.content_html, excerpt: record.excerpt, thumbnail_url: null, published_at: record.scheduledAt }),
  });
  if (!response.ok) throw new Error(`Failed ${record.slug}: ${response.status} ${await response.text()}`);
  results.push({ id: record.id, slug: record.slug, scheduledAt: record.scheduledAt });
}
console.log(JSON.stringify({ mode: "live", mutationPerformed: true, count: results.length, results }, null, 2));
