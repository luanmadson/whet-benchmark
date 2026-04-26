//=========================================
// Provider: Groq (free tier, very fast inference)
//
// Auth: GROQ_API_KEY in .env.local or process env.
// Get a key: https://console.groq.com/keys (daily free tier)
// Docs: https://console.groq.com/docs/api-reference#chat-create
//=========================================

"use strict";

const MODEL = "llama-3.3-70b-versatile";
const ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

function getApiKey() {
  return process.env.GROQ_API_KEY;
}

const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 8000; // Groq's free tier has restrictive TPM — backoff needs to be generous

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
  if (!apiKey) throw new Error("GROQ_API_KEY missing");

  let lastError = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const response = await submitOnce(fullPrompt, apiKey);

    if (response.ok) {
      const data = await response.json();
      const text = data?.choices?.[0]?.message?.content;
      if (!text) throw new Error(`Groq returned response with no text: ${JSON.stringify(data).slice(0, 300)}`);
      return text.trim();
    }

    // 429 is rate limit — retry with exponential backoff.
    // Uses the `retry-after` header if the provider sends one; otherwise
    // falls back to deterministic backoff. Groq sometimes includes retry-after.
    if (response.status === 429 && attempt < MAX_RETRIES) {
      const retryAfterHeader = response.headers.get("retry-after");
      const retryAfterSec = retryAfterHeader ? parseFloat(retryAfterHeader) : null;
      const backoffMs = retryAfterSec && !Number.isNaN(retryAfterSec)
        ? Math.ceil(retryAfterSec * 1000)
        : BASE_BACKOFF_MS * Math.pow(2, attempt); // 8s, 16s, 32s
      await sleep(backoffMs);
      continue;
    }

    // Other status codes or retries exhausted — final error
    const errText = await response.text().catch(() => "");
    lastError = new Error(`Groq HTTP ${response.status}: ${errText.slice(0, 300)}`);
    break;
  }

  throw lastError || new Error("Groq: failed after retries");
}

module.exports = {
  name: "groq-llama",
  displayName: "Llama 3.3 70B (Groq)",
  model: MODEL,
  tier: "free",
  origin: "Meta (USA) via Groq",
  description: "Open-source Llama with inference on Groq's LPU hardware",
  isAvailable: () => Boolean(getApiKey()),
  submit,
};
