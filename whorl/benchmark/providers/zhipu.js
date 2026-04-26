//=========================================
// Provider: Zhipu GLM (persistent free tier, no expiry)
//
// Auth: ZHIPU_API_KEY in .env.local or process env.
// Get a key: https://open.bigmodel.cn (simple signup, free tier with no expiry)
// Docs: https://open.bigmodel.cn/dev/api
//=========================================

"use strict";

const MODEL = "glm-4.7-flash";
const ENDPOINT = "https://open.bigmodel.cn/api/paas/v4/chat/completions";

function getApiKey() {
  return process.env.ZHIPU_API_KEY;
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
  if (!apiKey) throw new Error("ZHIPU_API_KEY missing");

  let lastError = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const response = await submitOnce(fullPrompt, apiKey);

    if (response.ok) {
      const data = await response.json();
      const text = data?.choices?.[0]?.message?.content;
      if (!text) throw new Error(`Zhipu returned response with no text: ${JSON.stringify(data).slice(0, 300)}`);
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
    lastError = new Error(`Zhipu HTTP ${response.status}: ${errText.slice(0, 300)}`);
    break;
  }

  throw lastError || new Error("Zhipu: failed after retries");
}

module.exports = {
  name: "zhipu",
  displayName: "Zhipu GLM-4.7 Flash",
  model: MODEL,
  tier: "free",
  origin: "Zhipu AI (China)",
  description: "Chinese model with a persistent, no-expiry free tier",
  isAvailable: () => Boolean(getApiKey()),
  submit,
};
