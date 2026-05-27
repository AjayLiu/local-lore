-- Gemini synthesis failures and fallback attempts (server-written via service role).
create table lore_gemini_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  job_id text,
  search_label text,
  event text not null check (
    event in ('primary_failed', 'fallback_attempt', 'synthesis_failed')
  ),
  model_id text not null,
  previous_model_id text,
  fallback_model_id text,
  status_code integer,
  error_kind text,
  error_message text not null default '',
  will_fallback boolean
);

create index lore_gemini_logs_created_at_idx on lore_gemini_logs (created_at desc);
create index lore_gemini_logs_event_idx on lore_gemini_logs (event, created_at desc);
create index lore_gemini_logs_job_id_idx on lore_gemini_logs (job_id)
  where job_id is not null;
