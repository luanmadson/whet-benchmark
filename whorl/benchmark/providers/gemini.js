//=========================================
// Provider: Google Gemini (free tier via AI Studio)
//
// Autenticação: GEMINI_API_KEY no .env.local ou env do processo.
// Obter chave: https://aistudio.google.com/app/apikey (free tier generoso)
// Docs: https://ai.google.dev/gemini-api/docs/quickstart?lang=rest
//=========================================

"use strict";

// gemini-2.0-flash não tem free tier ativo (limit 0 em projetos novos).
// gemini-2.5-flash tem free tier e está disponível no endpoint.
const MODEL = "gemini-2.5-flash";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

function getApiKey() {
  return process.env.GEMINI_API_KEY;
}

const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 15000; // RPM free tier é apertado — backoff maior

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function submitOnce(fullPrompt, apiKey) {
  const body = {
    contents: [{ parts: [{ text: fullPrompt }] }],
    generationConfig: {
      temperature: 0.3,
      // 8192 dá headroom suficiente pros prompts reescritos mais longos
      // do corpus. O corte anterior em 2048 estava truncando silenciosamente
      // porque thinking tokens também contam no orçamento total.
      maxOutputTokens: 8192,
      // Desabilita thinking — task de reescrita mecânica não se beneficia,
      // e thinking consome orçamento de saída. Ver src/lib/providers/gemini.ts
      // pra explicação completa.
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
  if (!apiKey) throw new Error("GEMINI_API_KEY ausente");

  let lastError = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const response = await submitOnce(fullPrompt, apiKey);

    if (response.ok) {
      const data = await response.json();
      const candidate = data?.candidates?.[0];
      if (!candidate) {
        throw new Error(`Gemini retornou sem candidate: ${JSON.stringify(data).slice(0, 300)}`);
      }

      // Fail-loud em MAX_TOKENS/SAFETY/RECITATION pra o benchmark não
      // contabilizar output truncado como "resposta válida". Isso vazia os
      // resultados históricos contra o Gemini.
      if (candidate.finishReason === "MAX_TOKENS") {
        throw new Error("Gemini cortou resposta por MAX_TOKENS — output truncado");
      }
      if (candidate.finishReason === "SAFETY" || candidate.finishReason === "RECITATION") {
        throw new Error(`Gemini bloqueou resposta por filtro: ${candidate.finishReason}`);
      }

      // Concatena todas as parts com texto que NÃO são `thought: true`.
      // Defesa em profundidade: mesmo com thinking desabilitado, Gemini
      // pode retornar múltiplas parts, e pegar só `parts[0]` é um bug
      // silencioso que deixa output parcial passar.
      const parts = candidate.content?.parts || [];
      const text = parts
        .filter((p) => !p.thought && typeof p.text === "string")
        .map((p) => p.text)
        .join("");

      if (!text.trim()) {
        throw new Error(`Gemini retornou resposta sem texto: ${JSON.stringify(data).slice(0, 300)}`);
      }
      return text.trim();
    }

    // 429 = rate limit. Gemini sinaliza "retry after Xs" no body do erro;
    // parsear é complexo, então usa backoff exponencial determinístico.
    if (response.status === 429 && attempt < MAX_RETRIES) {
      const backoffMs = BASE_BACKOFF_MS * Math.pow(1.5, attempt); // 15s, 22s, 33s
      await sleep(backoffMs);
      continue;
    }

    const errText = await response.text().catch(() => "");
    lastError = new Error(`Gemini HTTP ${response.status}: ${errText.slice(0, 300)}`);
    break;
  }

  throw lastError || new Error("Gemini: falha após retries");
}

module.exports = {
  name: "gemini",
  displayName: "Gemini 2.5 Flash",
  model: MODEL,
  tier: "free",
  origin: "Google (EUA)",
  description: "Modelo multimodal de referência do Google",
  isAvailable: () => Boolean(getApiKey()),
  submit,
};
