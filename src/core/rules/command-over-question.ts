/**
 * Rule: command-over-question
 *
 * Situation: instructions that issue direct commands without explaining
 * the purpose. When the agent understands *why* something is requested,
 * it can adapt to situations the author didn't anticipate. Commands
 * without context produce mechanical compliance — the agent does what
 * it was told, not what makes sense.
 *
 * Reframing as a question or observation invites the agent to evaluate
 * intent, which tends to produce smarter behavior.
 *
 * This rule doesn't catch hard imperatives (NEVER, ALWAYS, MUST) —
 * those belong to imperative-overload. It catches moderate commands
 * that would be more effective with context.
 */

import type { AnalysisContext, Diagnostic, Rule } from "../models";

/*=========================================
// Detection patterns
=========================================*/

const PT_IMPERATIVE_STARTS = /^(use|utilize|adicione|implemente|verifique|valide|garanta|mantenha|evite|inclua|remova|aplique|siga|faça|crie|gere|produza|escreva|documente|teste|revise|priorize|prefira|assegure|certifique-se|considere|trate|formate|organize|estruture|otimize|minimize|maximize)/i;

// Direct negations without purpose (PT)
const PT_NEGATION_STARTS = /^não\s+\w+/i;

// Common imperative verbs (EN)
const EN_IMPERATIVE_STARTS = /^(use|add|implement|verify|validate|ensure|maintain|avoid|include|remove|apply|follow|make|create|generate|produce|write|document|test|review|prioritize|prefer|check|treat|format|organize|structure|optimize|minimize|maximize|handle|keep|return|output|provide|give|show|display|render|process|parse|convert|set|configure)/i;

// Direct negations without purpose (EN)
const EN_NEGATION_STARTS = /^(do not|don'?t)\s+\w+/i;

// Common imperative verbs (ES)
const ES_IMPERATIVE_STARTS = /^(usa |utiliza |añade |implementa |verifica |valida |garantiza |mantén |evita |incluye |elimina |asegúrate |proporciona |genera |crea |define |establece |configura |aplica |ejecuta )/i;

// Direct negations without purpose (ES)
const ES_NEGATION_STARTS = /^(no hagas |no uses |no incluyas |no utilices |no agregues |no menciones |no generes |no proporciones |nunca )/i;

// Patterns that indicate the instruction ALREADY has purpose/context
const HAS_PURPOSE = /\b(porque|pois|para que|para evitar|para garantir|para manter|já que|visto que|uma vez que|dado que|sem antes|sem que|since|because|so that|in order to|to avoid|to ensure|to prevent|to maintain|given that|as this|this helps|this prevents|this ensures|without first|unless|isso ajuda|isso evita|isso garante|isso previne|tende a|costuma|pode ser|tends to|usually|might|consider|quando|when .+ then|ya que|puesto que|con el fin de|a fin de)\b/i;

// Long dash (— or --) followed by justification/alternative carries
// the purpose outside the classic connectors: "Não inventar X — só usar Y",
// "Don't adjust — the value is seeing the raw text". Requires a substantive
// clause after the dash (≥12 chars) so it doesn't match short parentheticals.
// `\b` isn't reliable for tokens ending in accents (`só`, `razão`), so the
// marker's end requires explicit space, period, or comma.
const HAS_DASH_JUSTIFICATION = /\s[—–-]{1,2}\s+(só|apenas|pois|porque|para|o que|o valor|o ponto|o objetivo|a ideia|a razão|o motivo|assim|dessa forma|desse modo|only|just|because|so that|for|the reason|the point|the goal|the idea|the value|solo|ya que|puesto que|el motivo|la razón|el objetivo|la idea|el valor|el punto|de ese modo|de esa forma)(\s|[.,]).{12,}/i;

// Patterns that indicate suggestive or interrogative tone (already fine)
const HAS_SUGGESTIVE_TONE = /\b(tende a|costuma|pode ser|considere|talvez|geralmente|preferencialmente|quando possível|se fizer sentido|tends to|usually|might|perhaps|consider|when possible|if it makes sense|ideally|tiende a|suele|puede ser|considere|tal vez|quizás|generalmente|preferentemente|cuando sea posible|si tiene sentido)\b|\?$/i;

// Legitimate configuration patterns (direct command is appropriate)
const IS_CONFIGURATION = /\b(responda? em|respond in|formato|format:|output:|idioma|language:|tom:|tone:|persona:|papel:|role:|contexto:|context:)\b/i;

// Persona/context patterns (not a command)
const IS_PERSONA = /^(você é|tu é|eu sou|you are|i am|act as|atue como|contexto:|context:)\b/i;

// Commands with specific, detailed complement (not generic)
const HAS_SPECIFIC_COMPLEMENT = /^(analise|priorize|use|formate|considere|mantenha|analyze|prioritize|format|consider|maintain|keep|handle|avoid|usa|utiliza|configura|mantén|evita|verifica)\b.{20,}/i;

// Negations that include a contrary specification (e.g.: "that contradicts", "que danifique")
const NEGATION_HAS_CONSEQUENCE = /\b(that\s+(contradicts?|damages?|harms?|violates?|breaks?)|que\s+(contradiz|danifiqu|prejudiqu|viole|quebre|compromet))\b/i;

// Already caught by imperative-overload
const ALREADY_IMPERATIVE = /\b(NUNCA|SEMPRE|NEVER|ALWAYS|MUST|FORBIDDEN|PROIBIDO|É OBRIGATÓRIO|OBRIGATORIAMENTE|REQUIRED|JAMAIS)\b|\b(sob nenhuma (hipótese|circunstância)|em hipótese alguma|under no circumstances|it is (essential|critical|imperative|vital)|at all times|[ÉEée] (essencial|crítico|imprescindível|vital|fundamental|imperativo|indispensável)|a todo (momento|instante|tempo)|o tempo (todo|inteiro)|em todas as (interações|situações|respostas|ocasiões))\b/i;

/*=========================================
// Reformulation tips
=========================================*/

const TIP_PT =
  "Adicionar o motivo da instrução (\"...porque tende a causar X\") " +
  "ou reformular como observação costuma produzir adesão mais inteligente.";

const TIP_EN =
  "Adding the reason behind the instruction (\"...because it tends to cause X\") " +
  "or rephrasing as an observation tends to produce smarter compliance.";

const TIP_ES =
  "Agregar el motivo de la instrucción (\"...porque tiende a causar X\") " +
  "o reformular como observación suele producir un cumplimiento más inteligente.";

// Simple heuristic: if the line starts with a PT verb, PT tip; ES, ES tip; otherwise EN
const PT_LINE_START = /^(use|utilize|adicione|implemente|verifique|valide|garanta|mantenha|evite|inclua|remova|aplique|siga|faça|crie|gere|produza|escreva|documente|teste|revise|priorize|prefira|assegure|certifique-se|considere|trate|formate|organize|estruture|otimize|minimize|maximize)/i;

function getTip(line: string, lang?: string): string {
  if (lang === "es") return TIP_ES;
  return PT_LINE_START.test(line) ? TIP_PT : TIP_EN;
}

/*=========================================
// Exported rule
=========================================*/

export const commandOverQuestion: Rule = {
  name: "command-over-question",
  description:
    "Instructions that command without explaining the purpose — the agent " +
    "complies mechanically instead of understanding intent and adapting",
  severity: "info",

  analyze(text: string, ctx: AnalysisContext): Diagnostic[] {
    const statements = ctx.statements;
    const diagnostics: Diagnostic[] = [];
    const lang = ctx.lang;

    for (const stmt of statements) {
      if (ALREADY_IMPERATIVE.test(stmt.text)) continue;
      if (HAS_SUGGESTIVE_TONE.test(stmt.text)) continue;
      if (HAS_PURPOSE.test(stmt.text)) continue;
      if (HAS_DASH_JUSTIFICATION.test(stmt.text)) continue;
      if (IS_CONFIGURATION.test(stmt.text)) continue;
      if (IS_PERSONA.test(stmt.text)) continue;
      if (HAS_SPECIFIC_COMPLEMENT.test(stmt.text)) continue;
      if (NEGATION_HAS_CONSEQUENCE.test(stmt.text)) continue;

      const ptMatch = stmt.text.match(PT_IMPERATIVE_STARTS);
      const enMatch = stmt.text.match(EN_IMPERATIVE_STARTS);
      const esMatch = stmt.text.match(ES_IMPERATIVE_STARTS);
      const ptNegMatch = stmt.text.match(PT_NEGATION_STARTS);
      const enNegMatch = stmt.text.match(EN_NEGATION_STARTS);
      const esNegMatch = stmt.text.match(ES_NEGATION_STARTS);
      const isCommand = ptMatch || enMatch || esMatch;
      const isNegation = ptNegMatch || enNegMatch || esNegMatch;

      if (isCommand || isNegation) {
        const highlight = isCommand
          ? (ptMatch || enMatch || esMatch)?.[0]
          : (ptNegMatch || enNegMatch || esNegMatch)?.[0];

        const reasonText = isNegation
          ? (lang === "en"
            ? "This instruction says what NOT to do, but not why. When " +
              "the agent understands the reason behind a restriction, it " +
              "can apply the principle even in situations the author didn't " +
              "foresee. Prohibitions without context produce mechanical " +
              "avoidance instead of understanding."
            : lang === "es"
            ? "Esta instrucción dice qué NO hacer, pero no por qué. Cuando " +
              "el agente entiende el motivo de una restricción, puede aplicar " +
              "el principio incluso en situaciones que el autor no previó. " +
              "Prohibiciones sin contexto producen evasión mecánica en vez " +
              "de comprensión."
            : "Essa instrução diz o que NÃO fazer, mas não por quê. Quando " +
              "o agente entende o motivo de uma restrição, ele pode aplicar " +
              "o princípio mesmo em situações que o autor não previu. " +
              "Proibições sem contexto produzem evitação mecânica em vez " +
              "de compreensão.")
          : (lang === "en"
            ? "This instruction says what to do, but not why. When " +
              "the agent understands the purpose, it can apply the principle " +
              "even in situations the author didn't foresee. Commands without " +
              "context produce mechanical compliance — the agent does what " +
              "it was told, not what makes sense."
            : lang === "es"
            ? "Esta instrucción dice qué hacer, pero no por qué. Cuando " +
              "el agente entiende el propósito, puede aplicar el principio " +
              "incluso en situaciones que el autor no previó. Comandos sin " +
              "contexto producen cumplimiento mecánico — el agente hace lo " +
              "que le dijeron, no lo que tiene sentido."
            : "Essa instrução diz o que fazer, mas não por quê. Quando " +
              "o agente entende o propósito, ele pode aplicar o princípio " +
              "mesmo em situações que o autor não previu. Comandos sem " +
              "contexto produzem adesão mecânica — o agente faz o que " +
              "mandaram, não o que faz sentido.");

        const suggestionText = isNegation
          ? (lang === "en"
            ? "Why should this be avoided? Adding the reason " +
              "('...because it tends to cause X') turns a prohibition " +
              "into understanding."
            : lang === "es"
            ? "¿Por qué debe evitarse esto? Agregar el motivo " +
              "('...porque tiende a causar X') transforma una prohibición " +
              "en comprensión."
            : "Por que isso deve ser evitado? Adicionar o motivo " +
              "('...porque tende a causar X') transforma uma proibição " +
              "em compreensão.")
          : (lang === "en"
            ? "What motivated this instruction? Adding the reason " +
              "('...because it tends to cause X') or rephrasing as " +
              "an observation gives the agent context to decide better."
            : lang === "es"
            ? "¿Qué motivó esta instrucción? Agregar el motivo " +
              "('...porque tiende a causar X') o reformular como " +
              "observación le da al agente contexto para decidir mejor."
            : "O que motivou essa instrução? Adicionar o motivo " +
              "('...porque tende a causar X') ou reformular como " +
              "observação dá ao agente contexto para decidir melhor.");

        diagnostics.push({
          rule: "command-over-question",
          severity: "info",
          line: stmt.line,
          original: stmt.text,
          highlight,
          reason: reasonText,
          suggestion: suggestionText,
          tip: getTip(stmt.text, lang),
        });
      }
    }

    return diagnostics;
  },
};
