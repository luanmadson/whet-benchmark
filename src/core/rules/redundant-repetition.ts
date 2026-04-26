/**
 * Regra: redundant-repetition
 *
 * Situação: mesma ideia repetida com palavras diferentes. "Não invente",
 * "Não alucine", "Apenas fatos reais" — são a mesma instrução dita três
 * vezes, inflando o prompt sem agregar.
 *
 * Detecção via grupos semânticos: instruções que pertencem ao mesmo grupo
 * e aparecem mais de uma vez provavelmente são redundantes entre si.
 */

import type { AnalysisContext, Diagnostic, Rule } from "../models";

/*=========================================
// Grupos semanticos
=========================================*/

const SEMANTIC_GROUPS: Array<{
  id: string;
  label: string;
  patterns: RegExp[];
}> = [
  {
    id: "no-hallucination",
    label: "não alucinar / não inventar",
    patterns: [
      /\b(não|nunca) (invente?|fabrique?|crie? dados?)\b/i,
      /\b(não|nunca) alucine?\b/i,
      /\b(apenas|somente|só) (fatos?|dados?|informaç) ?(reais?|verificad|verdadeir|concreto)/i,
      /\bdon'?t (hallucinate|make .* up|fabricate|invent)\b/i,
      /\bonly (real|verified|factual|true)\b/i,
      /\bno hallucination/i,
      /\bseja? factual\b/i,
      /\bbe factual\b/i,
      /\bstick to (the )?(facts|truth)\b/i,
      /\bdo not (make up|invent|guess)\b/i,
      /\bavoid (hallucin|fabricat|speculat)/i,
      /\b(não|nunca) (especule|invente|adivinhe)\b/i,
      // ES
      /\bno (inventes?|alucines?|fabriques?)\b/i,
      /\b(solo|únicamente) (hechos|datos|información) ?(reales?|verificad|verdader|correcta)/i,
      /\bno generes? información falsa\b/i,
      /\bevita(r?) (alucin|fabricar|inventar|especular)/i,
      /\bsé factual\b/i,
      /\bno (especules?|adivines?)\b/i,
    ],
  },
  {
    id: "be-concise",
    label: "ser conciso / não se estender",
    patterns: [
      /\bseja? (concis[oa]|brev[e]|sucinst[oa])\b/i,
      /\b(não|nunca) (se estenda?|enrole?|prologue?)\b/i,
      /\bresposta?s? (curta|breve|concisa|direta)/i,
      /\bbe (concise|brief|succinct)\b/i,
      /\bkeep .* (short|brief|concise)\b/i,
      /\bdon'?t (ramble|over-?explain|be verbose)\b/i,
      /\bavoid (verbos|unnecessar|redundan)\w* (word|text|detail|explanation)/i,
      /\bget (straight |)to the point\b/i,
      /\bvá direto ao ponto\b/i,
      // ES
      /\bsé (concis[oa]|breve|sucint[oa])\b/i,
      /\bno te (extiendas?|enrolles?|prolongues?)\b/i,
      /\brespuestas? (cortas?|breves?|concisas?|directas?)\b/i,
      /\bve (directo |)al (punto|grano)\b/i,
      /\bevita(r?) (verbosidad|rodeos|redundancia)/i,
    ],
  },
  {
    id: "be-helpful",
    label: "ser útil / prestar ajuda",
    patterns: [
      /\bseja? (útil|prestativ[oa]|solícit[oa])\b/i,
      /\bajud[ea]? (o usuário|o melhor|sempre)\b/i,
      /\bbe helpful\b/i,
      /\bassist the user\b/i,
      /\bhelp the user\b/i,
      /\byour (goal|purpose|job) is to (help|assist)\b/i,
      /\bseu (objetivo|propósito|trabalho) é (ajudar|auxiliar)\b/i,
      // ES
      /\bsé (útil|servicial|solicít[oa])\b/i,
      /\bayuda al usuario\b/i,
      /\basiste? al usuario\b/i,
      /\btu (objetivo|propósito|trabajo) es (ayudar|asistir)\b/i,
    ],
  },
  {
    id: "be-accurate",
    label: "ser preciso / exato",
    patterns: [
      /\bseja? (precis[oa]|exat[oa]|acurad[oa])\b/i,
      /\b(respostas?|informaç\w*) (precis|exat|acurad)/i,
      /\bbe (accurate|precise|exact)\b/i,
      /\bprovide accurate\b/i,
      /\bensure (accuracy|correctness|precision)\b/i,
      /\brespond (accurately|precisely|correctly)\b/i,
      /\bgarant[ai]r? (a |)(precisão|exatidão|correção)\b/i,
      // ES
      /\bsé (precis[oa]|exact[oa]|acurad[oa])\b/i,
      /\b(respuestas?|información) (precis|exact|correct)/i,
      /\bgarantiza(r?) (la |)(precisión|exactitud|corrección)\b/i,
      /\bresponde? (con precisión|correctamente|de forma precisa)\b/i,
    ],
  },
  {
    id: "follow-instructions",
    label: "seguir instruções",
    patterns: [
      /\bsiga? (as |)(instruções|orientações|regras)\b/i,
      /\bcumpra? (as |)(instruções|orientações|regras)\b/i,
      /\bfollow (the |my )?(instructions|rules|guidelines)\b/i,
      /\badhere to (the |my )?(instructions|rules|guidelines)\b/i,
      /\bcomply with (the |my )?(instructions|rules|guidelines)\b/i,
      /\bobey (the |my )?(instructions|rules|guidelines)\b/i,
      /\bobedeça? (as |)(instruções|orientações|regras)\b/i,
      // ES
      /\bsigue? (las |)(instrucciones|orientaciones|reglas|indicaciones)\b/i,
      /\bobedece? (las |)(instrucciones|orientaciones|reglas|indicaciones)\b/i,
      /\bcumple? (con )?(las |)(instrucciones|orientaciones|reglas|indicaciones)\b/i,
      /\badhiérete? a (las |)(instrucciones|reglas|indicaciones)\b/i,
    ],
  },
  {
    id: "be-safe",
    label: "ser seguro / não causar dano",
    patterns: [
      /\bdo not (cause |)(harm|damage)\b/i,
      /\bavoid (harmful|dangerous|unsafe)\b/i,
      /\bbe safe\b/i,
      /\bprioritize safety\b/i,
      /\b(não|nunca) caus[ea]r? (dano|prejuízo)\b/i,
      /\bseja? segur[oa]\b/i,
      /\bevite? (respostas?|conteúdo) (perigoso|prejudicial|danoso)/i,
      // ES
      /\bno causes? (daño|perjuicio)\b/i,
      /\bsé segur[oa]\b/i,
      /\bevita(r?) (contenido )?(dañino|peligroso|perjudicial|nocivo)\b/i,
      /\bprioriza(r?) (la )?seguridad\b/i,
    ],
  },
  {
    id: "be-respectful",
    label: "ser respeitoso / educado",
    patterns: [
      /\bseja? (educad[oa]|respeitoso|polido|cordial)\b/i,
      /\bbe (polite|respectful|courteous|kind)\b/i,
      /\btreat .* with respect\b/i,
      /\bmaintain .* (polite|respectful|professional) tone\b/i,
      /\btrate? .* com respeito\b/i,
      /\bmantenha? (um |)(tom|postura) (respeitoso|educado|profissional)\b/i,
      // ES
      /\bsé (respetuos[oa]|educad[oa]|cortés|amable)\b/i,
      /\btrata(r?)? .* con respeto\b/i,
      /\bmantén (un |)(tono|postura) (respetuos[oa]|educad[oa]|profesional)\b/i,
    ],
  },
  {
    id: "create-content",
    label: "criar conteúdo / produzir texto",
    patterns: [
      /\b(crie|gere|produza|escreva|elabore|redija) (conteúdo|textos?|copy|posts?)\b/i,
      /\b(create|generate|produce|write|craft|compose) (content|texts?|copy|posts?)\b/i,
      /\bconteúdo (persuasivo|engajante|atrativo|envolvente|impactante)\b/i,
      /\b(engaging|persuasive|compelling|attractive|impactful) (content|texts?|copy)\b/i,
      /\btextos? que (engaj|conect|resso[ea]|atra[ij])/i,
      /\b(escreva|redija) de forma (envolvente|atrativa|persuasiva|engajante)\b/i,
      // ES
      /\b(crea|genera|produce|escribe|elabora|redacta) (contenido|textos?|copy|posts?)\b/i,
      /\bcontenido (persuasivo|atractivo|envolvente|impactante)\b/i,
      /\btextos? que (enganche|conecte|resuene|atraiga)/i,
      /\b(escribe|redacta) de forma (envolvente|atractiva|persuasiva)\b/i,
    ],
  },
];

interface Match {
  groupId: string;
  groupLabel: string;
  line: number;
  text: string;
}

/*=========================================
// Regra exportada
=========================================*/

export const redundantRepetition: Rule = {
  name: "redundant-repetition",
  description:
    "Mesma ideia repetida com palavras diferentes, inflando o prompt sem agregar",
  severity: "warning",

  analyze(text: string, ctx: AnalysisContext): Diagnostic[] {
    const statements = ctx.statements;
    const lang = ctx.lang;
    const matches: Match[] = [];

    for (const stmt of statements) {
      for (const group of SEMANTIC_GROUPS) {
        const matched = group.patterns.some((p) => p.test(stmt.text));
        if (matched) {
          matches.push({
            groupId: group.id,
            groupLabel: group.label,
            line: stmt.line,
            text: stmt.text,
          });
          break;
        }
      }
    }

    // Agrupa por grupo semântico e reporta onde há mais de uma ocorrência
    const grouped = new Map<string, Match[]>();
    for (const match of matches) {
      const list = grouped.get(match.groupId) || [];
      list.push(match);
      grouped.set(match.groupId, list);
    }

    const diagnostics: Diagnostic[] = [];

    for (const [, groupMatches] of grouped) {
      if (groupMatches.length < 2) continue;

      const linesStr = groupMatches.map((m) => `L${m.line}`).join(", ");
      const firstMatch = groupMatches[0];

      diagnostics.push({
        rule: "redundant-repetition",
        severity: "warning",
        line: firstMatch.line,
        original:
          groupMatches.map((m) => `L${m.line}: "${m.text}"`).join("\n"),
        reason: lang === "en"
          ? `${groupMatches.length} instructions about "${firstMatch.groupLabel}" ` +
            `found (${linesStr}). Repeating the same idea with different words ` +
            "tends to dilute rather than reinforce — each phrase ideally adds " +
            "something new. The space taken by repetitions could be used for " +
            "instructions that genuinely change something."
          : lang === "es"
          ? `${groupMatches.length} instrucciones sobre "${firstMatch.groupLabel}" ` +
            `encontradas (${linesStr}). Repetir la misma idea con palabras ` +
            "diferentes tiende a diluir más que a reforzar — cada frase " +
            "idealmente aporta algo nuevo. El espacio ocupado por repeticiones " +
            "podría usarse para instrucciones que genuinamente cambien algo."
          : `${groupMatches.length} instruções sobre "${firstMatch.groupLabel}" ` +
            `encontradas (${linesStr}). Repetir a mesma ideia com palavras ` +
            "diferentes tende a diluir mais do que reforçar — cada frase " +
            "idealmente adiciona algo novo. O espaço ocupado por repetições " +
            "poderia ser usado por instruções que genuinamente mudem algo.",
        suggestion: lang === "en"
          ? "Which of these formulations is the clearest? Keeping only that one " +
            "tends to be more effective than repeating the same idea — each " +
            "repetition competes for attention without adding new information."
          : lang === "es"
          ? "Cuál de estas formulaciones es la más clara? Mantener solo esa " +
            "tiende a ser más eficaz que repetir la misma idea — cada " +
            "repetición compite por atención sin aportar información nueva."
          : "Qual dessas formulações é a mais clara? Manter apenas ela " +
            "tende a ser mais eficaz do que repetir a mesma ideia — cada " +
            "repetição compete por atenção sem adicionar informação nova.",
      });
    }

    return diagnostics;
  },
};
