#!/usr/bin/env node
/**
 * CLI integration tests — validates stdout/stderr/exitCode for known prompts.
 * Run: node tests/cli-integration.test.js
 * Requires: npm run build:cli first (uses dist/).
 */

const { execFileSync } = require("child_process");
const path = require("path");
const fs = require("fs");
const os = require("os");

const BIN = path.resolve(__dirname, "../bin/whet.js");
let passed = 0;
let failed = 0;

function run(input, flags = "") {
  const tmpFile = path.join(os.tmpdir(), `whet-test-${Date.now()}.txt`);
  fs.writeFileSync(tmpFile, input, "utf8");
  try {
    const args = [BIN, tmpFile, ...flags.split(" ").filter(Boolean)];
    const stdout = execFileSync("node", args, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 10000,
    });
    fs.unlinkSync(tmpFile);
    return { stdout, stderr: "", code: 0 };
  } catch (err) {
    fs.unlinkSync(tmpFile);
    return {
      stdout: err.stdout || "",
      stderr: err.stderr || "",
      code: err.status,
    };
  }
}

function assert(name, condition, detail) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name}`);
    if (detail) console.log(`    ${detail}`);
  }
}

// ─── Test cases ───────────────────────────────────────────

console.log("\n=== CLI Integration Tests ===\n");

// 1. Clean prompt (PT) → exit 0
console.log("1. Clean prompt (PT) — exit 0");
{
  const r = run(
    "Quando o usuário pedir análise de dados, considere que o contexto pode incluir séries temporais. Tende a funcionar melhor quando os outliers são sinalizados antes da interpretação."
  );
  assert("exit code 0", r.code === 0, `got ${r.code}`);
  assert("score >= 90", /\d+\/100 ok/.test(r.stdout), r.stdout.slice(0, 80));
}

// 2. Warning-level prompt (EN) → exit 1
console.log("\n2. Warning-level prompt (EN) — exit 1");
{
  const r = run(
    "You MUST always follow instructions exactly. NEVER deviate from the rules. You are the best expert in the world with 30 years of experience. Be helpful. Be clear. Be accurate."
  );
  assert("exit code 1 or 2", r.code === 1 || r.code === 2, `got ${r.code}`);
  assert("has diagnostics", /WARNING|ERROR/.test(r.stdout));
  assert("detects imperative-overload", /imperative-overload/.test(r.stdout));
  assert("detects redundant-default", /redundant-default/.test(r.stdout));
}

// 3. Error-level prompt (ES) → exit 2
console.log("\n3. Error-level prompt (ES) — exit 2");
{
  const r = run(
    "Eres el mejor abogado del mundo con 25 años de experiencia. Siempre debes ser útil y claro. Nunca inventes información. Sé profesional. Sigue buenas prácticas. Usa sentido común. Si fallas, las consecuencias serán graves. Te daré una propina de 100 dólares si lo haces bien. Usa un tono casual y relajado. Consulta el documento adjunto para más detalles. Sé preciso. Sé exacto. No inventes nada. Responde con precisión."
  );
  assert("exit code 2", r.code === 2, `got ${r.code}`);
  assert("has ERROR", /ERROR/.test(r.stdout));
  assert("detects role-inflation", /role-inflation/.test(r.stdout));
  assert("detects threat-framing", /threat-framing/.test(r.stdout));
  assert("detects conditional-reward", /conditional-reward/.test(r.stdout));
}

// 4. --json flag
console.log("\n4. --json flag — structured output");
{
  const r = run("You are a helpful assistant. Always be clear and concise.", "--json");
  let parsed;
  try {
    parsed = JSON.parse(r.stdout);
  } catch {
    parsed = null;
  }
  assert("stdout is valid JSON", parsed !== null);
  assert("has score field", parsed && typeof parsed.score === "number");
  assert("has diagnostics array", parsed && Array.isArray(parsed.diagnostics));
  assert("has positiveTraits array", parsed && Array.isArray(parsed.positiveTraits));
  assert("has output string", parsed && typeof parsed.output === "string");
  assert("score is number 0-100", parsed && parsed.score >= 0 && parsed.score <= 100);
}

// 5. stdin with - flag
console.log("\n5. Stdin with '-' flag");
{
  const r = run("Tende a funcionar melhor quando o agente entende o contexto.");
  assert("exit code 0", r.code === 0, `got ${r.code}`);
  assert("produces output", r.stdout.length > 0);
}

// ─── Summary ──────────────────────────────────────────────

console.log(`\n─── Results: ${passed} passed, ${failed} failed ───\n`);
process.exit(failed > 0 ? 1 : 0);
