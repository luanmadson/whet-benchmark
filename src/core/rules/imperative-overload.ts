/**
 * Regra: imperative-overload
 *
 * Situação: excesso de linguagem imperativa ("NUNCA", "SEMPRE", "OBRIGATÓRIO",
 * "PROIBIDO", "É OBRIGATÓRIO", etc.) que tende a gerar agentes travados,
 * cautelosos e com conflitos entre regras.
 */

import type { AnalysisContext, Diagnostic, Rule } from "../models";

/*=========================================
// Padroes imperativos
=========================================*/

const IMPERATIVE_PATTERNS: Array<{
  pattern: RegExp;
  label: string;
  guidance: string;
  tip: string;
  exclude?: RegExp;
}> = [
  {
    pattern: /\bNUNCA\b/i,
    label: "NUNCA",
    guidance:
      "Essa proibição precisa ser absoluta? Descrever *por que* algo " +
      "tende a não funcionar ('alterar código existente costuma não " +
      "ser a melhor abordagem porque...') dá ao agente contexto para " +
      "se adaptar quando a situação for diferente.",
    tip:
      'Substituir "nunca" por "pode não ser adequado" ou "tende a não ' +
      'funcionar bem" costuma dar margem de adaptação ao agente.',
    // Uso descritivo dentro de relativa ou cláusula subordinada
    // ("mudança que nunca caberia", "quais regras não disparam nunca")
    // — não é ordem direta ao agente, é narração sobre um terceiro objeto.
    exclude: /\b(que|quais|qual|onde|quem|cujas?|nada|ninguém|nenhum[ao]?)\b[^.?!]{0,60}\bnunca\b/i,
  },
  {
    pattern: /\bSEMPRE\b/i,
    label: "SEMPRE",
    guidance:
      "Precisa ser 'sempre', mesmo? Descrever quando e por que algo " +
      "funciona ('responder em português costuma ser mais adequado " +
      "neste contexto') dá margem para o agente adaptar quando fizer " +
      "sentido.",
    tip:
      'Substituir "sempre" por "costuma funcionar melhor" ou "tende a ' +
      'ser mais adequado" permite adaptação ao contexto.',
    // "quase sempre" é hedge observacional, não instrução imperativa.
    // Sujeito de 3ª pessoa + "sempre" + verbo 3ª pessoa = prosa descritiva
    // sobre um terceiro objeto, não instrução ao agente.
    // Ex: "Gatos sempre demonstram…", "Esse padrão sempre ocorre…"
    exclude: /(?:\bquase\s+sempre\b|(?:^|[.!?]\s+)(?!(?:voc[êe]|tu|you)\b)[A-ZÁÉÍÓÚÂÊÎÔÛÀÇÜ]\w+(?:\s+\w+){0,3}\s+sempre\s+(?:demonstr|ocorr|exist|acontec|tend|precis|represent|indic|envolv|result|são|é|sao|e\b|tem\b|têm\b|s[ãa]o|est[áa]|ficam?))/i,
  },
  {
    pattern: /(?<!\w)[ÉEée] OBRIGAT[ÓOóo]RIO\b/i,
    label: "É OBRIGATÓRIO",
    guidance:
      "Essa obrigatoriedade vem de onde? Se há um motivo concreto, " +
      "descrevê-lo ('citar fontes tende a dar mais credibilidade') " +
      "costuma funcionar melhor do que impor como obrigação.",
    tip:
      'Substituir "é obrigatório" pelo motivo concreto: "tende a ser ' +
      'importante porque..." costuma produzir adesão mais inteligente.',
  },
  {
    pattern: /\bOBRIGATORIAMENTE\b/i,
    label: "OBRIGATORIAMENTE",
    guidance:
      "O que acontece se o agente não fizer isso? Se a consequência " +
      "não é grave, 'preferencialmente' ou descrever o motivo tende " +
      "a produzir comportamento mais inteligente.",
    tip:
      'Substituir "obrigatoriamente" por "preferencialmente" ou ' +
      "descrever o motivo tende a produzir comportamento mais inteligente.",
  },
  {
    pattern: /\bPROIBIDO\b/i,
    label: "PROIBIDO",
    guidance:
      "Por que é proibido? Se o agente entender o motivo ('isso tende " +
      "a causar X'), ele pode se adaptar a situações que você não " +
      "previu. Proibir sem explicar gera rigidez sem compreensão.",
    tip:
      'Substituir "proibido" por "tende a causar problemas porque..." ' +
      "dá ao agente compreensão em vez de rigidez.",
  },
  {
    pattern: /\bNÃO PODE\b/i,
    label: "NÃO PODE",
    guidance:
      "O que torna isso inadequado? Reformular como 'pode não ser " +
      "adequado porque...' dá ao agente a informação que ele precisa " +
      "para decidir bem, inclusive em situações imprevistas.",
    tip:
      'Substituir "não pode" por "pode não ser adequado porque..." ' +
      "dá ao agente informação para decidir bem.",
    // Uso descritivo em tempo composto ("o propósito não pode ter sido
    // comprometido") — modal + particípio descreve estado, não ordem.
    exclude: /\bnão pode\s+ter\s+\w+/i,
  },
  // PT: sinônimos de NUNCA (antes de DEVE para ter prioridade em sentenças compostas)
  {
    pattern: /\bsob nenhuma (hip[óo]tese|circunst[âa]ncia)\b/i,
    label: "sob nenhuma hipótese",
    guidance:
      "Essa proibição precisa ser tão absoluta? Descrever o *motivo* " +
      "('diagnósticos definitivos costumam ser problemáticos neste " +
      "contexto porque...') dá ao agente compreensão para se adaptar.",
    tip:
      'Substituir "sob nenhuma hipótese" por "pode não ser adequado ' +
      'porque..." costuma dar ao agente compreensão em vez de rigidez.',
  },
  {
    pattern: /\bem hip[óo]tese alguma\b/i,
    label: "em hipótese alguma",
    guidance:
      "Essa restrição absoluta é necessária? Descrever a consequência " +
      "concreta ('inventar informações tende a causar...') costuma " +
      "funcionar melhor do que uma proibição sem contexto.",
    tip:
      'Substituir "em hipótese alguma" por "tende a causar problemas ' +
      'porque..." dá ao agente o contexto da restrição.',
  },
  {
    pattern: /\bJAMAIS\b/i,
    label: "JAMAIS",
    guidance:
      "Essa proibição precisa ser absoluta? Descrever *por que* algo " +
      "tende a não funcionar costuma produzir adesão mais inteligente " +
      "do que uma proibição sem contexto.",
    tip:
      'Substituir "jamais" por "tende a não funcionar bem porque..." ' +
      "costuma dar margem de adaptação ao agente.",
    exclude: /\b(que|quais|qual|onde|quem|cujas?|nada|ninguém|nenhum[ao]?)\b[^.?!]{0,60}\bjamais\b/i,
  },
  {
    pattern: /\b(você |tu |)\bDEVE\b/i,
    label: "DEVE",
    guidance:
      "O que acontece se não fizer? Se há um motivo concreto, " +
      "descrevê-lo ('usar TypeScript costuma ser mais adequado " +
      "neste contexto porque...') tende a produzir adesão mais " +
      "inteligente do que uma obrigação.",
    tip:
      'Substituir "deve" por "costuma ser mais adequado" ou descrever ' +
      "o motivo tende a produzir adesão mais inteligente.",
    exclude: /\b(código|sistema|sistemas|aplicação|aplicações|programa|programas|função|funções|método|métodos|api|apis|endpoint|endpoints|servidor|servidores|banco|bancos|arquivo|arquivos|componente|componentes|módulo|módulos|classe|classes|objeto|objetos|variável|variáveis|resultado|resultados|valor|valores|retorno|retornos|campo|campos|registro|registros|dado|dados|output|outputs|input|inputs|erro|erros|request|requests|response|responses|teste|testes|dependência|dependências|pacote|pacotes)\b.{0,20}\bdeve\b/i,
  },
  {
    pattern: /\bNEVER\b/i,
    label: "NEVER",
    guidance:
      "Does this need to be absolute? Describing *why* something " +
      "tends not to work ('modifying existing code often introduces " +
      "regressions') gives the agent context to adapt when the " +
      "situation is different.",
    tip:
      'Replace "never" with "tends not to work well" or "may not be ' +
      'adequate" to give the agent room to adapt.',
  },
  {
    pattern: /\bALWAYS\b/i,
    label: "ALWAYS",
    guidance:
      "Does it need to be 'always'? Describing when and why " +
      "something works ('responding in English tends to be more " +
      "appropriate here') leaves room for the agent to adapt " +
      "when it makes sense.",
    tip:
      'Replace "always" with "tends to work better" or "is usually ' +
      'more appropriate" to allow context-dependent adaptation.',
  },
  {
    pattern: /\b(you |)\bMUST\b/i,
    label: "MUST",
    guidance:
      "What's the reason behind this requirement? If the agent " +
      "understands *why* ('citing sources tends to add credibility'), " +
      "it can apply the principle even in situations you didn't " +
      "anticipate.",
    tip:
      'Replace "must" with the underlying reason: "tends to be ' +
      'important because..." produces smarter compliance.',
    exclude: /\b(code|system|systems|app|apps|application|applications|function|functions|method|methods|api|apis|endpoint|endpoints|server|servers|database|databases|file|files|component|components|module|modules|class|classes|object|objects|variable|variables|result|results|value|values|return|returns|field|fields|record|records|data|output|outputs|input|inputs|error|errors|request|requests|response|responses|test|tests|dependency|dependencies|package|packages)\b.{0,20}\bmust\b/i,
  },
  {
    pattern: /\bFORBIDDEN\b/i,
    label: "FORBIDDEN",
    guidance:
      "Why is this forbidden? If the agent understands the reason " +
      "('this tends to cause X'), it can adapt to situations you " +
      "didn't foresee. Forbidding without explaining creates " +
      "rigidity without understanding.",
    tip:
      'Replace "forbidden" with "tends to cause problems because..." ' +
      "to give the agent understanding instead of rigidity.",
  },
  {
    pattern: /\bREQUIRED\b/i,
    label: "REQUIRED",
    guidance:
      "What makes this important? Describing the reason ('tends " +
      "to be important for...') often produces better compliance " +
      "than making it a requirement.",
    tip:
      'Replace "required" with "tends to be important for..." — ' +
      "describing the reason often produces better compliance.",
    exclude: /\b(is |are |)(required|optional)\b.*\b(field|param|argument|dependency|package)/i,
  },
  // EN: sinônimos de NEVER/ALWAYS
  {
    pattern: /\bunder no circumstances\b/i,
    label: "under no circumstances",
    guidance:
      "Does this need to be absolute? Describing *why* something " +
      "is problematic ('code without tests tends to introduce " +
      "regressions') gives the agent context to apply the principle " +
      "even in situations you didn't foresee.",
    tip:
      'Replace "under no circumstances" with "tends to be problematic ' +
      'because..." — describing the reason gives the agent understanding.',
  },
  {
    pattern: /\bit is (essential|critical|imperative|vital)\b/i,
    label: "it is essential",
    guidance:
      "What makes this essential? If the agent understands the reason " +
      "('PR descriptions help reviewers catch context-dependent issues'), " +
      "it can apply the principle intelligently instead of mechanically.",
    tip:
      'Replace "it is essential/critical" with the underlying reason: ' +
      '"tends to be important because..." produces smarter compliance.',
  },
  // PT: contrapartes de "it is essential/critical/imperative/vital"
  {
    pattern: /(?:^|[\s.;,!?])[ÉEée]\s+(essencial|crítico|critico|imprescindível|imprescindivel|vital|fundamental|imperativo|indispensável|indispensavel)\b/i,
    label: "é essencial",
    guidance:
      "O que torna isso essencial? Se o agente entende o motivo " +
      "('preservar o registro do autor importa porque...'), ele " +
      "aplica o princípio de forma inteligente em vez de mecânica.",
    tip:
      'Substituir "é essencial/crítico/imprescindível" pelo motivo ' +
      'concreto: "tende a importar porque..." costuma produzir adesão ' +
      "mais inteligente.",
  },
  // PT: contraparte de "at all times"
  {
    pattern: /\b(a todo (momento|instante|tempo)|o tempo (todo|inteiro)|a qualquer (momento|custo)|em todas as (interações|situações|respostas|ocasiões))\b/i,
    label: "a todo momento",
    guidance:
      "Precisa ser 'a todo momento'? Descrever quando e por que algo " +
      "importa ('a clareza ajuda o leitor a captar a intenção rápido') " +
      "dá ao agente margem para adaptar conforme o contexto muda.",
    tip:
      'Substituir "a todo momento" / "o tempo todo" por "tende a funcionar ' +
      'melhor" ou descrever o contexto onde mais importa.',
  },
  {
    pattern: /\bat all times\b/i,
    label: "at all times",
    guidance:
      "Does it need to be 'at all times'? Describing when and why " +
      "something matters ('readability helps the next reviewer understand " +
      "intent faster') leaves room for the agent to adapt when context " +
      "shifts.",
    tip:
      'Replace "at all times" with "tends to work better" or describe ' +
      "the context where it matters most.",
  },
  // ES: padrões imperativos em espanhol
  {
    pattern: /\bSIEMPRE\b/i,
    label: "SIEMPRE",
    guidance:
      "Does it need to be 'siempre'? Describing when and why " +
      "something works leaves room for the agent to adapt " +
      "when it makes sense.",
    tip:
      'Replace "siempre" with "suele funcionar mejor" or "tiende a ' +
      'ser más adecuado" to allow context-dependent adaptation.',
  },
  {
    pattern: /\bJAM[ÁA]S\b/i,
    label: "JAMÁS",
    guidance:
      "Does it need to be 'jamás'? Describing when and why " +
      "something is problematic gives the agent context to adapt.",
    tip:
      'Replace "jamás" with "tiende a causar problemas porque..." ' +
      "to give the agent understanding instead of rigidity.",
    exclude: /\b(que|quién|dónde|cuál)\b[^.?!]{0,60}\bjam[áa]s\b/i,
  },
  {
    pattern: /\b(usted |tú |)\bDEBE\b/i,
    label: "DEBE",
    guidance:
      "What's the reason behind this requirement? If the agent " +
      "understands *why*, it can apply the principle intelligently.",
    tip:
      'Replace "debe" with the underlying reason: "suele ser ' +
      'importante porque..." produces smarter compliance.',
    exclude: /\b(código|sistema|aplicación|función|método|servidor|archivo|componente|módulo|clase|objeto|variable|resultado|valor|campo|registro|dato)\b.{0,20}\bdebe\b/i,
  },
  {
    pattern: /\bPROHIBIDO\b/i,
    label: "PROHIBIDO",
    guidance:
      "Why is this prohibited? If the agent understands the reason, " +
      "it can adapt to situations you didn't foresee.",
    tip:
      'Replace "prohibido" with "tiende a causar problemas porque..." ' +
      "to give the agent understanding instead of rigidity.",
  },
  {
    pattern: /\bbajo ninguna circunstancia\b/i,
    label: "bajo ninguna circunstancia",
    guidance:
      "Does this need to be absolute? Describing *why* something " +
      "is problematic gives the agent context to apply the principle " +
      "even in situations you didn't foresee.",
    tip:
      'Replace "bajo ninguna circunstancia" with "tiende a ser problemático ' +
      'porque..." — describing the reason gives the agent understanding.',
  },
  {
    pattern: /\ben ning[úu]n caso\b/i,
    label: "en ningún caso",
    guidance:
      "Does this restriction need to be absolute? Describing the " +
      "consequence gives the agent context to decide well.",
    tip:
      'Replace "en ningún caso" with "tiende a causar problemas ' +
      'porque..." to give the agent the reason behind the restriction.',
  },
  {
    pattern: /(?:^|[\s.;,!?])[Ee]s\s+(esencial|cr[íi]tico|imprescindible|vital|fundamental|imperativo|indispensable)\b/i,
    label: "es esencial",
    guidance:
      "What makes this essential? If the agent understands the reason, " +
      "it can apply the principle intelligently instead of mechanically.",
    tip:
      'Replace "es esencial/crítico" with the underlying reason: ' +
      '"suele importar porque..." produces smarter compliance.',
  },
  {
    pattern: /\b(en todo momento|a toda costa|todo el tiempo)\b/i,
    label: "en todo momento",
    guidance:
      "Does it need to be 'en todo momento'? Describing when and why " +
      "something matters leaves room for the agent to adapt.",
    tip:
      'Replace "en todo momento" with "suele funcionar mejor" or describe ' +
      "the context where it matters most.",
  },
];

/*=========================================
// Regra exportada
=========================================*/

export const imperativeOverload: Rule = {
  name: "imperative-overload",
  description:
    "Excesso de linguagem imperativa que tende a gerar agentes travados, " +
    "cautelosos e com conflitos entre regras",
  severity: "warning",

  analyze(text: string, ctx: AnalysisContext): Diagnostic[] {
    const statements = ctx.statements;
    const diagnostics: Diagnostic[] = [];
    const lang = ctx.lang;

    for (const stmt of statements) {
      // Sentenças com múltiplos imperativos sobrepostos ("sob nenhuma hipótese
      // deve mentir") geram um diagnostic por padrão distinto, para que cada
      // gatilho apareça destacado. Dedup por span de caractere evita que regex
      // sobrepostos (ex: DEVE vs você DEVE) disparem duas vezes no mesmo trecho.
      const claimedSpans: Array<{ start: number; end: number }> = [];

      for (const { pattern, label, guidance, tip, exclude } of IMPERATIVE_PATTERNS) {
        if (exclude && exclude.test(stmt.text)) continue;
        const match = stmt.text.match(pattern);
        if (!match || match.index === undefined) continue;

        const start = match.index;
        const end = start + match[0].length;
        const overlapsExisting = claimedSpans.some(
          (span) => start < span.end && end > span.start,
        );
        if (overlapsExisting) continue;
        claimedSpans.push({ start, end });

        diagnostics.push({
          rule: "imperative-overload",
          severity: "warning",
          line: stmt.line,
          original: stmt.text,
          highlight: match[0],
          reason: lang === "en"
            ? `Imperative language ("${label}") tends to produce ` +
              "overly cautious agents that spend energy evaluating rules " +
              "instead of serving the purpose. When multiple imperative " +
              "instructions compete, the agent doesn't know which to prioritize."
            : lang === "es"
            ? `El lenguaje imperativo ("${label}") tiende a producir ` +
              "agentes excesivamente cautelosos que gastan energía evaluando " +
              "reglas en lugar de atender al propósito. Cuando varias " +
              "instrucciones imperativas compiten, el agente no sabe cuál priorizar."
            : `Linguagem imperativa ("${label}") tende a gerar agentes ` +
              "excessivamente cautelosos que gastam energia avaliando regras " +
              "em vez de atender ao propósito. Quando várias instruções " +
              "imperativas competem, o agente não sabe qual priorizar.",
          suggestion: guidance,
          tip,
        });
      }
    }

    return diagnostics;
  },
};
