# Resume Evaluator — Scope

This document describes the resume-related features in GitHire.

---

## Resume vs repo truthfulness

**Implemented.** Input: resume (file upload or pasted text) and candidate GitHub username. Only the **Projects** section is extracted and used.

- **Bullet-level verification:** For each bullet in the project section, the app parses claimed technologies, numbers, and features and checks them against the candidate's GitHub repos (structure, README, code snippets). Output: per-bullet status (supported / partially supported / not found / contradicted) with evidence.
- **Project-name alignment:** Resume project phrases are also matched to repo names/descriptions (one signal among others).
- **API:** `POST /api/resume-vs-repo` — body `{ resumeText: string, candidateUsername: string }`, auth required.
- **UI:** Resume page — upload file or paste text, enter GitHub username, see bullet-level truthfulness and project alignment.

---

## Resume report

**Implemented.** Same style as the GitHub profile report (sections, scores, strengths, growth areas, recommendation) but resume-focused (experience, skills, consistency, clarity). Uses the same UI components.

- **API:** `POST /api/resume-analyze` — body `{ resumeText: string }`, auth optional.
- **UI:** Resume page — paste or upload resume (project section or full text) to generate the report.

---

## Resume input

- **File upload:** PDF and DOCX. User selects a file; the app extracts text via `POST /api/resume-extract`.
- **Paste text:** Toggle "Paste text instead" to use a text area. Only one mode is active at a time.
- **Scope:** Only the project section (Projects / Project Experience / similar headers) is extracted and used for resume–GitHub validation and for the resume report.

---

## Overall score

The app shows:

- **GitHub report:** Overall hiring score from the GitHub analysis (dashboard).
- **Resume report:** Overall resume score (Resume page).

No combined LinkedIn score; the product uses GitHub and resume only.
