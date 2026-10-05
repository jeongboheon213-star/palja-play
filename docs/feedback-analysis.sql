-- 관리자 SQL Editor에서만 실행하는 읽기 전용 집계. 원문/구매 코드/결제 데이터 출력 없음.
-- 최근 90일의 production 자료. Preview 테스트 제출도 현재 source=production이므로
-- 정식 공개 전 테스트 자료 정리 또는 별도 운영 DB 정책을 먼저 결정한다.
select date_trunc('month', created_at at time zone 'Asia/Seoul') as month,
       count(*) as responses, round(avg(similarity), 2) as average_score,
       round(100.0 * count(*) filter (where similarity = 5) / nullif(count(*), 0), 1) as five_star_percent
from public.beta_feedback
where source = 'production' and created_at >= now() - interval '90 days'
group by 1 order by 1;

select area, count(*) as mismatch_reports
from public.beta_feedback cross join lateral unnest(worst_match) as area
where source = 'production' and created_at >= now() - interval '90 days'
group by area order by mismatch_reports desc, area;

select interpretation_version, count(*) as responses, round(avg(similarity), 2) as average_score
from public.beta_feedback
where source = 'production' and created_at >= now() - interval '90 days'
group by interpretation_version order by responses desc;
