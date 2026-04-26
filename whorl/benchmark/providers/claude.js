//=========================================
// Provider: Claude (via CLI subprocess)
//
// Aproveita a subscription Claude Code já paga em vez de exigir
// ANTHROPIC_API_KEY separada. Spawna `claude --print` como subprocesso,
// envia o prompt por stdin, captura stdout.
//
// Trade-off: não tem controle fino de temperature/max_tokens, e o
// modelo exato depende da configuração do CLI. Em compensação, não
// há custo adicional e a autenticação já existe.
//=========================================

"use strict";

const { spawn } = require("node:child_process");

const MODEL = "claude-opus-4-7 (via CLI)";

async function submit(fullPrompt) {
  return new Promise((resolve, reject) => {
    // Windows: claude vem como .cmd/.ps1 — precisa do shell pra resolver,
    // mas evitamos shell:true (injeção). Usa cmd.exe /c como wrapper.
    // --model opus força o modelo, evitando drift pelo default do CLI.
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
      reject(new Error(`Claude CLI timeout após ${timeoutMs / 1000}s`));
    }, timeoutMs);

    proc.stdout.on("data", (chunk) => (stdout += chunk.toString("utf8")));
    proc.stderr.on("data", (chunk) => (stderr += chunk.toString("utf8")));

    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(new Error(`Claude CLI erro ao spawn: ${err.message}`));
    });

    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(`Claude CLI exit ${code}: ${stderr.slice(0, 300)}`));
        return;
      }
      const text = stdout.trim();
      if (!text) {
        reject(new Error("Claude CLI retornou stdout vazio"));
        return;
      }
      resolve(text);
    });

    proc.stdin.write(fullPrompt);
    proc.stdin.end();
  });
}

function isAvailable() {
  // Heurística: assume que está disponível — se o binário não existir,
  // o próprio spawn falhará no submit com erro claro.
  return true;
}

module.exports = {
  name: "claude-cli",
  displayName: "Claude (via CLI)",
  model: MODEL,
  tier: "paid",
  origin: "Anthropic (EUA)",
  description: "Claude Opus via CLI subscription — sem API key separada",
  isAvailable,
  submit,
};
