-- orders 권한 보정 (2026-10-05)
-- 20261005010000_orders.sql 실행 후 실제 DB 조회에서 service_role 에 DELETE·TRUNCATE·REFERENCES·TRIGGER 권한이
-- 남아 있는 것을 발견 (Supabase 가 새 테이블에 자동으로 주는 기본 권한). 서버 코드는 주문을 지우지 않으므로 회수한다.
-- 데이터·테이블 구조는 바꾸지 않고 권한만 다시 정리한다. 여러 번 실행해도 결과가 같다.
revoke all on public.orders from public, anon, authenticated, service_role;
grant select, insert, update on public.orders to service_role;
