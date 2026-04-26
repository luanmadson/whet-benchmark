/**
 * Vocabulário do sistema.
 *
 * Define os tipos que todas as camadas usam pra se comunicar.
 * Nenhuma lógica aqui — só formatos.
 */

/*=========================================
// Tipos base
=========================================*/

// Quão grave é o problema encontrado
export type Severity = "error" | "warning" | "info";

// Um problema encontrado no prompt
export interface Diagnostic {
  rule: string;        // qual regra encontrou ("imperative-overload")
  severity: Severity;
  line?: number;       // onde no texto (opcional — regras globais não têm linha)
  original: string;    // o trecho problemático
  highlight?: string;  // palavra/trecho especifico que disparou a regra
  reason: string;      // por que é problema (a experiência por trás)
  suggestion: string;  // reescrita ou caminho concreto
  tip?: string; // orientação de reformulação alinhada à filosofia do sistema
}

/*=========================================
// Utilitario: split de texto em instrucoes
=========================================*/

/**
 * Divide texto em instrucoes individuais.
 * Cada linha vira uma ou mais instrucoes (split por sentenca quando a linha e longa).
 * Retorna pares [lineNumber, instructionText].
 */
export function splitIntoStatements(text: string): Array<{ line: number; text: string }> {
  const lines = text.split("\n");
  const result: Array<{ line: number; text: string }> = [];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("#")) continue;

    // Se a linha tem multiplas sentencas, split por ponto/exclamacao/interrogacao seguido de espaco
    const sentences = trimmed.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);
    if (sentences.length > 1) {
      for (const sentence of sentences) {
        result.push({ line: i + 1, text: sentence.trim() });
      }
    } else {
      result.push({ line: i + 1, text: trimmed });
    }
  }

  return result;
}

/*=========================================
// Deteccao de idioma do texto
=========================================*/

/**
 * Detecta se o texto é predominantemente em português, espanhol ou inglês.
 * Usado pelas regras e pelo renderer para gerar texto no idioma correto.
 */
export function detectLanguage(text: string): "pt" | "en" | "es" {
  const ptMarkers = /\b(você|voce|não|nao|instrução|instruções|seja|responda|considere|mantenha|evite|utilize|é obrigatório|também|então|porquê)\b/gi;
  const esMarkers = /\b(usted|tú|debes|deberías|siempre|nunca|asegúrate|asegurate|proporciona|incluye|responde|utiliza|instrucción|instrucciones|además|también|según|también|entonces|obligatorio|prohibido|hacia|está)\b/gi;
  const enMarkers = /\b(you|your|must|should|always|never|ensure|provide|maintain|avoid|consider|follow|when|the|this|that|with|from)\b/gi;

  const ptCount = (text.match(ptMarkers) || []).length;
  const esCount = (text.match(esMarkers) || []).length;
  const enCount = (text.match(enMarkers) || []).length;

  if (esCount > ptCount && esCount > enCount) return "es";
  return ptCount >= enCount ? "pt" : "en";
}

/*=========================================
// Contexto pre-computado da analise
=========================================*/

/**
 * Dados calculados uma unica vez no inicio de analyze() e
 * compartilhados com todas as regras — evita re-computar
 * detectLanguage e splitIntoStatements em cada regra.
 */
export interface AnalysisContext {
  text: string;
  statements: Array<{ line: number; text: string }>;
  lang: "pt" | "en" | "es";
}

/*=========================================
// Contrato das regras
=========================================*/

export interface Rule {
  name: string;          // identificador ("imperative-overload")
  description: string;   // a situação que endereça (pro usuário entender "quando isso é útil pra mim?")
  severity: Severity;    // severidade padrão dos diagnósticos dessa regra
  analyze: (text: string, ctx: AnalysisContext) => Diagnostic[];
}

/*=========================================
// Resultado da analise
=========================================*/

export interface AnalysisResult {
  score: number;           // 0-100
  diagnostics: Diagnostic[];
  output: string;          // meta-prompt de reescrita — instrução de correção enviada a outro LLM
  originalText: string;    // texto original analisado
  positiveTraits: string[]; // pontos positivos do prompt (quando limpo)
}
