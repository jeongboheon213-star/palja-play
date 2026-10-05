-- 사주팔자PLAY: 결제 주문 (토스페이먼츠). 서버(Secret Key = service_role)만 읽고 쓴다.
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 Run 한 번. 여러 번 실행해도 안전하다(이미 있으면 건너뜀).
--
-- 원칙
--  - 카드번호 등 결제수단 민감정보를 저장하지 않는다 (토스가 보관). 생년월일·시각·성별·전화번호도 없음.
--  - 브라우저 역할(anon/authenticated)은 이 테이블에 어떤 권한도 없다. 접근은 서버 함수(Secret Key)로만.
--  - 구매 코드는 해시(sha256)만 저장한다. 원문은 구매자 화면에만 보여 주고 서버에 남기지 않는다.
--  - payment_key 는 환불(토스 취소 API)에 꼭 필요한 참조값이라 저장한다 (카드 정보 아님, 서버 전용).

create table if not exists public.orders (
  order_id             text primary key check (order_id ~ '^[A-Za-z0-9_-]{6,64}$'),
  result_id            uuid,
  product_id           text not null check (product_id in ('premium_money', 'premium_love', 'premium_career')),
  amount               integer not null check (amount > 0),
  currency             text not null default 'KRW' check (currency = 'KRW'),
  status               text not null check (status in ('CREATED', 'PAYMENT_REQUESTED', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED')),
  chart_key            text not null check (chart_key ~ '^[0-9a-f]{64}$'),      -- 어느 사주 결과용 구매인지 (Signal id 해시, 개인정보 아님)
  purchase_code_hash   text not null unique check (purchase_code_hash ~ '^[0-9a-f]{64}$'),
  payment_key          text unique check (char_length(payment_key) <= 200),
  method               text check (char_length(method) <= 40),
  toss_mode            text not null check (toss_mode in ('test', 'live')),
  source               text not null check (source in ('development', 'preview', 'production')),
  failure_code         text check (char_length(failure_code) <= 80),
  failure_message      text check (char_length(failure_message) <= 300),
  refund_reason        text check (char_length(refund_reason) <= 200),
  created_at           timestamptz not null default now(),
  payment_requested_at timestamptz,
  paid_at              timestamptz,
  approved_at          timestamptz,                                         -- 토스 승인 시각
  cancelled_at         timestamptz,
  refunded_at          timestamptz,
  updated_at           timestamptz not null default now()
);

create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_created_at_idx on public.orders (created_at);

-- 상태가 바뀔 때 시각을 자동 기록
create or replace function public.orders_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  if new.status is distinct from old.status then
    if new.status = 'PAYMENT_REQUESTED' then new.payment_requested_at := now(); end if;
    if new.status = 'PAID' then new.paid_at := now(); end if;
    if new.status = 'CANCELLED' then new.cancelled_at := now(); end if;
    if new.status = 'REFUNDED' then new.refunded_at := now(); end if;
  end if;
  return new;
end
$$;

-- 이 함수는 트리거 전용: 외부(브라우저 RPC)에서 호출하지 못하게 한다
revoke all on function public.orders_touch() from public, anon, authenticated;

drop trigger if exists orders_touch on public.orders;
create trigger orders_touch before update on public.orders for each row execute function public.orders_touch();

-- 권한
alter table public.orders enable row level security;
-- Supabase 는 새 테이블에 service_role 기본 권한(DELETE·TRUNCATE 등)을 자동으로 주므로 service_role 도 먼저 모두 회수한다.
-- (이미 이 파일을 실행한 DB 는 20261005020000_orders_restrict_service_role.sql 로 보정)
revoke all on public.orders from public, anon, authenticated, service_role;  -- 브라우저 역할: 권한 없음
grant select, insert, update on public.orders to service_role;    -- 서버(Secret Key): 조회·생성·상태 변경 (삭제 없음)
-- anon/authenticated 용 정책을 만들지 않으므로 SELECT/INSERT/UPDATE/DELETE 모두 불가.
