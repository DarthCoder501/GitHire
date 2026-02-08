# GitHire — GitHub Profile to Hiring-Ready Insights

A web application that analyzes a developer's GitHub profile and produces a comprehensive, hiring-grade evaluation. Given a GitHub username, the app assesses repositories, understands project intent and structure, reviews code quality like a senior engineer, and synthesizes everything into a clear, structured report.

---

## What This App Does

- **Input:** A GitHub username (or two for comparison).
- **Analysis:**
  - Fetches profile and public repositories via GitHub REST API.
  - Selects top repos, builds per-repo summaries (structure, README, code snippets).
  - Sends aggregated data to Groq LLM for scoring and narrative.
- **Output:** A structured hiring report including:
  - **Overall score** (0–100) and **hiring verdict** (Strong Yes / Yes / Lean Yes / No).
  - **Recommended role(s)** (e.g. Frontend Engineer, Backend Engineer, Full-stack).
  - **Score breakdown** (code quality, consistency, impact, documentation, testing).
  - **Strengths & growth areas**, **technical highlights**, **skills radar**, **activity chart**.
  - **Executive summary** (with optional TTS: “Beep boop” + summary).
- **Compare:** Side-by-side comparison of two candidates (reports can be created on the fly or from saved history).
- **Export:** PDF and Markdown.
- **Auth:** Supabase (email/password). Signed-in users get saved reports, chats, comparisons, and preferences.

---

## Tech Stack

- **Framework:** Next.js 14+ (App Router).
- **UI:** React, Tailwind CSS, Framer Motion (teal accent, glass cards, responsive).
- **APIs:** GitHub REST for profile/repos; Groq for LLM analysis; Deepgram for TTS.
- **Backend:** Supabase (auth, Postgres: reports, chats, messages, comparisons, user_preferences).

---

## Project Structure

```
/
├── app/
│   ├── page.tsx                 # Home: analyze input + report + TTS
│   ├── layout.tsx               # Root layout (theme, fonts)
│   ├── globals.css               # Design tokens (dark/light), glass, teal
│   ├── account/page.tsx          # Account: stats, preferences, GitHub token, sign out
│   ├── analyze/page.tsx          # Standalone analyze form + report
│   ├── compare/page.tsx          # Compare two candidates (ad-hoc or saved)
│   ├── chats/page.tsx            # Past searches (saved reports by candidate)
│   ├── match/page.tsx            # Job match (report vs job description)
│   ├── auth/
│   │   ├── sign-in/page.tsx
│   │   ├── sign-up/page.tsx
│   │   └── callback/route.ts     # OAuth redirect
│   └── api/
│       ├── analyze/route.ts      # POST: full pipeline (GitHub → Groq), saves report/chat if auth
│       ├── compare/route.ts      # POST/GET: compare two candidates, saves comparison
│       ├── reports/route.ts      # GET/POST: list/save reports
│       ├── chats/route.ts        # GET: list chats
│       ├── speak/route.ts        # POST: TTS (Deepgram)
│       ├── preferences/route.ts # GET/POST: role_level, focus
│       ├── github-ingest/route.ts# POST: ingest repos (optional module)
│       ├── match-job/route.ts    # POST: job match
│       └── conversation/route.ts# FormData: voice conversation
├── components/
│   ├── NavHeader.tsx             # Nav + theme toggle + account/avatar
│   ├── dashboard/
│   │   ├── GlassCard.tsx
│   │   ├── ReportView.tsx        # Bento grid: score, verdict, role, strengths, radar, export
│   │   ├── SpeechBubble.tsx     # TTS controls + “beep boop” + executive summary
│   │   ├── ExportControls.tsx
│   │   ├── ScoreRing.tsx, HiringBadge.tsx, SkillRadar.tsx, etc.
│   └── canvas/                   # Optional 3D/2D visuals
├── lib/
│   ├── github/api.ts             # GitHub REST (profile, repos, tree, file content); uses GITHUB_TOKEN if set
│   ├── github/summarize.ts       # Select top repos, build repo summaries
│   ├── github/exclusions.ts      # Repo/file exclusions
│   ├── groq/analyze.ts            # Groq LLM → HiringReport (scores, verdict, recommendedRoles, etc.)
│   ├── export/markdown.ts        # Markdown report
│   ├── export/pdf.ts             # PDF report
│   ├── supabase/                 # Client, server, hooks, middleware
│   ├── types/report.ts           # HiringReport type
│   └── audio/                    # TTS playback (SpeechAudioManager)
├── config/prompts.ts
├── supabase/schema.sql           # reports, chats, messages, comparisons, user_preferences
└── public/                       # Logo, robot avatar, favicon
```

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Copy the example file and fill in values:

```bash
cp .env.local.example .env.local
```

See `.env.local.example` for all variables. Required for full functionality:

- **Supabase:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (auth, DB).
- **Groq:** `GROQ_API_KEY` (LLM analysis).
- **Deepgram:** `DEEPGRAM_API_KEY` (TTS for executive summary).

Optional:

- **GITHUB_TOKEN:** Personal access token for higher GitHub API rate limits. Without it, the app works with unauthenticated limits (60 req/hr). You can also set a per-user token in Account → GitHub token.

### 3. Database

Run `supabase/schema.sql` in the Supabase SQL Editor (see SUPABASE_SETUP.md).

### 4. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Features (summary)

| Feature           | Description                                                                                                          |
| ----------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Analyze**       | Enter GitHub username → full report (scores, verdict, recommended roles, TTS summary).                               |
| **Compare**       | Two usernames → analyze both if needed, then side-by-side comparison; saved for signed-in users.                     |
| **Resume**        | Upload PDF/DOCX or paste text; only Projects section used. Bullet-level truthfulness vs GitHub repos; resume report. |
| **Past Searches** | List and reopen saved reports (chats).                                                                               |
| **Job Match**     | Match a saved report to a job description.                                                                           |
| **Account**       | Stats, hiring preferences (role level, focus), optional GitHub token, sign out.                                      |
| **Export**        | PDF and Markdown from report view.                                                                                   |
| **Theme**         | Light/dark toggle (persisted in localStorage).                                                                       |
| **Mobile**        | Responsive layout; nav, analyze, compare, account, export, and TTS work on narrow viewports.                         |

---

## Deployment

1. Push the repo to GitHub.
2. Import the project in [Vercel](https://vercel.com) (or your host).
3. Add all required env vars (Supabase, Groq, Deepgram; optional GITHUB_TOKEN).
4. In Supabase, set redirect URLs for production (e.g. `https://yourdomain.com/auth/callback`).
5. Deploy.

---

## License

MIT
