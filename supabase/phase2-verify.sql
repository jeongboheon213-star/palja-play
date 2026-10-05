-- Read-only verification after phase2-apply.sql. No keys or customer data returned.
select jsonb_build_object(
  'content_opened_column', exists(select 1 from information_schema.columns where table_schema = 'public' and table_name = 'orders' and column_name = 'content_opened_at'),
  'orders_rls', (select relrowsecurity from pg_class where oid = 'public.orders'::regclass),
  'rate_buckets_rls', (select relrowsecurity from pg_class where oid = 'public.premium_rate_buckets'::regclass),
  'anon_orders_select', has_table_privilege('anon','public.orders','SELECT'),
  'anon_orders_insert', has_table_privilege('anon','public.orders','INSERT'),
  'authenticated_orders_select', has_table_privilege('authenticated','public.orders','SELECT'),
  'service_orders_delete', has_table_privilege('service_role','public.orders','DELETE'),
  'service_rate_direct_select', has_table_privilege('service_role','public.premium_rate_buckets','SELECT'),
  'service_open_rpc', has_function_privilege('service_role','public.open_paid_content(text,text,text,text,text)','EXECUTE'),
  'service_cancel_rpc', has_function_privilege('service_role','public.claim_unopened_refund(text,text,text,text,text)','EXECUTE'),
  'service_limit_rpc', has_function_privilege('service_role','public.consume_premium_attempt(text,text)','EXECUTE'),
  'anon_open_rpc', has_function_privilege('anon','public.open_paid_content(text,text,text,text,text)','EXECUTE'),
  'anon_limit_rpc', has_function_privilege('anon','public.consume_premium_attempt(text,text)','EXECUTE')
) as phase2_check;
