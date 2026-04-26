//=========================================
// Provider: Google Gemini (free tier via AI Studio)
//
// Auth: GEMINI_API_KEY in .env.local or process env.
// Get a key: https://aistudio.google.com/app/apikey (generous free tier)
// Docs: https://ai.google.dev/gemini-api/docs/quickstart?lang=rest
//=========================================

"use strict";

// gemini-2.0-flash has no active free tier (limit 0 on new projects).
// gemini-2.5-flash has a free tier and is available on the endpoint.
const MODEL = "gemini-2.5-flash";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

function getApiKey() {
  return process.env.GEMINI_API_KEY;
}

const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 15000; // Free tier RPM is tight — bigger backoff

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function submitOnce(fullPrompt, apiKey) {
  const body = {
    contents: [{ parts: [{ text: fullPrompt }] }],
    generationConfig: {
      temperature: 0.3,
      // 8192 gives enough headroom for the corpus's longer rewritten
      // prompts. The previous 2048 cap was silently truncating because
      // thinking tokens also count against the total output budget.
      maxOutputTokens: 8192,
      // Disable thinking — mechanical rewrite tasks don't benefit,
      // and thinking eats into the output budget. See
      // src/lib/providers/gemini.ts for the full explanation.
      thinkingConfig: { thinkingBudget: 0 },
    },
  };

  return fetch(`${ENDPOINT}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function submit(fullPrompt) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("GEMINI_API_KEY missing");

  let lastError = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const response = await submitOnce(fullPrompt, apiKey);

    if (response.ok) {
      const data = await response.json();
      const candidate = data?.candidates?.[0];
      if (!candidate) {
        throw new Error(`Gemini returned no candidate: ${JSON.stringify(data).slice(0, 300)}`);
      }

      // Fail-loud on MAX_TOKENS/SAFETY/RECITATION so the benchmark
      // doesn't count truncated output as a "valid response". That
      // would skew historical results against Gemini.
      if (candidate.finishReason === "MAX_TOKENS") {
        throw new Error("Gemini cut response on MAX_TOKENS — output truncated");
      }
      if (candidate.finishReason === "SAFETY" || candidate.finishReason === "RECITATION") {
        throw new Error(`Gemini blocked response by filter: ${candidate.finishReason}`);
      }

      // Concatenate every text part that is NOT `thought: true`.
      // Defense in depth: even with thinking disabled, Gemini can
      // return multiple parts, and grabbing just `parts[0]` is a
      // silent bug that lets partial output through.
      const parts = candidate.content?.parts || [];
      const text = parts
        .filter((p) => !p.thought && typeof p.text === "string")
        .map((p) => p.text)
        .join("");

      if (!text.trim()) {
        throw new Error(`Gemini returned response with no text: ${JSON.stringify(data).slice(0, 300)}`);
      }
      return text.trim();
    }

    // 429 = rate limit. Gemini signals "retry after Xs" in the error
    // body; parsing it is complex, so we use deterministic exponential backoff.
    if (response.status === 429 && attempt < MAX_RETRIES) {
      const backoffMs = BASE_BACKOFF_MS * Math.pow(1.5, attempt); // 15s, 22s, 33s
      await sleep(backoffMs);
      continue;
    }

    const errText = await response.text().catch(() => "");
    lastError = new Error(`Gemini HTTP ${response.status}: ${errText.slice(0, 300)}`);
    break;
  }

  throw lastError || new Error("Gemini: failed after retries");
}

module.exports = {
  name: "gemini",
  displayName: "Gemini 2.5 Flash",
  model: MODEL,
  tier: "free",
  origin: "Google (USA)",
  description: "Google's flagship multimodal model",
  isAvailable: () => Boolean(getApiKey()),
  submit,
};
