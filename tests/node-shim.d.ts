// 임시: 이 환경에서는 @types/node를 설치할 수 없어 필요한 최소 선언만 둔다.
// @types/node 설치 후에는 이 파일을 삭제한다.

declare module "node:test" {
  export function test(name: string, fn: () => void | Promise<void>): void;
  export function describe(name: string, fn: () => void): void;
  export function it(name: string, fn: () => void | Promise<void>): void;
}
declare module "node:assert/strict" {
  interface Assert {
    (v: unknown, msg?: string): void;
    ok(v: unknown, msg?: string): void;
    equal(a: unknown, b: unknown, msg?: string): void;
    notEqual(a: unknown, b: unknown, msg?: string): void;
    deepEqual(a: unknown, b: unknown, msg?: string): void;
    throws(fn: () => unknown): void;
  }
  const assert: Assert;
  export default assert;
}
declare module "node:fs" {
  export function readdirSync(p: string, o?: { recursive?: boolean }): string[];
  export function readFileSync(p: string, enc: "utf8"): string;
}
declare const process: { cwd(): string };
declare const console: { log(...a: unknown[]): void };
