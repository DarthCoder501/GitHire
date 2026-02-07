# GitHub Profile → Hiring-Ready Insights

**Hackathon Track:** Turn GitHub Profiles into Hiring-Ready Insights

A web application that analyzes a developer's GitHub profile and produces a comprehensive, hiring-grade evaluation. Given a GitHub username, the app assesses repositories, understands project intent and structure, reviews code quality like a senior engineer, and synthesizes everything into a clear, structured report.

---

## Track Summary

> **Turn GitHub profiles into hiring-ready insights.**  
> This track challenges you to build a web application that analyzes a developer's GitHub profile and produces a comprehensive, hiring-grade evaluation.  
> Given a GitHub username, your app should assess repositories, understand project intent and structure, review code quality like a senior engineer, and synthesize everything into a clear, structured report.  
> Think **scores**, **strengths and weaknesses**, **technical highlights**, **growth areas**, and a **final hiring recommendation**. Bonus points for depth, clarity, and realism in your evaluations.

---

## What This App Does

- **Input:** A GitHub username
- **Analysis:**
  - Assesses public repositories (languages, structure, activity)
  - Infers project intent and architecture
  - Reviews code quality with a senior-engineer lens (readability, patterns, testing, docs)
- **Output:** A structured, hiring-grade report including:
  - **Scores** (e.g. code quality, consistency, impact)
  - **Strengths & weaknesses**
  - **Technical highlights**
  - **Growth areas**
  - **Hiring recommendation** (e.g. Strong Yes / Yes / Lean Yes / No)

---

## Tech Stack

- **Framework:** Next.js 14+ (App Router)
- **UI:** React, Tailwind CSS
- **State:** React state / Zustand (as needed)
- **APIs:** GitHub REST/GraphQL for profile and repo data
- **Evaluation logic:** Custom scoring + optional LLM synthesis for narrative (e.g. Groq, OpenAI) for depth and clarity

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Create a `.env.local` in the project root:

```env
# Optional: for LLM-powered narrative and deeper code analysis
GITHUB_TOKEN=your_github_personal_access_token
# GROQ_API_KEY=...
# OPENAI_API_KEY=...
```

- **GITHUB_TOKEN:** [Create a token](https://github.com/settings/tokens) (repo scope) for higher rate limits and private repo metadata if needed.

### 3. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project Structure (current)

```
/
├── app/
│   ├── api/              # API routes (e.g. /api/analyze, /api/github)
│   ├── page.tsx          # Main UI: username input + report view
│   └── layout.tsx
├── components/
│   ├── canvas/           # Optional: visuals or charts
│   └── ui/               # Forms, report sections, scores
├── config/
│   └── prompts.ts        # Optional: LLM prompts for evaluation text
├── lib/
│   ├── github/           # GitHub API client, repo fetching
│   ├── analysis/         # Scoring, code quality heuristics
│   └── store/            # App state (e.g. report, loading)
└── public/
```

---

## Evaluation Criteria (for the report)

The report aims to be **realistic and useful to hiring managers**:

| Area               | What we assess                                    |
| ------------------ | ------------------------------------------------- |
| **Repositories**   | Variety, languages, stars, forks, activity trends |
| **Project intent** | README clarity, structure, tech choices           |
| **Code quality**   | Readability, patterns, tests, dependencies, docs  |
| **Scores**         | Numeric or tiered scores with short justification |
| **Strengths**      | Concrete, evidence-based positives                |
| **Weaknesses**     | Fair, constructive gaps                           |
| **Growth areas**   | Actionable suggestions                            |
| **Recommendation** | Clear hiring decision with reasoning              |

---

## Deployment

1. Push this repo to GitHub.
2. Import the project in [Vercel](https://vercel.com) (or your preferred host).
3. Add `GITHUB_TOKEN` (and any LLM keys) in the project’s environment variables.
4. Deploy; the app will be available at your Vercel URL.

---

## License

MIT
