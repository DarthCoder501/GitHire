-- GitHire Database Schema
-- Run this in Supabase SQL Editor to set up all tables and RLS policies.

-- ─── Reports ─── --
-- One row per (user, candidate). Payload is the full HiringReport JSON.
create table if not exists public.reports (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  candidate_username text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create unique index if not exists reports_user_candidate_idx
  on public.reports (user_id, candidate_username);

alter table public.reports enable row level security;

create policy "Users can read own reports"
  on public.reports for select
  using (auth.uid() = user_id);

create policy "Users can insert own reports"
  on public.reports for insert
  with check (auth.uid() = user_id);

create policy "Users can update own reports"
  on public.reports for update
  using (auth.uid() = user_id);

create policy "Users can delete own reports"
  on public.reports for delete
  using (auth.uid() = user_id);


-- ─── Chats ─── --
-- One chat per (user, candidate). Each chat holds a conversation thread.
create table if not exists public.chats (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  candidate_username text not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create unique index if not exists chats_user_candidate_idx
  on public.chats (user_id, candidate_username);

create index if not exists chats_user_updated_idx
  on public.chats (user_id, updated_at desc);

alter table public.chats enable row level security;

create policy "Users can read own chats"
  on public.chats for select
  using (auth.uid() = user_id);

create policy "Users can insert own chats"
  on public.chats for insert
  with check (auth.uid() = user_id);

create policy "Users can update own chats"
  on public.chats for update
  using (auth.uid() = user_id);

create policy "Users can delete own chats"
  on public.chats for delete
  using (auth.uid() = user_id);


-- ─── Messages ─── --
-- Individual messages within a chat. Ordered by sequence.
create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  chat_id uuid references public.chats(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  sequence serial not null,
  created_at timestamptz default now() not null
);

create index if not exists messages_chat_seq_idx
  on public.messages (chat_id, sequence);

alter table public.messages enable row level security;

-- Messages inherit access from parent chat (user owns the chat)
create policy "Users can read messages from own chats"
  on public.messages for select
  using (
    exists (
      select 1 from public.chats
      where chats.id = messages.chat_id
        and chats.user_id = auth.uid()
    )
  );

create policy "Users can insert messages into own chats"
  on public.messages for insert
  with check (
    exists (
      select 1 from public.chats
      where chats.id = messages.chat_id
        and chats.user_id = auth.uid()
    )
  );

create policy "Users can delete messages from own chats"
  on public.messages for delete
  using (
    exists (
      select 1 from public.chats
      where chats.id = messages.chat_id
        and chats.user_id = auth.uid()
    )
  );


-- ─── Comparisons ─── --
-- One row per (user, candidateA, candidateB). candidate_a < candidate_b (normalized).
create table if not exists public.comparisons (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  candidate_a text not null,
  candidate_b text not null,
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz default now() not null,
  constraint comparisons_ordered check (candidate_a < candidate_b)
);

create unique index if not exists comparisons_user_pair_idx
  on public.comparisons (user_id, candidate_a, candidate_b);

alter table public.comparisons enable row level security;

create policy "Users can read own comparisons"
  on public.comparisons for select
  using (auth.uid() = user_id);

create policy "Users can insert own comparisons"
  on public.comparisons for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own comparisons"
  on public.comparisons for delete
  using (auth.uid() = user_id);


-- ─── User Preferences (Role & Level Targeting) ─── --
-- Optional hiring preferences per user.
create table if not exists public.user_preferences (
  user_id uuid references auth.users(id) on delete cascade primary key,
  role_level text check (role_level in ('junior', 'mid', 'senior', 'staff') or role_level is null),
  focus text check (focus in ('frontend', 'backend', 'fullstack', 'devops', 'ai-ml') or focus is null),
  updated_at timestamptz default now() not null
);

alter table public.user_preferences enable row level security;

create policy "Users can read own preferences"
  on public.user_preferences for select
  using (auth.uid() = user_id);

create policy "Users can insert own preferences"
  on public.user_preferences for insert
  with check (auth.uid() = user_id);

create policy "Users can update own preferences"
  on public.user_preferences for update
  using (auth.uid() = user_id);


-- ─── Auto-update updated_at ─── --
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger reports_updated_at
  before update on public.reports
  for each row execute function public.handle_updated_at();

create trigger chats_updated_at
  before update on public.chats
  for each row execute function public.handle_updated_at();

create trigger user_preferences_updated_at
  before update on public.user_preferences
  for each row execute function public.handle_updated_at();
