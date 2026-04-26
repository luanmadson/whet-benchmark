//=========================================
// Provider: Claude Sonnet (via CLI subprocess with --model sonnet)
//
// Mirror of claude.js, but forces the Sonnet model instead of the CLI's
// default (which is Opus today). Lets us keep Opus and Sonnet as
// distinct providers in the benchmark, useful for measuring whether
// performance changes between models from the same lab in different
// capability tiers.
//
// Editorial caveat: both run via the Claude Code CLI, so they carry the
// harness's system prompt. The result here is "model-inside-the-harness",
// not the model on its own. For a public benchmark, this should
// eventually be a direct Anthropic API call with ANTHROPIC_API_KEY and
// no wrapper.
//=========================================

"use strict";

const { spawn } = require("node:child_process");

const MODEL = "claude-sonnet-4-6 (via CLI)";

async function submit(fullPrompt) {
  return new Promise((resolve, reject) => {
    const isWindows = process.platform === "win32";
    const cmd = isWindows ? "cmd.exe" : "claude";
    const args = isWindows
      ? ["/c", "claude", "--print", "--model", "sonnet", "--dangerously-skip-permissions"]
      : ["--print", "--model", "sonnet", "--dangerously-skip-permissions"];

    const proc = spawn(cmd, args, {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    const timeoutMs = 180_000; // 3 min
    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error(`Claude Sonnet CLI timeout after ${timeoutMs / 1000}s`));
    }, timeoutMs);

    proc.stdout.on("data", (chunk) => (stdout += chunk.toString("utf8")));
    proc.stderr.on("data", (chunk) => (stderr += chunk.toString("utf8")));

    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(new Error(`Claude Sonnet CLI failed to spawn: ${err.message}`));
    });

    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(`Claude Sonnet CLI exit ${code}: ${stderr.slice(0, 300)}`));
        return;
      }
      const text = stdout.trim();
      if (!text) {
        reject(new Error("Claude Sonnet CLI returned empty stdout"));
        return;
      }
      resolve(text);
    });

    proc.stdin.write(fullPrompt);
    proc.stdin.end();
  });
}

function isAvailable() {
  return true;
}

module.exports = {
  name: "claude-sonnet-cli",
  displayName: "Claude Sonnet (via CLI)",
  model: MODEL,
  tier: "paid",
  origin: "Anthropic (USA)",
  description: "Claude Sonnet via CLI — faster and lighter sibling of Opus",
  isAvailable,
  submit,
};
