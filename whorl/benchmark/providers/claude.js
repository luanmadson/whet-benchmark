//=========================================
// Provider: Claude (via CLI subprocess)
//
// Rides the existing Claude Code subscription instead of requiring a
// separate ANTHROPIC_API_KEY. Spawns `claude --print` as a subprocess,
// pipes the prompt through stdin, captures stdout.
//
// Trade-off: no fine control over temperature/max_tokens, and the
// exact model depends on the CLI's configuration. In exchange, no
// extra cost and the auth already exists.
//=========================================

"use strict";

const { spawn } = require("node:child_process");

const MODEL = "claude-opus-4-7 (via CLI)";

async function submit(fullPrompt) {
  return new Promise((resolve, reject) => {
    // Windows: claude ships as .cmd/.ps1 — needs a shell to resolve,
    // but we avoid shell:true (injection risk). Use cmd.exe /c as wrapper.
    // --model opus pins the model, avoiding drift from the CLI default.
    const isWindows = process.platform === "win32";
    const cmd = isWindows ? "cmd.exe" : "claude";
    const args = isWindows
      ? ["/c", "claude", "--print", "--model", "opus", "--dangerously-skip-permissions"]
      : ["--print", "--model", "opus", "--dangerously-skip-permissions"];

    const proc = spawn(cmd, args, {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    const timeoutMs = 180_000; // 3 min
    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error(`Claude CLI timeout after ${timeoutMs / 1000}s`));
    }, timeoutMs);

    proc.stdout.on("data", (chunk) => (stdout += chunk.toString("utf8")));
    proc.stderr.on("data", (chunk) => (stderr += chunk.toString("utf8")));

    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(new Error(`Claude CLI failed to spawn: ${err.message}`));
    });

    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(`Claude CLI exit ${code}: ${stderr.slice(0, 300)}`));
        return;
      }
      const text = stdout.trim();
      if (!text) {
        reject(new Error("Claude CLI returned empty stdout"));
        return;
      }
      resolve(text);
    });

    proc.stdin.write(fullPrompt);
    proc.stdin.end();
  });
}

function isAvailable() {
  // Heuristic: assume it's available — if the binary doesn't exist,
  // the spawn itself will fail at submit time with a clear error.
  return true;
}

module.exports = {
  name: "claude-cli",
  displayName: "Claude Opus (via CLI)",
  model: MODEL,
  tier: "paid",
  origin: "Anthropic (USA)",
  description: "Claude Opus via the CLI subscription — no separate API key",
  isAvailable,
  submit,
};
