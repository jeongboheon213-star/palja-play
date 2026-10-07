import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readProfile,writeProfile} from '../web/src/profile';
test('profile: opt-in write/read, malformed data and storage denial fail safely, delete preserves purchases',()=>{
  const data=new Map<string,string>([['purchase','existing']]);
  const storage={getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>data.set(k,v),removeItem:(k:string)=>data.delete(k)} as unknown as Storage;
  const input={birthDate:'1990-05-15',birthTime:null,gender:'female',calendar:'solar',birthCountry:'KR'} as const;
  assert.equal(readProfile(storage,'2026-10-06'),null);
  assert(writeProfile(storage,input));assert.deepEqual(readProfile(storage,'2026-10-06'),input);
  data.set('palja-input-profile-v1','{"birthDate":"2099-01-01"}');assert.equal(readProfile(storage,'2026-10-06'),null);
  data.set('palja-input-profile-v1','bad');assert.equal(readProfile(storage,'2026-10-06'),null);
  assert(writeProfile(storage,null));assert.equal(data.get('purchase'),'existing');
  const denied={getItem:()=>{throw Error('denied')},setItem:()=>{throw Error('denied')}} as unknown as Storage;
  assert.equal(readProfile(denied,'2026-10-06'),null);assert.equal(writeProfile(denied,input),false);
});
