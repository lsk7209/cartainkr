import type { VercelRequest, VercelResponse } from "@vercel/node";

const publicRelease = (value: string | undefined) =>
  value && /^[0-9a-f]{7,40}$/i.test(value)
    ? value.slice(0, 12).toLowerCase()
    : "unknown";

export default function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const release = publicRelease(process.env.VERCEL_GIT_COMMIT_SHA);
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Cartain-Release", release);

  if (req.method === "HEAD") return res.status(200).end();
  return res.status(200).json({ release });
}
