/**
 * Regra: cognitive-overload
 *
 * Situação: muitas instruções competindo por atenção do agente. Na prática,
 * 3 a 5 instruções por bloco e no máximo 10 no total tendem a ser os limites
 * onde a eficácia se mantém. Acima disso, o retorno é negativo.
 *
 * Essa regra é global — analisa o documento inteiro, não linhas individuais.
 */

import type { AnalysisContext, Diagnostic, Rule } from "../models";

/*=========================================
// Thresholds
=========================================*/

const MAX_INSTRUCTIONS = 10;
const WARNING_INSTRUCTIONS = 6;
const MAX_CHARACTERS = 3000;
const WARNING_CHARACTERS = 2000;

// Prompts estruturados (workflows procedurais numerados ou prosa com seções
// rotuladas em negrito) toleram mais sentenças porque cada bloco é um chunk
// cognitivo explícito, não uma diretiva comportamental competindo por atenção.
const PROCEDURAL_MAX_INSTRUCTIONS = 25;
const PROCEDURAL_WARNING_INSTRUCTIONS = 16;

/*=========================================
// Deteccao de linha de persona
=========================================*/

const PERSONA_PATTERN = /^(você é|tu é|eu sou|you are|i am|act as|atue como|tú eres|usted es|eres un|actúa como)\b/i;

/*=========================================
// Deteccao de prompt estruturado
=========================================*/

// Linha que começa com número + ponto/parêntese — passo de workflow
const STEP_PATTERN = /^\s*\d+[.)]\s+\S/;

// Rótulo de seção em negrito markdown — `**O que carregar:**`, `**Sinal de rodada boa:**`
// Ancora a chunkificação cognitiva: cada rótulo é um bucket mental explícito,
// então sentenças sob o rótulo não competem com as de outros buckets do mesmo jeito
// que sentenças soltas competem entre si.
const BOLD_LABEL_PATTERN = /\*\*[^*\n]{2,60}:\*\*/g;

// Rótulos de ênfase genérica — **Important:**, **Critical:**, **Note:**, **Warning:**
// etc. — não indicam chunkificação estrutural: são "badges" de prioridade colados
// na frente de instruções soltas. Contar como seção estrutural infla o threshold
// e esconde cognitive-overload real.
const EMPHASIS_ONLY_LABEL = /^\*\*\s*(important|importante|critical|crítico|critico|note|nota|warning|advertencia|aviso|reminder|lembrete|essential|essencial|esencial|caution|cuidado|tip|dica|consejo|info|attention|atenção|atencao|atención|atencion|obs|observação|observacao)\s*:\*\*$/i;

/*=========================================
// Deteccao de framing declarativo
=========================================*/

// Sentenças do tipo "O X é Y" / "A X é Y" / "Esse X é Y" / "The X is Y" /
// "El X es Y" descrevem ou definem o alvo — são framing/setup, não diretivas
// ao agente. Aparecem tipicamente na intro de um workflow ("A pergunta do
// ciclo é...", "Esse workflow é o olho externo do sistema", "The goal is...")
// e inflam o count de instruções sem representar carga cognitiva competitiva.
//
// Conservador: só casa abertura com artigo/demonstrativo + NP curto (até 4
// tokens) + cópula. Não casa verbos de ação ("A regra detecta X"), nem
// sentenças com modais ("O agente deve X" — isso é diretiva legítima).
// Usamos classe explícita com acentos latinos em vez de \b, porque \b não
// delimita palavra em torno de caracteres acentuados (é/são) em regex JS.
const DECLARATIVE_FRAMING_PATTERN =
  /^(o|a|os|as|esse|essa|esses|essas|the|this|that|these|those|el|la|los|las|ese|esa|eso|esos|esas)\s+[\wáéíóúâêîôûãõàçñ-]+(\s+[\wáéíóúâêîôûãõàçñ-]+){0,3}\s+(é|são|is|are|es|son|era|eram|was|were)(\s|,|\.|:|!|\?|$)/i;

function isDeclarativeFraming(text: string): boolean {
  // Strip prefixos markdown comuns (blockquote, bullets, bold) antes do match,
  // já que frames aparecem com frequência em workflows como `> **Esse X é Y**`
  // ou `- A Y é Z`.
  const stripped = text
    .trim()
    .replace(/^(?:>\s*)+/, "")
    .replace(/^(?:[-*+]\s+)/, "")
    .replace(/^\*+/, "")
    .replace(/^_+/, "")
    .trim();
  return DECLARATIVE_FRAMING_PATTERN.test(stripped);
}

// Um texto é "estruturado" quando tem procedural numerado OU seções rotuladas
// em negrito o suficiente pra indicar chunkificação deliberada.
function isStructuredPrompt(text: string): boolean {
  // Caso 1: parágrafo contínuo com "1. ... 2. ... 3. ..." inline
  const inlineSteps = (text.match(/(?:^|[\s.])\d+\.\s+[A-ZÁÉÍÓÚÂÊÎÔÛÀÇ]/g) || []).length;
  if (inlineSteps >= 4) return true;

  // Caso 2: linhas separadas, maioria começando com "N." ou "N)"
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

  // Caso 3: prosa estruturada com >=3 rótulos de seção em negrito
  // (workflows reformados pós-2026-04, tutoriais chunkificados, system prompts
  // bem organizados). Cada rótulo funciona como divisor cognitivo explícito.
  // Exclui rótulos de ênfase genérica (**Important:**, **Note:** etc.) que
  // não representam chunkificação real — só badges de prioridade.
  const allBoldLabels = text.match(BOLD_LABEL_PATTERN) || [];
  const structuralLabels = allBoldLabels.filter((l) => !EMPHASIS_ONLY_LABEL.test(l));
  if (structuralLabels.length >= 3) return true;

  return false;
}

/*=========================================
// Contagem de instrucoes
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

  // Conta sentencas dentro de linhas longas (blocos de texto corrido)
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

  // Usa o maior entre contagem por linha e por sentenca
  return Math.max(lineCount, sentenceCount);
}

/*=========================================
// Regra exportada
=========================================*/

export const cognitiveOverload: Rule = {
  name: "cognitive-overload",
  description:
    "Muitas instruções competindo por atenção, além dos limites onde a eficácia se mantém",
  severity: "warning",

  analyze(text: string, ctx: AnalysisContext): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    const instructionCount = countInstructions(text);
    const charCount = text.length;
    const lang = ctx.lang;
    const structured = isStructuredPrompt(text);
    const maxInstructions = structured ? PROCEDURAL_MAX_INSTRUCTIONS : MAX_INSTRUCTIONS;
    const warningInstructions = structured ? PROCEDURAL_WARNING_INSTRUCTIONS : WARNING_INSTRUCTIONS;

    // Checa quantidade de instruções
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

    // Checa tamanho total
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
