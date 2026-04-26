//=========================================
// Provider: OpenAI GPT-5.5 (flagship reasoning, pay-as-you-go)
//
// Auth: OPENAI_API_KEY in .env.local or process env.
// Released on 2026-04-23 as the successor to gpt-5.4. Relevant change
// for integrators: 5.5 does reasoning by default — the first run here
// returned HTTP 400 on 62/62 because the initial config copied 5.4's
// (chat, with `temperature: 0.3`). Reasoning models don't accept
// temperature; OpenAI's docs expose `reasoning_effort` as the
// analogous control. The model's default is "medium"; we use "low"
// here to keep comparability with the gpt-5-nano provider (also a
// reasoning model run at low in the benchmark). `max_completion_tokens:
// 8000` accommodates reasoning tokens + the rewritten-prompt output.
// Price doubled vs 5.4: $5/M input, $30/M output.
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
  name: "openai-gpt-5-5",
  displayName: "GPT-5.5 (OpenAI)",
  model: MODEL,
  tier: "paid",
  origin: "OpenAI (USA)",
  description: "Reasoning-flagship successor to gpt-5.4 — measures whether the shift to reasoning-by-default in the 5.5 line preserves the meta-prompt-following gains",
  isAvailable: () => Boolean(getApiKey()),
  submit,
};
