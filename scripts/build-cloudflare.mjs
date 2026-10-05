import * as esbuild from "esbuild";
import { writeFileSync } from "node:fs";
import "./build.mjs";

await esbuild.build({
  entryPoints: ["api-lib/cloudflare.ts"], outfile: "dist/_worker.js",
  bundle: true, platform: "neutral", format: "esm", target: "es2022",
  external: ["node:*"], legalComments: "none",
});
// Static requests stay on Pages' static serving path, avoiding function quota use.
writeFileSync("dist/_routes.json", JSON.stringify({ version: 1, include: ["/api/*", "/admin", "/admin/*"], exclude: [] }));
