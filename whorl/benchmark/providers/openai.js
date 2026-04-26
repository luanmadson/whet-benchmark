//=========================================
// Provider: OpenAI GPT-4o-mini (pay-as-you-go, $5 minimum top-up)
//
// Auth: OPENAI_API_KEY in .env.local or process env.
// Get a key: https://platform.openai.com → API keys
// Docs: https://platform.openai.com/docs/api-reference/chat
//
// Automatic trial was discontinued in mid-2025. New accounts require
// a credit card + a $5 minimum top-up. At an average of ~$0.01 per
// full corpus run (gpt-4o-mini), $5 covers about 500 full runs.
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
  name: "openai-gpt-4o-mini",
  displayName: "GPT-4o mini (OpenAI)",
  model: MODEL,
  tier: "paid",
  origin: "OpenAI (USA)",
  description: "OpenAI's cost-efficient flagship — represents the RLHF philosophy that pioneered the field",
  isAvailable: () => Boolean(getApiKey()),
  submit,
};
