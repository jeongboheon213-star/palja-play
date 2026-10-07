import { validateSajuInput } from '../../src/lib/validation';
import type { SajuInput } from '../../src/lib/saju/types';
const KEY='palja-input-profile-v1';
export function readProfile(storage: Storage, today: string): SajuInput|null {
  try { const v=validateSajuInput(JSON.parse(storage.getItem(KEY)??'null'),{todayKst:today});return v.ok?v.value:null; } catch {return null;}
}
export function writeProfile(storage: Storage, input: SajuInput|null): boolean {
  try { if(input)storage.setItem(KEY,JSON.stringify(input));else storage.removeItem(KEY);return true;}catch{return false;}
}
