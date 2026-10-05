import { readFileSync } from "node:fs";
import { deepStrictEqual } from "node:assert";
const read = (path) => JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/, ""));
deepStrictEqual(read(process.argv[2] ?? "tier-distribution.json"), read("docs/tier-distribution.json"));
console.log("Actual tier analysis matches the committed reference report");
