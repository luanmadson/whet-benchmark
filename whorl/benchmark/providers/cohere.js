//=========================================
// Provider: Cohere Command A (1000 req/month trial, no credit card)
//
// Auth: COHERE_API_KEY in .env.local or process env.
// Get a key: https://dashboard.cohere.com → API Keys (trial created automatically on signup)
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

// Cohere v2 returns { message: { role, content: [{ type: "text", text }] } }
// or { text } in legacy cases. We cover both.
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
  if (!apiKey) throw new Error("COHERE_API_KEY missing");

  let lastError = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const response = await submitOnce(fullPrompt, apiKey);

    if (response.ok) {
      const data = await response.json();
      const text = extractText(data);
      if (!text) throw new Error(`Cohere returned response with no text: ${JSON.stringify(data).slice(0, 300)}`);
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

  throw lastError || new Error("Cohere: failed after retries");
}

module.exports = {
  name: "cohere-command-a",
  displayName: "Command A (Cohere)",
  model: MODEL,
  tier: "trial",
  origin: "Cohere (Canada)",
  description: "Alignment philosophy focused on RAG/grounded generation/tool use — tests meta-prompt-following under a different bias",
  isAvailable: () => Boolean(getApiKey()),
  submit,
};
