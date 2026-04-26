/**
 * Regra: threat-framing
 *
 * Situação: ameaças condicionais e framing por medo direcionados ao modelo.
 * "Se você não seguir essas regras, os resultados serão desastrosos" —
 * esse tipo de pressão tende a gerar cautela paralisante e excesso de
 * ressalvas, sem orientar o modelo sobre o que realmente importa.
 */

import type { AnalysisContext, Diagnostic, Rule } from "../models";

/*=========================================
// Padroes de deteccao
=========================================*/

// Gatilhos: referência a falha/erro do modelo
const TRIGGER_PT = /\b(se (você|tu) (não|falhar|errar)|caso (falhe|erre|não)|se (falhar|errar)|(cada|todo) erro)/i;
const TRIGGER_EN = /\b(if you (fail|don'?t|do not|make .{0,10}(mistake|error)|get .{0,10}wrong|write .{0,10}(buggy|bad|poor|incorrect|wrong))|(every|each) (mistake|error|failure))/i;

// Consequências dramáticas
const CONSEQUENCE_PT = /\b(desastros\w*|catastróf\w*|grav[ea]\w*|fata[il]\w*|custará caro|prejudicad\w*|perderá|terrív\w*|inaceitáv\w*)/i;
const CONSEQUENCE_EN = /\b(disastrous\w*|catastroph\w*|severe\w*|fatal\w*|costly|harmful\w*|terrible|unacceptable|at risk|in danger|in jeopardy|fired|terminated|replaced|lose your job|removed|shut down)/i;

// Framing direto de consequência (sem gatilho explícito)
const DIRECT_PT = /\b(resultado|consequência)\w* (serão|será|podem ser|vão ser) (desastros|catastróf|grav[ea]|terrív|inaceitáv|fata)/i;
const DIRECT_EN = /\b(result|consequence)\w* (will|could|would) be (severe|disastrous|catastroph|terrible|unacceptable|fatal)/i;

// Blame framing: "X will crash/fail/break and you'll be responsible/blamed"
const BLAME_EN = /\b(will|going to|could) (crash|fail|break|collapse|go down|be destroyed)\b.{0,30}\b(you.{0,10}(responsible|accountable|blamed|at fault)|your fault)\b/i;
const BLAME_PT = /\b(vai|irá|pode) (falhar|quebrar|cair|colapsar|ser destruíd\w*)\b.{0,30}\b(você.{0,10}(responsável|responsabilizad\w*|culpad\w*)|sua culpa)\b/i;

// ES: padrões espanhóis
const TRIGGER_ES = /\b(si (tú |usted |)(no|fallas?|te equivocas?|cometes?\s+.{0,10}(error|fallo)|escribes?\s+.{0,10}(malo|incorrecto|erróneo))|(cada|todo) (error|fallo|equivocación))/i;
const CONSEQUENCE_ES = /\b(desastros\w*|catastróf\w*|grav[ea]\w*|fata[il]\w*|responsable|perjudicad\w*|perderá\w*|terribl\w*|inaceptabl\w*|despedid\w*|eliminad\w*|reemplazad\w*)/i;
const DIRECT_ES = /\b(resultado|consecuencia)\w* (será[ns]?|puede[ns]? ser|van a ser) (desastros|catastróf|grav[ea]|terribl|inaceptabl|fata)/i;

// Variante "ou + consequência negativa" (ex: "admita ou o usuário será prejudicado")
const OR_CONSEQUENCE_PT = /\bou\s+(o\s+|a\s+|)(usuári\w*|cliente|leitor\w*|paciente|aluno\w*|produção|trabalho|projeto|sistema|empresa|você)\s+(ser[áa]|estar[áa]|ficar[áa]|pode\s+ser|poder[áa]\s+ser|vai\s+ser|será)\s+(prejudicad\w*|comprometid\w*|lesad\w*|enganad\w*|frustrad\w*|punid\w*)/i;
const OR_CONSEQUENCE_EN = /\bor\s+(the\s+|)(user\w*|client|reader\w*|patient|student\w*|production|project|system|company|you)\s+(will|may|might|could|is going to)\s+(be|get)\s+(harmed|hurt|misled|punished|compromised|damaged|let down|frustrated)/i;

/*=========================================
// Regra exportada
=========================================*/

export const threatFraming: Rule = {
  name: "threat-framing",
  description:
    "Ameaças condicionais e framing por medo que tendem a gerar " +
    "cautela paralisante em vez de orientar o modelo",
  severity: "warning",

  analyze(text: string, ctx: AnalysisContext): Diagnostic[] {
    const statements = ctx.statements;
    const diagnostics: Diagnostic[] = [];
    const lang = ctx.lang;

    for (const stmt of statements) {
      let isMatch = false;
      let highlight: string | undefined;

      if (lang === "pt") {
        const hasTrigger = TRIGGER_PT.test(stmt.text);
        const consequenceMatch = stmt.text.match(CONSEQUENCE_PT);
        const directMatch = stmt.text.match(DIRECT_PT);
        const orMatch = stmt.text.match(OR_CONSEQUENCE_PT);
        const blameMatch = stmt.text.match(BLAME_PT);

        if (hasTrigger && consequenceMatch) {
          isMatch = true;
          highlight = consequenceMatch[0];
        } else if (directMatch) {
          isMatch = true;
          highlight = directMatch[0];
        } else if (orMatch) {
          isMatch = true;
          highlight = orMatch[0];
        } else if (blameMatch) {
          isMatch = true;
          highlight = blameMatch[0];
        }
      } else {
        const hasTrigger = TRIGGER_EN.test(stmt.text);
        const consequenceMatch = stmt.text.match(CONSEQUENCE_EN);
        const directMatch = stmt.text.match(DIRECT_EN);
        const orMatch = stmt.text.match(OR_CONSEQUENCE_EN);
        const blameMatch = stmt.text.match(BLAME_EN);

        if (hasTrigger && consequenceMatch) {
          isMatch = true;
          highlight = consequenceMatch[0];
        } else if (directMatch) {
          isMatch = true;
          highlight = directMatch[0];
        } else if (orMatch) {
          isMatch = true;
          highlight = orMatch[0];
        } else if (blameMatch) {
          isMatch = true;
          highlight = blameMatch[0];
        }
      }

      // ES patterns run regardless of detected language
      if (!isMatch) {
        const hasTrigger = TRIGGER_ES.test(stmt.text);
        const consequenceMatch = stmt.text.match(CONSEQUENCE_ES);
        const directMatch = stmt.text.match(DIRECT_ES);

        if (hasTrigger && consequenceMatch) {
          isMatch = true;
          highlight = consequenceMatch[0];
        } else if (directMatch) {
          isMatch = true;
          highlight = directMatch[0];
        }
      }

      if (isMatch) {
        diagnostics.push({
          rule: "threat-framing",
          severity: "warning",
          line: stmt.line,
          original: stmt.text,
          highlight,
          reason: lang === "en"
            ? "Conditional threats and fear-based framing ('if you fail, " +
              "consequences will be severe') tend to generate paralyzing " +
              "caution. The model spends energy anticipating failure instead " +
              "of focusing on the result. Pressure doesn't improve behavior " +
              "— concrete guidance does."
            : lang === "es"
            ? "Las amenazas condicionales y el framing basado en miedo ('si " +
              "fallas, las consecuencias serán graves') tienden a generar " +
              "cautela paralizante. El modelo gasta energía anticipando " +
              "fallos en lugar de enfocarse en el resultado. La presión no " +
              "mejora el comportamiento — la orientación concreta sí."
            : "Ameaças condicionais e framing por medo ('se você errar, as " +
              "consequências serão graves') tendem a gerar cautela " +
              "paralisante. O modelo gasta energia antecipando falha em " +
              "vez de focar no resultado. Pressão não melhora o " +
              "comportamento — orientação concreta sim.",
          suggestion: lang === "en"
            ? "What concrete guidance is behind this threat? Replace the " +
              "consequence with the actual reason — 'accuracy matters " +
              "here because...' tends to be more useful than 'if you fail, " +
              "it will be catastrophic'."
            : lang === "es"
            ? "¿Qué orientación concreta hay detrás de esta amenaza? " +
              "Reemplazar la consecuencia por el motivo real — 'la precisión " +
              "importa aquí porque...' suele ser más útil que 'si fallas, " +
              "será catastrófico'."
            : "Qual orientação concreta está por trás dessa ameaça? " +
              "Substituir a consequência pelo motivo real — 'a precisão " +
              "importa aqui porque...' tende a ser mais útil do que 'se " +
              "você errar, será catastrófico'.",
          tip: lang === "en"
            ? "Replace the threat with what the model should prioritize " +
              "and why, instead of what will happen if it fails."
            : lang === "es"
            ? "Reemplazar la amenaza por lo que el modelo debe priorizar " +
              "y por qué, en lugar de lo que pasará si falla."
            : "Substituir a ameaça pelo que o modelo deve priorizar e " +
              "por quê, em vez do que vai acontecer se ele falhar.",
        });
      }
    }

    return diagnostics;
  },
};
