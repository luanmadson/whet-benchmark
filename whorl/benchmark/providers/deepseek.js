//=========================================
// Provider: DeepSeek V3 (free trial via platform.deepseek.com)
//
// Auth: DEEPSEEK_API_KEY in .env.local or process env.
// Get a key: https://platform.deepseek.com (5M tokens trial, 30 days)
// Docs: https://api-docs.deepseek.com/
// API: OpenAI-compatible.
//=========================================

"use strict";

const MODEL = "deepseek-chat";
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

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`DeepSeek HTTP ${response.status}: ${errText.slice(0, 300)}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error(`DeepSeek returned response with no text: ${JSON.stringify(data).slice(0, 300)}`);
  return text.trim();
}

module.exports = {
  name: "deepseek",
  displayName: "DeepSeek V3",
  model: MODEL,
  tier: "free",
  origin: "DeepSeek (China)",
  description: "High-performance Chinese model trained with a focus on code and reasoning",
  isAvailable: () => Boolean(getApiKey()),
  submit,
};
