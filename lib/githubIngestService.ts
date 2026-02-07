import { GithubRepo, RepoContent, FileContent, GithubIngestResult } from '@/types/github';

const GITHUB_API_BASE = 'https://api.github.com';

/**
 * Fetch paginated data from GitHub API without authentication
 * Uses public endpoints only with no rate limit headers
 */
async function fetchFromGitHub<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'GitHire-Ingest',
    },
  });

  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status} ${res.statusText} - ${url}`);
  }

  return res.json() as Promise<T>;
}

/**
 * Fetch all public repositories for a given username
 * Limited to first 100 repos sorted by updated date (most recent first)
 */
async function fetchUserRepositories(username: string): Promise<GithubRepo[]> {
  const url = `${GITHUB_API_BASE}/users/${encodeURIComponent(username)}/repos?per_page=100&sort=updated&direction=desc`;

  const repos = await fetchFromGitHub<any[]>(url);

  if (!Array.isArray(repos) || repos.length === 0) {
    throw new Error(`No repositories found for user: ${username}`);
  }

  // Map to GithubRepo type and limit to 10
  return repos.slice(0, 10).map((repo) => ({
    name: repo.name,
    description: repo.description || null,
    language: repo.language || null,
    url: repo.html_url,
    stars: repo.stargazers_count || 0,
    forks: repo.forks_count || 0,
  }));
}

/**
 * Fetch contents (file tree) of a repository
 * Recursively retrieves directory structure up to 2 levels deep
 */
async function fetchRepositoryContents(
  owner: string,
  repo: string,
  path: string = '',
  depth: number = 0,
  maxDepth: number = 2
): Promise<RepoContent[]> {
  if (depth > maxDepth) {
    return [];
  }

  const url = `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path}`;

  try {
    const contents = await fetchFromGitHub<any[]>(url);

    if (!Array.isArray(contents)) {
      return [];
    }

    const results: RepoContent[] = [];

    // Process each item in the directory
    for (const item of contents) {
      results.push({
        name: item.name,
        path: item.path,
        type: item.type === 'dir' ? 'dir' : 'file',
        size: item.size || undefined,
      });

      // Recursively fetch directory contents
      if (item.type === 'dir' && depth < maxDepth) {
        try {
          const nestedContents = await fetchRepositoryContents(
            owner,
            repo,
            item.path,
            depth + 1,
            maxDepth
          );
          results.push(...nestedContents);
        } catch (err) {
          // Skip directories that fail (e.g., permission issues)
          console.warn(`Failed to fetch contents of ${item.path}:`, err);
        }
      }
    }

    return results;
  } catch (err) {
    // Return empty if root contents can't be fetched
    console.warn(`Failed to fetch repository contents for ${owner}/${repo}:`, err);
    return [];
  }
}

/**
 * Check if file extension is supported for content fetching
 */
function isSupportedFileType(filename: string): boolean {
  const supportedExtensions = ['.js', '.ts', '.tsx', '.json', '.md', '.txt'];
  const extension = filename.substring(filename.lastIndexOf('.')).toLowerCase();
  return supportedExtensions.includes(extension);
}

/**
 * Fetch actual file content from GitHub
 * Uses the /contents endpoint and decodes base64 content
 * Returns null if file is too large or fetch fails
 */
async function fetchFileContent(
  owner: string,
  repo: string,
  path: string,
  maxSizeBytes: number = 102400 // 100kb default limit
): Promise<string | null> {
  try {
    const url = `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodeURIComponent(path)}`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'GitHire-Ingest',
      },
    });

    if (!response.ok) {
      console.warn(`Failed to fetch file ${path}: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json() as any;

    // Check if content exists
    if (!data.content) {
      console.warn(`No content field for file ${path}`);
      return null;
    }

    // Check size during encoding check
    if (data.size && data.size > maxSizeBytes) {
      console.warn(`File too large (${data.size} bytes): ${path}`);
      return null;
    }

    // Decode base64 content if encoding is base64
    let decodedContent = '';
    if (data.encoding === 'base64') {
      try {
        decodedContent = Buffer.from(data.content, 'base64').toString('utf-8');
      } catch (decodeErr) {
        console.warn(`Failed to decode base64 content for ${path}:`, decodeErr);
        return null;
      }
    } else {
      // If not base64, use content as-is
      decodedContent = data.content;
    }

    // Final safety check on decoded content
    if (decodedContent.length > maxSizeBytes) {
      console.warn(`Decoded content exceeds max size: ${path}`);
      return null;
    }

    return decodedContent;
  } catch (err) {
    console.warn(`Failed to fetch file content for ${path}:`, err);
    return null;
  }
}

/**
 * Fetch file contents from a repository
 * Filters by supported file types, limits to maxFiles
 */
async function fetchRepositoryFileContents(
  owner: string,
  repo: string,
  maxFiles: number = 20
): Promise<FileContent[]> {
  try {
    // Get all contents first
    const allContents = await fetchRepositoryContents(owner, repo);

    // Filter for files only with supported extensions
    const supportedFiles = allContents.filter(
      (item) => item.type === 'file' && isSupportedFileType(item.name)
    );

    // Limit to maxFiles
    const filesToFetch = supportedFiles.slice(0, maxFiles);

    // Fetch content for each file in parallel
    const fileContentPromises = filesToFetch.map(async (file) => {
      const content = await fetchFileContent(owner, repo, file.path);

      const fileContent: FileContent = {
        name: file.name,
        path: file.path,
        type: 'file',
        size: file.size,
        content: content || '', // Empty string if fetch failed
      };

      return fileContent;
    });

    // Resolve all in parallel
    const fileContents = await Promise.all(fileContentPromises);

    // Filter out files where content fetch completely failed (optional)
    // Alternatively, keep them with empty content for transparency
    return fileContents;
  } catch (err) {
    console.warn(`Failed to fetch repository file contents for ${owner}/${repo}:`, err);
    return [];
  }
}

/**
 * Main ingestion function
 * Fetches user repos and their file structures, returns structured result
 */
export async function ingestGithubUser(username: string): Promise<GithubIngestResult> {
  const startTime = Date.now();

  try {
    // Fetch user repositories
    const repos = await fetchUserRepositories(username);

    // Fetch contents and file contents for each repository in parallel
    const repoPromises = repos.map(async (repo) => {
      const [contents, files] = await Promise.all([
        fetchRepositoryContents(username, repo.name),
        fetchRepositoryFileContents(username, repo.name, 20), // Limit to 20 files per repo
      ]);

      return {
        name: repo.name,
        description: repo.description,
        language: repo.language,
        url: repo.url,
        stars: repo.stars,
        forks: repo.forks,
        contents,
        files,
      };
    });

    const reposWithContents = await Promise.all(repoPromises);

    const result: GithubIngestResult = {
      username,
      timestamp: new Date().toISOString(),
      repos: reposWithContents,
      totalReposProcessed: reposWithContents.length,
      status: 'success',
    };

    const endTime = Date.now();
    console.log(`Ingestion completed for ${username} in ${endTime - startTime}ms`);

    return result;
  } catch (err: any) {
    console.error(`GitHub ingest error for ${username}:`, err);

    return {
      username,
      timestamp: new Date().toISOString(),
      repos: [],
      totalReposProcessed: 0,
      status: 'failed',
      message: err?.message || 'Unknown error during ingestion',
    };
  }
}
