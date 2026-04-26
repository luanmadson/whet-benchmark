/**
 * Gerador de explicação detalhada por diagnóstico — `explain-this-diagnostic`.
 *
 * Expande o card de cada diagnóstico com um before/after concreto e uma
 * referência externa ancorando o raciocínio. Inspirado em `eslint --rule`,
 * `biome explain` e `ruff --explain`, que mostram o código atual e o código
 * corrigido junto da motivação da regra.
 *
 * Puro: recebe `Diagnostic`, devolve texto. Não toca DOM, não importa React.
 */

import type { Diagnostic } from "./models";

export interface RuleExplanation {
  /** Before — trecho original problemático (pode ser multilinha). */
  before: string;
  /** After — reformulação concreta derivada do `before`. Vazio se não aplicável. */
  after: string;
  /** Rótulo traduzido pra "Antes" (usado no dashboard da UI). */
  beforeLabel: string;
  /** Rótulo traduzido pra "Depois". */
  afterLabel: string;
  /** Âncora externa — referência pública ao padrão detectado. */
  reference?: { label: string; url: string };
}

type Lang = "pt" | "en" | "es";

/*=========================================
// Mapeamento por regra — transformação de highlight
=========================================*/

// Substitutos neutros para highlights imperativos comuns (imperative-overload,
// threat-framing, command-over-question). Key: forma canônica do gatilho
// (lowercase, sem acento). Value: par por idioma.
const IMPERATIVE_REPLACEMENTS: Record<
  string,
  Record<Lang, string>
> = {
  nunca: { pt: "evite", en: "avoid", es: "evita" },
  never: { pt: "evite", en: "avoid", es: "evita" },
  jamais: { pt: "evite", en: "avoid", es: "evita" },
  sempre: { pt: "costume", en: "tend to", es: "suele" },
  always: { pt: "costume", en: "tend to", es: "suele" },
  siempre: { pt: "costume", en: "tend to", es: "suele" },
  deve: { pt: "costuma", en: "tends to", es: "suele" },
  must: { pt: "costuma", en: "tends to", es: "suele" },
  debe: { pt: "costuma", en: "tends to", es: "suele" },
  should: { pt: "pode", en: "can", es: "puede" },
  "é obrigatório": { pt: "vale a pena", en: "it's worth", es: "vale la pena" },
  obrigatório: { pt: "recomendado", en: "recommended", es: "recomendado" },
  obligatorio: { pt: "recomendado", en: "recommended", es: "recomendado" },
  "é proibido": { pt: "evite", en: "avoid", es: "evita" },
  proibido: { pt: "desaconselhado", en: "discouraged", es: "desaconsejado" },
  prohibido: { pt: "desaconselhado", en: "discouraged", es: "desaconsejado" },
};

/** Remove acentos e normaliza pra comparar highlight. */
function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Substitui o highlight no texto original preservando capitalização do match. */
function replaceHighlight(original: string, highlight: string, replacement: string): string {
  if (!highlight) return original;
  const esc = highlight.replace(/[.*+?^${}()|[\]\\]/g, "\\$1");
  const re = new RegExp(esc, "i");
  const match = original.match(re);
  if (!match) return original;
  // Preserva a maiusculização do gatilho original
  const isUpperCase = match[0] === match[0].toUpperCase();
  const isCapitalized = match[0][0] === match[0][0].toUpperCase();
  let out = replacement;
  if (isUpperCase && replacement.length > 1) out = replacement.toUpperCase();
  else if (isCapitalized) out = replacement[0].toUpperCase() + replacement.slice(1);
  return original.replace(re, out);
}

/*=========================================
// Rationale estendido por regra
=========================================*/

const REFERENCES: Record<string, { label: string; url: string }> = {
  "imperative-overload": {
    label: "Anthropic — Prompt engineering: be direct but not demanding",
    url: "https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/overview",
  },
  "redundant-default": {
    label: "Anthropic — Don't reinforce defaults",
    url: "https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/overview",
  },
  "cognitive-overload": {
    label: "OpenAI — Give models time to think (keep prompts focused)",
    url: "https://platform.openai.com/docs/guides/prompt-engineering",
  },
  "vague-instruction": {
    label: "OpenAI — Be specific about the desired output",
    url: "https://platform.openai.com/docs/guides/prompt-engineering",
  },
  "redundant-repetition": {
    label: "Anthropic — Prompt engineering overview",
    url: "https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/overview",
  },
  "command-over-question": {
    label: "Anthropic — Explain the why",
    url: "https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/overview",
  },
  "threat-framing": {
    label: "Anthropic — Avoid threats and coercion",
    url: "https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/overview",
  },
  "role-inflation": {
    label: "Anthropic — Use role prompts sparingly",
    url: "https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/system-prompts",
  },
  "conditional-reward": {
    label: "Lilian Weng — Prompt engineering (no fake rewards)",
    url: "https://lilianweng.github.io/posts/2023-03-15-prompt-engineering/",
  },
  "tone-domain-mismatch": {
    label: "Anthropic — Match tone to purpose",
    url: "https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/system-prompts",
  },
  contradiction: {
    label: "Anthropic — Avoid conflicting instructions",
    url: "https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/overview",
  },
  "unresolved-reference": {
    label: "OpenAI — Include all necessary context in the prompt",
    url: "https://platform.openai.com/docs/guides/prompt-engineering",
  },
};

/*=========================================
// Rótulos por idioma
=========================================*/

const LABELS: Record<Lang, { before: string; after: string }> = {
  pt: { before: "Como está", after: "Uma reformulação possível" },
  en: { before: "As written", after: "A possible reformulation" },
  es: { before: "Como está", after: "Una reformulación posible" },
};

/*=========================================
// After generators por regra
=========================================*/

function afterForImperative(d: Diagnostic, lang: Lang): string {
  if (!d.highlight) return "";
  const key = normalize(d.highlight);
  const rep = IMPERATIVE_REPLACEMENTS[key]?.[lang];
  if (!rep) return "";
  return replaceHighlight(d.original, d.highlight, rep);
}

function afterForRedundantDefault(d: Diagnostic, lang: Lang): string {
  // Instrução redundante: o after é a remoção/omissão.
  const tags: Record<Lang, string> = {
    pt: "(pode ser omitido — já faz parte do comportamento padrão do modelo)",
    en: "(can be omitted — already part of the model's default behavior)",
    es: "(puede omitirse — ya es parte del comportamiento por defecto del modelo)",
  };
  return tags[lang];
}

function afterForRoleInflation(d: Diagnostic, lang: Lang): string {
  if (!d.highlight) return "";
  // Remove o trecho inflacionado do original
  const withoutHighlight = d.original.replace(d.highlight, "").replace(/\s+/g, " ").trim();
  const suffixes: Record<Lang, string> = {
    pt: " (sem superlativos fictícios)",
    en: " (without fictional superlatives)",
    es: " (sin superlativos ficticios)",
  };
  return (withoutHighlight || d.original.replace(d.highlight, "").trim()) + suffixes[lang];
}

function afterForConditionalReward(d: Diagnostic, lang: Lang): string {
  // Remove a cláusula de recompensa
  const tags: Record<Lang, string> = {
    pt: "(cláusula de recompensa removida — o modelo não transaciona com promessas fictícias)",
    en: "(reward clause removed — the model doesn't transact with fictional promises)",
    es: "(cláusula de recompensa eliminada — el modelo no transa con promesas ficticias)",
  };
  return tags[lang];
}

function afterForThreatFraming(d: Diagnostic, lang: Lang): string {
  // Igual à imperative — se o highlight for uma palavra de ameaça, substituir
  const imp = afterForImperative(d, lang);
  if (imp) return imp;
  const tags: Record<Lang, string> = {
    pt: "(ameaça condicional reescrita como orientação positiva — descrever o resultado desejado em vez da punição)",
    en: "(conditional threat rewritten as positive guidance — describe the desired outcome instead of the punishment)",
    es: "(amenaza condicional reescrita como orientación positiva — describe el resultado deseado en lugar del castigo)",
  };
  return tags[lang];
}

function afterForUnresolvedReference(d: Diagnostic, lang: Lang): string {
  const tags: Record<Lang, string> = {
    pt: "(trazer o conteúdo essencial da referência pra dentro do prompt em vez de apontar pra um artefato externo que o modelo não terá)",
    en: "(include the essential content inline instead of pointing to an external artifact the model won't have)",
    es: "(incluir el contenido esencial en el propio prompt en lugar de apuntar a un artefacto externo que el modelo no tendrá)",
  };
  return tags[lang];
}

function afterForCommandOverQuestion(d: Diagnostic, lang: Lang): string {
  const tags: Record<Lang, string> = {
    pt: "(acrescentar o propósito depois do comando: `… para que o usuário consiga X`)",
    en: "(add the purpose after the command: `… so that the user can X`)",
    es: "(añadir el propósito después del comando: `… para que el usuario pueda X`)",
  };
  return tags[lang];
}

function afterForContradiction(d: Diagnostic, lang: Lang): string {
  const tags: Record<Lang, string> = {
    pt: "(resolver a tensão: manter só um dos lados, OU condicionar um ao outro — `seja conciso por padrão, expanda quando o usuário pedir detalhe`)",
    en: "(resolve the tension: keep only one side, OR condition one on the other — `be concise by default, expand when the user asks for detail`)",
    es: "(resolver la tensión: mantener sólo un lado, O condicionar uno al otro — `sé conciso por defecto, amplía cuando el usuario pida detalle`)",
  };
  return tags[lang];
}

function afterForVague(d: Diagnostic, lang: Lang): string {
  const tags: Record<Lang, string> = {
    pt: "(substituir a instrução genérica por um critério observável — `responda em até 3 parágrafos`, `use listas quando o conteúdo tiver 4+ itens`)",
    en: "(replace the generic instruction with an observable criterion — `answer in up to 3 paragraphs`, `use lists when there are 4+ items`)",
    es: "(sustituir la instrucción genérica por un criterio observable — `responde en hasta 3 párrafos`, `usa listas con 4+ ítems`)",
  };
  return tags[lang];
}

function afterForToneDomainMismatch(d: Diagnostic, lang: Lang): string {
  const tags: Record<Lang, string> = {
    pt: "(substituir o pedido de tom casual por uma descrição do propósito: `linguagem acessível, sem jargão técnico desnecessário`)",
    en: "(replace the request for casual tone with a description of the purpose: `accessible language, without unnecessary technical jargon`)",
    es: "(sustituir el pedido de tono casual por una descripción del propósito: `lenguaje accesible, sin jerga técnica innecesaria`)",
  };
  return tags[lang];
}

function afterForRedundantRepetition(d: Diagnostic, lang: Lang): string {
  const tags: Record<Lang, string> = {
    pt: "(consolidar as duas formulações em uma — a repetição dilui em vez de reforçar)",
    en: "(consolidate the two formulations into one — repetition dilutes instead of reinforcing)",
    es: "(consolidar las dos formulaciones en una — la repetición diluye en lugar de reforzar)",
  };
  return tags[lang];
}

function afterForCognitiveOverload(d: Diagnostic, lang: Lang): string {
  const tags: Record<Lang, string> = {
    pt: "(trimar o prompt pra 3-5 instruções-chave — as demais costumam competir por atenção sem mudar comportamento)",
    en: "(trim the prompt to 3-5 key instructions — the rest tend to compete for attention without changing behavior)",
    es: "(recortar el prompt a 3-5 instrucciones clave — las demás suelen competir por atención sin cambiar comportamiento)",
  };
  return tags[lang];
}

/*=========================================
// Função pública
=========================================*/

export function explainDiagnostic(d: Diagnostic, lang: Lang): RuleExplanation {
  const labels = LABELS[lang];
  const reference = REFERENCES[d.rule];

  let after = "";
  switch (d.rule) {
    case "imperative-overload":
      after = afterForImperative(d, lang);
      break;
    case "redundant-default":
      after = afterForRedundantDefault(d, lang);
      break;
    case "role-inflation":
      after = afterForRoleInflation(d, lang);
      break;
    case "conditional-reward":
      after = afterForConditionalReward(d, lang);
      break;
    case "threat-framing":
      after = afterForThreatFraming(d, lang);
      break;
    case "unresolved-reference":
      after = afterForUnresolvedReference(d, lang);
      break;
    case "command-over-question":
      after = afterForCommandOverQuestion(d, lang);
      break;
    case "contradiction":
      after = afterForContradiction(d, lang);
      break;
    case "vague-instruction":
      after = afterForVague(d, lang);
      break;
    case "tone-domain-mismatch":
      after = afterForToneDomainMismatch(d, lang);
      break;
    case "redundant-repetition":
      after = afterForRedundantRepetition(d, lang);
      break;
    case "cognitive-overload":
      after = afterForCognitiveOverload(d, lang);
      break;
    default:
      after = "";
  }

  return {
    before: d.original,
    after,
    beforeLabel: labels.before,
    afterLabel: labels.after,
    reference,
  };
}
