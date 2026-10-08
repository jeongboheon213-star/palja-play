import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

test('actual show function synchronizes reused input label with today/free mode', () => {
  const source = readFileSync(new URL('../web/src/main.ts', import.meta.url), 'utf8');
  const show = source.match(/function show\(id: Screen\): void \{[\s\S]*?\n\}/)?.[0];
  assert(show);
  const calc = { textContent: '内' };
  const context = {
    todayMode: false, SCREENS: ['s-input', 's-result', 's-today'],
    $: () => calc,
    document: { getElementById: () => ({ classList: { toggle() {} } }) },
    window: { scrollTo() {} },
  };
  const js = ts.transpileModule(show, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  runInNewContext(js + '\nshow("s-input");', context);
  assert.equal(calc.textContent, '내 팔자 펼치기');
  for (let repeat = 0; repeat < 3; repeat++) {
    context.todayMode = true;
    runInNewContext(js + '\nshow("s-input");', context);
    assert.equal(calc.textContent, '무료 오늘운세 펼치기');
    runInNewContext(js + '\nshow("s-today");', context);
    context.todayMode = false; // existing Today → free CTA transition
    runInNewContext(js + '\nshow("s-result"); show("s-input");', context);
    assert.equal(calc.textContent, '내 팔자 펼치기');
  }
});
