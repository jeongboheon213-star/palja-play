import { resultCardUrl, type ResultCardModel } from '../../src/lib/share/resultCard';
import { copyText } from './shareTools';

type Action = 'result_share_open' | 'result_card_created' | 'result_share_native' | 'result_image_download' | 'result_link_copy';
export function drawResultCard(model: ResultCardModel): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 1080; canvas.height = 1350;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  const bg = ctx.createLinearGradient(0, 0, 1080, 1350);
  bg.addColorStop(0, '#202143'); bg.addColorStop(1, '#13162d');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, 1080, 1350);
  const text = (value: string, y: number, size: number, color = '#f4f3ff', weight = '600') => {
    ctx.fillStyle = color; ctx.font = weight + ' ' + size + 'px "Noto Sans KR", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(value, 540, y, 900);
  };
  const panel = (y: number, height: number) => {
    const fill = ctx.createLinearGradient(60, y, 1020, y + height);
    fill.addColorStop(0, '#2b2d58'); fill.addColorStop(1, '#1c1e3d');
    ctx.fillStyle = fill; ctx.strokeStyle = '#515386'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(60, y, 960, height, 40); ctx.fill(); ctx.stroke();
  };
  text('사주팔자PLAY · 내 팔자 캐릭터', 83, 30, '#c7c9ff');
  panel(116, 342);
  text(model.character?.emoji ?? '🎮', 244, 100);
  text(model.character?.name ?? '내 PLAY 캐릭터', 332, 56, '#ffffff', '900');
  text(model.character?.tagline ?? '내 팔자를 게임처럼', 402, 30, '#dce0ff');
  panel(482, 232);
  text('🏆 내 팔자 티어', 543, 36, '#f4f3ff', '800');
  text(model.tier + ' TIER', 639, 90, '#ffffff', '900');
  text(model.rankLabel, 688, 32, '#ead297');
  const icons = ['💰', '❤️', '💼', '🔥'];
  model.stats.forEach((s, i) => {
    const x = 60 + (i % 2) * 490, y = 738 + Math.floor(i / 2) * 100;
    ctx.fillStyle = '#27294f'; ctx.strokeStyle = '#515386'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(x, y, 470, 82, 22); ctx.fill(); ctx.stroke();
    ctx.textAlign = 'left'; ctx.fillStyle = '#f4f3ff'; ctx.font = '700 32px "Noto Sans KR", sans-serif'; ctx.fillText(icons[i] + ' ' + s.label, x + 24, y + 54);
    ctx.textAlign = 'right'; ctx.fillStyle = '#ead297'; ctx.font = '900 44px sans-serif'; ctx.fillText(s.tier, x + 443, y + 56);
  });
  text(model.line, 990, 30, '#c7c9ff');
  ctx.strokeStyle = '#515386'; ctx.beginPath(); ctx.moveTo(180, 1034); ctx.lineTo(900, 1034); ctx.stroke();
  text('너는 몇 티어?', 1105, 57, '#ead297', '800');
  text('무료로 내 팔자 확인하기', 1167, 32);
  text('paljaplay.com', 1231, 38, '#a7d3c4');
  text('PLAY 표본 기준 · 미래를 단정하지 않는 재미용 결과', 1284, 21, '#a5a1b4', '400');
  return canvas;
}

export function openResultCard(model: ResultCardModel, track: (action: Action, method?: string) => void) {
  document.getElementById('result-card-dialog')?.remove();
  track('result_share_open');
  const opener = document.getElementById('result-share-open') ?? document.activeElement as HTMLElement | null;
  const dialog = document.createElement('dialog'); dialog.id = 'result-card-dialog';
  dialog.setAttribute('aria-labelledby', 'result-card-title');
  dialog.style.cssText = 'box-sizing:border-box;width:min(480px,calc(100% - 24px));max-height:92dvh;overflow:auto;background:#191d34;color:#f4eee4;border:1px solid #6d6252;border-radius:20px;padding:20px';
  const heading = document.createElement('h2'); heading.id = 'result-card-title'; heading.textContent = '내 팔자 공유카드';
  const close = document.createElement('button'); close.type = 'button'; close.className = 'btn ghost'; close.textContent = '닫기'; close.id = 'result-card-close';
  close.onclick = () => dialog.close();
  const status = document.createElement('p'); status.id = 'result-card-status'; status.setAttribute('role', 'status'); status.textContent = '카드를 만드는 중이에요…';
  const preview = document.createElement('div'); preview.id = 'result-card-preview';
  const actions = document.createElement('div'); actions.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin-top:16px';
  const button = (id: string, title: string) => { const b = document.createElement('button'); b.id = id; b.type = 'button'; b.className = 'btn ghost'; b.textContent = title; b.style.cssText = 'flex:1 1 110px;margin:0;min-height:48px'; actions.append(b); return b; };
  const native = button('result-card-share', '공유하기');
  const save = button('result-card-save', '이미지 저장');
  const copy = button('result-card-copy', '링크 복사');
  native.disabled = save.disabled = true;
  const link = document.createElement('input'); link.id = 'result-card-link'; link.readOnly = true; link.value = resultCardUrl(); link.setAttribute('aria-label', '직접 복사할 공유 링크'); link.hidden = true; link.style.cssText = 'box-sizing:border-box;width:100%;margin-top:12px';
  const help = document.createElement('p'); help.className = 'mute small'; help.textContent = '이미지를 저장해 Instagram·스토리에 직접 올릴 수 있어요. 공유 앱은 브라우저와 기기에 따라 달라요. 생년월일·이름은 카드에 포함되지 않아요.';
  dialog.append(heading, preview, status, actions, link, help, close); document.body.append(dialog); dialog.showModal();
  let objectUrl: string | null = null, file: File | null = null;
  dialog.addEventListener('close', () => { if (objectUrl) URL.revokeObjectURL(objectUrl); dialog.remove(); opener?.focus(); }, { once: true });
  copy.onclick = async () => {
    const method = await copyText(resultCardUrl());
    if (!dialog.isConnected) return;
    if (method) { status.textContent = '링크를 복사했어요.'; track('result_link_copy', method); }
    else { link.hidden = false; link.focus(); link.select(); status.textContent = '아래 링크를 길게 눌러 직접 복사해 주세요.'; }
  };
  save.onclick = () => {
    if (!objectUrl) return;
    const a = document.createElement('a'); a.href = objectUrl; a.download = 'paljaplay-result.png'; a.textContent = '이미지 열기';
    document.body.append(a); a.click(); a.remove(); track('result_image_download');
    status.textContent = '저장이 시작됐어요. 저장이 안 되면 아래 이미지를 열어 길게 눌러 주세요.';
    const fallback = document.createElement('a'); fallback.href = objectUrl; fallback.target = '_blank'; fallback.rel = 'noopener'; fallback.textContent = '이미지 열어 저장하기'; status.append(' ', fallback);
  };
  native.onclick = async () => {
    if (!file) return;
    if (typeof navigator.share !== 'function') { status.textContent = '이 브라우저는 공유 시트를 지원하지 않아요. 이미지 저장 또는 링크 복사를 사용해 주세요.'; return; }
    try {
      const files = typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });
      await navigator.share(files ? { files: [file], title: '너는 몇 티어?', text: '내 팔자를 게임처럼! ' + resultCardUrl() } : { title: '너는 몇 티어?', text: '무료로 내 팔자 확인하기', url: resultCardUrl() });
      track('result_share_native', files ? 'image' : 'link'); status.textContent = files ? '공유 앱에 전달했어요.' : '링크를 전달했어요. 카드는 이미지 저장으로 보낼 수 있어요.';
    } catch (error) { status.textContent = error instanceof DOMException && error.name === 'AbortError' ? '공유를 취소했어요.' : '공유를 열지 못했어요. 이미지 저장 또는 링크 복사를 사용해 주세요.'; }
  };
  void (async () => {
    try {
      await Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 2500))]);
      if (!dialog.isConnected) return;
      const canvas = drawResultCard(model);
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('Image unavailable')), 'image/png'));
      if (!dialog.isConnected) return;
      file = new File([blob], 'paljaplay-result.png', { type: 'image/png' }); objectUrl = URL.createObjectURL(blob);
      const image = document.createElement('img'); image.id = 'result-card-image'; image.src = objectUrl; image.style.cssText = 'display:block;width:100%;height:auto;border-radius:12px';
      image.alt = `${model.tier} TIER, ${model.rankLabel}. ${model.stats.map(s => `${s.label} ${s.tier}`).join(', ')}. ${model.line}. 너는 몇 티어? paljaplay.com`;
      preview.append(image); native.disabled = save.disabled = false; status.textContent = '카드가 준비됐어요. 1080 × 1350 PNG'; track('result_card_created');
    } catch { if (dialog.isConnected) status.textContent = '이미지를 만들지 못했어요. 링크 복사는 사용할 수 있어요.'; }
  })();
}
