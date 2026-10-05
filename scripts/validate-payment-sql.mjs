// Ephemeral GitHub Actions PostgreSQL service only. Never connects to Supabase.
import { spawnSync, spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const container = process.env.PALJA_TEST_POSTGRES_CONTAINER;
if (!container || !/^[a-f0-9]{12,64}$/.test(container) || process.env.GITHUB_ACTIONS !== "true") throw new Error("Isolated CI PostgreSQL container required");
const args = ["exec", "-i", container, "psql", "-U", "postgres", "-v", "ON_ERROR_STOP=1", "-At"];
function sql(text, expectFailure = false) {
  const result = spawnSync("docker", args, { input: text, encoding: "utf8" });
  if (expectFailure) { assert.notEqual(result.status, 0); return; }
  if (result.status !== 0) throw new Error(result.stderr);
  return result.stdout.trim();
}
async function concurrent(text) {
  return new Promise((resolve, reject) => {
    const child = spawn("docker", args); let out = ""; let err = "";
    child.stdout.on("data", (d) => out += d); child.stderr.on("data", (d) => err += d);
    child.on("error", reject); child.on("close", (code) => code === 0 ? resolve(out.trim()) : reject(new Error(err)));
    child.stdin.end(text);
  });
}
sql("create role anon; create role authenticated; create role service_role;");
for (const name of ["20261005010000_orders.sql", "20261005030000_orders_content_access.sql", "20261005040000_content_access_and_limits.sql"]) {
  sql(readFileSync(`supabase/migrations/${name}`, "utf8"));
}
// Reapplication is safe.
sql(readFileSync("supabase/migrations/20261005040000_content_access_and_limits.sql", "utf8"));
const code = "a".repeat(64), chart = "b".repeat(64);
const create = (id) => sql(`insert into public.orders(order_id,product_id,amount,status,chart_key,purchase_code_hash,toss_mode,source,payment_key)
 values ('${id}','premium_money',2900,'PAID','${chart}','${id === "sp-sql-fixture" ? code : "c".repeat(64)}','test','preview','${id}-pk');`);
create("sp-sql-fixture");
const params = `'sp-sql-fixture','${code}','${chart}','premium_money','test'`;
const open = `select content_opened_at from public.open_paid_content(${params});`;
const times = await Promise.all(Array.from({ length: 12 }, () => concurrent(open)));
assert.ok(times[0]); assert.ok(times.every((t) => t === times[0]));
assert.equal(sql(open), times[0]);
sql("update public.orders set content_opened_at = null where order_id = 'sp-sql-fixture';", true);
sql("update public.orders set content_opened_at = now() + interval '1 second' where order_id = 'sp-sql-fixture';", true);
assert.equal(sql(`select count(*) from public.claim_unopened_refund(${params});`), "0");
sql("update public.orders set status = 'REFUND_REQUESTED' where order_id = 'sp-sql-fixture';");
assert.equal(sql(`select count(*) from public.open_paid_content(${params});`), "0");
sql("update public.orders set status = 'REFUNDED' where order_id = 'sp-sql-fixture';");
assert.equal(sql(`select count(*) from public.open_paid_content(${params});`), "0");
create("sp-sql-race");
const race = `'sp-sql-race','${"c".repeat(64)}','${chart}','premium_money','test'`;
const outcomes = await Promise.all([
  concurrent(`select count(*) from public.open_paid_content(${race});`),
  concurrent(`select count(*) from public.claim_unopened_refund(${race});`),
]);
assert.equal(outcomes.map(Number).reduce((a, b) => a + b), 1);
for (const role of ["anon", "authenticated"]) {
  sql(`set role ${role}; select * from public.orders;`, true);
  sql(`set role ${role}; select * from public.open_paid_content(${params});`, true);
  sql(`set role ${role}; select public.consume_premium_attempt('${code}','${chart}');`, true);
}
sql(`set role service_role; select public.consume_premium_attempt('${code}','${chart}');`);
sql("set role service_role; select * from public.premium_rate_buckets;", true);
sql(`do $$ declare n integer := 0; i integer; begin
  truncate public.premium_rate_buckets;
  for i in 1..40 loop
    if public.consume_premium_attempt('${code}',lpad(to_hex(i),64,'0')) then n := n + 1; end if;
  end loop;
  if n <> 30 then raise exception 'client limit %', n; end if;
  truncate public.premium_rate_buckets; n := 0;
  for i in 1..20 loop
    if public.consume_premium_attempt(lpad(to_hex(i),64,'0'),'${code}') then n := n + 1; end if;
  end loop;
  if n <> 15 then raise exception 'code limit %', n; end if;
  truncate public.premium_rate_buckets; n := 0;
  for i in 1..1100 loop
    if public.consume_premium_attempt(lpad(to_hex(i),64,'0'),lpad(to_hex(i),64,'0')) then n := n + 1; end if;
  end loop;
  if n <> 1000 then raise exception 'global limit %', n; end if;
end $$;`);
sql("truncate public.premium_rate_buckets;");
const attempts = await Promise.all(Array.from({ length: 40 }, () => concurrent(`select public.consume_premium_attempt('${code}','${chart}');`)));
assert.equal(attempts.filter((v) => v === "t").length, 15);
sql(`insert into public.premium_rate_buckets values ('client:${"d".repeat(64)}',now()-interval '1 hour',1);
 select public.consume_premium_attempt('${code}','${chart}');`);
assert.equal(sql("select count(*) from public.premium_rate_buckets where window_start < now()-interval '30 minutes';"), "0");
console.log("PostgreSQL: migrations/reapplication, privileges, immutable first-open, open/refund race, limits and concurrent attempts passed");
