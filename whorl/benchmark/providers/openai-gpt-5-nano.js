//=========================================
// Provider: OpenAI GPT-5 nano (cheap variant of the new generation)
//
// Auth: OPENAI_API_KEY in .env.local or process env.
// $0.05/M input, $0.40/M output — roughly 3× cheaper than gpt-4o-mini.
// Direct analog to gpt-4o-mini but in the new lineage, to test whether
// the "conservative mini" pattern is family-bound or generation-bound.
//=========================================

"use strict";

const MODEL = "gpt-5-nano";
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
  // gpt-5-nano is a reasoning model: it eats a big chunk of the budget
  // on reasoning tokens before emitting output. With `max_completion_tokens:
  // 2048` and default effort, long meta-prompts blow the budget on reasoning
  // and return empty output. `reasoning_effort: "low"` cuts reasoning down to
  // ~100-300 tokens; 8000 leaves room for the output. Also doesn't accept
  // temperature ≠ 1 (reasoning default).
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
  name: "openai-gpt-5-nano",
  displayName: "GPT-5 nano (OpenAI)",
  model: MODEL,
  tier: "paid",
  origin: "OpenAI (USA)",
  description: "Nano tier of the GPT-5 generation — cheap and recent, direct contrast to legacy gpt-4o-mini",
  isAvailable: () => Boolean(getApiKey()),
  submit,
};
