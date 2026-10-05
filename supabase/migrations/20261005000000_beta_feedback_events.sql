-- 팔자PLAY Beta: 피드백 · 행동 이벤트 저장 테이블
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 Run 한 번.
--
-- 원칙
--  - 이름·생년월일·출생 시각·성별을 저장하지 않는다 (컬럼 자체가 없음).
--  - 브라우저(anon 키)는 INSERT 만 가능하다. 읽기·수정·삭제는 불가 (RLS).
--  - 값의 모양은 CHECK 제약으로 막는다 (anon 키는 공개 키라서 누구나 보낼 수 있기 때문).
--  - 조회·분석은 Supabase 대시보드(관리자)에서만 한다.

-- ── 피드백 ────────────────────────────────────────────────────
create table if not exists public.beta_feedback (
  id                          uuid primary key,                 -- feedbackId (브라우저 무작위 UUID)
  result_id                   uuid not null,                    -- 결과 연결용 무작위 UUID (개인정보 아님)
  created_at                  timestamptz not null default now(),
  client_created_at           timestamptz,
  source                      text not null check (source in ('development', 'production')),
  feedback_schema_version     text not null check (char_length(feedback_schema_version) <= 40),
  engine_version              text not null check (char_length(engine_version) <= 40),
  schema_version              text not null check (char_length(schema_version) <= 40),
  interpretation_version      text not null check (char_length(interpretation_version) <= 40),
  score_version               text not null check (char_length(score_version) <= 40),
  solar_term_provider_version text not null check (char_length(solar_term_provider_version) <= 60),
  policy_version              text not null check (char_length(policy_version) <= 40),
  character_id                text not null check (char_length(character_id) <= 40),
  time_known                  boolean not null,
  boundary_risk               boolean not null,
  uncertain_pillar_count      smallint not null check (uncertain_pillar_count between 0 and 4),
  similarity                  smallint not null check (similarity between 1 and 5),
  best_match                  text[] not null default '{}'
    check (best_match <@ array['personality','wealth','love','career','business','relationship']::text[]),
  worst_match                 text[] not null default '{}'
    check (worst_match <@ array['personality','wealth','love','career','business','relationship']::text[]),
  worst_none                  boolean not null default false,
  share_intent                text check (share_intent in ('no', 'maybe', 'yes')),
  comment                     text check (char_length(comment) <= 500)
);

create index if not exists beta_feedback_created_at_idx on public.beta_feedback (created_at);
create index if not exists beta_feedback_versions_idx on public.beta_feedback (engine_version, interpretation_version, score_version);

-- ── 행동 이벤트 ───────────────────────────────────────────────
create table if not exists public.beta_events (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  client_at   timestamptz,
  source      text not null check (source in ('development', 'production')),
  name        text not null check (name in (
                'landing_view', 'input_start', 'calculation_complete', 'result_view', 'share_click',
                'premium_money_click', 'premium_love_click', 'premium_career_click',
                'premium_money_interest', 'premium_love_interest', 'premium_career_interest',
                'feedback_submit')),
  session_id  uuid not null,
  result_id   uuid,
  props       jsonb not null default '{}'::jsonb check (pg_column_size(props) <= 2048)
);

create index if not exists beta_events_created_at_idx on public.beta_events (created_at);
create index if not exists beta_events_name_idx on public.beta_events (name);
create index if not exists beta_events_session_idx on public.beta_events (session_id);

-- ── 권한: 브라우저(anon)는 INSERT 만 ──────────────────────────
alter table public.beta_feedback enable row level security;
alter table public.beta_events enable row level security;

revoke all on public.beta_feedback from anon, authenticated;
revoke all on public.beta_events from anon, authenticated;
grant insert on public.beta_feedback to anon;
grant insert on public.beta_events to anon;

drop policy if exists "anon can insert feedback" on public.beta_feedback;
create policy "anon can insert feedback" on public.beta_feedback for insert to anon with check (true);

drop policy if exists "anon can insert events" on public.beta_events;
create policy "anon can insert events" on public.beta_events for insert to anon with check (true);
-- SELECT/UPDATE/DELETE 정책이 없으므로 anon 은 읽거나 고칠 수 없다.
