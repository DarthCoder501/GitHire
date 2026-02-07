// ---------------------------------------------------------------------------
// File / directory exclusion rules for the GitHub repo extraction pipeline.
// Intent: include only source code & docs an engineer would read to evaluate
// quality; skip config/lock files, generated/build artifacts, and binaries.
// ---------------------------------------------------------------------------

const EXCLUDED_DIRS = new Set([
  "node_modules",
  "venv",
  ".venv",
  "env",
  ".env",
  "dist",
  "build",
  ".git",
  "__pycache__",
  ".next",
  ".nuxt",
  ".output",
  ".vscode",
  ".idea",
  "vendor",
  "coverage",
  ".cache",
  "tmp",
  "temp",
  ".turbo",
  ".parcel-cache",
  ".svelte-kit",
  "target", // Rust/Java build output
  "out", // common build output
  ".terraform",
]);

const EXCLUDED_FILES = new Set([
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lock",
  "bun.lockb",
  "Cargo.lock",
  "go.sum",
  "Pipfile.lock",
  "poetry.lock",
  "composer.lock",
  ".DS_Store",
  "Thumbs.db",
]);

const EXCLUDED_EXTENSIONS = new Set([
  ".min.js",
  ".min.css",
  ".map",
  ".log",
  // Images
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".ico",
  ".svg",
  ".webp",
  ".bmp",
  ".tiff",
  // Fonts
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".otf",
  // Archives
  ".zip",
  ".tar",
  ".gz",
  ".rar",
  ".7z",
  ".bz2",
  ".xz",
  // Binaries / executables
  ".exe",
  ".dll",
  ".so",
  ".dylib",
  ".o",
  ".obj",
  ".a",
  ".lib",
  ".class",
  // Databases
  ".db",
  ".sqlite",
  ".sqlite3",
  // Media
  ".mp3",
  ".mp4",
  ".wav",
  ".avi",
  ".mov",
  ".flac",
  ".ogg",
  ".webm",
  // Office / PDF
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  // Misc generated
  ".pyc",
  ".pyo",
  ".wasm",
]);

const CODE_EXTENSIONS = new Set([
  // JS / TS
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  // Python
  ".py",
  ".pyi",
  // Systems
  ".go",
  ".rs",
  ".c",
  ".cpp",
  ".cc",
  ".h",
  ".hpp",
  ".zig",
  // JVM
  ".java",
  ".kt",
  ".kts",
  ".scala",
  ".clj",
  // .NET
  ".cs",
  ".fs",
  ".vb",
  // Ruby / PHP
  ".rb",
  ".php",
  // Apple / Mobile
  ".swift",
  ".m",
  ".mm",
  ".dart",
  // Scripting / Config-as-code
  ".sh",
  ".bash",
  ".zsh",
  ".fish",
  ".ps1",
  ".lua",
  ".nim",
  ".ex",
  ".exs",
  ".erl",
  ".hrl",
  ".r",
  ".R",
  ".jl",
  // Web
  ".html",
  ".css",
  ".scss",
  ".sass",
  ".less",
  ".vue",
  ".svelte",
  ".astro",
  // Data / Query
  ".sql",
  ".graphql",
  ".gql",
  ".proto",
  // Infra
  ".tf",
  ".hcl",
  // Blockchain
  ".sol",
  // Docs & structured
  ".md",
  ".mdx",
  ".rst",
  ".txt",
  ".yaml",
  ".yml",
  ".toml",
  ".json", // non-lock .json files
  ".xml",
]);

function getExtension(fileName: string): string {
  if (fileName.endsWith(".min.js")) return ".min.js";
  if (fileName.endsWith(".min.css")) return ".min.css";
  const dot = fileName.lastIndexOf(".");
  if (dot <= 0) return "";
  return fileName.slice(dot).toLowerCase();
}

/**
 * Decide whether a given repo-relative path should be fetched & included
 * in the per-repo summary sent to the LLM.
 */
export function shouldIncludeFile(path: string): boolean {
  const parts = path.split("/");
  const fileName = parts[parts.length - 1];

  // --- directory exclusions ---
  for (const dir of parts.slice(0, -1)) {
    if (EXCLUDED_DIRS.has(dir) || EXCLUDED_DIRS.has(dir.toLowerCase())) {
      return false;
    }
  }

  // --- specific file-name exclusions ---
  if (EXCLUDED_FILES.has(fileName)) return false;

  // --- .env files (any variant) ---
  if (fileName.startsWith(".env")) return false;

  // --- extension-based exclusions ---
  const ext = getExtension(fileName);
  if (EXCLUDED_EXTENSIONS.has(ext)) return false;

  // --- always-include special files ---
  const lower = fileName.toLowerCase();
  if (
    lower === "dockerfile" ||
    lower === "makefile" ||
    lower === "cmakelists.txt" ||
    lower.startsWith("readme")
  ) {
    return true;
  }

  // --- whitelist code extensions ---
  if (CODE_EXTENSIONS.has(ext)) return true;

  // Anything not in the whitelist is excluded.
  return false;
}
