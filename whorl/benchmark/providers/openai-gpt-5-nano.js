//=========================================
// Provider: OpenAI GPT-5 nano (versão barata da nova geração)
//
// Autenticação: OPENAI_API_KEY no .env.local ou env do processo.
// $0.05/M input, $0.40/M output — ~3x mais barato que gpt-4o-mini.
// Análogo direto ao gpt-4o-mini mas na linhagem nova, pra testar se
// o padrão "mini conservador" é da família ou da geração.
//=========================================

"use strict";

const MODEL = "gpt-5-nano";
const ENDPOINT = "https://api.openai.com/v1/chat/completions";

function getApiKey() {
  return process.env.OPENAI_API_KEY;
}

const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 8000;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function submitOnce(fullPrompt, apiKey) {
  // gpt-5-nano é reasoning: consome boa parte do budget em reasoning tokens
  // antes de emitir output. Com `max_completion_tokens: 2048` e effort default,
  // meta-prompts longos estouram o budget em reasoning e retornam output vazio.
  // `reasoning_effort: "low"` reduz pra ~100-300 tokens de reasoning; 8000 dá
  // folga pro output. Também não aceita temperature ≠ 1 (padrão reasoning).
  const body = {
    model: MODEL,
    messages: [{ role: "user", content: fullPrompt }],
    max_completion_tokens: 8000,
    reasoning_effort: "low",
  };

  return fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
}

async function submit(fullPrompt) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("OPENAI_API_KEY ausente");

  let lastError = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const response = await submitOnce(fullPrompt, apiKey);

    if (response.ok) {
      const data = await response.json();
      const text = data?.choices?.[0]?.message?.content;
      if (!text) throw new Error(`OpenAI retornou resposta sem texto: ${JSON.stringify(data).slice(0, 300)}`);
      return text.trim();
    }

    if (response.status === 429 && attempt < MAX_RETRIES) {
      const retryAfterHeader = response.headers.get("retry-after");
      const retryAfterSec = retryAfterHeader ? parseFloat(retryAfterHeader) : null;
      const backoffMs = retryAfterSec && !Number.isNaN(retryAfterSec)
        ? Math.ceil(retryAfterSec * 1000)
        : BASE_BACKOFF_MS * Math.pow(2, attempt);
      await sleep(backoffMs);
      continue;
    }

    const errText = await response.text().catch(() => "");
    lastError = new Error(`OpenAI HTTP ${response.status}: ${errText.slice(0, 300)}`);
    break;
  }

  throw lastError || new Error("OpenAI: falha após retries");
}

module.exports = {
  name: "openai-gpt-5-nano",
  displayName: "GPT-5 nano (OpenAI)",
  model: MODEL,
  tier: "paid",
  origin: "OpenAI (EUA)",
  description: "Tier nano da geração GPT-5 — barato e recente, contraste direto ao gpt-4o-mini legado",
  isAvailable: () => Boolean(getApiKey()),
  submit,
};
