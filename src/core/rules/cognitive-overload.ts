/**
 * Rule: cognitive-overload
 *
 * Situation: too many instructions competing for the agent's attention.
 * In practice, 3-5 instructions per block and at most 10 in total tend
 * to be the limits where effectiveness holds. Beyond that, the return
 * is negative.
 *
 * This rule is global — it analyzes the whole document, not individual lines.
 */

import type { AnalysisContext, Diagnostic, Rule } from "../models";

/*=========================================
// Thresholds
=========================================*/

const MAX_INSTRUCTIONS = 10;
const WARNING_INSTRUCTIONS = 6;
const MAX_CHARACTERS = 3000;
const WARNING_CHARACTERS = 2000;

// Structured prompts (numbered procedural workflows or prose with
// bold-labeled sections) tolerate more sentences because each block
// is an explicit cognitive chunk, not a behavioral directive
// competing for attention.
const PROCEDURAL_MAX_INSTRUCTIONS = 25;
const PROCEDURAL_WARNING_INSTRUCTIONS = 16;

/*=========================================
// Persona-line detection
=========================================*/

const PERSONA_PATTERN = /^(você é|tu é|eu sou|you are|i am|act as|atue como|tú eres|usted es|eres un|actúa como)\b/i;

/*=========================================
// Structured-prompt detection
=========================================*/

// Line starting with a number + period/paren — workflow step
const STEP_PATTERN = /^\s*\d+[.)]\s+\S/;

// Markdown bold section label — `**What to load:**`, `**Good-round signal:**`
// Anchors cognitive chunking: each label is an explicit mental bucket,
// so sentences under the label don't compete with sentences under other
// buckets the way loose sentences compete with each other.
const BOLD_LABEL_PATTERN = /\*\*[^*\n]{2,60}:\*\*/g;

// Generic emphasis labels — **Important:**, **Critical:**, **Note:**,
// **Warning:**, etc. — don't indicate structural chunking: they're
// priority "badges" stuck in front of loose instructions. Counting
// them as structural sections inflates the threshold and hides real
// cognitive-overload.
const EMPHASIS_ONLY_LABEL = /^\*\*\s*(important|importante|critical|crítico|critico|note|nota|warning|advertencia|aviso|reminder|lembrete|essential|essencial|esencial|caution|cuidado|tip|dica|consejo|info|attention|atenção|atencao|atención|atencion|obs|observação|observacao)\s*:\*\*$/i;

/*=========================================
// Declarative-framing detection
=========================================*/

// Sentences like "O X é Y" / "A X é Y" / "Esse X é Y" / "The X is Y" /
// "El X es Y" describe or define the target — they're framing/setup,
// not directives to the agent. They typically show up at the top of a
// workflow ("The cycle question is...", "This workflow is the system's
// outer eye", "The goal is...") and inflate the instruction count
// without representing competitive cognitive load.
//
// Conservative: only matches an opening with article/demonstrative +
// short NP (up to 4 tokens) + copula. Doesn't match action verbs
// ("The rule detects X"), nor sentences with modals ("The agent must X"
// — that's a legitimate directive).
// We use an explicit class with Latin accents instead of \b, because \b
// doesn't delimit words around accented characters (é/são) in JS regex.
const DECLARATIVE_FRAMING_PATTERN =
  /^(o|a|os|as|esse|essa|esses|essas|the|this|that|these|those|el|la|los|las|ese|esa|eso|esos|esas)\s+[\wáéíóúâêîôûãõàçñ-]+(\s+[\wáéíóúâêîôûãõàçñ-]+){0,3}\s+(é|são|is|are|es|son|era|eram|was|were)(\s|,|\.|:|!|\?|$)/i;

function isDeclarativeFraming(text: string): boolean {
  // Strip common markdown prefixes (blockquote, bullets, bold) before
  // matching, since frames often show up in workflows like `> **Esse X é Y**`
  // or `- A Y é Z`.
  const stripped = text
    .trim()
    .replace(/^(?:>\s*)+/, "")
    .replace(/^(?:[-*+]\s+)/, "")
    .replace(/^\*+/, "")
    .replace(/^_+/, "")
    .trim();
  return DECLARATIVE_FRAMING_PATTERN.test(stripped);
}

// A text counts as "structured" when it has either numbered procedural
// steps OR bold-labeled sections in enough quantity to indicate deliberate
// chunking.
function isStructuredPrompt(text: string): boolean {
  // Case 1: continuous paragraph with inline "1. ... 2. ... 3. ..."
  const inlineSteps = (text.match(/(?:^|[\s.])\d+\.\s+[A-ZÁÉÍÓÚÂÊÎÔÛÀÇ]/g) || []).length;
  if (inlineSteps >= 4) return true;

  // Case 2: separate lines, most starting with "N." or "N)"
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const meaningful = lines.filter(
    (l) =>
      !l.startsWith("#") &&
      !l.startsWith("//") &&
      !l.startsWith("---") &&
      !PERSONA_PATTERN.test(l),
  );
  if (meaningful.length >= 4) {
    const steps = meaningful.filter((l) => STEP_PATTERN.test(l)).length;
    if (steps / meaningful.length >= 0.6) return true;
  }

  // Case 3: structured prose with >=3 bold section labels
  // (reformatted workflows post-2026-04, chunked tutorials, well-organized
  // system prompts). Each label acts as an explicit cognitive divider.
  // Excludes generic emphasis labels (**Important:**, **Note:**, etc.)
  // that don't represent real chunking — just priority badges.
  const allBoldLabels = text.match(BOLD_LABEL_PATTERN) || [];
  const structuralLabels = allBoldLabels.filter((l) => !EMPHASIS_ONLY_LABEL.test(l));
  if (structuralLabels.length >= 3) return true;

  return false;
}

/*=========================================
// Instruction counting
=========================================*/

function countInstructions(text: string): number {
  const lines = text.split("\n");
  let lineCount = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("#")) continue;
    if (trimmed.startsWith("//")) continue;
    if (trimmed.startsWith("---")) continue;
    if (PERSONA_PATTERN.test(trimmed)) continue;
    if (isDeclarativeFraming(trimmed)) continue;
    lineCount++;
  }

  // Counts sentences inside long lines (continuous prose blocks)
  let sentenceCount = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("//") || trimmed.startsWith("---")) continue;
    const sentences = trimmed
      .split(/(?<=[.!?])\s+/)
      .filter((s) => s.trim().length > 10 && !isDeclarativeFraming(s));
    if (sentences.length > 1) {
      sentenceCount += sentences.length;
    }
  }

  // Uses the larger of per-line and per-sentence counts
  return Math.max(lineCount, sentenceCount);
}

/*=========================================
// Exported rule
=========================================*/

export const cognitiveOverload: Rule = {
  name: "cognitive-overload",
  description:
    "Too many instructions competing for attention, beyond the limits where effectiveness holds",
  severity: "warning",

  analyze(text: string, ctx: AnalysisContext): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    const instructionCount = countInstructions(text);
    const charCount = text.length;
    const lang = ctx.lang;
    const structured = isStructuredPrompt(text);
    const maxInstructions = structured ? PROCEDURAL_MAX_INSTRUCTIONS : MAX_INSTRUCTIONS;
    const warningInstructions = structured ? PROCEDURAL_WARNING_INSTRUCTIONS : WARNING_INSTRUCTIONS;

    // Check instruction count
    if (instructionCount > maxInstructions) {
      diagnostics.push({
        rule: "cognitive-overload",
        severity: "error",
        original: lang === "en"
          ? `${instructionCount} instructions detected`
          : lang === "es"
            ? `${instructionCount} instrucciones detectadas`
            : `${instructionCount} instruções detectadas`,
        reason: lang === "en"
          ? `The prompt contains ${instructionCount} instructions. In practice, ` +
            `above ${maxInstructions} instructions the return tends to be ` +
            "negative — the agent doesn't become more disciplined, it becomes more confused. " +
            "Each additional instruction competes for attention, and the excess causes " +
            "paralysis or inconsistent behavior."
          : lang === "es"
            ? `El prompt contiene ${instructionCount} instrucciones. En la práctica, ` +
              `por encima de ${maxInstructions} instrucciones el retorno tiende a ser ` +
              "negativo — el agente no se vuelve más disciplinado, se vuelve más confuso. " +
              "Cada instrucción adicional compite por la atención, y el exceso causa " +
              "parálisis o comportamiento inconsistente."
            : `O prompt contém ${instructionCount} instruções. Na prática, ` +
              `acima de ${maxInstructions} instruções o retorno tende a ser ` +
              "negativo — o agente não fica mais disciplinado, fica mais confuso. " +
              "Cada instrução adicional compete por atenção, e o excesso causa " +
              "paralisia ou comportamento inconsistente.",
        suggestion: lang === "en"
          ? "If each instruction were removed one by one, which would be missed? " +
            "Those that wouldn't change the agent's behavior are probably " +
            "competing for attention with those that do."
          : lang === "es"
            ? "Si cada instrucción se eliminara una por una, ¿cuáles harían " +
              "falta? Las que no cambiarían el comportamiento del agente " +
              "probablemente están compitiendo por la atención con las que sí lo hacen."
            : `Se cada instrução fosse removida uma a uma, quais fariam ` +
              "falta? As que não mudariam o comportamento do agente " +
              "provavelmente estão competindo por atenção com as que mudam.",
      });
    } else if (instructionCount > warningInstructions) {
      diagnostics.push({
        rule: "cognitive-overload",
        severity: "warning",
        original: lang === "en"
          ? `${instructionCount} instructions detected`
          : lang === "es"
            ? `${instructionCount} instrucciones detectadas`
            : `${instructionCount} instruções detectadas`,
        reason: lang === "en"
          ? `The prompt contains ${instructionCount} instructions. The limit where ` +
            `effectiveness tends to hold is ${maxInstructions}, but ` +
            "the ideal range tends to be 3 to 5 instructions per block. " +
            "The more instructions, the higher the chance of attention competition."
          : lang === "es"
            ? `El prompt contiene ${instructionCount} instrucciones. El límite donde ` +
              `la eficacia tiende a mantenerse es de ${maxInstructions}, pero ` +
              "el rango ideal tiende a ser entre 3 y 5 instrucciones por bloque. " +
              "Cuantas más instrucciones, mayor la probabilidad de competencia por la atención."
            : `O prompt contém ${instructionCount} instruções. O limite onde ` +
              `a eficácia costuma se manter é de ${maxInstructions}, mas ` +
              "a faixa ideal tende a ser entre 3 e 5 instruções por bloco. " +
              "Quanto mais instruções, maior a chance de competição por atenção.",
        suggestion: lang === "en"
          ? "Are all these instructions essential? Those that repeat " +
            "default behavior or are too generic tend to be " +
            "good candidates for removal."
          : lang === "es"
            ? "¿Son esenciales todas estas instrucciones? Las que repiten " +
              "comportamiento predeterminado o son demasiado genéricas suelen ser " +
              "buenas candidatas para eliminar."
            : "Todas essas instruções são essenciais? As que repetem " +
              "comportamento padrão ou são genéricas demais costumam ser " +
              "boas candidatas a remoção.",
      });
    }

    // Check total length
    if (charCount > MAX_CHARACTERS) {
      diagnostics.push({
        rule: "cognitive-overload",
        severity: "warning",
        original: lang === "en"
          ? `${charCount} characters total`
          : lang === "es"
            ? `${charCount} caracteres en total`
            : `${charCount} caracteres no total`,
        reason: lang === "en"
          ? `The prompt has ${charCount} characters. Very long prompts ` +
            "tend to dilute the agent's attention — the most important " +
            "instructions compete with text that could be more concise."
          : lang === "es"
            ? `El prompt tiene ${charCount} caracteres. Los prompts muy largos ` +
              "tienden a diluir la atención del agente — las instrucciones más " +
              "importantes compiten con texto que podría ser más conciso."
            : `O prompt tem ${charCount} caracteres. Prompts muito longos ` +
              "tendem a diluir a atenção do agente — as instruções mais " +
              "importantes competem com texto que poderia ser mais conciso.",
        suggestion: lang === "en"
          ? "Does the agent need all this text to fulfill the purpose? " +
            "Details it could infer from context tend to " +
            "dilute the attention of instructions that really matter."
          : lang === "es"
            ? "¿El agente necesita todo este texto para cumplir el propósito? " +
              "Los detalles que podría inferir del contexto tienden a " +
              "diluir la atención de las instrucciones que realmente importan."
            : "O agente precisa de todo esse texto para cumprir o propósito? " +
              "Detalhes que ele conseguiria inferir do contexto tendem a " +
              "diluir a atenção das instruções que realmente importam.",
      });
    } else if (charCount > WARNING_CHARACTERS) {
      diagnostics.push({
        rule: "cognitive-overload",
        severity: "info",
        original: lang === "en"
          ? `${charCount} characters total`
          : lang === "es"
            ? `${charCount} caracteres en total`
            : `${charCount} caracteres no total`,
        reason: lang === "en"
          ? `The prompt has ${charCount} characters. Not critical yet, ` +
            "but worth considering if all the text is necessary."
          : lang === "es"
            ? `El prompt tiene ${charCount} caracteres. Aún no es crítico, ` +
              "pero vale la pena considerar si todo el texto es necesario."
            : `O prompt tem ${charCount} caracteres. Ainda não é crítico, ` +
              "mas vale considerar se todo o texto é necessário.",
        suggestion: lang === "en"
          ? "Are there filler phrases or explanations the agent " +
            "doesn't need to fulfill the purpose? Each phrase that doesn't " +
            "add value competes with those that do."
          : lang === "es"
            ? "¿Hay frases de relleno o explicaciones que el agente " +
              "no necesita para cumplir el propósito? Cada frase que no " +
              "aporta valor compite con las que sí lo hacen."
            : "Há frases de preenchimento ou explicações que o agente " +
              "não precisa para cumprir o propósito? Cada frase que não " +
              "agrega compete com as que agregam.",
      });
    }

    return diagnostics;
  },
};
