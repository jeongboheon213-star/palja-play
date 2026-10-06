import { resultCardUrl, type ResultCardModel } from '../../src/lib/share/resultCard';
import { copyText } from './shareTools';

type Action = 'result_share_open' | 'result_card_created' | 'result_share_native' | 'result_image_download' | 'result_link_copy';
export function drawResultCard(model: ResultCardModel): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 1080; canvas.height = 1350;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  const bg = ctx.createLinearGradient(0, 0, 1080, 1350);
  bg.addColorStop(0, '#262440'); bg.addColorStop(1, '#111525');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, 1080, 1350);
  ctx.strokeStyle = '#6d6252'; ctx.lineWidth = 2; ctx.strokeRect(42, 42, 996, 1266);
  const text = (value: string, y: number, size: number, color = '#f4eee4', weight = '600') => {
    ctx.fillStyle = color; ctx.font = `${weight} ${size}px "Noto Sans KR", sans-serif`; ctx.textAlign = 'center';
    ctx.fillText(value, 540, y, 936);
  };
  text('사주팔자PLAY', 130, 38, '#a7d3c4');
  text('MY PLAY TIER', 231, 28, '#ccb887');
  text(`${model.tier} TIER`, 417, 160, '#ead297', '900');
  text(model.rankLabel, 492, 42);
  text('내 팔자를 게임처럼', 551, 27, '#b7b4c9', '400');
  model.stats.forEach((s, i) => {
    const x = 92 + (i % 2) * 466, y = 608 + Math.floor(i / 2) * 151;
    ctx.fillStyle = '#ffffff0d'; ctx.beginPath(); ctx.roundRect(x, y, 430, 125, 18); ctx.fill();
    ctx.textAlign = 'left'; ctx.fillStyle = '#c4c5d4'; ctx.font = '500 32px "Noto Sans KR", sans-serif'; ctx.fillText(s.label, x + 28, y + 73);
    ctx.textAlign = 'right'; ctx.fillStyle = '#a7d3c4'; ctx.font = '800 52px sans-serif'; ctx.fillText(s.tier, x + 402, y + 78);
  });
  text(model.line, 980, 34);
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
