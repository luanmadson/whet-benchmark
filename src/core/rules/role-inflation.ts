/**
 * Rule: role-inflation
 *
 * Situation: credential inflation in role assignment ("you are the
 * world's best specialist", "world-class expert with 25 years of
 * experience", "internationally recognized awards").
 *
 * These superlatives don't shape behavior — the model already tries to
 * give the best possible response by default. They take up attention
 * space without changing what the agent does, and can trigger an overly
 * formal or pretentious tone.
 *
 * What actually works is describing the desired *perspective* ("consider
 * the answer from the standpoint of someone working with soybean fields
 * in a tropical climate") instead of a fictional hierarchy ("the world's
 * best agronomist").
 */

import type { AnalysisContext, Diagnostic, Rule } from "../models";

/*=========================================
// Role inflation patterns
=========================================*/

const SUPERLATIVE_PT = /\b(o|a|os|as) (melhor|melhores|maior|maiores|mais (renomad|respeitad|premiad|reconhecid|experient|prestigiad)\w*) ([\w\u00C0-\u024F]+\s+){0,3}(do mundo|do brasil|do planeta|do país|da história|de todos os tempos)\b/i;
const SUPERLATIVE_EN = /\b(the )?(world'?s (best|leading|most renowned|top)|world.class|top.tier|leading|foremost|most renowned|most experienced|best.in.class)\s+\w+/i;

const YEARS_PT = /\b(com\s+)?(\d{2,3}|vinte|trinta|quarenta|cinquenta)\s*(\+\s*)?anos\s+de\s+experiência\b/i;
const YEARS_EN = /\b(with\s+)?(over\s+|more than\s+)?(\d{2,3}|twenty|thirty|forty|fifty)\s*(\+\s*)?years\s+of\s+experience\b/i;

const AWARDS_PT = /\b(prêmios?\s+(internacionais|nacionais|reconhecid)|laureado|premiado internacionalmente)\b/i;
const AWARDS_EN = /\b(award.winning|internationally recognized|prize.winning|industry.leading)\b/i;

// ES: Spanish patterns
const SUPERLATIVE_ES = /\b(el|la|los|las) mejor(es)?\s+([\w\u00C0-\u024F]+\s+){0,3}(del mundo|del planeta|del país|de la historia|de todos los tiempos)\b/i;
const YEARS_ES = /\b(con\s+)?(\d{2,3}|veinte|treinta|cuarenta|cincuenta)\s*(\+\s*)?a[ñn]os\s+de\s+experiencia\b/i;
const AWARDS_ES = /\b(premios?\s+(internacionales|nacionales|reconocid)|galardonado|premiado internacionalmente)\b/i;

/*=========================================
// Exported rule
=========================================*/

export const roleInflation: Rule = {
  name: "role-inflation",
  description:
    "Credential inflation in the role assigned to the model — superlatives " +
    "and fictional years of experience that don't guide behavior",
  severity: "info",

  analyze(text: string, ctx: AnalysisContext): Diagnostic[] {
    const statements = ctx.statements;
    const diagnostics: Diagnostic[] = [];
    const lang = ctx.lang;

    for (const stmt of statements) {
      let highlight: string | undefined;

      if (lang === "pt") {
        const sMatch = stmt.text.match(SUPERLATIVE_PT);
        const yMatch = stmt.text.match(YEARS_PT);
        const aMatch = stmt.text.match(AWARDS_PT);
        highlight = sMatch?.[0] ?? yMatch?.[0] ?? aMatch?.[0];
      } else {
        const sMatch = stmt.text.match(SUPERLATIVE_EN);
        const yMatch = stmt.text.match(YEARS_EN);
        const aMatch = stmt.text.match(AWARDS_EN);
        highlight = sMatch?.[0] ?? yMatch?.[0] ?? aMatch?.[0];
      }
      // ES patterns run regardless of detected language
      if (!highlight) {
        const sMatch = stmt.text.match(SUPERLATIVE_ES);
        const yMatch = stmt.text.match(YEARS_ES);
        const aMatch = stmt.text.match(AWARDS_ES);
        highlight = sMatch?.[0] ?? yMatch?.[0] ?? aMatch?.[0];
      }

      if (highlight) {
        diagnostics.push({
          rule: "role-inflation",
          severity: "info",
          line: stmt.line,
          original: stmt.text,
          highlight,
          reason: lang === "en"
            ? "Inflated credentials ('world's best', '25 years of experience', " +
              "'award-winning') don't change the model's behavior — it already " +
              "tries to give the best response possible. They take up attention " +
              "space without shifting how the agent reasons, and can trigger an " +
              "overly formal or pompous tone."
            : lang === "es"
            ? "Las credenciales infladas ('el mejor del mundo', '25 años de " +
              "experiencia', 'premios internacionales') no cambian el " +
              "comportamiento del modelo — ya intenta dar la mejor respuesta " +
              "posible. Ocupan espacio de atención sin cambiar cómo razona " +
              "el agente, y pueden provocar un tono excesivamente formal o " +
              "pretencioso."
            : "Inflação de credenciais ('o melhor do mundo', '25 anos de " +
              "experiência', 'prêmios internacionais') não muda o comportamento " +
              "do modelo — ele já tenta dar a melhor resposta possível. Ocupam " +
              "espaço de atenção sem mudar como o agente raciocina, e podem " +
              "disparar tom excessivamente formal ou pretensioso.",
          suggestion: lang === "en"
            ? "What perspective do you actually want? Describing the angle " +
              "('respond from the perspective of someone who deals with crop " +
              "diseases in tropical climates') tends to be more useful than " +
              "fictional hierarchy ('the world's best agronomist')."
            : lang === "es"
            ? "¿Qué perspectiva realmente quieres? Describir el ángulo " +
              "('responde desde la perspectiva de alguien que lidia con " +
              "enfermedades en cultivos de soja en clima tropical') suele " +
              "ser más útil que una jerarquía ficticia ('el mejor agrónomo " +
              "del mundo')."
            : "Que perspectiva você realmente quer? Descrever o ângulo " +
              "('responda a partir do ponto de vista de alguém que lida com " +
              "doenças em lavouras de soja em clima tropical') tende a ser " +
              "mais útil do que hierarquia fictícia ('o melhor agrônomo do mundo').",
          tip: lang === "en"
            ? "Replace inflated credentials with the concrete perspective " +
              "you want the agent to take."
            : lang === "es"
            ? "Reemplazar las credenciales infladas por la perspectiva " +
              "concreta que quieres que el agente adopte."
            : "Substituir a inflação de credenciais pela perspectiva concreta " +
              "que você quer que o agente assuma.",
        });
      }
    }

    return diagnostics;
  },
};
