-- 사주팔자PLAY: 결제 주문 (토스페이먼츠). 서버(service_role)만 읽고 쓴다.
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 Run 한 번.
--
-- 원칙
--  - 카드번호 등 결제수단 민감정보를 저장하지 않는다 (토스가 보관). 생년월일·시각·성별도 없음.
--  - 브라우저(anon/authenticated)는 이 테이블에 어떤 권한도 없다. 모든 접근은 서버 함수(service_role)로만.
--  - 구매 코드는 해시(sha256)만 저장한다. 원문은 구매자에게 한 번 보여 주고 서버에 남기지 않는다.
--  - payment_key 는 환불(토스 취소 API)에 꼭 필요한 참조값이라 저장한다 (카드 정보 아님, 서버 전용).

create table if not exists public.orders (
  order_id            text primary key check (order_id ~ '^[A-Za-z0-9_-]{6,64}$'),
  result_id           uuid,
  product_id          text not null check (product_id in ('premium_money', 'premium_love', 'premium_career')),
  amount              integer not null check (amount > 0),
  currency            text not null default 'KRW' check (currency = 'KRW'),
  status              text not null check (status in ('CREATED', 'PAYMENT_REQUESTED', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED')),
  chart_key           text not null check (chart_key ~ '^[0-9a-f]{64}$'),      -- 어느 사주 결과용 구매인지 (Signal id 해시, 개인정보 아님)
  purchase_code_hash  text not null unique check (purchase_code_hash ~ '^[0-9a-f]{64}$'),
  payment_key         text unique check (char_length(payment_key) <= 200),
  method              text check (char_length(method) <= 40),
  toss_mode           text not null check (toss_mode in ('test', 'live')),
  source              text not null check (source in ('development', 'preview', 'production')),
  failure_code        text check (char_length(failure_code) <= 80),
  failure_message     text check (char_length(failure_message) <= 300),
  refund_reason       text check (char_length(refund_reason) <= 200),
  created_at          timestamptz not null default now(),
  payment_requested_at timestamptz,
  paid_at             timestamptz,
  approved_at         timestamptz,                                          -- 토스 승인 시각
  cancelled_at        timestamptz,
  refunded_at         timestamptz,
  updated_at          timestamptz not null default now()
);

create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_created_at_idx on public.orders (created_at);

-- 상태 변경 시각 자동 기록
create or replace function public.orders_touch() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  if new.status is distinct from old.status then
    if new.status = 'PAYMENT_REQUESTED' then new.payment_requested_at := now(); end if;
    if new.status = 'PAID' then new.paid_at := now(); end if;
    if new.status in ('CANCELLED', 'FAILED') then new.cancelled_at := coalesce(new.cancelled_at, now()); end if;
    if new.status = 'REFUNDED' then new.refunded_at := now(); end if;
  end if;
  return new;
end $$;

drop trigger if exists orders_touch on public.orders;
create trigger orders_touch before update on public.orders for each row execute function public.orders_touch();

-- 권한: 브라우저 역할에는 아무 권한도 주지 않는다. service_role 은 RLS 를 우회한다.
alter table public.orders enable row level security;
revoke all on public.orders from anon, authenticated;
-- 정책을 만들지 않으므로 anon/authenticated 는 SELECT/INSERT/UPDATE/DELETE 모두 불가.
