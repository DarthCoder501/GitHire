# Supabase Setup Guide (GitHire)

Step-by-step instructions to set up Supabase for this project (auth, database, and env). The app uses Supabase for authentication (email/password and optional OAuth) and for storing reports, chats, messages, comparisons, and user preferences.

---

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and sign in (or create an account).
2. Click **New project**.
3. Choose your **Organization** (or create one).
4. Set:
   - **Name**: e.g. `githire` or `sjhacks2026`
   - **Database password**: choose a strong password and **store it safely** (you need it for DB access).
   - **Region**: pick one close to you or your users.
5. Click **Create new project** and wait until the project is ready.

---

## 2. Get your project URL and anon key

1. In the Supabase dashboard, open your project.
2. Go to **Project Settings** (gear icon in the left sidebar).
3. Open the **API** section.
4. Copy:
   - **Project URL** (e.g. `https://xxxxxxxx.supabase.co`)
   - **anon public** key (under "Project API keys") — this is safe to use in the browser.

You will use these in the next step.

---

## 3. Configure environment variables locally

1. In the project root, copy the example env file:
   ```bash
   cp .env.local.example .env.local
   ```
2. Open `.env.local` and set the Supabase values:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
   Replace with your **Project URL** and **anon public** key from step 2.
3. Save the file. Do not commit `.env.local` (it should be in `.gitignore`).

---

## 4. Run the database schema in Supabase

1. In the Supabase dashboard, go to **SQL Editor**.
2. Click **New query**.
3. Open this repo’s schema file: `supabase/schema.sql`.
4. Copy its **entire contents** and paste them into the SQL Editor.
5. Click **Run** (or press Cmd/Ctrl + Enter).
6. Confirm there are no errors. This creates:
   - `reports` — one row per (user, candidate); payload is the full HiringReport JSON (with RLS).
   - `chats` — one chat per (user, candidate) for conversation history (with RLS).
   - `messages` — messages within a chat (with RLS).
   - `comparisons` — one row per (user, candidate_a, candidate_b); result is comparison JSON (with RLS).
   - `user_preferences` — role_level, focus (and optionally GitHub token; see migration in schema if added later) (with RLS).
   - `handle_updated_at()` and triggers on reports, chats, user_preferences.

---

## 5. Enable Authentication (email/password)

The app uses Supabase Auth with email/password and supports OAuth callback.

1. In the dashboard, go to **Authentication** → **Providers**.
2. Ensure **Email** is enabled (it usually is by default).
3. Optional: under **Email**, configure:
   - **Confirm email**: turn on if you want users to verify email before signing in.
   - **Secure email change**: recommended for production.
4. For **Redirect URLs** (used after sign-in/sign-up):
   - Go to **Authentication** → **URL Configuration**.
   - Add your app URLs, e.g.:
     - `http://localhost:3000`
     - `http://localhost:3000/auth/callback`
     - Your production URL and callback, e.g. `https://yourdomain.com/auth/callback`

Without the callback URL, the auth redirect after login may fail.

---

## 6. (Optional) Enable OAuth providers

If you want Google, GitHub, etc.:

1. Go to **Authentication** → **Providers** and enable the provider (e.g. **Google**).
2. Follow Supabase’s instructions to create OAuth credentials (e.g. in Google Cloud Console) and paste **Client ID** and **Client Secret** into Supabase.
3. Add the same **Redirect URL** in the provider’s config:  
   `https://<your-project-ref>.supabase.co/auth/v1/callback`  
   (Supabase shows this in the provider setup.)

---

## 7. Verify the app

1. Restart your Next.js dev server so it picks up `.env.local`:
   ```bash
   npm run dev
   ```
2. In the app:
   - Open the sign-up page (e.g. `/auth/sign-up`) and create an account.
   - Sign in (e.g. `/auth/sign-in`).
   - Use features that use Supabase: reports, chats, compare, etc.
3. In Supabase:
   - **Authentication** → **Users**: you should see the new user.
   - **Table Editor**: check `reports`, `chats`, `messages`, `comparisons` after using those features.

---

## Summary checklist

- [ ] Supabase project created
- [ ] Project URL and anon key copied
- [ ] `.env.local` created with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `supabase/schema.sql` run in SQL Editor
- [ ] Auth redirect URLs set (including `/auth/callback` and localhost)
- [ ] Dev server restarted and sign-up/sign-in tested

---

## Troubleshooting

- **"Invalid API key" or auth errors**  
  Double-check `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local` and that you restarted the dev server.

- **Redirect after login fails**  
  Add the exact callback URL (e.g. `http://localhost:3000/auth/callback`) under **Authentication** → **URL Configuration** → **Redirect URLs**.

- **RLS errors when reading/writing data**  
  Ensure you ran the full `supabase/schema.sql` so RLS policies exist. Signed-in users can only access their own rows (`auth.uid() = user_id`).

- **GitHub token column missing**  
  If you ran the schema before the `github_token_encrypted` column was added, run this in the SQL Editor:

  ```sql
  alter table public.user_preferences
  add column if not exists github_token_encrypted text;
  ```

- **Types out of date**  
  If you change the schema in Supabase, you can regenerate TypeScript types with the Supabase CLI:
  ```bash
  npx supabase gen types typescript --project-id YOUR_PROJECT_REF > lib/supabase/types.ts
  ```
  Replace `YOUR_PROJECT_REF` with your project ref from the Supabase URL.
