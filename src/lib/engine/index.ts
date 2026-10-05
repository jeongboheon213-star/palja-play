// 조립 지점: 교체 가능한 구현을 고르는 유일한 곳.
import { createKrTimeNormalizer } from "../saju/timeNormalizer";
import { KR_TIME_HISTORY } from "../../data/saju/kr-time-history";

export const defaultTimeNormalizer = createKrTimeNormalizer(KR_TIME_HISTORY);
