import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const screenRoot = path.join(root, "lib", "mock-data", "screens");
const outputRoot = path.join(root, "public", "images");
const mapPath = path.join(root, "lib", "mock-data", "image-map.json");
const placeholder = "/images/placeholder.svg";
const failures = [];

await mkdir(outputRoot, { recursive: true });

async function getFiles(directory) {
  const { readdir, stat } = await import("node:fs/promises");
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await getFiles(fullPath)));
    else if (entry.name === "code.html") files.push(fullPath);
  }
  return files;
}

function extractImageUrls(html) {
  const urls = new Set();
  for (const match of html.matchAll(/<img\b[^>]*\bsrc=["'](https?:\/\/[^"']+)["'][^>]*>/gi)) {
    urls.add(match[1]);
  }
  for (const match of html.matchAll(/url\(\s*["']?(https?:\/\/[^"')]+)["']?\s*\)/gi)) {
    urls.add(match[1]);
  }
  return urls;
}

function extensionFor(contentType) {
  if (contentType.includes("png")) return ".png";
  if (contentType.includes("webp")) return ".webp";
  if (contentType.includes("gif")) return ".gif";
  if (contentType.includes("avif")) return ".avif";
  return ".jpg";
}

const htmlFiles = await getFiles(screenRoot);
const urls = new Set();
for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  for (const url of extractImageUrls(html)) urls.add(url);
}

const mapping = {};
const queue = [...urls];
let next = 0;
const workerCount = Math.min(5, queue.length);

async function worker() {
  while (next < queue.length) {
    const url = queue[next++];
    const hash = createHash("sha256").update(url).digest("hex").slice(0, 20);
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(25000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.startsWith("image/")) {
        throw new Error(`Unexpected content type: ${contentType || "unknown"}`);
      }
      const extension = extensionFor(contentType);
      const fileName = `${hash}${extension}`;
      await writeFile(
        path.join(outputRoot, fileName),
        Buffer.from(await response.arrayBuffer()),
      );
      mapping[url] = `/images/${fileName}`;
      console.log(`Downloaded ${url}`);
    } catch (error) {
      mapping[url] = placeholder;
      failures.push({ url, error: String(error) });
      console.warn(`Using placeholder for ${url}: ${String(error)}`);
    }
  }
}

await Promise.all(Array.from({ length: workerCount }, () => worker()));
await writeFile(mapPath, `${JSON.stringify(mapping, null, 2)}\n`, "utf8");
console.log(`Processed ${urls.size} unique image URLs; ${failures.length} failed.`);

if (failures.length > 0) {
  console.log("Failed image URLs:");
  for (const failure of failures) console.log(`- ${failure.url} (${failure.error})`);
}
