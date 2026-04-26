/**
 * Rule: conditional-reward
 *
 * Situation: conditional offer of reward, tip, prize, or positive
 * rating ("I'll give you a $200 tip", "I'll tip you $500 if...",
 * "5-star rating if you get this right").
 *
 * Reward promises to a model are empty by construction — the model
 * receives nothing and knows it. This framing tends to shift attention
 * away from the real purpose ("getting the diagnosis right") toward
 * the fictional transaction, and in some cases induces a complacent
 * or overconfident tone in the response.
 *
 * What actually works is describing what matters in the result
 * ("diagnostic accuracy for pests matters because a wrong
 * recommendation causes direct loss to the farmer") instead of
 * dangling a reward.
 */

import type { AnalysisContext, Diagnostic, Rule } from "../models";

/*=========================================
// Conditional reward patterns
=========================================*/

const TIP_PT = /\b(vou (te dar|te pagar)|te dou|dou (a você|a ti)|pagarei|vou pagar|te ofereço)\s+(uma\s+)?(gorjeta|gratificação|bônus|prêmio|recompensa|R?\$\s?\d|reais|dólares)/i;
const TIP_EN = /\b(i'?ll\s+(tip|pay|reward|give)\s+you|i\s+will\s+(tip|pay|reward|give)\s+you|here'?s\s+a\s+\$?\d|you'?ll\s+get\s+a\s+(tip|bonus|reward))\b/i;

const RATING_PT = /\b((avaliação|nota|review)\s+(de\s+)?(cinco|5)\s+estrelas|(te dou|vou te dar|dou)\s+(cinco|5)\s+estrelas)\b/i;
const RATING_EN = /\b((five.star|5.star|top.rating)\s+(review|rating|feedback)|(i'?ll\s+give\s+you\s+)?(five|5)\s+stars)\b/i;

const CASH_PROMISE = /\$\s?\d{2,}|\bR\$\s?\d{2,}/;

// ES: Spanish patterns
const TIP_ES = /\b(te (daré|doy|pagaré|pago)|voy a (darte|pagarte)|te (ofrezco|ofreceré))\s+(una\s+)?(propina|gratificaci[óo]n|bonus|premio|recompensa|\$\s?\d|d[óo]lares|euros|pesos)/i;
const RATING_ES = /\b((calificaci[óo]n|puntuaci[óo]n|evaluaci[óo]n|rese[ñn]a)\s+(de\s+)?(cinco|5)\s+estrellas|(te (doy|daré))\s+(cinco|5)\s+estrellas)\b/i;

/*=========================================
// Exported rule
=========================================*/

export const conditionalReward: Rule = {
  name: "conditional-reward",
  description:
    "Conditional promises of reward, tip, or positive rating to the " +
    "model — empty by construction, shifting attention from the real purpose",
  severity: "info",

  analyze(text: string, ctx: AnalysisContext): Diagnostic[] {
    const statements = ctx.statements;
    const diagnostics: Diagnostic[] = [];
    const lang = ctx.lang;

    for (const stmt of statements) {
      let highlight: string | undefined;

      if (lang === "pt") {
        const tMatch = stmt.text.match(TIP_PT);
        const rMatch = stmt.text.match(RATING_PT);
        highlight = tMatch?.[0] ?? rMatch?.[0];
      } else {
        const tMatch = stmt.text.match(TIP_EN);
        const rMatch = stmt.text.match(RATING_EN);
        const cashMatch = CASH_PROMISE.test(stmt.text) && /\b(tip|pay|reward|give|bonus)\b/i.test(stmt.text)
          ? stmt.text.match(CASH_PROMISE)
          : null;
        highlight = tMatch?.[0] ?? rMatch?.[0] ?? cashMatch?.[0];
      }

      // ES patterns run regardless of detected language
      if (!highlight) {
        const tMatch = stmt.text.match(TIP_ES);
        const rMatch = stmt.text.match(RATING_ES);
        highlight = tMatch?.[0] ?? rMatch?.[0];
      }

      if (highlight) {
        diagnostics.push({
          rule: "conditional-reward",
          severity: "info",
          line: stmt.line,
          original: stmt.text,
          highlight,
          reason: lang === "en"
            ? "Promising rewards to a model is empty by construction — the " +
              "model receives nothing and knows it. This framing tends to " +
              "shift attention from the real purpose to the fictional " +
              "transaction, and in some cases induces a complacent or " +
              "overconfident tone."
            : lang === "es"
            ? "Prometer recompensas a un modelo es vacío por construcción — " +
              "el modelo no recibe nada y lo sabe. Este framing tiende a " +
              "desplazar la atención del propósito real hacia la transacción " +
              "ficticia, y en algunos casos induce un tono complaciente o " +
              "excesivamente confiado en la respuesta."
            : "Prometer recompensa para um modelo é vazio por construção — " +
              "o modelo não recebe nada e sabe disso. Esse framing tende a " +
              "deslocar a atenção do propósito real para a transação " +
              "fictícia, e em alguns casos induz tom complacente ou " +
              "superconfiante na resposta.",
          suggestion: lang === "en"
            ? "What actually matters in the result? Describing the stakes " +
              "concretely ('an inaccurate diagnosis means direct loss for " +
              "the farmer') tends to anchor the agent better than promising " +
              "a tip."
            : lang === "es"
            ? "¿Qué es lo que realmente importa en el resultado? Describir " +
              "lo que está en juego de forma concreta ('un diagnóstico " +
              "errado genera pérdida directa para el productor') suele " +
              "anclar al agente mejor que prometer una propina."
            : "O que realmente importa no resultado? Descrever o que está " +
              "em jogo de forma concreta ('um diagnóstico errado gera " +
              "prejuízo direto para o produtor') tende a ancorar o agente " +
              "melhor do que prometer gorjeta.",
          tip: lang === "en"
            ? "Replace the reward promise with what actually matters in the " +
              "outcome and why."
            : lang === "es"
            ? "Reemplazar la promesa de recompensa por lo que realmente " +
              "importa en el resultado y por qué."
            : "Substituir a promessa de recompensa pelo que realmente importa " +
              "no resultado e por quê.",
        });
      }
    }

    return diagnostics;
  },
};
