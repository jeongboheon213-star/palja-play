-- 사주팔자PLAY: Premium 콘텐츠 최초 제공 시각 기록용 컬럼.
-- 아직 API에서 사용하지 않는다. 코드/테스트 검증 후 사용자에게 SQL Editor 실행을 요청한다.
-- 기존 주문/상태/권한은 변경하지 않는다.

alter table public.orders
  add column if not exists content_opened_at timestamptz;

comment on column public.orders.content_opened_at is
  'Premium 리포트가 서버에서 최초로 제공된 시각. null이면 아직 콘텐츠 미제공.';

revoke all on public.orders from public, anon, authenticated, service_role;
grant select, insert, update on public.orders to service_role;
