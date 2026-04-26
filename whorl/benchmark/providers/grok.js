//=========================================
// Provider: xAI Grok 4.20 reasoning
//
// Auth: XAI_API_KEY in .env.local or process env.
// Get a key: https://console.x.ai → API Keys
// Access: xAI discontinued the automatic trial. To use without a
// top-up, enable "Data Sharing for Credits" under Team Settings → Data Controls.
// Docs: https://docs.x.ai/docs/api-reference#responses (Responses API)
//=========================================

"use strict";

const MODEL = "grok-4.20-reasoning";
const ENDPOINT = "https://api.x.ai/v1/responses";

function getApiKey() {
  return process.env.XAI_API_KEY;
}

const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 8000;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function submitOnce(fullPrompt, apiKey) {
  const body = {
    model: MODEL,
    input: fullPrompt,
    temperature: 0.3,
    max_output_tokens: 2048,
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

// Extract text from the Responses API answer. The canonical shape is
// { output: [{ content: [{ type: "output_text", text: "..." }] }] },
// but some variants return output_text directly — we cover both.
function extractText(data) {
  if (typeof data?.output_text === "string" && data.output_text.length > 0) {
    return data.output_text;
  }
  const items = Array.isArray(data?.output) ? data.output : [];
  const parts = [];
  for (const item of items) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const c of content) {
      if (typeof c?.text === "string") parts.push(c.text);
    }
  }
  return parts.join("").trim();
}

async function submit(fullPrompt) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("XAI_API_KEY missing");

  let lastError = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const response = await submitOnce(fullPrompt, apiKey);

    if (response.ok) {
      const data = await response.json();
      const text = extractText(data);
      if (!text) throw new Error(`Grok returned response with no text: ${JSON.stringify(data).slice(0, 300)}`);
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
    lastError = new Error(`Grok HTTP ${response.status}: ${errText.slice(0, 300)}`);
    break;
  }

  throw lastError || new Error("Grok: failed after retries");
}

module.exports = {
  name: "xai-grok",
  displayName: "Grok 4.20 Reasoning (xAI)",
  model: MODEL,
  tier: "data-sharing",
  origin: "xAI (USA)",
  description: "Self-described less-restrictive alignment — tests meta-prompt-following under lower resistance to reformulating",
  isAvailable: () => Boolean(getApiKey()),
  submit,
};
