export interface AdminFeedback {
  created_at: string; similarity: number; best_match: string[]; worst_match: string[];
  worst_none: boolean; share_intent: string | null; comment: string | null;
  character_id: string; interpretation_version: string; source: string;
}
export const areas: Record<string, string> = { personality: "성격", wealth: "재물", love: "연애", career: "직업", business: "사업", relationship: "인간관계" };
export function summarize(rows: readonly AdminFeedback[]) {
  const counts = (field: "best_match" | "worst_match") => Object.keys(areas).map(key => ({ key, label: areas[key]!, count: rows.filter(r => r[field].includes(key)).length }));
  const days = new Map<string, { count: number; sum: number }>();
  for (const row of rows) {
    const day = new Date(new Date(row.created_at).getTime() + 9 * 3600000).toISOString().slice(0, 10);
    const value = days.get(day) ?? { count: 0, sum: 0 }; value.count++; value.sum += row.similarity; days.set(day, value);
  }
  const themes = ["결제", "가격", "공유", "시간", "설명", "정확", "디자인", "오류"].map(word => ({ word, count: rows.filter(r => r.comment?.includes(word)).length })).filter(x => x.count).sort((a, b) => b.count - a.count);
  const intents = ["yes", "maybe", "no"].map(key => ({ key, count: rows.filter(r => r.share_intent === key).length }));
  const n = rows.length;
  return { count: n, average: n ? rows.reduce((sum, r) => sum + r.similarity, 0) / n : null, positive: n ? rows.filter(r => r.similarity >= 4).length / n : null,
    distribution: [1, 2, 3, 4, 5].map(score => ({ score, count: rows.filter(r => r.similarity === score).length })),
    best: counts("best_match"), worst: counts("worst_match"), intents, themes,
    days: [...days].sort(([a], [b]) => a.localeCompare(b)).map(([day, value]) => ({ day, ...value, average: value.sum / value.count })) };
}
export function csvCell(value: unknown): string {
  let text = String(value ?? "");
  if (/^[\s]*[=+@-]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}
