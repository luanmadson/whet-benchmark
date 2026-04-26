//=========================================
// Provider: OpenAI GPT-4o-mini (pay-as-you-go, top-up mínimo $5)
//
// Autenticação: OPENAI_API_KEY no .env.local ou env do processo.
// Obter chave: https://platform.openai.com → API keys
// Docs: https://platform.openai.com/docs/api-reference/chat
//
// Trial automático foi descontinuado em meados de 2025. Contas novas
// exigem cartão + top-up mínimo de $5. A uma média de ~$0.01 por run
// full do corpus (gpt-4o-mini), $5 cobre ~500 runs completas.
//=========================================

"use strict";

const MODEL = "gpt-4o-mini";
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
  const body = {
    model: MODEL,
    messages: [{ role: "user", content: fullPrompt }],
    temperature: 0.3,
    max_tokens: 2048,
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
  name: "openai-gpt-4o-mini",
  displayName: "GPT-4o mini (OpenAI)",
  model: MODEL,
  tier: "paid",
  origin: "OpenAI (EUA)",
  description: "Flagship cost-efficient da OpenAI — representa a filosofia RLHF pioneira do campo",
  isAvailable: () => Boolean(getApiKey()),
  submit,
};
