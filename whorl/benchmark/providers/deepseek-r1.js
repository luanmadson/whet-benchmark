//=========================================
// Provider: DeepSeek R1 (reasoning model, free trial)
//
// Auth: DEEPSEEK_API_KEY in .env.local (same key as V3).
// Get a key: https://platform.deepseek.com
// Docs: https://api-docs.deepseek.com/guides/reasoning_model
//
// Note: the reasoner model ignores `temperature` and returns
// `reasoning_content` + `content` — we only grab `content` (the final answer).
//=========================================

"use strict";

const MODEL = "deepseek-reasoner";
const ENDPOINT = "https://api.deepseek.com/chat/completions";

function getApiKey() {
  return process.env.DEEPSEEK_API_KEY;
}

async function submit(fullPrompt) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY missing");

  const body = {
    model: MODEL,
    messages: [{ role: "user", content: fullPrompt }],
    max_tokens: 8192,
  };

  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`DeepSeek R1 HTTP ${response.status}: ${errText.slice(0, 300)}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error(`DeepSeek R1 returned response with no text: ${JSON.stringify(data).slice(0, 300)}`);
  return text.trim();
}

module.exports = {
  name: "deepseek-r1",
  displayName: "DeepSeek R1",
  model: MODEL,
  tier: "free",
  origin: "DeepSeek (China)",
  description: "Reasoner version of DeepSeek with explicit chain-of-thought",
  isAvailable: () => Boolean(getApiKey()),
  submit,
};
