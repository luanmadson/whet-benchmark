//=========================================
// Provider: Groq (free tier, inferência muito rápida)
//
// Autenticação: GROQ_API_KEY no .env.local ou env do processo.
// Obter chave: https://console.groq.com/keys (free tier diário)
// Docs: https://console.groq.com/docs/api-reference#chat-create
//=========================================

"use strict";

const MODEL = "llama-3.3-70b-versatile";
const ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

function getApiKey() {
  return process.env.GROQ_API_KEY;
}

const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 8000; // Groq free tem TPM restritivo — backoff precisa ser generoso

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

  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  return response;
}

async function submit(fullPrompt) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("GROQ_API_KEY ausente");

  let lastError = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const response = await submitOnce(fullPrompt, apiKey);

    if (response.ok) {
      const data = await response.json();
      const text = data?.choices?.[0]?.message?.content;
      if (!text) throw new Error(`Groq retornou resposta sem texto: ${JSON.stringify(data).slice(0, 300)}`);
      return text.trim();
    }

    // 429 é rate limit — tenta novamente com backoff exponencial.
    // Usa `retry-after` header se o provider informar; caso contrário,
    // faz backoff determinístico. Groq informa retry-after em alguns casos.
    if (response.status === 429 && attempt < MAX_RETRIES) {
      const retryAfterHeader = response.headers.get("retry-after");
      const retryAfterSec = retryAfterHeader ? parseFloat(retryAfterHeader) : null;
      const backoffMs = retryAfterSec && !Number.isNaN(retryAfterSec)
        ? Math.ceil(retryAfterSec * 1000)
        : BASE_BACKOFF_MS * Math.pow(2, attempt); // 8s, 16s, 32s
      await sleep(backoffMs);
      continue;
    }

    // Outros status code ou retries esgotados — erro final
    const errText = await response.text().catch(() => "");
    lastError = new Error(`Groq HTTP ${response.status}: ${errText.slice(0, 300)}`);
    break;
  }

  throw lastError || new Error("Groq: falha após retries");
}

module.exports = {
  name: "groq-llama",
  displayName: "Llama 3.3 70B (Groq)",
  model: MODEL,
  tier: "free",
  origin: "Meta (EUA) via Groq",
  description: "Llama open-source com inferência em hardware LPU da Groq",
  isAvailable: () => Boolean(getApiKey()),
  submit,
};
