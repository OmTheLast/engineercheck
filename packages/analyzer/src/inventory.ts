import { lstat, readFile, readdir } from "node:fs/promises";
import path from "node:path";

export type SourceFile = {
  path: string;
  absolutePath: string;
  content: string;
  lines: string[];
};
export type Inventory = {
  files: SourceFile[];
  filesSkipped: number;
  bytesRead: number;
};

const ignored = new Set([
  ".git",
  "node_modules",
  ".next",
  "dist",
  "build",
  "coverage",
  ".engineercheck",
]);
const textExtensions = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".md",
  ".sql",
  ".yml",
  ".yaml",
  ".toml",
  ".env",
  ".rules",
  ".txt",
  ".html",
  ".css",
]);
const maxFileBytes = 512_000;
const maxTotalBytes = 20_000_000;
const maxFiles = 10_000;

export async function inventoryRepository(root: string): Promise<Inventory> {
  const absoluteRoot = path.resolve(root);
  const files: SourceFile[] = [];
  let filesSkipped = 0;
  let bytesRead = 0;

  async function walk(directory: string): Promise<void> {
    if (files.length >= maxFiles || bytesRead >= maxTotalBytes) return;
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      if (ignored.has(entry.name)) continue;
      const absolutePath = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) {
        filesSkipped++;
        continue;
      }
      if (entry.isDirectory()) {
        await walk(absolutePath);
        continue;
      }
      if (!entry.isFile()) continue;
      const extension = path.extname(entry.name).toLowerCase();
      if (
        !textExtensions.has(extension) &&
        !entry.name.startsWith(".env") &&
        !["Dockerfile", "README", "Procfile"].includes(entry.name)
      ) {
        filesSkipped++;
        continue;
      }
      const stat = await lstat(absolutePath);
      if (stat.size > maxFileBytes || bytesRead + stat.size > maxTotalBytes) {
        filesSkipped++;
        continue;
      }
      const buffer = await readFile(absolutePath);
      if (buffer.includes(0)) {
        filesSkipped++;
        continue;
      }
      const content = buffer.toString("utf8");
      files.push({
        path: path.relative(absoluteRoot, absolutePath) || entry.name,
        absolutePath,
        content,
        lines: content.split(/\r?\n/),
      });
      bytesRead += buffer.byteLength;
    }
  }
  await walk(absoluteRoot);
  return { files, filesSkipped, bytesRead };
}

export function detectStacks(files: SourceFile[]): string[] {
  const names = new Set(files.map((file) => file.path));
  const packageFile = files.find((file) => file.path === "package.json");
  const packageText = packageFile?.content ?? "";
  const stacks = new Set<string>();
  if (/\.tsx?$/.test(files.map((file) => file.path).join(" ")))
    stacks.add("TypeScript");
  if (/\.(jsx?|mjs|cjs)$/.test(files.map((file) => file.path).join(" ")))
    stacks.add("JavaScript");
  if (/"next"\s*:/.test(packageText)) stacks.add("Next.js");
  if (/"react"\s*:/.test(packageText)) stacks.add("React");
  if (
    /supabase/i.test(packageText) ||
    [...names].some((name) => name.includes("supabase"))
  )
    stacks.add("Supabase");
  if (/firebase/i.test(packageText) || names.has("firebase.json"))
    stacks.add("Firebase");
  if (names.has("vercel.json")) stacks.add("Vercel");
  if (names.has("netlify.toml")) stacks.add("Netlify");
  return [...stacks];
}
