/**
 * Types for GitHub ingest service and storage.
 * Used by lib/githubIngestService.ts and lib/storageService.ts.
 */

export interface GithubRepo {
  name: string;
  description: string | null;
  language: string | null;
  url: string;
  stars: number;
  forks: number;
}

export interface RepoContent {
  name: string;
  path: string;
  type: "dir" | "file";
  size?: number;
}

export interface FileContent {
  name: string;
  path: string;
  type: "file";
  size?: number;
  content: string;
}

export interface GithubIngestRepo {
  name: string;
  description: string | null;
  language: string | null;
  url: string;
  stars: number;
  forks: number;
  contents: RepoContent[];
  files: FileContent[];
}

export interface GithubIngestResult {
  username: string;
  timestamp: string;
  repos: GithubIngestRepo[];
  totalReposProcessed: number;
  status: "success" | "partial" | "failed";
  message?: string;
}
