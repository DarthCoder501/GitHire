// ---------------------------------------------------------------------------
// Per-repo summary builder.
// For each repo: fetch tree → filter files → fetch content → build summary.
// ---------------------------------------------------------------------------

import { GitHubRepo, TreeEntry, fetchTree, fetchFileContent } from "./api";
import { shouldIncludeFile } from "./exclusions";

// ── Types ───────────────────────────────────────────────────────────────────

export interface FileSummary {
  path: string;
  language: string;
  snippet: string;
  lineCount: number;
}

export interface RepoSummary {
  name: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  topLevelStructure: string[];
  files: FileSummary[];
}

// ── Tunables ────────────────────────────────────────────────────────────────

const MAX_FILE_CONTENT_CHARS = 1200;
const MAX_FILES_PER_REPO = 5;
const MAX_REPOS_TO_ANALYZE = 6;
const MAX_FILE_SIZE_BYTES = 80_000; // 80 KB

// ── Helpers ─────────────────────────────────────────────────────────────────

const LANG_MAP: Record<string, string> = {
  ts: "TypeScript",
  tsx: "TypeScript/React",
  js: "JavaScript",
  jsx: "JavaScript/React",
  mjs: "JavaScript",
  cjs: "JavaScript",
  py: "Python",
  pyi: "Python",
  go: "Go",
  rs: "Rust",
  java: "Java",
  kt: "Kotlin",
  scala: "Scala",
  c: "C",
  cpp: "C++",
  cc: "C++",
  h: "C/C++ Header",
  hpp: "C++ Header",
  cs: "C#",
  fs: "F#",
  rb: "Ruby",
  php: "PHP",
  swift: "Swift",
  dart: "Dart",
  sol: "Solidity",
  vue: "Vue",
  svelte: "Svelte",
  astro: "Astro",
  html: "HTML",
  css: "CSS",
  scss: "SCSS",
  md: "Markdown",
  mdx: "Markdown",
  yaml: "YAML",
  yml: "YAML",
  toml: "TOML",
  sql: "SQL",
  sh: "Shell",
  bash: "Shell",
  r: "R",
  jl: "Julia",
  lua: "Lua",
  zig: "Zig",
  ex: "Elixir",
  exs: "Elixir",
  tf: "Terraform",
  hcl: "HCL",
  proto: "Protobuf",
};

function inferLanguage(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() || "";
  return LANG_MAP[ext] ?? (ext.toUpperCase() || "Unknown");
}

/** Sort priority — lower = fetch first. */
function filePriority(path: string): number {
  const p = path.toLowerCase();
  if (p.includes("readme")) return 0;
  if (/^(src\/)?(index|main|app)\.(ts|tsx|js|jsx|py|go|rs)$/.test(p)) return 1;
  if (p.endsWith("main.rs") || p.endsWith("lib.rs")) return 1;
  if (p.includes("/page.") || p.includes("/layout.")) return 2;
  if (p.includes("/route.") || p.includes("/api/")) return 2;
  if (p.startsWith("src/") || p.startsWith("app/") || p.startsWith("lib/"))
    return 3;
  return 5;
}

function truncateContent(content: string, max: number): string {
  if (content.length <= max) return content;
  return content.slice(0, max) + "\n// … (truncated)";
}

// ── Public API ──────────────────────────────────────────────────────────────

/** Pick the top repos to analyse (non-fork, non-archived, non-empty). */
export function selectTopRepos(repos: GitHubRepo[]): GitHubRepo[] {
  return repos
    .filter((r) => !r.fork && !r.archived && r.size > 0)
    .sort((a, b) => {
      if (b.stargazers_count !== a.stargazers_count)
        return b.stargazers_count - a.stargazers_count;
      return (
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
    })
    .slice(0, MAX_REPOS_TO_ANALYZE);
}

/** Build a structured summary for a single repository. */
export async function buildRepoSummary(
  owner: string,
  repo: GitHubRepo,
): Promise<RepoSummary> {
  // 1. Recursive tree
  const tree = await fetchTree(owner, repo.name, repo.default_branch);

  // 2. Top-level directory listing
  const topLevel = tree
    .filter((e) => !e.path.includes("/"))
    .map((e) => (e.type === "tree" ? `${e.path}/` : e.path))
    .slice(0, 25);

  // 3. Filter & prioritise blobs
  const filesToRead = tree
    .filter(
      (e) =>
        e.type === "blob" &&
        shouldIncludeFile(e.path) &&
        (e.size == null || e.size <= MAX_FILE_SIZE_BYTES),
    )
    .sort((a, b) => filePriority(a.path) - filePriority(b.path))
    .slice(0, MAX_FILES_PER_REPO);

  // 4. Fetch content
  const files: FileSummary[] = [];
  for (const entry of filesToRead) {
    try {
      const content = await fetchFileContent(
        owner,
        repo.name,
        entry.path,
        repo.default_branch,
      );
      if (!content) continue;

      files.push({
        path: entry.path,
        language: inferLanguage(entry.path),
        snippet: truncateContent(content, MAX_FILE_CONTENT_CHARS),
        lineCount: content.split("\n").length,
      });
    } catch {
      // Skip files that fail
    }
  }

  return {
    name: repo.name,
    description: repo.description,
    language: repo.language,
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    topLevelStructure: topLevel,
    files,
  };
}
