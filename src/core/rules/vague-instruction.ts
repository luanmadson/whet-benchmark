/**
 * Rule: vague-instruction
 *
 * Situation: instructions too generic to have real effect. "Follow best
 * practices", "Be professional", "Use common sense" — the model
 * interprets it however, which in practice means the instruction
 * doesn't change anything.
 */

import type { AnalysisContext, Diagnostic, Rule } from "../models";

/*=========================================
// Vague-instruction patterns
=========================================*/

const VAGUE_PATTERNS: Array<{
  pattern: RegExp;
  example: string;
  betterApproach: string;
}> = [
  {
    pattern: /\bsiga? (as |)(boas práticas)\b/i,
    example: "siga boas práticas",
    betterApproach:
      "especificar qual prática concreta espera — por exemplo, " +
      "'tende a funcionar melhor quando funções têm uma única responsabilidade'",
  },
  {
    pattern: /\bfollow (best practices)\b/i,
    example: "follow best practices",
    betterApproach:
      "specify which concrete practice you expect — e.g., " +
      "'tends to work better when functions have a single responsibility'",
  },
  {
    pattern: /\b(siga|sigue) (las |)(buenas prácticas)\b/i,
    example: "sigue buenas prácticas",
    betterApproach:
      "especificar qué práctica concreta espera — por ejemplo, " +
      "'tiende a funcionar mejor cuando las funciones tienen una sola responsabilidad'",
  },
  {
    pattern: /\bseja? profissional\b/i,
    example: "seja profissional",
    betterApproach:
      "descrever o tom concreto desejado — por exemplo, " +
      "'um tom direto e respeitoso costuma funcionar bem neste contexto'",
  },
  {
    pattern: /\bsea profesional\b/i,
    example: "sea profesional",
    betterApproach:
      "describir el tono concreto deseado — por ejemplo, " +
      "'un tono directo y respetuoso suele funcionar bien en este contexto'",
  },
  {
    pattern: /\b(use?|tenha?) bom senso\b/i,
    example: "use bom senso",
    betterApproach:
      "descrever o comportamento concreto esperado — 'bom senso' é " +
      "subjetivo demais para orientar um agente de forma previsível",
  },
  {
    pattern: /\buse common sense\b/i,
    example: "use common sense",
    betterApproach:
      "describe the expected behavior concretely — 'common sense' is " +
      "too subjective to guide an agent predictably",
  },
  {
    pattern: /\b(use?|tenga?) sentido común\b/i,
    example: "use sentido común",
    betterApproach:
      "describir el comportamiento concreto esperado — 'sentido común' es " +
      "demasiado subjetivo para orientar un agente de forma predecible",
  },
  {
    pattern: /\bseja? (criativ[oa]|creative)\b/i,
    example: "seja criativo",
    betterApproach:
      "descrever o tipo de criatividade esperado — por exemplo, " +
      "'oferecer alternativas com abordagens diferentes pode ser mais útil'",
  },
  {
    pattern: /\bsea creativ[oa]\b/i,
    example: "sea creativo",
    betterApproach:
      "describir el tipo de creatividad esperado — por ejemplo, " +
      "'ofrecer alternativas con enfoques diferentes puede ser más útil'",
  },
  {
    pattern: /\b(produza?|gere?) (conteúdo|respostas?) de qualidade\b/i,
    example: "produza conteúdo de qualidade",
    betterApproach:
      "definir o que 'qualidade' significa neste contexto — " +
      "concisão? profundidade? referências? Sem critério concreto, " +
      "o modelo interpreta à sua maneira",
  },
  {
    pattern: /\b(produzca?|genere?) (contenido|respuestas?) de calidad\b/i,
    example: "produzca contenido de calidad",
    betterApproach:
      "definir qué significa 'calidad' en este contexto — " +
      "¿concisión? ¿profundidad? ¿referencias? Sin criterio concreto, " +
      "el modelo lo interpreta a su manera",
  },
  {
    pattern: /\b(be|act) professional(ly)?\b/i,
    example: "be professional",
    betterApproach:
      "describe the specific tone you want — e.g., " +
      "'a direct and respectful tone tends to work well here'",
  },
  {
    pattern: /\b(actúe?|compórtese) (de manera |de forma |)profesional(mente)?\b/i,
    example: "actúe de manera profesional",
    betterApproach:
      "describir el tono concreto deseado — por ejemplo, " +
      "'un tono directo y respetuoso suele funcionar bien en este contexto'",
  },
  {
    pattern: /\bproduce (high[- ]?quality|quality)\b/i,
    example: "produce quality content",
    betterApproach:
      "define what 'quality' means in this context — " +
      "conciseness? depth? references? Without concrete criteria, " +
      "the model interprets it however it sees fit",
  },
  {
    pattern: /\bseja? (cuidados[oa]|careful)\b/i,
    example: "seja cuidadoso",
    betterApproach:
      "especificar com o quê ser cuidadoso — por exemplo, " +
      "'preservar o código existente tende a ser a abordagem mais segura'",
  },
  {
    pattern: /\bsea cuidados[oa]\b/i,
    example: "sea cuidadoso",
    betterApproach:
      "especificar con qué ser cuidadoso — por ejemplo, " +
      "'preservar el código existente tiende a ser el enfoque más seguro'",
  },
  {
    pattern: /\bbe careful\b/i,
    example: "be careful",
    betterApproach:
      "specify what to be careful about — e.g., " +
      "'preserving existing code tends to be the safer approach'",
  },
  {
    pattern: /\bseja? (eficiente|efficient)\b/i,
    example: "seja eficiente",
    betterApproach:
      "descrever o que eficiência significa aqui — menos tokens? " +
      "menos etapas? resposta mais curta? O termo é vago demais sozinho",
  },
  {
    pattern: /\bsea eficiente\b/i,
    example: "sea eficiente",
    betterApproach:
      "describir qué significa eficiencia aquí — ¿menos tokens? " +
      "¿menos pasos? ¿respuesta más corta? El término es demasiado vago solo",
  },
  {
    pattern: /\bbe efficient\b/i,
    example: "be efficient",
    betterApproach:
      "describe what efficiency means here — fewer tokens? " +
      "fewer steps? shorter response? The term is too vague on its own",
  },
  {
    pattern: /\b(garanta?|ensure) (a |)(qualidade|quality)\b/i,
    example: "garanta a qualidade",
    betterApproach:
      "definir critérios concretos de qualidade para este contexto específico",
  },
  {
    pattern: /\b(garantice?|asegure?) (la |)(calidad)\b/i,
    example: "garantice la calidad",
    betterApproach:
      "definir criterios concretos de calidad para este contexto específico",
  },
  {
    pattern: /\buse (good |your )?(judgment|judgement)\b/i,
    example: "use your judgment",
    betterApproach:
      "describe the decision criteria — e.g., 'when in doubt, " +
      "prefer the simpler approach' gives concrete guidance",
  },
  {
    pattern: /\b(use?|aplique?) (su |)(buen |)(juicio|criterio)\b/i,
    example: "use su juicio",
    betterApproach:
      "describir los criterios de decisión — por ejemplo, 'en caso de duda, " +
      "prefiera el enfoque más simple' da una orientación concreta",
  },
  {
    pattern: /\bbe (smart|intelligent|thoughtful)\b/i,
    example: "be smart",
    betterApproach:
      "describe the type of thinking you expect — e.g., 'consider " +
      "trade-offs before recommending' or 'flag assumptions explicitly'",
  },
  {
    pattern: /\bsea (inteligente|list[oa])\b/i,
    example: "sea inteligente",
    betterApproach:
      "describir el tipo de razonamiento esperado — por ejemplo, " +
      "'evalúe trade-offs antes de recomendar' o 'explicite las premisas'",
  },
  {
    pattern: /\b(write|produce|create) (good|great|excellent)\b/i,
    example: "write good code",
    betterApproach:
      "define what 'good' means — e.g., 'prefer readability over " +
      "cleverness' or 'functions should do one thing'",
  },
  {
    pattern: /\b(escriba?|produzca?|cree?) (un |)(buen|buenos?|buena?s?)\b/i,
    example: "escriba un buen código",
    betterApproach:
      "definir qué significa 'bueno' — por ejemplo, 'prefiera legibilidad " +
      "sobre soluciones ingeniosas' o 'funciones con responsabilidad única'",
  },
  {
    pattern: /\b(be|act) (like |as )?(an? )?(expert|specialist|senior)\b/i,
    example: "act as an expert",
    betterApproach:
      "describe the expertise you need — e.g., 'focus on performance " +
      "implications' or 'consider security edge cases'",
  },
  {
    pattern: /\b(actúe?|compórtese) como (un |)(experto|especialista|senior|sénior)\b/i,
    example: "actúe como un experto",
    betterApproach:
      "describir la expertise necesaria — por ejemplo, 'enfóquese en las " +
      "implicaciones de rendimiento' o 'considere casos extremos de seguridad'",
  },
  {
    pattern: /\bpay attention\b/i,
    example: "pay attention to details",
    betterApproach:
      "specify *which* details matter — e.g., 'verify that import " +
      "paths match the actual file structure'",
  },
  {
    pattern: /\bponga? atención\b/i,
    example: "ponga atención a los detalles",
    betterApproach:
      "especificar *cuáles* detalles importan — por ejemplo, 'verifique " +
      "que las rutas de import correspondan a la estructura real de archivos'",
  },
  {
    pattern: /\bpreste? atención\b/i,
    example: "preste atención a los detalles",
    betterApproach:
      "especificar *cuáles* detalles importan — por ejemplo, 'verifique " +
      "que las rutas de import correspondan a la estructura real de archivos'",
  },
  {
    pattern: /\b(be|stay) (consistent|coherent)\b/i,
    example: "be consistent",
    betterApproach:
      "specify consistent *with what* — e.g., 'match the naming " +
      "conventions already used in the codebase'",
  },
  {
    pattern: /\bsea (consistente|coherente)\b/i,
    example: "sea consistente",
    betterApproach:
      "especificar consistente *con qué* — por ejemplo, 'siga las convenciones " +
      "de nomenclatura ya usadas en el codebase'",
  },
  {
    pattern: /\bseja? (inteligente|esperto)\b/i,
    example: "seja inteligente",
    betterApproach:
      "descrever o tipo de raciocínio esperado — por exemplo, " +
      "'avalie trade-offs antes de recomendar' ou 'explicite premissas'",
  },
  {
    pattern: /\b(escreva?|produza?|crie?) (um |)(bom|bons|boa|boas)\b/i,
    example: "escreva um bom código",
    betterApproach:
      "definir o que 'bom' significa — por exemplo, 'prefira legibilidade " +
      "a soluções engenhosas' ou 'funções com responsabilidade única'",
  },
  {
    pattern: /\bseja? (bom|boa)\b/i,
    example: "seja bom",
    betterApproach:
      "descrever o comportamento concreto esperado — 'bom' " +
      "sozinho não orienta o agente de forma previsível",
  },
  {
    pattern: /\bsea buen[oa]\b/i,
    example: "sea bueno",
    betterApproach:
      "describir el comportamiento concreto esperado — 'bueno' " +
      "solo no orienta al agente de forma predecible",
  },
  {
    pattern: /\bbe good\b/i,
    example: "be good",
    betterApproach:
      "describe the specific behavior you expect — 'good' " +
      "alone doesn't guide the agent predictably",
  },
  {
    pattern: /\bd[êe]? (bom|bons|boa|boas) (conselhos?|dicas?|orientações?|sugestões?)\b/i,
    example: "dê bons conselhos",
    betterApproach:
      "descrever o tipo de orientação esperada — por exemplo, " +
      "'priorize recomendações acionáveis e baseadas em evidência'",
  },
  {
    pattern: /\bd[ée]? (buenos?|buenas?) (consejos?|sugerencias?|orientación|orientaciones)\b/i,
    example: "dé buenos consejos",
    betterApproach:
      "describir el tipo de orientación esperada — por ejemplo, " +
      "'priorice recomendaciones accionables y basadas en evidencia'",
  },
  {
    pattern: /\bgive good (advice|tips|suggestions?|guidance)\b/i,
    example: "give good advice",
    betterApproach:
      "describe the type of guidance expected — e.g., " +
      "'prioritize actionable, evidence-based recommendations'",
  },
  {
    pattern: /\b(aja?|comporte-se) como (um |)(expert|especialista|senior|sênior)\b/i,
    example: "aja como um especialista",
    betterApproach:
      "descrever a expertise necessária — por exemplo, 'foque nas " +
      "implicações de performance' ou 'considere edge cases de segurança'",
  },
  {
    pattern: /\bpreste? atenção\b/i,
    example: "preste atenção aos detalhes",
    betterApproach:
      "especificar *quais* detalhes importam — por exemplo, 'verifique " +
      "que os paths de import correspondem à estrutura real de arquivos'",
  },
  // Urgência artificial (PT)
  {
    pattern: /\b(isso é (extremamente|muito) importante|a qualidade .{0,20} crucial|não (há|existe) margem para (erro|imprecisão)|precisa ser (perfeita?|impecável|impecáveis)|é absolutamente crucial)\b/i,
    example: "isso é extremamente importante",
    betterApproach:
      "descrever *o que* é importante e *por quê* — por exemplo, " +
      "'erros em datas comprometem a credibilidade junto ao leitor' " +
      "orienta melhor do que declarar urgência genérica",
  },
  // Urgência artificial (EN)
  {
    pattern: /\b(this is (extremely|very|critically) important|quality .{0,20} crucial|no (room|margin) for (error|mistakes?)|needs? to be (perfect|flawless|impeccable)|is absolutely (crucial|critical|essential))\b/i,
    example: "this is extremely important",
    betterApproach:
      "describe *what* matters and *why* — e.g., " +
      "'date errors compromise credibility with the reader' " +
      "guides better than declaring generic urgency",
  },
  // Urgencia artificial (ES)
  {
    pattern: /\b(esto es (extremadamente|muy) importante|la calidad .{0,20} crucial|no hay margen (de|para) (error|errores|imprecisión)|necesita ser (perfect[oa]|impecable)|es absolutamente (crucial|crítico|esencial))\b/i,
    example: "esto es extremadamente importante",
    betterApproach:
      "describir *qué* es importante y *por qué* — por ejemplo, " +
      "'errores en fechas comprometen la credibilidad ante el lector' " +
      "orienta mejor que declarar urgencia genérica",
  },
];

/*=========================================
// Exported rule
=========================================*/

export const vagueInstruction: Rule = {
  name: "vague-instruction",
  description:
    "Instructions too generic to have real effect — the model interprets however it wants",
  severity: "info",

  analyze(text: string, ctx: AnalysisContext): Diagnostic[] {
    const statements = ctx.statements;
    const diagnostics: Diagnostic[] = [];
    const lang = ctx.lang;

    for (const stmt of statements) {
      for (const { pattern, example, betterApproach } of VAGUE_PATTERNS) {
        const match = stmt.text.match(pattern);
        if (match) {
          diagnostics.push({
            rule: "vague-instruction",
            severity: "info",
            line: stmt.line,
            original: stmt.text,
            highlight: match[0],
            reason: lang === "en"
              ? `Instructions like "${example}" are too generic to have ` +
                "a predictable effect. The model interprets them however it " +
                "sees fit, which in practice means the instruction doesn't " +
                "change behavior reliably."
              : lang === "es"
              ? `Instrucciones como "${example}" son demasiado genéricas para tener ` +
                "un efecto predecible. El modelo las interpreta como quiera, lo que " +
                "en la práctica significa que la instrucción no cambia el comportamiento " +
                "de forma confiable."
              : `Instruções como "${example}" são genéricas demais para ter ` +
                "efeito previsível. O modelo interpreta como quiser, o que " +
                "na prática significa que a instrução não muda o comportamento " +
                "de forma confiável.",
            suggestion: lang === "en"
              ? `An approach that tends to work better: ${betterApproach}.`
              : lang === "es"
              ? `Un enfoque que suele funcionar mejor: ${betterApproach}.`
              : `Uma abordagem que costuma funcionar melhor: ${betterApproach}.`,
          });
          break;
        }
      }
    }

    return diagnostics;
  },
};
