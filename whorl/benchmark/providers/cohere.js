//=========================================
// Provider: Cohere Command A (trial 1000 req/mês, sem cartão)
//
// Autenticação: COHERE_API_KEY no .env.local ou env do processo.
// Obter chave: https://dashboard.cohere.com → API Keys (trial criada auto no signup)
// Docs: https://docs.cohere.com/v2/docs/chat-api (Chat API v2)
//=========================================

"use strict";

const MODEL = "command-a-03-2025";
const ENDPOINT = "https://api.cohere.com/v2/chat";

function getApiKey() {
  return process.env.COHERE_API_KEY;
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
      accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
}

// Cohere v2 devolve { message: { role, content: [{ type: "text", text }] } }
// ou { text } em casos legados. Cobrimos ambos.
function extractText(data) {
  if (typeof data?.text === "string" && data.text.length > 0) return data.text;
  const content = Array.isArray(data?.message?.content) ? data.message.content : [];
  const parts = [];
  for (const c of content) {
    if (typeof c?.text === "string") parts.push(c.text);
  }
  return parts.join("").trim();
}

async function submit(fullPrompt) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("COHERE_API_KEY ausente");

  let lastError = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const response = await submitOnce(fullPrompt, apiKey);

    if (response.ok) {
      const data = await response.json();
      const text = extractText(data);
      if (!text) throw new Error(`Cohere retornou resposta sem texto: ${JSON.stringify(data).slice(0, 300)}`);
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
    lastError = new Error(`Cohere HTTP ${response.status}: ${errText.slice(0, 300)}`);
    break;
  }

  throw lastError || new Error("Cohere: falha após retries");
}

module.exports = {
  name: "cohere-command-a",
  displayName: "Command A (Cohere)",
  model: MODEL,
  tier: "trial",
  origin: "Cohere (Canadá)",
  description: "Filosofia de alinhamento focada em RAG/grounded generation/tool use — testa meta-prompt-following sob viés distinto",
  isAvailable: () => Boolean(getApiKey()),
  submit,
};
