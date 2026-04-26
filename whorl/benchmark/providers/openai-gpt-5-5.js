//=========================================
// Provider: OpenAI GPT-5.5 (flagship reasoning, pay-as-you-go)
//
// Autenticação: OPENAI_API_KEY no .env.local ou env do processo.
// Lançado em 2026-04-23 como sucessor do gpt-5.4. Mudança relevante
// pro integrador: a 5.5 faz reasoning por padrão — a primeira run aqui
// devolveu HTTP 400 em 62/62 porque a config inicial imitava o 5.4
// (chat, com `temperature: 0.3`). Modelos reasoning não aceitam
// temperature; a documentação da OpenAI expõe `reasoning_effort` como
// controle análogo. O default do modelo é "medium"; aqui usamos "low"
// pra manter comparabilidade com o provider gpt-5-nano (também reasoning
// rodado em low no benchmark). `max_completion_tokens: 8000` acomoda
// reasoning tokens + output do prompt reescrito. Preço dobrou em relação
// ao 5.4: $5/M input, $30/M output.
//=========================================

"use strict";

const MODEL = "gpt-5.5";
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
  name: "openai-gpt-5-5",
  displayName: "GPT-5.5 (OpenAI)",
  model: MODEL,
  tier: "paid",
  origin: "OpenAI (EUA)",
  description: "Iteração flagship reasoning sucessora do gpt-5.4 — mede se o salto pra reasoning por padrão na linhagem 5.5 mantém o ganho de meta-prompt-following",
  isAvailable: () => Boolean(getApiKey()),
  submit,
};
