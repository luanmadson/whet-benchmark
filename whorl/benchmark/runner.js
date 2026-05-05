//=========================================
// Whet Benchmark runner — cross-model score delta via meta-prompt
//
// Per-pair (prompt × provider) flow:
//   1. analyze(prompt) → scoreBefore, metaPromptText
//   2. submit(metaPromptText) → rewrittenPrompt (the provider rewrites)
//   3. analyze(rewrittenPrompt) → scoreAfter
//   4. delta = scoreAfter - scoreBefore
//
// The rewrite meta-prompt (renderer output) is already self-contained:
// it includes the original prompt, the suggested adjustments, and tells
// the recipient to return only the rewritten prompt as plain text. So
// submit() receives the entire meta-prompt as input.
//
// Usage:
//   node whorl/benchmark/runner.js                  # all available providers
//   node whorl/benchmark/runner.js --providers=gemini,claude-cli
//   node whorl/benchmark/runner.js --prompts=consultor-juridico,assistente-medico
//   node whorl/benchmark/runner.js --dry-run        # don't call APIs, just print the plan
//
// Results: saved to whorl/benchmark/results.json (merged with previous runs)
//=========================================

"use strict";

const fs = require("node:fs");
const path = require("node:path");

// Load .env.local manually (no dotenv dependency)
const envLocalPath = path.resolve(__dirname, "..", "..", ".env.local");
if (fs.existsSync(envLocalPath)) {
  const raw = fs.readFileSync(envLocalPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) {
      let value = m[2].trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[m[1]] = value;
    }
  }
}

// Make sure the compiled core is available
const analyzerPath = path.resolve(__dirname, "..", "..", "dist", "core", "analyzer.js");
if (!fs.existsSync(analyzerPath)) {
  console.error("\x1b[31merror:\x1b[0m dist/core/analyzer.js not found. Run `npm run build:cli` first.");
  process.exit(2);
}
const { analyze } = require(analyzerPath);

// Load providers
const providers = [
  require("./providers/gemini"),
  require("./providers/mistral"),
  require("./providers/groq"),
  require("./providers/deepseek"),
  require("./providers/deepseek-r1"),
  require("./providers/claude"),
  require("./providers/claude-sonnet"),
  require("./providers/zhipu"),
  require("./providers/ai21"),
  require("./providers/cohere"),
  require("./providers/openai"),
  require("./providers/openai-gpt-5-4"),
  require("./providers/openai-gpt-5-5"),
  require("./providers/openai-gpt-5-nano"),
  require("./providers/grok"),
];

// Lightweight CLI flag parser
function parseFlags(argv) {
  const flags = { providers: null, prompts: null, dryRun: false };
  for (const arg of argv) {
    if (arg === "--dry-run") flags.dryRun = true;
    else if (arg.startsWith("--providers=")) flags.providers = arg.slice("--providers=".length).split(",").map(s => s.trim()).filter(Boolean);
    else if (arg.startsWith("--prompts=")) flags.prompts = arg.slice("--prompts=".length).split(",").map(s => s.trim()).filter(Boolean);
  }
  return flags;
}

// ANSI helpers
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const BLUE = "\x1b[34m";
const GRAY = "\x1b[90m";

function color(c, text) {
  return process.stdout.isTTY ? `${c}${text}${RESET}` : text;
}

function scoreColor(score) {
  if (score >= 90) return GREEN;
  if (score >= 60) return YELLOW;
  return RED;
}

function deltaColor(delta) {
  if (delta >= 20) return GREEN;
  if (delta >= 5) return BLUE;
  if (delta >= 0) return GRAY;
  return RED;
}

async function main() {
  const flags = parseFlags(process.argv.slice(2));

  // Load corpus
  const corpusPath = path.resolve(__dirname, "corpus.json");
  const corpus = JSON.parse(fs.readFileSync(corpusPath, "utf8"));

  // Filter providers
  const selectedProviders = providers.filter(p => {
    if (flags.providers && !flags.providers.includes(p.name)) return false;
    return true;
  });

  const availableProviders = selectedProviders.filter(p => p.isAvailable());
  const unavailable = selectedProviders.filter(p => !p.isAvailable());

  // Filter prompts
  const selectedPrompts = corpus.prompts.filter(p => {
    if (flags.prompts && !flags.prompts.includes(p.id)) return false;
    return true;
  });

  console.log(color(BOLD, "whet cross-model benchmark"));
  console.log(color(DIM, `corpus v${corpus.schemaVersion} · ${selectedPrompts.length} prompts · ${availableProviders.length}/${selectedProviders.length} providers available`));
  console.log();

  if (unavailable.length > 0) {
    console.log(color(YELLOW, "providers skipped (missing key):"));
    for (const p of unavailable) console.log(color(GRAY, `  · ${p.displayName} (${p.name})`));
    console.log();
  }

  if (availableProviders.length === 0) {
    console.error(color(RED, "error: no providers available. Configure keys in .env.local."));
    process.exit(2);
  }

  if (flags.dryRun) {
    console.log(color(BOLD, "plan (dry run):"));
    for (const p of availableProviders) {
      console.log(color(BLUE, `  ${p.displayName}`));
      for (const entry of selectedPrompts) {
        console.log(color(GRAY, `    · ${entry.id} (${entry.lang})`));
      }
    }
    return;
  }

  const runs = [];
  const runStartedAt = new Date().toISOString();

  // Run: for each provider, iterate prompts. Predictable order.
  for (const provider of availableProviders) {
    console.log(color(BOLD + BLUE, `\n── ${provider.displayName} (${provider.model}) ──`));

    for (const entry of selectedPrompts) {
      process.stdout.write(color(GRAY, `  ${entry.id.padEnd(26)} `));

      try {
        // 1. Analyze input
        const before = analyze(entry.text);
        const metaPrompt = before.output; // includes original + adjustments + instruction
        if (!metaPrompt) {
          console.log(color(YELLOW, "skipped — prompt has no diagnostics (score already clean)"));
          continue;
        }

        // 2. Submit rewrite meta-prompt
        const startedAt = Date.now();
        const rewritten = await provider.submit(metaPrompt);
        const elapsedMs = Date.now() - startedAt;

        // 3. Analyze output
        const after = analyze(rewritten);

        const delta = after.score - before.score;
        const beforeStr = color(scoreColor(before.score), String(before.score).padStart(3));
        const afterStr = color(scoreColor(after.score), String(after.score).padStart(3));
        const deltaStr = color(deltaColor(delta), `${delta >= 0 ? "+" : ""}${delta}`.padStart(4));
        const elapsedStr = color(GRAY, `${(elapsedMs / 1000).toFixed(1)}s`);
        console.log(`${beforeStr} → ${afterStr}  ${deltaStr}  ${elapsedStr}`);

        runs.push({
          provider: provider.name,
          displayName: provider.displayName,
          model: provider.model,
          tier: provider.tier,
          origin: provider.origin ?? "",
          description: provider.description ?? "",
          promptId: entry.id,
          promptLang: entry.lang,
          scoreBefore: before.score,
          scoreAfter: after.score,
          delta,
          diagnosticsBefore: before.diagnostics.length,
          diagnosticsAfter: after.diagnostics.length,
          elapsedMs,
          rewrittenLength: rewritten.length,
          rewrittenPreview: rewritten.slice(0, 240),
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.log(color(RED, `error: ${msg.slice(0, 100)}`));
        runs.push({
          provider: provider.name,
          displayName: provider.displayName,
          promptId: entry.id,
          error: msg,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  // Per-provider aggregate
  console.log();
  console.log(color(BOLD, "── Per-provider aggregate ──"));
  const byProvider = new Map();
  for (const r of runs) {
    if (r.error || typeof r.delta !== "number") continue;
    const arr = byProvider.get(r.provider) ?? [];
    arr.push(r);
    byProvider.set(r.provider, arr);
  }

  for (const [name, rs] of byProvider) {
    const avgBefore = rs.reduce((a, r) => a + r.scoreBefore, 0) / rs.length;
    const avgAfter = rs.reduce((a, r) => a + r.scoreAfter, 0) / rs.length;
    const avgDelta = avgAfter - avgBefore;
    const display = rs[0].displayName;
    const beforeStr = color(scoreColor(avgBefore), avgBefore.toFixed(1).padStart(5));
    const afterStr = color(scoreColor(avgAfter), avgAfter.toFixed(1).padStart(5));
    const deltaStr = color(deltaColor(avgDelta), `${avgDelta >= 0 ? "+" : ""}${avgDelta.toFixed(1)}`.padStart(6));
    console.log(`  ${display.padEnd(24)} ${beforeStr} → ${afterStr}  ${deltaStr}  ${color(GRAY, `(${rs.length} prompts)`)}`);
  }

  // Persist
  const resultsPath = path.resolve(__dirname, "results.json");
  let existing = { schemaVersion: 1, runs: [] };
  if (fs.existsSync(resultsPath)) {
    try {
      existing = JSON.parse(fs.readFileSync(resultsPath, "utf8"));
    } catch {
      // ignore if corrupt
    }
  }
  existing.runs.push({
    runStartedAt,
    runFinishedAt: new Date().toISOString(),
    corpusVersion: corpus.schemaVersion,
    prompts: Object.fromEntries(selectedPrompts.map(e => [e.id, { text: e.text, lang: e.lang }])),
    results: runs,
  });
  fs.writeFileSync(resultsPath, JSON.stringify(existing, null, 2));
  console.log();
  console.log(color(DIM, `results saved to whorl/benchmark/results.json`));
}

main().catch(err => {
  console.error(color(RED, `fatal error: ${err instanceof Error ? err.message : String(err)}`));
  process.exit(2);
});
