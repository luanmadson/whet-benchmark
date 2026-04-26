/**
 * Rule: tone-domain-mismatch
 *
 * Situation: prompts in sensitive domains (law, health, finance,
 * accounting/tax) that ask for casual, informal, slangy, or emoji tone.
 * In domains where communication errors have real cost (compliance,
 * clinical risk, civil liability), a casual tone tends to undermine
 * trust, mask uncertainty, and enable misunderstanding. The rule
 * doesn't forbid — it flags the conflict so the prompt author can
 * decide consciously.
 */

import type { AnalysisContext, Diagnostic, Rule } from "../models";

/*=========================================
// Sensitive domains
=========================================*/

// Pairs of sensitive-domain patterns + label. Deliberately more
// restrictive than the renderer's generic detection — only domains
// where formality has a function (compliance, risk, accountability)
// belong here.
const SENSITIVE_DOMAINS: Array<{ pattern: RegExp; label: string; labelEn: string; labelEs: string }> = [
  {
    pattern: /\b(jurídi[co]|legislação|jurisprudência|advogad[oa]?|direito|CLT|rescisão|legal|law|attorney|statute|litigation|contract law|abogad[oa]|legislación|jurisprudencia|derecho)\b/i,
    label: "jurídico",
    labelEn: "legal",
    labelEs: "jurídico/legal",
  },
  {
    pattern: /\b(médic[oa]|triagem|diagnóstic|paciente|sintoma|medicament|prescrição|clínic|medical|triage|patient|symptom|diagnosis|prescription|clinical|diagnóstico médico|síntoma|medicamento|prescripción|clínic[oa])\b/i,
    label: "saúde",
    labelEn: "health",
    labelEs: "salud",
  },
  {
    pattern: /\b(financ|investiment|rentabilidade|portfolio|hedge|financial|investment|asset class|portfolio|ROI|inversión|rentabilidad|cartera de inversión)\b/i,
    label: "finanças",
    labelEn: "finance",
    labelEs: "finanzas",
  },
  {
    pattern: /\b(contábil|contabilidade|tributári|tributaç|imposto|ICMS|ISS|IRPJ|IRPF|accounting|tax|bookkeeping|fiscal|contable|contabilidad|tributari[oa]|impuesto)\b/i,
    label: "contábil/tributário",
    labelEn: "accounting/tax",
    labelEs: "contable/tributario",
  },
];

/*=========================================
// Casual-tone markers
=========================================*/

// Each pattern corresponds to an explicit signal of informal tone.
const CASUAL_TONE_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\btom (casual|descontraíd[oa]|informal|relaxad[oa]|leve|divertid[oa])\b/i, label: "tom casual" },
  { pattern: /\bde forma (descontraíd[oa]|informal|casual|relaxad[oa])\b/i, label: "de forma descontraída" },
  { pattern: /\busa?r? gírias\b/i, label: "gírias" },
  { pattern: /\bemoj[ií]s?\b/i, label: "emojis" },
  { pattern: /\bcomo (um|uma) amig[oa]\b/i, label: "como um amigo" },
  { pattern: /\b(fala|falar|fale) como (um|uma)? ?amig[oa]\b/i, label: "fale como amigo" },
  { pattern: /\b(no |via |pelo |)whatsapp\b/i, label: "whatsapp" },
  { pattern: /\bsem (usar )?(linguagem )?formal\b/i, label: "sem linguagem formal" },
  { pattern: /\bsem jargão\b/i, label: "sem jargão" },
  { pattern: /\bcasual(?: |,|\.|$)/i, label: "casual" },
  { pattern: /\bchill\b/i, label: "chill" },
  { pattern: /\brelaxed\b/i, label: "relaxed" },
  { pattern: /\binformal (tone|voice|style)\b/i, label: "informal tone" },
  { pattern: /\bplayful\b/i, label: "playful" },
  { pattern: /\bemojis?\b/i, label: "emojis" },
  { pattern: /\blike a friend\b/i, label: "like a friend" },
  { pattern: /\btext(ing)? (a friend|like)\b/i, label: "texting a friend" },
  { pattern: /\bdrop the (formal|jargon)/i, label: "drop the formal" },
  { pattern: /\btalk like\b/i, label: "talk like" },
  // --- ES patterns ---
  { pattern: /\btono (casual|informal|relajad[oa]|desenfadad[oa]|divertid[oa])\b/i, label: "tono casual" },
  { pattern: /\bde manera (relajada|informal|desenfadada)\b/i, label: "de manera relajada" },
  { pattern: /\bde forma (divertida|informal|casual|relajada|desenfadada)\b/i, label: "de forma divertida" },
  { pattern: /\busa[r]? (argot|jerga)\b/i, label: "usa argot/jerga" },
  { pattern: /\blenguaje coloquial\b/i, label: "lenguaje coloquial" },
  { pattern: /\bcomo (un|una) amig[oa]\b/i, label: "como un amigo" },
  { pattern: /\b(háblame|habla|hablá) como (un |una )?amig[oa]\b/i, label: "háblame como amigo" },
  { pattern: /\bcomo si fueras mi amig[oa]\b/i, label: "como si fueras mi amigo" },
  { pattern: /\bsin formalidades\b/i, label: "sin formalidades" },
  { pattern: /\bsin lenguaje formal\b/i, label: "sin lenguaje formal" },
  { pattern: /\bnada formal\b/i, label: "nada formal" },
  { pattern: /\bcon humor\b/i, label: "con humor" },
];

/*=========================================
// Exported rule
=========================================*/

export const toneDomainMismatch: Rule = {
  name: "tone-domain-mismatch",
  description:
    "Casual tone explicitly requested in a sensitive domain (legal, health, " +
    "finance, accounting) where formality has a function — compliance, " +
    "clinical risk, accountability — and informality tends to undermine trust",
  severity: "warning",

  analyze(text: string, ctx: AnalysisContext): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    const lang = ctx.lang;

    // 1. Identify the sensitive domain, if any
    const domainMatch = SENSITIVE_DOMAINS.find((d) => d.pattern.test(text));
    if (!domainMatch) return diagnostics;
    const domainLabel = lang === "en" ? domainMatch.labelEn : lang === "es" ? domainMatch.labelEs : domainMatch.label;

    // 2. For each statement, look for a casual-tone marker
    const statements = ctx.statements;
    for (const stmt of statements) {
      for (const { pattern, label } of CASUAL_TONE_PATTERNS) {
        const match = stmt.text.match(pattern);
        if (!match) continue;
        diagnostics.push({
          rule: "tone-domain-mismatch",
          severity: "warning",
          line: stmt.line,
          original: stmt.text,
          highlight: match[0],
          reason:
            lang === "en"
              ? `The prompt is aimed at the ${domainLabel} domain but explicitly ` +
                `asks for a casual or informal tone ("${match[0]}"). In domains ` +
                "where miscommunication has real cost (compliance, clinical risk, " +
                "civil liability), an informal tone tends to undermine trust, " +
                "obscure uncertainty, and invite misunderstanding. The concern " +
                "isn't formality for its own sake — it's that the user may read " +
                "a casual answer as less consequential than it actually is."
              : lang === "es"
              ? `El prompt apunta al dominio ${domainLabel} pero pide ` +
                `explícitamente un tono casual o informal ("${match[0]}"). En dominios ` +
                "donde un error de comunicación tiene un costo real (cumplimiento, " +
                "riesgo clínico, responsabilidad civil), un tono informal tiende a " +
                "minar la confianza, disfrazar la incertidumbre y facilitar " +
                "malentendidos. No se trata de formalidad por sí misma — es que el " +
                "usuario puede interpretar una respuesta casual como menos importante " +
                "de lo que realmente es."
              : `O prompt é voltado para o domínio ${domainLabel} mas pede ` +
                `explicitamente tom casual ou informal ("${match[0]}"). Em domínios ` +
                "onde erro de comunicação tem custo real (compliance, risco clínico, " +
                "responsabilidade civil), tom informal tende a minar a confiança, " +
                "disfarçar a incerteza e facilitar mal-entendidos. Não se trata de " +
                "formalidade por formalidade — é que o usuário pode ler uma resposta " +
                "casual como menos consequente do que ela de fato é.",
          suggestion:
            lang === "en"
              ? "Consider what the casual tone is actually for — making the user " +
                "comfortable is legitimate — and describe that purpose instead of " +
                'the tone itself. E.g.: "answers should be accessible and avoid ' +
                'unnecessary jargon, while still citing sources and flagging ' +
                'uncertainty".'
              : lang === "es"
              ? "Considerar para qué sirve realmente el tono casual — hacer que el " +
                "usuario se sienta cómodo es legítimo — y describir ese propósito " +
                'en vez del tono en sí. Ej.: "las respuestas deben ser accesibles y ' +
                'evitar jerga innecesaria, pero citando fuentes y señalando ' +
                'incertidumbre".'
              : "Considerar para que o tom casual serve — deixar o usuário à " +
                "vontade é legítimo — e descrever esse propósito em vez do tom " +
                'em si. Ex: "respostas devem ser acessíveis e evitar jargão ' +
                'desnecessário, mas ainda citar fontes e sinalizar incerteza".',
          tip:
            lang === "en"
              ? 'Replace "casual tone" with the underlying purpose: "accessible ' +
                'language, clear about uncertainty". That keeps the accessibility ' +
                "without losing the protections the domain needs."
              : lang === "es"
              ? 'Reemplazar "tono casual" por el propósito subyacente: "lenguaje ' +
                'accesible, claro sobre la incertidumbre". Así se mantiene la ' +
                "accesibilidad sin perder las protecciones que el dominio necesita."
              : 'Substituir "tom casual" pelo propósito por trás: "linguagem ' +
                'acessível, clara sobre incerteza". Preserva a acessibilidade ' +
                "sem abrir mão das proteções que o domínio pede.",
        });
        break; // só um marcador por sentença
      }
    }

    return diagnostics;
  },
};
