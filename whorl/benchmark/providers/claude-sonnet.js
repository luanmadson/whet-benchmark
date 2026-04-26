//=========================================
// Provider: Claude Sonnet (via CLI subprocess com --model sonnet)
//
// Espelho de claude.js, mas força o modelo Sonnet em vez do default
// do CLI (que hoje é Opus). Permite ter Opus e Sonnet como providers
// distintos no benchmark, o que é útil pra medir se o desempenho muda
// em modelos do mesmo lab mas em tiers de capacidade diferentes.
//
// Caveat editorial: ambos sobem via Claude Code CLI, então carregam o
// system prompt do harness. O resultado aqui é "modelo-dentro-do-harness",
// não modelo puro. Pra benchmark público, eventualmente precisa virar
// chamada direta da Anthropic API com ANTHROPIC_API_KEY e sem o wrapper.
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
      reject(new Error(`Claude Sonnet CLI timeout após ${timeoutMs / 1000}s`));
    }, timeoutMs);

    proc.stdout.on("data", (chunk) => (stdout += chunk.toString("utf8")));
    proc.stderr.on("data", (chunk) => (stderr += chunk.toString("utf8")));

    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(new Error(`Claude Sonnet CLI erro ao spawn: ${err.message}`));
    });

    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(`Claude Sonnet CLI exit ${code}: ${stderr.slice(0, 300)}`));
        return;
      }
      const text = stdout.trim();
      if (!text) {
        reject(new Error("Claude Sonnet CLI retornou stdout vazio"));
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
  origin: "Anthropic (EUA)",
  description: "Claude Sonnet via CLI — versão mais rápida e leve que Opus",
  isAvailable,
  submit,
};
