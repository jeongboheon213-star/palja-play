import { summarize, areas, csvCell, type AdminFeedback } from "../../src/lib/feedback/admin";
const el = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const period = el<HTMLSelectElement>("period"), version = el<HTMLSelectElement>("version"), score = el<HTMLSelectElement>("score"), search = el<HTMLInputElement>("search");
const status = el("status"), dashboard = el("dashboard"), exportButton = el<HTMLButtonElement>("export"), refresh = el<HTMLButtonElement>("refresh");
let rows: AdminFeedback[] = [], truncated = false, fetchedAt = "", generation = 0;
const escape = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, x => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[x]!));
const pct = (v: number | null) => v === null ? "—" : `${Math.round(v * 100)}%`;
const filtered = () => rows.filter(r => (!version.value || r.interpretation_version === version.value) && (!score.value || r.similarity === Number(score.value)) && (!search.value.trim() || (r.comment ?? "").toLowerCase().includes(search.value.trim().toLowerCase())));
const bars = (values: { label: string; count: number }[], n: number, bad = false) => values.map(x => `<div class="barrow"><span>${escape(x.label)}</span><div class="track"><div class="fill ${bad ? "bad" : ""}" style="width:${n ? x.count / n * 100 : 0}%"></div></div><span>${x.count}건</span></div>`).join("");
function render() {
  const list = filtered(), m = summarize(list);
  exportButton.disabled = !list.length;
  status.className = "muted";
  status.textContent = `${new Date(fetchedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })} 갱신 · 조회 ${rows.length.toLocaleString()}건 / 현재 필터 ${list.length.toLocaleString()}건`;
  const worst = [...m.worst].sort((a, b) => b.count - a.count)[0];
  const insight = !m.count ? "선택한 조건에 피드백이 없습니다. 조건을 바꾸거나 첫 응답을 기다려 주세요." : `${m.count < 20 ? "표본이 적으므로 경향을 참고용으로 봐 주세요. " : ""}${worst?.count ? `${worst.label} 영역이 안 맞는다는 응답이 ${worst.count}건입니다. 해당 의견을 먼저 읽고 설명을 점검해 보세요.` : "안 맞는 영역으로 선택된 항목이 없습니다."}`;
  const max = Math.max(1, ...m.days.map(d => d.count));
  const points = m.days.map((d, i) => `${m.days.length === 1 ? 300 : 20 + i / (m.days.length - 1) * 560},${140 - d.count / max * 115}`).join(" ");
  dashboard.innerHTML = `${truncated ? '<p class="notice">조회 한도를 넘겨 최신 10,000건만 집계합니다. 전체 통계가 아닙니다. 기간을 줄여 확인하세요.</p>' : ""}<div class="cards"><div class="card">제출 피드백<strong>${m.count.toLocaleString()}<small> 건</small></strong></div><div class="card">평균 공감 점수<strong>${m.average?.toFixed(2) ?? "—"}<small> / 5</small></strong></div><div class="card">4·5점 응답 비율<strong>${pct(m.positive)}</strong></div><div class="card">자유 의견<strong>${list.filter(r => r.comment?.trim()).length}<small> 건</small></strong></div></div>
  <div class="grid"><section class="panel"><h2>날짜별 피드백 추이</h2>${m.days.length ? `<svg viewBox="0 0 600 160" role="img" aria-label="날짜별 제출 건수"><line x1="20" y1="140" x2="580" y2="140" stroke="#dce3ef"/><polyline points="${points}" fill="none" stroke="#4f67d5" stroke-width="3"/>${m.days.map((d, i) => `<circle cx="${m.days.length === 1 ? 300 : 20 + i / (m.days.length - 1) * 560}" cy="${140 - d.count / max * 115}" r="4" fill="#4f67d5"><title>${d.day}: ${d.count}건, 평균 ${d.average.toFixed(2)}</title></circle>`).join("")}</svg><div class="table-wrap"><table><thead><tr><th>날짜</th><th>제출 수</th><th>평균 점수</th></tr></thead><tbody>${m.days.map(d => `<tr><td>${d.day}</td><td>${d.count}</td><td>${d.average.toFixed(2)}</td></tr>`).join("")}</tbody></table></div>` : '<p class="empty">아직 데이터가 없어요.</p>'}</section><section class="panel"><h2>공감 점수 분포</h2>${bars(m.distribution.map(x => ({ label: `${x.score}점`, count: x.count })), m.count)}<h2 style="margin-top:26px">공유 의향</h2>${bars(m.intents.map(x => ({ label: ({ yes: "공유할래요", maybe: "고민 중", no: "아니요" } as Record<string, string>)[x.key]!, count: x.count })), m.count)}<p class="muted">미응답 ${m.count - m.intents.reduce((n, x) => n + x.count, 0)}건 · 비율의 기준은 필터 내 전체 피드백입니다.</p></section></div>
  <div class="grid"><section class="panel"><h2>잘 맞는 영역</h2>${bars(m.best, m.count)}<p class="muted">복수 선택이므로 합계가 전체 응답 수를 넘을 수 있어요.</p></section><section class="panel"><h2>개선이 필요한 영역</h2>${bars(m.worst, m.count, true)}<p class="muted">안 맞는 부분 없음: ${list.filter(r => r.worst_none).length}건</p></section></div>
  <section class="panel"><h2>응답에서 읽는 개선 힌트</h2><p>${escape(insight)}</p><p>${m.themes.map(t => `<span class="pill">${t.word} 언급 ${t.count}건</span>`).join("") || "반복 키워드가 아직 없습니다."}</p><p class="muted">자유 의견에 위 단어가 포함된 응답 수입니다. 긍정·부정 감정이나 원인을 자동 판정하지 않습니다.</p></section>
  <section class="panel"><h2>피드백 목록</h2><p class="muted">최신 순 · 화면에는 최대 200건 표시 · CSV는 현재 필터 전체를 저장합니다.</p><div class="table-wrap"><table><thead><tr><th>접수 시간</th><th>점수</th><th>잘 맞음 / 안 맞음</th><th>의견</th><th>해석 버전</th></tr></thead><tbody>${list.slice(0, 200).map(r => `<tr><td>${escape(new Date(r.created_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }))}</td><td>${r.similarity}/5</td><td>${escape(r.best_match.map(a => areas[a] ?? a).join(", ") || "—")}<br><span class="muted">${escape(r.worst_none ? "안 맞는 부분 없음" : r.worst_match.map(a => areas[a] ?? a).join(", ") || "—")}</span></td><td class="comment">${escape(r.comment || "—")}</td><td>${escape(r.interpretation_version)}</td></tr>`).join("")}</tbody></table>${!list.length ? '<p class="empty">표시할 피드백이 없습니다.</p>' : ""}</div></section>`;
}
async function load() {
  const current = ++generation;
  dashboard.replaceChildren(); rows = []; exportButton.disabled = true; refresh.disabled = true;
  status.className = "muted"; status.textContent = "피드백을 불러오는 중입니다.";
  try {
    const response = await fetch(`/api/admin/feedback?days=${period.value}`, { cache: "no-store", credentials: "same-origin" });
    if (!response.ok) {
      const failure = await response.json().catch(() => ({})) as { code?: unknown };
      const code = typeof failure.code === "string" && /^(AUTH|FEEDBACK)_[A-Z0-9_]+$/.test(failure.code) ? ` (오류 코드: ${failure.code})` : "";
      throw new Error((response.status === 403 ? "관리자 인증을 확인하지 못했어요. 페이지를 새로고침해 주세요." : "피드백을 불러오지 못했어요. 저장소 설정과 연결을 확인해 주세요.") + code);
    }
    const data = await response.json() as { rows: AdminFeedback[]; truncated: boolean; fetchedAt: string };
    if (current !== generation) return;
    rows = data.rows; truncated = data.truncated; fetchedAt = data.fetchedAt;
    const selected = version.value; version.replaceChildren(new Option("전체 버전", ""));
    [...new Set(rows.map(r => r.interpretation_version))].sort().forEach(v => version.add(new Option(v, v)));
    if ([...version.options].some(o => o.value === selected)) version.value = selected;
    render();
  } catch (error) { if (current === generation) { status.className = "error"; status.textContent = error instanceof Error ? error.message : "불러오기에 실패했어요."; } }
  finally { if (current === generation) refresh.disabled = false; }
}
period.addEventListener("change", load); refresh.addEventListener("click", load);
for (const input of [version, score, search]) input.addEventListener("input", () => { if (fetchedAt && rows.length) render(); });
exportButton.addEventListener("click", () => {
  const lines = [["접수시간(한국)", "공감점수", "잘맞는영역", "안맞는영역", "공유의향", "의견", "해석버전"], ...filtered().map(r => [new Date(r.created_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }), r.similarity, r.best_match.map(a => areas[a]).join(","), r.worst_none ? "없음" : r.worst_match.map(a => areas[a]).join(","), r.share_intent, r.comment, r.interpretation_version])];
  const url = URL.createObjectURL(new Blob(["\uFEFF" + lines.map(line => line.map(csvCell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a"); link.href = url; link.download = `palja-feedback-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
});
void load();
