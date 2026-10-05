// 개발 전용 debug 화면: Raw SajuData, 기둥, confidence, boundaryRisk, Signals, Scores, provenance.
// scripts/build.mjs 는 production 빌드에서 이 파일과 debug.html 을 만들지 않는다.

import { computeBetaResult } from "../../src/lib/engine";
import { deriveSignals } from "../../src/lib/interpretation";
import { validateSajuInput } from "../../src/lib/validation";
import { ALPHA_POLICY, withJasiPolicy, type JasiPolicy } from "../../src/lib/saju/policies";
import { VERIFICATION_STATUS } from "../../src/lib/saju/verification";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

function block(title: string, data: unknown, open = false): string {
  const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
  return `<details${open ? " open" : ""}><summary>${esc(title)}</summary><pre>${esc(JSON.stringify(data, null, 2))}</pre></details>`;
}

function run(e?: Event): void {
  e?.preventDefault();
  const v = validateSajuInput({
    birthDate: $<HTMLInputElement>("d").value,
    birthTime: $<HTMLInputElement>("u").checked ? null : $<HTMLInputElement>("t").value,
    gender: $<HTMLSelectElement>("g").value,
    calendar: "solar",
    birthCountry: "KR",
  });
  const out = $("out");
  if (!v.ok) {
    out.innerHTML = block("validation errors", v.errors, true);
    return;
  }
  const policy = withJasiPolicy(ALPHA_POLICY, $<HTMLSelectElement>("j").value as JasiPolicy);
  const oc = $<HTMLSelectElement>("o").value;
  const r = computeBetaResult(v.value, oc ? { overlapChoice: oc as "earlier" | "later" } : {}, policy);
  if (!r.ok) {
    out.innerHTML = block("calculation error", r, true);
    return;
  }
  const d = r.saju;
  const rows = (["year", "month", "day", "hour"] as const)
    .map((p) => {
      const x = d.pillars[p];
      return `<tr><td>${p}</td><td>${x?.ganji ?? "-"}</td><td>${x?.hanja ?? ""}</td><td>${x?.confidence ?? "null"}</td><td class="${x?.boundaryRisk ? "warn" : ""}">${x?.boundaryRisk ?? false}</td><td>${x?.candidates.map((c) => c.stem + c.branch).join("/") ?? ""}</td><td>${x?.verification.level ?? ""}</td></tr>`;
    })
    .join("");
  out.innerHTML =
    `<table><tr><th>pillar</th><th>ganji</th><th>hanja</th><th>confidence</th><th>boundaryRisk</th><th>candidates</th><th>verification</th></tr>${rows}</table>` +
    block("pillars (PillarResult)", d.pillars) +
    block("provenance", d.provenance, true) +
    block("time", d.time) +
    block("dayMaster / fiveElements", { dayMaster: d.dayMaster, fiveElements: d.fiveElements }) +
    block("tenGods / hiddenStems", { tenGods: d.tenGods, hiddenStems: d.hiddenStems }) +
    block("twelveStages (unverified, not used in readings)", d.twelveStages) +
    block("relations", d.relations) +
    block("Signals", deriveSignals(d)) +
    block("Scores", r.free.scores) +
    block("FREE reading", r.free) +
    block("PREMIUM previews", r.premium) +
    block("verification status", VERIFICATION_STATUS) +
    block("Raw SajuData", d);
}

$("f").addEventListener("submit", run);
run();
