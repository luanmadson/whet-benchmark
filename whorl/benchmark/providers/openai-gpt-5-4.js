//=========================================
// Provider: OpenAI GPT-5.4 (current flagship, pay-as-you-go)
//
// Auth: OPENAI_API_KEY in .env.local or process env.
// Flagship model released on 2026-03-05. $2.50/M input, $15/M output.
// Roughly 2× the output cost of gpt-4o-mini; ~$1.13 per full corpus run.
//=========================================

"use strict";

const MODEL = "gpt-5.4";
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
    max_completion_tokens: 4096,
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
  if (!apiKey) throw new Error("OPENAI_API_KEY missing");

  let lastError = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const response = await submitOnce(fullPrompt, apiKey);

    if (response.ok) {
      const data = await response.json();
      const text = data?.choices?.[0]?.message?.content;
      if (!text) throw new Error(`OpenAI returned response with no text: ${JSON.stringify(data).slice(0, 300)}`);
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

  throw lastError || new Error("OpenAI: failed after retries");
}

module.exports = {
  name: "openai-gpt-5-4",
  displayName: "GPT-5.4 (OpenAI)",
  model: MODEL,
  tier: "paid",
  origin: "OpenAI (USA)",
  description: "OpenAI's current flagship (released March 2026) — tests whether the new generation breaks the gpt-4o-mini conservative pattern",
  isAvailable: () => Boolean(getApiKey()),
  submit,
};
