/**
 * Renderer — generates the rewrite meta-prompt (a self-contained
 * correction instruction sent to an LLM to rewrite the original prompt).
 *
 * Two outputs:
 * 1. render() → clean text to copy and paste into an AI
 * 2. getStructuredParts() → the same parts split out for the UI to style
 *
 * What the UI shows IS what the user copies. No parallel representation.
 */

import type { Diagnostic } from "./models";
import { detectLanguage } from "./models";
import { groupByRule } from "./rule-meta";

/*=========================================
// Structured parts (UI + text)
=========================================*/

export interface StructuredOutput {
  opening: string;
  originalPrompt: string;
  adjustmentsLabel: string;
  adjustments: string[];
  closing: string;
  fullText: string;  // tudo junto, para copiar
}

export function getStructuredOutput(diagnostics: Diagnostic[], text: string, lang?: "pt" | "en" | "es"): StructuredOutput | null {
  if (diagnostics.length === 0) return null;

  if (!lang) lang = detectLanguage(text);
  const domain = detectDomain(text, lang);

  let opening: string;
  let adjustmentsLabel: string;

  if (lang === "en") {
    const domainNote = domain
      ? ` The prompt is aimed at the ${domain} domain.`
      : "";
    opening =
      "Consider the following prompt. It contains patterns that, from " +
      "experience, tend to degrade the behavior of AI agents. " +
      "The adjustments listed below describe what was identified " +
      "and what tends to work better in practice." + domainNote;
    adjustmentsLabel = "Suggested adjustments:";
  } else if (lang === "es") {
    const domainNote = domain
      ? ` El prompt está orientado al dominio de ${domain}.`
      : "";
    opening =
      "Considere el siguiente prompt. Contiene patrones que, por " +
      "experiencia, tienden a degradar el comportamiento de agentes de IA. " +
      "Los ajustes listados a continuación describen lo que se identificó " +
      "y lo que suele funcionar mejor en la práctica." + domainNote;
    adjustmentsLabel = "Ajustes sugeridos:";
  } else {
    const domainNote = domain
      ? ` O prompt é voltado para o domínio de ${domain}.`
      : "";
    opening =
      "Considere o prompt a seguir. Ele contém padrões que, pela " +
      "experiência, tendem a degradar o comportamento de agentes de IA. " +
      "As adequações listadas abaixo descrevem o que foi identificado " +
      "e como costuma funcionar melhor na prática." + domainNote;
    adjustmentsLabel = "Adequações sugeridas:";
  }

  const grouped = groupByRule(diagnostics);
  const adjustments: string[] = [];
  let n = 1;
  for (const [rule, items] of grouped) {
    const directives = lang === "en" ? DIRECTIVE_TEXT_EN : lang === "es" ? DIRECTIVE_TEXT_ES : DIRECTIVE_TEXT;
    const directive = directives[rule];
    if (directive) {
      const example = buildExample(rule, items, lang);
      adjustments.push(`${n}. ${directive}${example}`);
      n++;
    }
  }

  const closing = lang === "en"
    ? "Rewrite the prompt applying the adjustments that make sense " +
      "for the context being worked on. Preserve the original purpose " +
      "of each instruction — if an instruction exists to prevent " +
      "a real risk (safety, compliance, integrity), keep that " +
      "protection, but rephrase so the agent understands why instead " +
      "of just obeying. Categorical tool or format constraints " +
      "(like 'use TypeScript' or 'respond in JSON') can be kept " +
      "as they are. Discard any adjustment that does not apply. " +
      "The output should be only the rewritten prompt, in running text " +
      "(single paragraph, no headings, no bullet points, no markdown), " +
      "ready to copy and paste directly as a system prompt. " +
      "Do not include explanations, notes or comments about what was done."
    : lang === "es"
    ? "Reescribe el prompt aplicando los ajustes que tengan sentido " +
      "para el contexto en el que se está trabajando. Preserva el propósito " +
      "original de cada instrucción — si una instrucción existe para evitar " +
      "un riesgo real (seguridad, cumplimiento, integridad), mantén esa " +
      "protección, pero reformula para que el agente entienda el porqué en vez " +
      "de solo obedecer. Restricciones categóricas de herramienta o formato " +
      "(como 'usa TypeScript' o 'responde en JSON') pueden mantenerse " +
      "como están. Descarta cualquier ajuste que no aplique. " +
      "La salida debe ser solo el prompt reescrito, en texto corrido " +
      "(párrafo único, sin títulos, sin viñetas, sin markdown), " +
      "listo para copiar y pegar directamente como system prompt. " +
      "No incluyas explicaciones, notas o comentarios sobre lo que se hizo."
    : "Reescreva o prompt aplicando as adequações que fizerem sentido " +
      "para o contexto em que está sendo trabalhado. Preserve o propósito " +
      "original de cada instrução — se uma instrução existe para evitar " +
      "um risco real (segurança, compliance, integridade), mantenha essa " +
      "proteção, mas reformule para que o agente entenda o porquê em vez " +
      "de apenas obedecer. Restrições categóricas de ferramenta ou formato " +
      "(como 'use TypeScript' ou 'responda em JSON') podem ser mantidas " +
      "como estão. Descarte qualquer adequação que não se aplique. " +
      "A saída deve ser apenas o prompt reescrito, em texto corrido " +
      "(parágrafo único, sem títulos, sem tópicos, sem markdown), " +
      "pronto para copiar e colar diretamente como system prompt. " +
      "Não inclua explicações, notas ou comentários sobre o que foi feito.";

  const fullText = [
    opening,
    text,
    adjustmentsLabel + "\n" + adjustments.join("\n"),
    closing,
  ].join("\n\n");

  return {
    opening,
    originalPrompt: text,
    adjustmentsLabel,
    adjustments,
    closing,
    fullText,
  };
}

/*=========================================
// Clean text to copy
=========================================*/

export function render(diagnostics: Diagnostic[], _score: number, text: string, lang?: "pt" | "en" | "es"): string {
  const structured = getStructuredOutput(diagnostics, text, lang);
  return structured?.fullText ?? "";
}

/*=========================================
// Positive traits (clean prompt)
=========================================*/

export function detectPositiveTraits(text: string, lang?: "pt" | "en" | "es"): string[] {
  const l = lang ?? detectLanguage(text);
  const traits: string[] = [];
  const lines = text.split("\n").filter((ln) => ln.trim() && !ln.trim().startsWith("#"));
  const charCount = text.length;

  const suggestivePatterns = /\b(tende a|costuma|pode ser|consider[ea]|talvez|geralmente|tends to|usually|might|consider)\b/i;
  if (lines.filter((ln) => suggestivePatterns.test(ln)).length >= 2) {
    traits.push(l === "en" ? "Suggestive tone — leaves room for adaptation"
      : l === "es" ? "Tono sugestivo — deja margen de adaptación"
      : "Tom sugestivo — dá margem de adaptação");
  }

  if (lines.length <= 10 && charCount <= 2000) {
    traits.push(l === "en" ? "Concise — few well-calibrated instructions"
      : l === "es" ? "Conciso — pocas instrucciones bien calibradas"
      : "Conciso — poucas instruções bem calibradas");
  }

  const vaguePatterns = /\b(boas práticas|best practices|buenas prácticas|seja profissional|be professional|sea profesional|bom senso|common sense|sentido común)\b/i;
  if (!lines.some((ln) => vaguePatterns.test(ln)) && lines.length >= 3) {
    traits.push(l === "en" ? "Specific — concrete and predictable instructions"
      : l === "es" ? "Específico — instrucciones concretas y predecibles"
      : "Específico — instruções concretas e previsíveis");
  }

  const defaultPatterns = /\b(seja útil|be helpful|sé útil|sea útil|seja claro|seja preciso|be accurate|sé preciso)\b/i;
  if (!lines.some((ln) => defaultPatterns.test(ln)) && lines.length >= 3) {
    traits.push(l === "en" ? "No redundancy — doesn't repeat default behaviors"
      : l === "es" ? "Sin redundancia — no repite comportamientos por defecto"
      : "Sem redundância — não repete comportamentos padrão");
  }

  return traits;
}

/*=========================================
// Domain detection by keyword patterns
=========================================*/

const DOMAIN_PATTERNS: Array<{ pattern: RegExp; label: string; labelEn: string }> = [
  { pattern: /\b(veterinári|veterinar|animal|pet|small animal|dog|cat|canin|felin)\b/i, label: "veterinária/medicina animal", labelEn: "veterinary/animal medicine" },
  { pattern: /\b(nutriç|nutricion|dieta\b|suplemento|calóri|nutrition|dietary|supplement\b|calori|macronutri|micronutri)\b/i, label: "nutrição", labelEn: "nutrition" },
  { pattern: /\b(médic[oa]|triagem|diagnóstic|paciente|sintoma|medicament|prescrição|clínic|medical|(?<!(be|being)\s)patient(?!ly)|symptom|diagnosis|prescription)\b/i, label: "saúde/medicina", labelEn: "health/medicine" },
  { pattern: /\b(contábil|contabilidade|tributári|tributaç|imposto|ICMS|ISS|IRPJ|IRPF|obrigaç\w* acessóri|accounting|tax|bookkeeping|fiscal|CPA)\b/i, label: "contabilidade/tributário", labelEn: "accounting/tax" },
  { pattern: /\b(jurídi[co]|legislação|jurisprudência|advogad[oa]?|direito|legal|law|attorney|statute|litigation|abogad[oa]|legislación|jurisprudencia|derecho)\b/i, label: "direito/jurídico", labelEn: "law/legal" },
  { pattern: /\b(real estate|imóve[il]|imobiliári|condo|condomínio residencial|apartamento|broker|listing|zoneamento residencial|zoning|hipoteca|mortgage|corretor de imóveis|escritura|m²|square foot|sqft|price per square foot|cap rate|REIT)\b/i, label: "imobiliário", labelEn: "real estate" },
  { pattern: /\b(agronôm|agronomi|agricultura|agrícol|agricultural|crop|lavoura|safra|defensiv\w* agrícol|inseticid|herbicid|fungicid|praga|pragas|cultivar|cultiv|plantio|colheita|harvest|soja|soybean|milho|maize|trigo|wheat|cana-de-açúcar|sugarcane|fertilizer|fertilizant|irrigaç|irrigation|agronomy|agronomist|agroneg|agribusiness)\b/i, label: "agricultura/agronegócio", labelEn: "agriculture/agribusiness" },
  { pattern: /\b(cinema|cinematogr|filmmak|filmmaker|roteirist|screenwrit|screenplay|roteiro|longa-metragem|curta-metragem|feature film|short film|documentári|documentary|diretor de fotografia|cinematograph|audiovisual|montagem cinematogr|edição de filme|film editing|mise.en.scène)\b/i, label: "cinema/audiovisual", labelEn: "film/audiovisual" },
  { pattern: /\b(petróleo|petroleum|offshore|upstream|downstream|refinaria|refinery|plataforma de petróleo|oil rig|oil platform|oil ?&? ?gas|óleo e gás|sonda de perfuração|drilling rig|well ?head|poço de petróleo|ANP|NR-10|NR-13|NR-20|NR-33|NR-37|HSE|SMS operacional|process safety|segurança operacional)\b/i, label: "energia/petróleo", labelEn: "energy/oil & gas" },
  { pattern: /\b(marketing|campanha|público-alvo|growth|copy|conversão|target audience|campaign)\b/i, label: "marketing", labelEn: "marketing" },
  { pattern: /\b(financ|investiment|rentabilidade|portfolio|financial|investment|asset class|return on investment|ROI|hedge|equity|bonds|stock market|mercado de ações|bolsa de valores|renda fixa|renda variável)\b/i, label: "finanças", labelEn: "finance" },
  { pattern: /\b(pedagóg|aluno|estudante|ensino|didátic|professor|student|teaching|learning)\b/i, label: "educação", labelEn: "education" },
  { pattern: /\b(psicólog|organizacional|clima corporativo|cultura organizacional|recursos humanos|RH|gestão de pessoas|HR|organizational|workplace)\b/i, label: "gestão/pessoas", labelEn: "management/people" },
  { pattern: /\b(engenheiro civil|engenharia civil|estrutural|cálculo de carga|concreto armado|fundação|laje|viga|pilar|structural engineer|civil engineer|structural analysis|load.bearing)\b/i, label: "engenharia civil", labelEn: "civil engineering" },
  { pattern: /\b(arquitet[uo]|urbanis|urban planning|zoneamento|plano diretor)\b/i, label: "arquitetura/urbanismo", labelEn: "architecture/urban planning" },
  { pattern: /\b(jornalis|reportagem|redação jornalística|editor[a ]|pauta|fonte primária|apuração|journalism|reporter|newsroom|editorial|press|fact.check|breaking news)\b/i, label: "jornalismo", labelEn: "journalism" },
  { pattern: /\b(ambiental|environmental|ecolog|biodiversi|carbono|carbon emission|emiss\w* de carbono|sustentabilidade ambiental|environmental impact|impacto ambiental)\b/i, label: "meio ambiente", labelEn: "environmental science" },
  { pattern: /\b(logística|supply chain|cadeia de suprimentos|frete|freight|armazé[nm]|warehouse|distribuição|fulfillment|last.mile)\b/i, label: "logística/supply chain", labelEn: "logistics/supply chain" },
  { pattern: /\b(UX|UI\b|wireframe|usabilidade|usability|protótipo|prototype|user experience|interaction design|design de interface|design system|experiência do usuário|user interface)\b/i, label: "design/UX", labelEn: "design/UX" },
  { pattern: /\b(código|TypeScript|JavaScript|Python|API|deploy|commit|code|function|module|database|architect|scalab|cloud.native|microservic|SOLID)\b/i, label: "programação", labelEn: "programming" },
];

function detectDomain(text: string, lang: "pt" | "en" | "es" = "pt"): string | null {
  for (const { pattern, label, labelEn } of DOMAIN_PATTERNS) {
    if (pattern.test(text)) return lang === "en" ? labelEn : label;
  }
  return null;
}

/*=========================================
// Concrete example per adjustment
=========================================*/

function buildExample(rule: string, items: Diagnostic[], lang: "pt" | "en" | "es" = "pt"): string {
  const first = items[0];
  if (!first || !first.highlight) return "";

  if (lang === "en") {
    const exampleMapEn: Record<string, (d: Diagnostic) => string> = {
      "imperative-overload": (d) =>
        ` E.g.: instead of "${d.highlight}", describe the reason — why does this guidance exist.`,
      "redundant-default": (d) =>
        ` E.g.: "${d.highlight}" is already default behavior — the space could describe something specific to the context.`,
      "vague-instruction": (d) =>
        ` E.g.: "${d.highlight}" is generic — replace with a concrete criterion for the context.`,
      "redundant-repetition": () => "",
      "cognitive-overload": () => "",
      "command-over-question": (d) =>
        ` E.g.: "${d.highlight}" says what, but not why — add the reason.`,
      "threat-framing": (d) =>
        ` E.g.: instead of threatening with "${d.highlight}", describe what matters and why.`,
      "role-inflation": (d) =>
        ` E.g.: "${d.highlight}" doesn't change what the agent does — describe the perspective you actually want instead.`,
      "conditional-reward": (d) =>
        ` E.g.: "${d.highlight}" is empty for a model — describe what's actually at stake instead.`,
      "tone-domain-mismatch": (d) =>
        ` E.g.: instead of "${d.highlight}", describe the underlying purpose — "accessible language that still flags uncertainty".`,
      "contradiction": (d) =>
        ` E.g.: the prompt asks for "${d.highlight}" and its opposite at the same time — pick one as the default and describe when the other applies.`,
    };
    const fn = exampleMapEn[rule];
    return fn ? fn(first) : "";
  }

  if (lang === "es") {
    const exampleMapEs: Record<string, (d: Diagnostic) => string> = {
      "imperative-overload": (d) =>
        ` Ej: en vez de "${d.highlight}", describir el motivo — por qué existe esta orientación.`,
      "redundant-default": (d) =>
        ` Ej: "${d.highlight}" ya es comportamiento por defecto — el espacio puede describir algo específico del contexto.`,
      "vague-instruction": (d) =>
        ` Ej: "${d.highlight}" es genérico — sustituir por un criterio concreto del contexto.`,
      "redundant-repetition": () => "",
      "cognitive-overload": () => "",
      "command-over-question": (d) =>
        ` Ej: "${d.highlight}" dice el qué, pero no el porqué — agregar la razón.`,
      "threat-framing": (d) =>
        ` Ej: en vez de amenazar con "${d.highlight}", describir lo que importa y por qué.`,
      "role-inflation": (d) =>
        ` Ej: "${d.highlight}" no cambia lo que el agente hace — describe la perspectiva que realmente quieres.`,
      "conditional-reward": (d) =>
        ` Ej: "${d.highlight}" es vacío para un modelo — describe lo que está realmente en juego.`,
      "tone-domain-mismatch": (d) =>
        ` Ej: en vez de "${d.highlight}", describir el propósito detrás — "lenguaje accesible que aún señale incertidumbre".`,
      "contradiction": (d) =>
        ` Ej: el prompt pide "${d.highlight}" y lo opuesto al mismo tiempo — elige uno como predeterminado y describe cuándo aplica el otro.`,
    };
    const fn = exampleMapEs[rule];
    return fn ? fn(first) : "";
  }

  const exampleMap: Record<string, (d: Diagnostic) => string> = {
    "imperative-overload": (d) =>
      ` Ex: em vez de "${d.highlight}", descrever o motivo — por que essa orientação existe.`,
    "redundant-default": (d) =>
      ` Ex: "${d.highlight}" já é comportamento padrão — o espaço pode descrever algo específico do contexto.`,
    "vague-instruction": (d) =>
      ` Ex: "${d.highlight}" é genérico — substituir por um critério concreto do contexto.`,
    "redundant-repetition": () => "",
    "cognitive-overload": () => "",
    "command-over-question": (d) =>
      ` Ex: "${d.highlight}" diz o quê, mas não por quê — adicionar o motivo.`,
    "threat-framing": (d) =>
      ` Ex: em vez de ameaçar com "${d.highlight}", descrever o que importa e por quê.`,
    "role-inflation": (d) =>
      ` Ex: "${d.highlight}" não muda o que o agente faz — descreva a perspectiva que você realmente quer.`,
    "conditional-reward": (d) =>
      ` Ex: "${d.highlight}" é vazio para um modelo — descreva o que está realmente em jogo.`,
    "tone-domain-mismatch": (d) =>
      ` Ex: em vez de "${d.highlight}", descrever o propósito por trás — "linguagem acessível que ainda sinaliza incerteza".`,
    "contradiction": (d) =>
      ` Ex: o prompt pede "${d.highlight}" e o oposto ao mesmo tempo — escolha um como padrão e descreva quando o outro se aplica.`,
  };

  const fn = exampleMap[rule];
  return fn ? fn(first) : "";
}

/*=========================================
// Directive texts (single source)
=========================================*/

const DIRECTIVE_TEXT: Record<string, string> = {
  "imperative-overload":
    "Substituir linguagem imperativa (\"nunca\", \"sempre\", \"deve\", " +
    "\"proibido\") por formulações que descrevam o propósito, " +
    "como \"tende a não funcionar bem porque...\". " +
    "Restrições categóricas de ferramenta ou formato " +
    "(ex: \"use TypeScript\", \"responda em JSON\") podem ser mantidas como estão.",

  "redundant-default":
    "Remover instruções que repetem comportamento padrão " +
    "(como \"seja útil\", \"seja claro\") e usar o espaço para " +
    "orientações que genuinamente mudem algo.",

  "cognitive-overload":
    "Reduzir a quantidade de instruções, mantendo apenas as que " +
    "genuinamente mudam o comportamento.",

  "vague-instruction":
    "Substituir instruções genéricas (como \"siga boas práticas\") " +
    "por critérios concretos e verificáveis.",

  "redundant-repetition":
    "Unificar instruções que dizem a mesma coisa com palavras diferentes, " +
    "mantendo apenas a formulação mais clara.",

  "command-over-question":
    "Adicionar o motivo por trás de cada comando direto, " +
    "para que o propósito fique claro.",

  "threat-framing":
    "Remover ameaças condicionais e framing por medo " +
    "('se você errar, as consequências serão graves'). " +
    "Esse tipo de pressão tende a gerar cautela paralisante — " +
    "substituir pela orientação concreta que está por trás da ameaça.",

  "role-inflation":
    "Remover inflação de credenciais ('o melhor do mundo', " +
    "'25 anos de experiência', 'prêmios internacionais') e " +
    "substituir pela perspectiva concreta desejada — qual " +
    "ângulo você quer que o agente assuma.",

  "conditional-reward":
    "Remover promessas condicionais de recompensa " +
    "('vou te dar uma gorjeta', 'avaliação 5 estrelas'). " +
    "Recompensas para um modelo são vazias e deslocam atenção " +
    "do propósito — substituir pela descrição do que importa " +
    "no resultado e por quê.",

  "tone-domain-mismatch":
    "O prompt pede tom casual ou informal num domínio onde a " +
    "formalidade tem função (compliance, risco, responsabilidade). " +
    "Descrever o propósito por trás do tom desejado — 'linguagem " +
    "acessível sem jargão desnecessário, ainda sinalizando " +
    "incerteza' — preserva a acessibilidade sem abrir mão das " +
    "proteções que o domínio pede.",

  "contradiction":
    "Resolver as instruções que se opõem dentro do prompt — ou " +
    "escolher qual lado vence por padrão, ou descrever a condição " +
    "que decide entre os dois. Manter instruções contraditórias " +
    "sem ranquear força o agente a adivinhar e gera respostas " +
    "inconsistentes entre chamadas.",
};

const DIRECTIVE_TEXT_EN: Record<string, string> = {
  "imperative-overload":
    "Replace imperative language (\"never\", \"always\", \"must\", " +
    "\"forbidden\") with formulations that describe the purpose, " +
    "like \"tends not to work well because...\". " +
    "Categorical tool or format constraints " +
    "(e.g., \"use TypeScript\", \"respond in JSON\") can be kept as they are.",

  "redundant-default":
    "Remove instructions that repeat default model behavior " +
    "(like \"be helpful\", \"be clear\") and use the space for " +
    "guidance that genuinely changes something.",

  "cognitive-overload":
    "Reduce the number of instructions, keeping only those that " +
    "genuinely change behavior.",

  "vague-instruction":
    "Replace generic instructions (like \"follow best practices\") " +
    "with concrete, verifiable criteria.",

  "redundant-repetition":
    "Unify instructions that say the same thing with different words, " +
    "keeping only the clearest formulation.",

  "command-over-question":
    "Add the reason behind each direct command, " +
    "so the purpose is clear.",

  "threat-framing":
    "Remove conditional threats and fear-based framing " +
    "('if you fail, consequences will be severe'). " +
    "This kind of pressure tends to generate paralyzing caution — " +
    "replace with the concrete guidance behind the threat.",

  "role-inflation":
    "Remove inflated credentials ('world's best', '25 years of " +
    "experience', 'award-winning') and replace with the concrete " +
    "perspective you actually want — what angle should the agent take.",

  "conditional-reward":
    "Remove conditional reward promises ('I'll tip you', " +
    "'5-star review'). Rewards to a model are empty and shift " +
    "attention away from the purpose — replace with what matters " +
    "in the outcome and why.",

  "tone-domain-mismatch":
    "The prompt asks for a casual or informal tone in a domain " +
    "where formality has a function (compliance, risk, liability). " +
    "Describing the purpose behind the desired tone — 'accessible " +
    "language without unnecessary jargon, still flagging " +
    "uncertainty' — keeps the accessibility without giving up " +
    "the protections the domain requires.",

  "contradiction":
    "Resolve the opposing instructions in the prompt — either pick " +
    "which side wins by default, or describe the condition that " +
    "decides between them. Keeping contradictory instructions " +
    "without ranking forces the agent to guess and produces " +
    "inconsistent answers across calls.",
};

const DIRECTIVE_TEXT_ES: Record<string, string> = {
  "imperative-overload":
    "Sustituir lenguaje imperativo (\"nunca\", \"siempre\", \"debe\", " +
    "\"prohibido\") por formulaciones que describan el propósito, " +
    "como \"tiende a no funcionar bien porque...\". " +
    "Restricciones categóricas de herramienta o formato " +
    "(ej: \"usa TypeScript\", \"responde en JSON\") pueden mantenerse como están.",

  "redundant-default":
    "Eliminar instrucciones que repiten comportamiento por defecto " +
    "(como \"sé útil\", \"sé claro\") y usar el espacio para " +
    "orientaciones que genuinamente cambien algo.",

  "cognitive-overload":
    "Reducir la cantidad de instrucciones, manteniendo solo las que " +
    "genuinamente cambian el comportamiento.",

  "vague-instruction":
    "Sustituir instrucciones genéricas (como \"sigue buenas prácticas\") " +
    "por criterios concretos y verificables.",

  "redundant-repetition":
    "Unificar instrucciones que dicen lo mismo con palabras diferentes, " +
    "manteniendo solo la formulación más clara.",

  "command-over-question":
    "Agregar la razón detrás de cada comando directo, " +
    "para que el propósito quede claro.",

  "threat-framing":
    "Eliminar amenazas condicionales y encuadre por miedo " +
    "('si fallas, las consecuencias serán graves'). " +
    "Este tipo de presión tiende a generar cautela paralizante — " +
    "sustituir por la orientación concreta detrás de la amenaza.",

  "role-inflation":
    "Eliminar inflación de credenciales ('el mejor del mundo', " +
    "'25 años de experiencia', 'premios internacionales') y " +
    "sustituir por la perspectiva concreta deseada — qué " +
    "ángulo quieres que el agente asuma.",

  "conditional-reward":
    "Eliminar promesas condicionales de recompensa " +
    "('te daré una propina', 'calificación 5 estrellas'). " +
    "Las recompensas para un modelo son vacías y desplazan la atención " +
    "del propósito — sustituir por la descripción de lo que importa " +
    "en el resultado y por qué.",

  "tone-domain-mismatch":
    "El prompt pide tono casual o informal en un dominio donde la " +
    "formalidad tiene función (cumplimiento, riesgo, responsabilidad). " +
    "Describir el propósito detrás del tono deseado — 'lenguaje " +
    "accesible sin jerga innecesaria, aún señalando " +
    "incertidumbre' — preserva la accesibilidad sin renunciar a las " +
    "protecciones que el dominio requiere.",

  "contradiction":
    "Resolver las instrucciones que se oponen dentro del prompt — o " +
    "elegir qué lado gana por defecto, o describir la condición " +
    "que decide entre los dos. Mantener instrucciones contradictorias " +
    "sin jerarquizar fuerza al agente a adivinar y produce " +
    "respuestas inconsistentes entre llamadas.",
};
