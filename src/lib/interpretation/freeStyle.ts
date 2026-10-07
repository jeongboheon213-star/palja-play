// 무료 화면의 말투만 선택한다. Signal/점수/캐릭터는 만들거나 변경하지 않는다.
import type { SajuData } from "../saju/chart";
import { extractFeatures } from "./features";
import type { SignalSet } from "./signals";
import type { ReadingItem, ReadingSection } from "./free";

export function freeStyle(d: SajuData, set: SignalSet, section: ReadingSection): ReadingSection {
  const f = extractFeatures(d), g = f.groupCount;
  const has = (id: string) => set.signals.some(s => s.id === id);
  const count = (name: keyof typeof f.tenGodCount) => f.tenGodCount[name] ?? 0;
  const ids = [...new Set(section.items.flatMap(i => i.signalIds))];
  const item = (text: string): ReadingItem => ({ text, signalIds: ids });
  let summary = "", core = "", nuance = "", tip = "", continuation = "";
  switch (section.domain) {
    case "wealth": {
      if (!g.재성) {
        summary = g.식상 ? "잘하는 일과 돈 관리는 따로 익혀요" : "돈 관리에는 나만의 기준이 필요해요";
        core = g.식상 ? "생각을 표현하는 데 비해 돈을 꾸준히 관리하는 일은 낯설 수 있어요." : "돈을 모으는 방식은 경험을 통해 내 기준을 찾아가는 편이에요.";
      } else if (count("정재") && count("편재")) {
        summary = "차곡차곡 모으면서 새 기회도 봐요";
        core = "안정적으로 모으고 싶다가도 새로운 돈의 기회에 마음이 움직여요.";
      } else if (count("편재")) {
        summary = count("편재") >= 2 ? "돈의 기회를 넓게 찾아봐요" : "새로운 돈의 기회에 눈길이 가요";
        core = count("편재") >= 2 ? "익숙한 수입에 머물기보다 여러 가능성을 비교하려는 마음이 커요." : "정해진 수입을 유지하는 것보다 새 기회를 찾는 데 관심이 가요.";
      } else {
        summary = count("정재") >= 2 ? "꾸준히 쌓이는 돈에서 안심해요" : "한 번의 큰돈보다 꾸준함을 택해요";
        core = count("정재") >= 2 ? "차곡차곡 쌓인 돈을 보며 마음이 편해지는 성향이 뚜렷해요." : "크게 흔들리는 기회보다 꾸준한 수입을 더 편하게 느낄 수 있어요.";
      }
      if (has("wealth.bigeop_outflow")) {
        nuance = has("wealth.siksang_to_jae") ? "잘하는 일을 수입으로 잇더라도 내 뜻이나 주변 관계에 지출이 늘 수 있어요." : "내 판단이나 주변 사람의 부탁이 돈 쓰는 기준에 끼어들 수 있어요.";
        tip = "사람과 얽힌 지출은 금액과 돌려받을 기준부터 적어 두세요.";
      } else if (has("wealth.inseong_slow")) {
        nuance = "돈에 관한 결정을 내릴 때 충분히 알아보고 싶어 시간이 걸릴 수 있어요.";
        tip = "돈을 결정할 때는 비교할 항목 세 가지와 결정할 날을 먼저 정해요.";
      } else if (has("wealth.siksang_to_jae")) {
        nuance = g.식상 >= 2 ? "여러 방식으로 만든 결과물에 값을 붙여 보고 싶은 마음도 커요." : "내가 만든 결과물의 쓰임과 가격을 함께 생각하는 편이에요.";
        tip = "잘하는 일 하나에 드는 시간과 비용을 적어 값을 가늠해 보세요.";
      } else {
        nuance = g.재성 >= 3 ? "생활 속에서도 비용과 성과를 자주 따져 보는 편이에요." : "";
        tip = !g.재성 ? "수입이 들어오면 저축할 몫부터 자동이체로 나눠 두세요." : "매달 남길 금액을 먼저 정하고 쓸 돈을 나눠 보세요.";
      }
      continuation = "상세 리포트에서는 돈을 모으고 쓰는 성향을 더 깊이 풀어봐요.";
      break;
    }
    case "love": {
      const star = has("love.star.none") ? 0 : has("love.star.many") ? 3 : 1;
      if (!star) {
        summary = g.식상 ? "표현한 마음을 관계로 이어 가요" : "가까워지는 속도를 천천히 찾아가요";
        core = g.식상 >= 2 ? "말과 행동으로 마음을 적극적으로 전해도 관계를 이어 가는 데는 노력이 필요해요." : g.식상 ? "마음을 드러낼 수 있어도 가까운 사이를 이어 가는 데는 별도의 노력이 필요해요." : "가까운 사이에서 무엇을 원하는지 경험하며 알아가는 편이에요.";
      } else if (star === 3) {
        summary = "마음을 쏟는 만큼 기대도 커져요";
        core = g.식상 >= 2 ? "마음을 적극적으로 전하는 만큼 가까운 사이에서 바라는 것도 많아질 수 있어요." : g.식상 ? "편한 상대에게 마음을 꺼내면서도 관계에서 기대하는 바가 큰 편이에요." : "상대에게 바라는 것이 많아도 속마음은 안에 담아 둘 수 있어요.";
      } else {
        summary = g.식상 >= 2 ? "좋아하는 마음을 적극적으로 전해요" : g.식상 ? "익숙한 사람에게 마음을 꺼내요" : "마음에 비해 표현이 느릴 수 있어요";
        core = g.식상 >= 2 ? "가까운 사람에게 말과 행동으로 마음을 전하는 편이에요." : g.식상 ? "편해진 상대에게는 생각과 감정을 조금씩 꺼낼 수 있어요." : "관계를 소중히 여기면서도 속마음을 먼저 꺼내기는 어려울 수 있어요.";
      }
      const combine = has("love.daybranch.combine"), clash = has("love.daybranch.clash");
      // 같은 표현력이라도 관계 관심·자기 기준·가까워지는 방식이 다르면 요약 의미도 달라진다.
      if (star && g.식상 >= 2) summary = star === 3 ? "마음을 크게 전하고 기대도 크게 품어요" : combine && clash ? "마음을 전하면서 서로의 차이도 느껴요" : clash ? "솔직히 다가가도 원하는 방식은 달라요" : has("love.bigeop_pride") ? "적극적으로 다가가도 내 기준은 지켜요" : combine ? "공통점을 찾아 마음을 적극적으로 전해요" : "좋아하는 마음을 말과 행동으로 전해요";
      else if (star && g.식상 === 1 && combine) summary = "편해진 상대와 공통점으로 가까워져요";
      if (combine && clash) {
        nuance = has("love.bigeop_pride") ? "가까워져도 내 기준은 확고해, 서로 다른 방식을 맞추는 데 시간이 걸려요." : "가까워지고 싶은 마음 속에도 각자의 방식을 지키려는 마음이 남아요.";
        tip = "함께 맞출 일 하나와 각자 정할 일 하나를 나눠 이야기해 보세요.";
      } else if (clash) {
        nuance = has("love.bigeop_pride") ? "내 기준이 확고한 만큼 가까운 상대와 원하는 방식의 차이를 느낄 수 있어요." : "친한 사이에서도 서로 원하는 방식이 다르게 느껴질 수 있어요.";
        tip = "생각이 다를 때는 내 바람을 말한 뒤 상대의 바람도 물어보세요.";
      } else if (has("love.bigeop_pride")) {
        nuance = combine ? "공통점으로 가까워져도 내 방식을 바꾸는 데는 시간이 걸려요." : "가까운 사이에서도 내 기준을 쉽게 내려놓기는 어려울 수 있어요.";
        tip = "함께 정할 일에서는 상대가 원하는 선택을 먼저 들어 보세요.";
      } else if (combine) {
        nuance = "차이보다 공통점을 찾으며 가까워지는 편이에요.";
        tip = "둘 다 좋아하는 작은 활동을 정해 함께할 시간을 만들어 보세요.";
      } else {
        nuance = "";
        tip = star === 3 ? "상대에게 바라는 것 중 가장 중요한 한 가지만 먼저 이야기해요." : g.식상 ? "마음을 전한 뒤에는 상대의 답을 충분히 기다려 보세요." : "고마웠던 일 하나를 짧은 말로 먼저 전해 보세요.";
      }
      // 표현의 개수는 관계 관심이 큰 경우에도 실제 의미 차이를 남긴다.
      continuation = "가까운 사이에서 마음을 주고받는 방식이 궁금하다면 상세 리포트로 이어가요.";
      break;
    }
    case "career": {
      if (has("career.gwan_in")) {
        summary = "배운 것을 책임 있는 일에 써요";
        core = count("정관") && count("편관") ? "원칙을 지키면서 어려운 과제에도 맞서고, 배움으로 맡은 일을 뒷받침해요." : count("정관") ? "맡은 일을 차분히 배우고 익히며 신뢰를 쌓는 편이에요." : "어려운 일을 만났을 때 알아보고 익히며 대응하는 편이에요.";
      } else if (!g.관성) {
        summary = g.인성 ? "정해진 틀보다 전문성을 키워요" : "내게 맞는 일하는 방식을 찾아요";
        core = g.인성 ? "조직의 틀에 맞추는 일보다 깊이 배우고 내 전문성을 쌓는 데 마음이 가요." : "정해진 역할만 따르기보다 나에게 맞는 일하는 방식을 찾아가는 편이에요.";
      } else {
        summary = count("정관") && count("편관") ? "기준을 지키며 어려운 일에도 맞서요" : count("정관") ? "맡은 일을 꾸준히 끝까지 해요" : "책임이 분명할 때 집중해요";
        core = count("정관") && count("편관") ? "일을 안정적으로 이어 가다가도 어려운 과제에는 직접 나서는 편이에요." : count("정관") ? "눈에 띄는 변화보다 맡은 일을 꾸준히 해내는 데 힘을 써요." : "편안한 반복보다 해결할 과제가 분명할 때 집중하기 쉬워요.";
      }
      nuance = has("career.gwan.pressure") ? "잘해 내고 싶은 마음이 커서 책임을 혼자 무겁게 받아들일 수 있어요." : has("career.gwan_in") && g.인성 >= 2 ? "맡은 일도 속까지 이해하고 싶어 충분히 익히려는 마음이 커요." : "";
      if (has("career.gwan_in")) summary = has("career.gwan.pressure") ? "배워서 해내려다 책임까지 많이 안아요" : count("정관") && count("편관") ? "배워 익히며 원칙과 어려운 과제에 맞서요" : count("정관") ? g.인성 >= 2 ? "충분히 익힌 뒤 맡은 일을 꾸준히 해요" : "배운 것을 맡은 일에 차근차근 써요" : g.인성 >= 2 ? "깊이 알아보고 어려운 과제에 맞서요" : "어려운 일을 배우면서 풀어가요";
      tip = has("career.gwan.pressure") ? "새 일을 맡기 전에 내 몫과 다른 사람의 몫을 나눠 보세요." : has("career.gwan_in") ? "새로 배운 내용 하나를 맡은 일에 써 보며 익혀요." : !g.관성 ? "하고 싶은 일에서도 함께 지킬 마감 한 가지는 먼저 정해요." : count("정관") ? "반복하는 일은 체크 목록으로 남겨 내 부담을 덜어 보세요." : "어려운 일은 가장 먼저 풀 문제 하나부터 골라 보세요.";
      continuation = "일에서 힘을 쓰는 방식은 상세 리포트와 함께 더 살펴볼 수 있어요.";
      break;
    }
    case "business": {
      const independence = has("business.independence"), opportunity = has("business.opportunity"), income = has("business.saengjae");
      if (income) {
        summary = independence ? "내 결과물의 가치를 직접 정해요" : opportunity ? "아이디어를 새 거래로 이어 봐요" : "만든 것의 쓰임과 가치를 생각해요";
        core = independence ? "내 방식으로 만든 결과물에 직접 값을 붙이고 싶은 마음이 있어요." : opportunity ? "아이디어를 꺼내 새로운 거래로 이어 보는 데 관심이 가요." : "만드는 즐거움에 더해 어디에 쓰이고 어떤 값이 될지도 생각해요.";
      } else if (g.식상) {
        summary = independence ? "내 방식으로 만들고 수입은 따로 익혀요" : "만드는 즐거움을 수입으로 이어 봐요";
        core = independence ? "자기 방식으로 만들어 내는 힘에 비해 수입을 꾸준히 잇는 일은 낯설 수 있어요." : "생각을 결과물로 꺼내는 즐거움과 돈으로 잇는 감각은 다르게 느껴질 수 있어요.";
      } else {
        summary = opportunity ? "보이는 기회를 결과물로 꺼내 봐요" : "생각을 밖으로 꺼낼 통로를 찾아요";
        core = opportunity ? "기회에는 눈길이 가도 직접 만들어 보여 주는 데는 시간이 걸릴 수 있어요." : "새 일을 구상하는 마음을 실제 모습으로 꺼내는 데 연습이 필요해요.";
      }
      nuance = has("business.overload") ? independence ? "내가 방향을 정하고 싶어도 기회만큼 많은 일을 혼자 맡기는 버거울 수 있어요." : "기회에 끌리는 마음에 비해 혼자 맡을 수 있는 범위는 좁게 느껴질 수 있어요." : has("business.slow_start") ? independence ? "내 판단을 믿으면서도 충분히 알아보고 싶어 시작에는 시간이 걸려요." : "충분히 알아보고 싶어 구상에 오래 머물 수 있어요." : g.식상 >= 2 ? opportunity && independence ? "내 방향을 지키며 여러 결과물을 새 거래로 이어 보고 싶어 해요." : opportunity ? "여러 모습으로 만든 아이디어에서 새 거래의 가능성을 찾는 편이에요." : independence ? "한 아이디어도 내 방식으로 여러 모습으로 꺼내고 싶어 해요." : "같은 아이디어도 여러 모습으로 만들어 보고 싶어 해요." : opportunity && independence ? "내 방향을 지키면서 새로운 거래에도 관심을 두는 편이에요." : opportunity && income ? "만든 것의 쓰임을 생각하면서 새 거래에도 눈길이 가요." : independence && income ? "함께 일하더라도 결과물의 방향은 직접 정하고 싶어 해요." : "";
      tip = has("business.overload") ? "새 일은 혼자 감당할 수 있는 작은 규모로 먼저 열어 보세요." : has("business.slow_start") ? "구상한 것 하나를 짧은 초안으로 꺼내 사람에게 보여 주세요." : income ? "결과물 하나에 누가 쓰는지와 들어가는 비용을 적어 보세요." : g.식상 ? "만든 것 하나에 가격을 붙여 반응을 들어 보세요." : "생각한 일을 그림이나 메모 한 장으로 먼저 꺼내 보세요.";
      break;
    }
    case "relationship": {
      const links = f.combines.length, clashes = f.clashes.length, friction = f.frictions.length;
      summary = links && (clashes || friction) ? "가까워져도 내 생각은 남겨 둬요" : links >= 3 ? "여러 사람과 공통점을 찾아요" : links ? "공통점으로 사람과 가까워져요" : clashes >= 2 ? "서로 다른 생각을 쉽게 굽히지 않아요" : clashes || friction ? "작은 차이도 마음에 남을 수 있어요" : "내 기준을 지키며 사람을 만나요";
      if (has("relationship.sharp_words")) summary = links ? "가까이 지내도 생각은 또렷하게 말해요" : "내 생각을 강하게 전할 수 있어요";
      else if (links && clashes >= 2) summary = has("relationship.peers") ? "여럿과 이어져도 내 입장은 오래 지켜요" : "관계를 이어 가도 의견은 쉽게 굽히지 않아요";
      else if (links && clashes && friction) summary = has("relationship.support") ? "상대를 이해해도 작은 차이가 마음에 남아요" : "가까운 사이의 의견과 작은 차이에 민감해요";
      else if (links && friction && !clashes) summary = has("relationship.peers") ? "함께 지내도 내 기준과 작은 차이를 의식해요" : "공통점으로 가까워져도 작은 차이에 민감해요";
      else if (links && clashes) summary = has("relationship.peers") ? "공통점을 찾되 내 선택은 직접 정해요" : "사람을 잇는 마음과 다른 의견을 함께 둬요";
      else if (links >= 2 && has("relationship.support")) summary = "여러 공통점과 상대의 사정으로 가까워져요";
      core = links && (clashes || friction) ? clashes >= 2 ? "사람을 잇는 마음이 있어도 의견이 다르면 쉽게 물러서기는 어려워요." : "함께 지내고 싶어 하면서도 의견 차이는 오래 마음에 남을 수 있어요." : links >= 3 ? "여러 사람 사이에서 공통점을 찾으며 관계를 넓혀 가는 편이에요." : links ? "서로 닮은 점을 찾으며 관계를 이어 가는 편이에요." : clashes >= 2 ? "생각이 다를 때는 내 입장을 오래 붙들고 있을 수 있어요." : clashes || friction ? "친하게 지내는 사이에서도 사소한 차이를 민감하게 받아들일 수 있어요." : "사람을 만나면서도 내 기준과 거리감을 알아가는 편이에요.";
      if (links >= 2 && links < 3 && !clashes && !friction) core = "사람 사이의 여러 공통점을 발견하며 가까워지는 편이에요.";
      if (links >= 2 && clashes >= 2) core = "여러 사람과 이어지려는 마음 속에도 쉽게 굽히기 어려운 생각이 있어요.";
      else if (links >= 2 && clashes) core = "여러 공통점으로 가까워져도 의견이 다른 부분은 따로 남겨 두는 편이에요.";
      else if (links && friction && !clashes) core = "공통점을 찾으며 가까워지다가도 작은 차이를 예민하게 느낄 수 있어요.";
      nuance = has("relationship.sharp_words") ? "생각을 또렷하게 말하려다 상대에게는 강하게 들릴 수 있어요." : has("relationship.peers") && has("relationship.support") ? "내 기준을 지키면서도 상대의 사정은 이해하려고 해요." : has("relationship.support") ? "상대의 사정을 알아보고 이해하려는 마음도 있어요." : has("relationship.peers") ? "함께 있어도 내 선택은 스스로 정하고 싶어 해요." : "";
      tip = has("relationship.sharp_words") ? "다른 의견을 말하기 전에 상대의 말에서 동의하는 부분부터 짚어요." : clashes || friction ? "의견이 다르면 지금 함께 정할 일 하나에만 초점을 맞춰요." : links ? "함께 좋아하는 일 하나를 골라 다음 만남을 제안해 보세요." : "사람을 만날 때 내 이야기를 한 뒤 상대의 생각도 물어보세요.";
      break;
    }
  }
  return { ...section, summary: item(summary), items: [item([core, nuance].filter(Boolean).join(" ")), item(tip), ...(continuation ? [item(continuation)] : [])] };
}
