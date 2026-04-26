/**
 * Rule: unresolved-reference
 *
 * Situation: instructions that point to external artifacts not provided
 * in the LLM's context — "follow the attached template", "use the
 * structure of the reference document", "per Appendix B". The model
 * doesn't have access to those artifacts, and the instruction degrades
 * silently.
 */

import type { AnalysisContext, Diagnostic, Rule } from "../models";

/*=========================================
// External reference patterns
=========================================*/

const REFERENCE_PATTERNS: Array<{
  pattern: RegExp;
  label: string;
}> = [
  // EN patterns
  { pattern: /\b(follow|use|refer to|see|check|consult|apply) the (attached|enclosed|provided) (document|file|template|guide|manual|spreadsheet|pdf|image)\b/i, label: "attached document" },
  { pattern: /\b(as (described|outlined|specified|detailed|shown) in) the (attached|enclosed|provided|accompanying)\b/i, label: "as described in attached" },
  { pattern: /\b(refer to|see|check|consult) (appendix|annex|exhibit|attachment|addendum) [A-Z0-9]/i, label: "appendix reference" },
  { pattern: /\b(follow|use|apply) the (structure|format|layout|style) (from|of|in) the (reference|attached|provided|sample) (document|file|template)\b/i, label: "reference document structure" },
  { pattern: /\b(according to|based on|per) the (attached|enclosed|provided|accompanying) (guidelines?|instructions?|specifications?|requirements?)\b/i, label: "attached guidelines" },
  { pattern: /\bin the (attached|enclosed|accompanying) (file|document|spreadsheet|pdf)\b/i, label: "in the attached file" },
  { pattern: /\b(style guide|brand guide|design system) (attached|provided|enclosed)\b/i, label: "attached guide" },
  { pattern: /\b(template|example|sample) (attached|provided|enclosed|below)\b(?![\s\S]{0,50}\b(```|---|\|))/i, label: "attached template" },

  // PT patterns
  { pattern: /\b(siga?|use?|consulte?|veja?|confira?) o (template|modelo|documento|arquivo|guia|manual|planilha|pdf) (em anexo|anexo|anexado|fornecido|encaminhado)\b/i, label: "documento em anexo" },
  { pattern: /\b(conforme|segundo|de acordo com) o (anexo|apêndice|documento anexo|arquivo fornecido|material encaminhado)\b/i, label: "conforme anexo" },
  { pattern: /\b(veja?|consulte?|confira?) (o |)(apêndice|anexo|adendo) [A-Z0-9]/i, label: "referência a apêndice" },
  { pattern: /\b(siga?|use?|aplique?) a (estrutura|formato|layout|estilo) (do|da|de) (documento|arquivo|template|modelo) (de referência|fornecido|anexo|em anexo)\b/i, label: "estrutura de documento de referência" },
  { pattern: /\b(no |)(documento|arquivo|planilha|pdf) (em anexo|anexo|anexado|fornecido)\b/i, label: "no documento em anexo" },

  // ES patterns
  { pattern: /\b(siga?|sigue|use?|usa|consulte?|consulta|vea?|mira) el (template|modelo|documento|archivo|guía|manual|planilla|pdf|imagen) (adjunto|anexo|proporcionado|enviado|incluido)\b/i, label: "documento adjunto" },
  { pattern: /\b(según|conforme|de acuerdo con) el (anexo|apéndice|documento adjunto|archivo proporcionado|material enviado|modelo adjunto)\b/i, label: "según anexo" },
  { pattern: /\b(véase|vea?|consulte?) (el |)(apéndice|anexo|adenda) [A-Z0-9]/i, label: "referencia a apéndice" },
  { pattern: /\bver anexo [A-Z0-9]/i, label: "referencia a apéndice" },
  { pattern: /\bconsulte el anexo\b/i, label: "referencia a apéndice" },
  { pattern: /\b(según|conforme) la plantilla\b/i, label: "según plantilla" },
  { pattern: /\bde acuerdo con el modelo adjunto\b/i, label: "según modelo adjunto" },
  { pattern: /\bcomo se indica en el documento\b/i, label: "como se indica en documento" },
  { pattern: /\b(siga?|use?|aplique?) la (estructura|formato|estilo) (del|de el|de la|del) (documento|archivo|plantilla|modelo) (de referencia|proporcionado|adjunto|anexo)\b/i, label: "estructura de documento de referencia" },
  { pattern: /\b(tal como|como) (se )?(describe|detalla|indica|especifica|muestra) en el (adjunto|anexo|documento adjunto|archivo proporcionado|documento proporcionado)\b/i, label: "como se describe en adjunto" },
  { pattern: /\b(en el|del) (documento|archivo|planilla|pdf) (adjunto|anexo|proporcionado|enviado)\b/i, label: "en el documento adjunto" },
  { pattern: /\b(guía de estilo|manual de marca|sistema de diseño) (adjunto|proporcionado|enviado)\b/i, label: "guía adjunta" },
  { pattern: /\b(plantilla|ejemplo|muestra) (adjunt[oa]|proporcionad[oa]|enviad[oa]|incluid[oa])\b(?![\s\S]{0,50}\b(```|---|\|))/i, label: "plantilla adjunta" },
];

/*=========================================
// Exported rule
=========================================*/

export const unresolvedReference: Rule = {
  name: "unresolved-reference",
  description:
    "Instructions referencing external artifacts not provided in the model's context",
  severity: "warning",

  analyze(text: string, ctx: AnalysisContext): Diagnostic[] {
    const statements = ctx.statements;
    const diagnostics: Diagnostic[] = [];
    const lang = ctx.lang;

    for (const stmt of statements) {
      for (const { pattern, label } of REFERENCE_PATTERNS) {
        const match = stmt.text.match(pattern);
        if (match) {
          diagnostics.push({
            rule: "unresolved-reference",
            severity: "warning",
            line: stmt.line,
            original: stmt.text,
            highlight: match[0],
            reason: lang === "en"
              ? `This instruction references "${label}" — an external artifact ` +
                "the model won't have access to. The instruction degrades " +
                "silently: the model either ignores it, hallucinates the " +
                "content, or asks for clarification instead of working."
              : lang === "es"
              ? `Esta instrucción referencia "${label}" — un artefacto externo ` +
                "al que el modelo no tendrá acceso. La instrucción se degrada " +
                "silenciosamente: el modelo la ignora, alucina el contenido, " +
                "o pide aclaraciones en vez de trabajar."
              : `Esta instrução referencia "${label}" — um artefato externo ` +
                "que o modelo não terá acesso. A instrução degrada " +
                "silenciosamente: o modelo ignora, alucina o conteúdo, " +
                "ou pede esclarecimento em vez de trabalhar.",
            suggestion: lang === "en"
              ? "Include the referenced content directly in the prompt, or " +
                "describe the key elements the model needs to follow. If the " +
                "content is too large, summarize the essential structure."
              : lang === "es"
              ? "Incluya el contenido referenciado directamente en el prompt, o " +
                "describa los elementos clave que el modelo necesita seguir. " +
                "Si el contenido es demasiado extenso, resuma la estructura esencial."
              : "Inclua o conteúdo referenciado diretamente no prompt, ou " +
                "descreva os elementos-chave que o modelo precisa seguir. " +
                "Se o conteúdo for grande demais, resuma a estrutura essencial.",
            tip: lang === "en"
              ? "Instead of 'follow the attached template', describe the " +
                "template's structure inline: sections, tone, length, format."
              : lang === "es"
              ? "En vez de 'siga la plantilla adjunta', describa la estructura " +
                "de la plantilla en línea: secciones, tono, extensión, formato."
              : "Em vez de 'siga o template em anexo', descreva a estrutura " +
                "do template inline: seções, tom, extensão, formato.",
          });
          break;
        }
      }
    }

    return diagnostics;
  },
};
