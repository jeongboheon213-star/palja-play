-- Phase 2 only: existing orders security correction is already complete.
-- Does not delete order data or enable payments.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
-- 사주팔자PLAY: Premium 콘텐츠 최초 제공 시각 기록용 컬럼.
-- 아직 API에서 사용하지 않는다. 코드/테스트 검증 후 사용자에게 SQL Editor 실행을 요청한다.
-- 기존 주문/상태/권한은 변경하지 않는다.

alter table public.orders
  add column if not exists content_opened_at timestamptz;

comment on column public.orders.content_opened_at is
  'Premium 리포트가 서버에서 최초로 제공된 시각. null이면 아직 콘텐츠 미제공.';

revoke all on public.orders from public, anon, authenticated, service_role;
grant select, insert, update on public.orders to service_role;

-- User SQL Editor Run required. Apply 20261005030000 first.
-- No birth input, raw IP, purchase code, or secret is stored in rate buckets.
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check check
  (status in ('CREATED','PAYMENT_REQUESTED','PAID','FAILED','CANCELLED','REFUND_REQUESTED','REFUNDED'));

create or replace function public.open_paid_content(p_order_id text, p_code_hash text, p_chart_key text, p_product_id text, p_mode text)
returns setof public.orders language plpgsql security definer set search_path = '' as $$
declare o public.orders;
begin
  select * into o from public.orders where order_id = p_order_id for update;
  if not found or o.status <> 'PAID' or o.purchase_code_hash is distinct from p_code_hash or o.chart_key is distinct from p_chart_key
    or o.product_id is distinct from p_product_id or o.toss_mode is distinct from p_mode then return; end if;
  if o.content_opened_at is null then
    update public.orders set content_opened_at = now() where order_id = p_order_id returning * into o;
  end if;
  return next o;
end $$;

create or replace function public.claim_unopened_refund(p_order_id text, p_code_hash text, p_chart_key text, p_product_id text, p_mode text)
returns setof public.orders language plpgsql security definer set search_path = '' as $$
declare o public.orders;
begin
  select * into o from public.orders where order_id = p_order_id for update;
  if not found or o.status not in ('PAID','REFUND_REQUESTED') or o.content_opened_at is not null
    or o.purchase_code_hash is distinct from p_code_hash or o.chart_key is distinct from p_chart_key or o.product_id is distinct from p_product_id or o.toss_mode is distinct from p_mode then return; end if;
  update public.orders set status = 'REFUND_REQUESTED' where order_id = p_order_id returning * into o;
  return next o;
end $$;

-- Defense in depth: first provision is immutable even for ordinary service-role updates.
create or replace function public.protect_content_opened_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.content_opened_at is not null and new.content_opened_at is distinct from old.content_opened_at then
    raise exception 'first content provision is immutable';
  end if;
  if old.content_opened_at is null and new.content_opened_at is not null then
    if old.status <> 'PAID' or new.status <> 'PAID' then raise exception 'content requires PAID'; end if;
    new.content_opened_at := now();
  end if;
  return new;
end $$;
drop trigger if exists protect_content_opened_at on public.orders;
create trigger protect_content_opened_at before update on public.orders
  for each row execute function public.protect_content_opened_at();
revoke all on function public.protect_content_opened_at() from public, anon, authenticated, service_role;

create table if not exists public.premium_rate_buckets (
  scope text not null check (scope ~ '^(global|client:[0-9a-f]{64}|code:[0-9a-f]{64})$'),
  window_start timestamptz not null,
  attempts integer not null check (attempts > 0),
  primary key (scope, window_start)
);
create index if not exists premium_rate_buckets_window_idx on public.premium_rate_buckets(window_start);
alter table public.premium_rate_buckets enable row level security;
revoke all on public.premium_rate_buckets from public, anon, authenticated, service_role;

-- Database clock + atomic upsert; global lock first bounds storage under rotating-code attacks.
create or replace function public.consume_premium_attempt(p_client_hash text, p_code_hash text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  w timestamptz := to_timestamp(floor(extract(epoch from now()) / 600) * 600);
  n integer;
  client_n integer;
  code_n integer;
begin
  if p_client_hash is null or p_code_hash is null or p_client_hash !~ '^[0-9a-f]{64}$' or p_code_hash !~ '^[0-9a-f]{64}$' then return false; end if;
  insert into public.premium_rate_buckets values ('global', w, 1)
    on conflict (scope, window_start) do update set attempts = least(public.premium_rate_buckets.attempts + 1, 1001)
    returning attempts into n;
  delete from public.premium_rate_buckets where window_start < w - interval '20 minutes';
  if n > 1000 then return false; end if;
  insert into public.premium_rate_buckets values ('client:' || p_client_hash, w, 1)
    on conflict (scope, window_start) do update set attempts = least(public.premium_rate_buckets.attempts + 1, 31)
    returning attempts into client_n;
  if client_n > 30 then return false; end if;
  insert into public.premium_rate_buckets values ('code:' || p_code_hash, w, 1)
    on conflict (scope, window_start) do update set attempts = least(public.premium_rate_buckets.attempts + 1, 16)
    returning attempts into code_n;
  return code_n <= 15;
end $$;

revoke all on function public.open_paid_content(text,text,text,text,text) from public, anon, authenticated, service_role;
revoke all on function public.claim_unopened_refund(text,text,text,text,text) from public, anon, authenticated, service_role;
revoke all on function public.consume_premium_attempt(text,text) from public, anon, authenticated, service_role;
grant execute on function public.open_paid_content(text,text,text,text,text) to service_role;
grant execute on function public.claim_unopened_refund(text,text,text,text,text) to service_role;
grant execute on function public.consume_premium_attempt(text,text) to service_role;

commit;

