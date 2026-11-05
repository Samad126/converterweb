#!/usr/bin/env node
// PreToolUse: refuse edits to generated or secret files; say how to regenerate instead.
let raw = "";
process.stdin.on("data", (c) => (raw += c));
process.stdin.on("end", () => {
  const path = (JSON.parse(raw).tool_input?.file_path ?? "").replaceAll("\\", "/");
  const rules = [
    [/lib\/files\/fileMatrix\.ts$/, "Generated. Rebuild the backend (`cd ../backend && npm run build`) then `node scripts/gen-file-matrix.mjs`."],
    [/lib\/api\/api-types\.ts$/, "Generated. Update openapi.json then run `npm run gen:api`."],
    [/(^|\/)\.env$/, "Local environment file; edit .env.example for committed defaults."],
    [/(^|\/)package-lock\.json$/, "Changed by npm only."],
  ];
  for (const [re, why] of rules) {
    if (re.test(path)) {
      console.error(`Blocked: ${path}\n${why}`);
      process.exit(2);
    }
  }
});
