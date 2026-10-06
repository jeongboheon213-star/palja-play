import type { TierResult } from '../tier';
import type { StatKey } from '../interpretation/types';

type ExistingTiers = { readonly total: TierResult; readonly stats: readonly (TierResult & { readonly stat: StatKey })[] };
const FEATURED = ['wealth', 'love', 'business', 'execution'] as const;
const LABELS = { wealth: '재물력', love: '연애력', business: '사업력', execution: '실행력' };
export function resultCardModel(tiers: ExistingTiers) {
  const stats = FEATURED.map(key => {
    const stat = tiers.stats.find(s => s.stat === key);
    if (!stat) throw new Error('Missing result stat');
    return Object.freeze({ key, label: LABELS[key], tier: stat.tier, score: stat.score, topPercent: stat.topPercent });
  });
  const best = stats.reduce((a, b) => b.topPercent < a.topPercent ? b : a);
  const spread = Math.max(...stats.map(s => s.topPercent)) - Math.min(...stats.map(s => s.topPercent));
  const line = spread >= 30 ? `${best.label}에 힘이 몰린 내 PLAY 캐릭터` : '고르게 갖춘 능력치, 친구와 비교해볼까?';
  return Object.freeze({ tier: tiers.total.tier, topPercent: tiers.total.topPercent, percentile: tiers.total.percentile,
    rankLabel: tiers.total.label.replace('사주팔자PLAY 기준', 'PLAY 기준'), stats: Object.freeze(stats), line });
}
export type ResultCardModel = ReturnType<typeof resultCardModel>;
/** Fixed public destination: never inherit personal, battle, payment or arbitrary query parameters. */
export function resultCardUrl() {
  return 'https://www.paljaplay.com/?utm_source=share&utm_medium=result_card';
}
export function isResultCardVisit(search: string) {
  const params = new URLSearchParams(search);
  return params.get('utm_source') === 'share' && params.get('utm_medium') === 'result_card';
}
