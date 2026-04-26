/**
 * Regra: contradiction
 *
 * Situação: duas instruções no mesmo prompt puxam para direções opostas —
 * "seja extremamente conciso" junto com "inclua todo o histórico",
 * "tom formal e acadêmico" junto com "descontraído e divertido",
 * "respond only in English" junto com "respond in the user's language".
 * Quando isso acontece, o agente é forçado a escolher uma das duas sem
 * entender qual priorizar, e o resultado tende a ser inconsistente.
 *
 * A regra procura pares curados de antônimos dentro do mesmo prompt.
 * Não tenta inferir contradição semântica aberta — só sinaliza pares
 * óbvios observados em prompts reais.
 */

import type { AnalysisContext, Diagnostic, Rule } from "../models";

/*=========================================
// Pares de antonimos curados
=========================================*/

interface ContradictionPair {
  id: string;
  left: RegExp;
  right: RegExp;
  axis: string;
  axisEn: string;
}

// Cada par representa um eixo onde as duas direções raramente coexistem
// sem sacrificar alguma coisa. Os padrões são conservadores de propósito:
// só disparam quando ambos os lados aparecem no mesmo prompt.
const CONTRADICTION_PAIRS: ContradictionPair[] = [
  {
    id: "concise-vs-exhaustive",
    left: /\b(extremamente conciso|muito conciso|conciso|máximo \w+ frases?|no máximo \w+ frases?|em uma frase|uma linha|breve|curta|super conciso|extremely concise|very concise|concise|brief|one paragraph maximum|one sentence|single sentence|super short)\b/i,
    right: /\b(todo o hist[óo]rico|histórico completo|contexto completo|complete context|complete historical context|every relevant|exhaustive|cover every|thorough review|completo e detalhado|detalhad[oa] e completo|inclua tudo|include all|include every|cobertura exaustiva)\b/i,
    axis: "concisão vs exaustividade",
    axisEn: "conciseness vs exhaustiveness",
  },
  {
    id: "formal-vs-informal",
    left: /\b(tom (formal|acad[êe]mico)|linguagem (formal|acad[êe]mica)|estritamente formal|formal(,| and|\.| tone)|academic (style|tone|voice)|strictly formal)\b/i,
    right: /\b(descontraíd[oa]|informal|divertid[oa]|gírias|emojis?|como (um )?amig[oa]|casual(?: tone| voice| style)?|chill|relaxed|playful|conversational voice|like texting|texting a friend)\b/i,
    axis: "tom formal vs informal",
    axisEn: "formal vs informal tone",
  },
  {
    id: "minimal-vs-every",
    left: /\b(exemplos? m[íi]nimos?|um exemplo|poucos exemplos|no m[áa]ximo um|minimal examples?|one per section|one example|keep examples minimal|at most one)\b/i,
    right: /\b(todos os exemplos|exemplos exaustivos|cobrir cada|cobrir todos|exhaustive examples?|cover(ing)? every (edge )?case|all edge cases|include every example|every possible)\b/i,
    axis: "exemplos mínimos vs exaustivos",
    axisEn: "minimal vs exhaustive examples",
  },
  {
    id: "english-vs-user-language",
    left: /\b(respond in english only|english only|apenas em ingl[êe]s|somente ingl[êe]s|only respond in english|respond only in english|all responses? must be in english|responses? must be in english)\b/i,
    right: /\b(user[‘’]s native language|in the user[‘’]s language|idioma (nativo )?do usu[áa]rio|l[íi]ngua do usu[áa]rio|na l[íi]ngua do usu[áa]rio|always respond in the user|idioma do leitor|l[íi]ngua do leitor|ao idioma do leitor)\b/i,
    axis: "idioma fixo vs idioma do usuário",
    axisEn: "fixed language vs user’s language",
  },
  {
    id: "never-source-vs-no-time",
    left: /\b(never cite (law|sources?) without (a )?source|sempre cite (a )?fonte|nunca (afirme|cite) sem fonte|cite sources|nunca cite (a )?lei sem fonte)\b/i,
    right: /\b(never take time to look up|don'?t look up|sem (procurar|consultar) fontes|não perca tempo (procurando|buscando) fontes|without checking)\b/i,
    axis: "exigir fontes vs não checar fontes",
    axisEn: "require sources vs skip source lookup",
  },
  {
    id: "creative-vs-rigid",
    left: /\b(seja? criativ[oa]|be (\w+ )?creative|explore? (alternativas|unconventional|different)|pense? fora da caixa|think outside the box|innovat\w*|inov\w*|experimente? (abordagens|soluções|approaches)|try (new|different|creative) approaches?|take risks|arrrisque|arrisque|ouse)\b/i,
    right: /\b(siga? (o |a |)(template|modelo|formato|estrutura) (exatamente|rigorosamente|sem devi)|follow the (template|format|structure) exactly|follow the exact (template|format|structure)|sem (nenhum[a]? )?devi(o|ações|ar)|without (any )?deviation|strictly follow|rigidly follow|do not deviate|não (se )?devi[ea]|stick to (proven|established|known) methods?|m[ée]todos? (comprovad|estabelecid|conhecid)\w*)\b/i,
    axis: "criatividade vs rigidez",
    axisEn: "creativity vs rigidity",
  },
  {
    id: "user-language-vs-fixed-language",
    left: /\b(responda? no idioma (do|que o) (usu[áa]rio|leitor)|respond (only )?in the (user'?s |reader'?s |same )language|no idioma (do|que o) (usu[áa]rio|leitor)|match the (user|reader)'?s language|na l[íi]ngua (do|que o) (usu[áa]rio|leitor)|ao idioma do leitor|adapte?.{0,20}idioma (do|que o) (usu[áa]rio|leitor))\b/i,
    right: /\b(always respond in english|sempre responda? em ingl[êe]s|respond (only |exclusively )?in english|only (respond |answer |reply )?in english|responda? (apenas|somente|exclusivamente) em ingl[êe]s|responda? sempre em (portugu[êe]s|ingl[êe]s|espanhol|franc[êe]s|alem[ãa]o)|always respond in (portuguese|spanish|french|german)|all responses? must be in (english|portuguese|spanish|french|german))\b/i,
    axis: "idioma do usuário vs idioma fixo",
    axisEn: "user's language vs fixed language",
  },
  {
    id: "no-invention-vs-confident-without-knowing",
    left: /\b(nunca invente|não invente informa[çc][ãa]o|no fabric|don'?t fabricate|never make up|não alucine)\b/i,
    right: /\b(responda com confian[çc]a mesmo sem saber|answer confidently (even )?without|respond with confidence even if you don'?t know)\b/i,
    axis: "não inventar vs responder com confiança sem saber",
    axisEn: "don't fabricate vs answer confidently without knowing",
  },
  {
    id: "speed-vs-depth",
    left: /\b((seja|responda) (bem |)r[áa]pid[ao]|rapidamente|de forma r[áa]pida|direto ao ponto|sem rodeios|quickly|(answer|respond|reply) quickly|fast response|be quick|get to the point|no preamble)\b/i,
    right: /\b((em|de) profundidade|(analise|explore) (mais |)a fundo|an[áa]lise (profunda|aprofundada)|aprofunde|deep dive|deep(ly analy| analysis)|thorough analysis|dig deep|explore thoroughly|mergulho profundo)\b/i,
    axis: "velocidade vs profundidade",
    axisEn: "speed vs depth",
  },
  {
    id: "agreeable-vs-challenging",
    left: /\b(concord[ae] (com o |sempre com o )?usu[áa]rio|valide (o |as opini[õo]es do )?usu[áa]rio|evite contradizer|n[ãa]o contradiga o usu[áa]rio|n[ãa]o discorde|mantenha o usu[áa]rio (feliz|satisfeito)|avoid contradicting the user|don'?t (challenge|disagree with) the user|keep the user (happy|satisfied)|always agree with the user)\b/i,
    right: /\b(desafie (o |)usu[áa]rio|discorde (quando necess[áa]rio|abertamente|com o usu[áa]rio)|n[ãa]o tema (discordar|contradizer)|seja brutalmente honesto|push back (on|against) (the )?user|brutally honest|don'?t be afraid to (disagree|push back|challenge)|contradict the user)\b/i,
    axis: "concordância vs confronto",
    axisEn: "agreeable vs challenging",
  },
];

/*=========================================
// Regra exportada
=========================================*/

export const contradiction: Rule = {
  name: "contradiction",
  description:
    "Instruções que se opõem dentro do mesmo prompt, forçando o agente a " +
    "escolher uma das duas sem entender qual priorizar — o resultado tende " +
    "a ser inconsistente",
  severity: "warning",

  analyze(text: string, ctx: AnalysisContext): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    const lang = ctx.lang;
    const lower = text; // regex já é /i

    for (const pair of CONTRADICTION_PAIRS) {
      const leftMatch = lower.match(pair.left);
      const rightMatch = lower.match(pair.right);
      if (!leftMatch || !rightMatch) continue;

      // Monta snippet combinando os dois lados para o diagnóstico
      const snippetLeft = `"${leftMatch[0]}"`;
      const snippetRight = `"${rightMatch[0]}"`;
      const axis = lang === "en" ? pair.axisEn : pair.axis;

      diagnostics.push({
        rule: "contradiction",
        severity: "warning",
        original:
          lang === "en"
            ? `${snippetLeft} vs ${snippetRight}`
            : `${snippetLeft} vs ${snippetRight}`,
        highlight: leftMatch[0],
        reason:
          lang === "en"
            ? `The prompt asks for both ${snippetLeft} and ${snippetRight} ` +
              `— opposite directions on the same axis (${axis}). When the agent ` +
              "hits this, it has to guess which side to prioritize, and the " +
              "result tends to be inconsistent across requests: sometimes " +
              "leaning one way, sometimes the other, with no principled reason."
            : `O prompt pede ao mesmo tempo ${snippetLeft} e ${snippetRight} ` +
              `— direções opostas no mesmo eixo (${axis}). Quando o agente ` +
              "encontra isso, tem que adivinhar qual lado priorizar, e o " +
              "resultado tende a ser inconsistente entre chamadas: às vezes " +
              "inclina pro lado A, às vezes pro B, sem critério.",
        suggestion:
          lang === "en"
            ? "Decide which side actually matters, or describe the condition " +
              "that picks one over the other ('concise by default, but expand " +
              "when the user asks for context'). Keeping both unconditionally " +
              "forces the agent to guess."
            : "Decidir qual lado importa de fato, ou descrever a condição que " +
              "escolhe um sobre o outro ('conciso por padrão, mas expande quando " +
              "o usuário pede contexto'). Manter os dois sem condição força o " +
              "agente a adivinhar.",
        tip:
          lang === "en"
            ? "Collapse the two sides into one conditional rule: which side " +
              "wins by default, and when does the other apply."
            : "Colapsar os dois lados em uma regra condicional: qual lado vence " +
              "por padrão, e quando o outro se aplica.",
      });
    }

    return diagnostics;
  },
};
