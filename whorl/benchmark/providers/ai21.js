//=========================================
// Provider: AI21 Jamba (trial $10, 3 meses, sem cartão)
//
// Autenticação: AI21_API_KEY no .env.local ou env do processo.
// Obter chave: https://studio.ai21.com/v2/workspaces/{id}/api-keys
// Docs: https://docs.ai21.com/reference/jamba-15-api-ref
//=========================================

"use strict";

const MODEL = "jamba-large-1.7";
const ENDPOINT = "https://api.ai21.com/studio/v1/chat/completions";

function getApiKey() {
  return process.env.AI21_API_KEY;
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
  if (!apiKey) throw new Error("AI21_API_KEY ausente");

  let lastError = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const response = await submitOnce(fullPrompt, apiKey);

    if (response.ok) {
      const data = await response.json();
      const text = data?.choices?.[0]?.message?.content;
      if (!text) throw new Error(`AI21 retornou resposta sem texto: ${JSON.stringify(data).slice(0, 300)}`);
      return text.trim();
    }

    if (response.status === 429 && attempt < MAX_RETRIES) {
      const retryAfterHeader = response.headers.get("retry-after");
      const retryAfterSec = retryAfterHeader ? parseFloat(retryAfterHeader) : null;
      const backoffMs = retryAfterSec && !Number.isNaN(retryAfterSec)
        ? Math.ceil(retryAfterSec * 1000)
        : BASE_BACKOFF_MS * Math.pow(2, attempt); // 8s, 16s, 32s
      await sleep(backoffMs);
      continue;
    }

    const errText = await response.text().catch(() => "");
    lastError = new Error(`AI21 HTTP ${response.status}: ${errText.slice(0, 300)}`);
    break;
  }

  throw lastError || new Error("AI21: falha após retries");
}

module.exports = {
  name: "ai21-jamba",
  displayName: "Jamba Large 1.7 (AI21)",
  model: MODEL,
  tier: "trial",
  origin: "AI21 Labs (Israel)",
  description: "Arquitetura Mamba-Transformer híbrida — única não-transformer pura do benchmark",
  isAvailable: () => Boolean(getApiKey()),
  submit,
};
