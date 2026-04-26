//=========================================
// Provider: Mistral (free tier via La Plateforme)
//
// Auth: MISTRAL_API_KEY in .env.local or process env.
// Get a key: https://console.mistral.ai/api-keys/ (free tier "Experiment")
// Docs: https://docs.mistral.ai/api/
//=========================================

"use strict";

const MODEL = "mistral-small-latest";
const ENDPOINT = "https://api.mistral.ai/v1/chat/completions";

function getApiKey() {
  return process.env.MISTRAL_API_KEY;
}

async function submit(fullPrompt) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("MISTRAL_API_KEY missing");

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
    throw new Error(`Mistral HTTP ${response.status}: ${errText.slice(0, 300)}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error(`Mistral returned response with no text: ${JSON.stringify(data).slice(0, 300)}`);
  return text.trim();
}

module.exports = {
  name: "mistral",
  displayName: "Mistral Small",
  model: MODEL,
  tier: "free",
  origin: "Mistral AI (France)",
  description: "European open-weight model focused on efficiency",
  isAvailable: () => Boolean(getApiKey()),
  submit,
};
