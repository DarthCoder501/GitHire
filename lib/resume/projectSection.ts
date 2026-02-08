// ---------------------------------------------------------------------------
// Extract only the "Projects" section from resume text.
// Used for resume–GitHub validation and truthfulness report.
// ---------------------------------------------------------------------------

// Match lines that START with these phrases (allow colon, period, dash, or rest of line after).
// PDF extraction often produces "Projects:", "Projects  Selected work", or "PROJECTS." etc.
const PROJECT_HEADERS = [
  /^\s*projects?\b/im,
  /^\s*project\s+experience\b/im,
  /^\s*development\s+projects?\b/im,
  /^\s*software\s+projects?\b/im,
  /^\s*side\s+projects?\b/im,
  /^\s*personal\s+projects?\b/im,
  /^\s*technical\s+projects?\b/im,
  /^\s*selected\s+projects?\b/im,
  /^\s*key\s+projects?\b/im,
  /^\s*relevant\s+projects?\b/im,
  /^\s*notable\s+projects?\b/im,
  /^\s*portfolio\s*$/im,
];

// Match lines that START with these (next section); same "starts with" logic for consistency.
const SECTION_END_HEADERS = [
  /^\s*work\s+experience\b/im,
  /^\s*experience\b/im,
  /^\s*employment\b/im,
  /^\s*education\b/im,
  /^\s*academic\b/im,
  /^\s*technical\s+skills?\b/im,
  /^\s*skills?\b/im,
  /^\s*summary\b/im,
  /^\s*objective\b/im,
  /^\s*references\b/im,
  /^\s*certifications?\b/im,
  /^\s*activities\b/im,
  /^\s*volunteer\b/im,
  /^\s*contact\b/im,
];

/** Strip zero-width and other invisible characters that break matching. */
function stripInvisible(s: string): string {
  return s.replace(/[\u200B-\u200D\u2060\uFEFF\u00AD]/g, "");
}

/** Normalize line for section detection: trim bullets, collapse spaces, normalize common Unicode. */
function normalizeLine(line: string): string {
  return stripInvisible(line)
    .replace(/^[\s#\-*·•]+|[\s#\-*·•]+$/g, "")
    .replace(/\s+/g, " ")
    .replace(/[\u2013\u2014\u2015]/g, "-")
    .trim();
}

function isSectionHeader(line: string, patterns: RegExp[]): boolean {
  const trimmed = normalizeLine(line);
  if (!trimmed) return false;
  return patterns.some((p) => p.test(trimmed));
}

/**
 * Extract the project section from full resume text.
 * Detects "Projects" / "Project Experience" / etc. and returns content
 * until the next major section (Experience, Education, Skills, etc.).
 * Uses line-by-line detection first; if nothing found, searches full text (for PDFs with few newlines).
 */
export function extractProjectSection(resumeText: string): string {
  const normalized = stripInvisible(
    resumeText
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/\u00A0/g, " ")
      .replace(/[\u2000-\u200B\u202F\u205F\u3000]/g, " ")
      .trim(),
  );
  if (!normalized) return "";

  const lines = normalized.split("\n");
  let inProjectSection = false;
  const projectLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isSectionHeader(line, PROJECT_HEADERS)) {
      inProjectSection = true;
      const rest = getRestAfterProjectHeader(line);
      if (rest) projectLines.push(rest);
      continue;
    }
    if (inProjectSection) {
      if (isSectionHeader(line, SECTION_END_HEADERS)) break;
      projectLines.push(line);
    }
  }

  const fromLines = projectLines.join("\n").trim();
  if (fromLines) return fromLines;

  return extractProjectSectionFallback(normalized);
}

/**
 * Fallback when line-by-line detection finds nothing: search full text for "Projects" (or similar)
 * and take content after it until the next section. Handles PDFs that extract with few newlines
 * or with "Projects" in the middle of a long line.
 */
function extractProjectSectionFallback(normalized: string): string {
  const collapsed = normalized.replace(/\s+/g, " ").trim();
  if (!collapsed) return "";
  const projectStartRegex =
    /\b(Projects?|Project\s+Experience|Development\s+Projects?|Software\s+Projects?|Side\s+Projects?|Personal\s+Projects?|Technical\s+Projects?|Selected\s+Projects?|Key\s+Projects?|Relevant\s+Projects?|Notable\s+Projects?|Portfolio)\s*[:.\-–—]?\s*/im;
  const match = collapsed.match(projectStartRegex);
  if (!match) return "";

  const startIndex = collapsed.indexOf(match[0]) + match[0].length;
  let after = collapsed.slice(startIndex).trim();
  if (!after) return "";

  const nextSectionRegex =
    /\s+(Work\s+Experience|Experience|Employment|Education|Academic|Technical\s+Skills|Skills|Summary|Objective|References|Certifications?|Activities|Volunteer|Contact)\s*[:.\-–—]?\s*/im;
  const nextMatch = after.match(nextSectionRegex);
  if (nextMatch) {
    const endIndex = after.indexOf(nextMatch[0]);
    after = after.slice(0, endIndex).trim();
  }

  if (!after) return "";
  if (after.includes("\n")) return after;
  const bulletSeps = /[\s\u00A0]{2,}|\s*[•\-*·]\s+/g;
  return after
    .split(bulletSeps)
    .map((s) => s.trim())
    .filter(Boolean)
    .join("\n");
}

/** If line starts with a project header phrase, return the rest of the line (e.g. "Projects:  First bullet" → "First bullet"). */
function getRestAfterProjectHeader(line: string): string {
  const trimmed = normalizeLine(line);
  const patterns: RegExp[] = [
    /^\s*project\s+experience\s*[:.\-–—]?\s*/im,
    /^\s*side\s+projects?\s*[:.\-–—]?\s*/im,
    /^\s*personal\s+projects?\s*[:.\-–—]?\s*/im,
    /^\s*technical\s+projects?\s*[:.\-–—]?\s*/im,
    /^\s*selected\s+projects?\s*[:.\-–—]?\s*/im,
    /^\s*key\s+projects?\s*[:.\-–—]?\s*/im,
    /^\s*relevant\s+projects?\s*[:.\-–—]?\s*/im,
    /^\s*notable\s+projects?\s*[:.\-–—]?\s*/im,
    /^\s*portfolio\s*[:.\-–—]?\s*/im,
    /^\s*projects?\s*[:.\-–—]?\s*/im,
  ];
  for (const regex of patterns) {
    const m = trimmed.match(regex);
    if (m) {
      const rest = trimmed.slice(m[0].length).trim();
      return rest;
    }
  }
  return "";
}

/**
 * Split project section text into individual bullet points (one per line/item).
 */
export function parseProjectBullets(projectSectionText: string): string[] {
  const normalized = projectSectionText
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
  if (!normalized) return [];

  const bullets: string[] = [];
  const lines = normalized
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  for (const line of lines) {
    const cleaned = line
      .replace(/^[\s•\-*·]\s*/, "")
      .replace(/^[\d.]+\s*/, "")
      .trim();
    if (cleaned.length < 10 || cleaned.length > 500) continue;
    bullets.push(cleaned);
  }

  return bullets.slice(0, 30);
}
