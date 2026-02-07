// ---------------------------------------------------------------------------
// GitHub REST API helpers — works without a token (60 req/hr) but respects
// GITHUB_TOKEN / GITHUB_ACCESS_TOKEN if present (5 000 req/hr).
// ---------------------------------------------------------------------------

const GITHUB_API = "https://api.github.com";

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "GitHubAnalyzer/1.0",
  };
  const token = process.env.GITHUB_TOKEN || process.env.GITHUB_ACCESS_TOKEN;
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

// ── Types ───────────────────────────────────────────────────────────────────

export interface GitHubProfile {
  login: string;
  name: string | null;
  bio: string | null;
  avatar_url: string;
  public_repos: number;
  followers: number;
}

export interface GitHubRepo {
  name: string;
  full_name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  size: number; // KB
  default_branch: string;
  fork: boolean;
  archived: boolean;
  topics?: string[];
  updated_at: string;
  created_at: string;
}

export interface TreeEntry {
  path: string;
  mode: string;
  type: "blob" | "tree";
  sha: string;
  size?: number;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

async function githubFetch(url: string): Promise<Response> {
  const response = await fetch(url, { headers: getHeaders() });

  if (response.status === 403) {
    const remaining = response.headers.get("x-ratelimit-remaining");
    if (remaining === "0") {
      const reset = response.headers.get("x-ratelimit-reset");
      const resetAt = reset
        ? new Date(parseInt(reset) * 1000).toISOString()
        : "unknown";
      throw new Error(
        `GitHub API rate limit exceeded. Resets at ${resetAt}. ` +
          `Set GITHUB_TOKEN env var for higher limits.`,
      );
    }
  }

  return response;
}

// ── Public API ──────────────────────────────────────────────────────────────

export async function fetchProfile(username: string): Promise<GitHubProfile> {
  const res = await githubFetch(
    `${GITHUB_API}/users/${encodeURIComponent(username)}`,
  );
  if (res.status === 404) {
    throw new Error(`GitHub user "${username}" not found`);
  }
  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status}`);
  }
  return res.json();
}

export async function fetchRepos(username: string): Promise<GitHubRepo[]> {
  const repos: GitHubRepo[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const res = await githubFetch(
      `${GITHUB_API}/users/${encodeURIComponent(username)}/repos` +
        `?per_page=${perPage}&page=${page}&sort=updated&type=owner`,
    );
    if (!res.ok) {
      throw new Error(`GitHub API error fetching repos: ${res.status}`);
    }
    const data: GitHubRepo[] = await res.json();
    if (data.length === 0) break;
    repos.push(...data);
    if (data.length < perPage) break;
    page++;
  }

  return repos;
}

export async function fetchTree(
  owner: string,
  repo: string,
  branch: string,
): Promise<TreeEntry[]> {
  const res = await githubFetch(
    `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
      repo,
    )}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
  );
  // Empty repo / missing default branch
  if (res.status === 404 || res.status === 409) return [];
  if (!res.ok) {
    throw new Error(
      `GitHub API error fetching tree for ${repo}: ${res.status}`,
    );
  }
  const data = await res.json();
  return data.tree ?? [];
}

/**
 * Fetch file content via raw.githubusercontent.com — this does NOT count
 * against the GitHub REST API rate limit, which is critical for unauthenticated
 * usage (60 req/hr).
 */
export async function fetchFileContent(
  owner: string,
  repo: string,
  path: string,
  branch: string = "main",
): Promise<string | null> {
  try {
    const url = `https://raw.githubusercontent.com/${encodeURIComponent(
      owner,
    )}/${encodeURIComponent(repo)}/${encodeURIComponent(branch)}/${path}`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const text = await res.text();
    // Guard against accidentally fetching binary content
    if (text.includes("\0")) return null;
    return text;
  } catch {
    return null;
  }
}
