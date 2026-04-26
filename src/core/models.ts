/**
 * System vocabulary.
 *
 * Defines the types every layer uses to communicate.
 * No logic here — just shapes.
 */

/*=========================================
// Base types
=========================================*/

// How serious the issue found is
export type Severity = "error" | "warning" | "info";

// An issue found in the prompt
export interface Diagnostic {
  rule: string;        // which rule found it ("imperative-overload")
  severity: Severity;
  line?: number;       // where in the text (optional — global rules have no line)
  original: string;    // the problematic excerpt
  highlight?: string;  // specific word/excerpt that triggered the rule
  reason: string;      // why it's a problem (the experience behind it)
  suggestion: string;  // rewrite or concrete path forward
  tip?: string; // reformulation guidance aligned with the system's philosophy
}

/*=========================================
// Utility: split text into statements
=========================================*/

/**
 * Splits text into individual statements.
 * Each line becomes one or more statements (split by sentence when the line is long).
 * Returns pairs [lineNumber, instructionText].
 */
export function splitIntoStatements(text: string): Array<{ line: number; text: string }> {
  const lines = text.split("\n");
  const result: Array<{ line: number; text: string }> = [];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("#")) continue;

    // If the line has multiple sentences, split on period/exclamation/question followed by whitespace
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
// Text language detection
=========================================*/

/**
 * Detects whether the text is predominantly Portuguese, Spanish, or English.
 * Used by the rules and the renderer to produce text in the correct language.
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
// Pre-computed analysis context
=========================================*/

/**
 * Data computed once at the start of analyze() and shared
 * with every rule — avoids re-running detectLanguage and
 * splitIntoStatements inside each rule.
 */
export interface AnalysisContext {
  text: string;
  statements: Array<{ line: number; text: string }>;
  lang: "pt" | "en" | "es";
}

/*=========================================
// Rule contract
=========================================*/

export interface Rule {
  name: string;          // identifier ("imperative-overload")
  description: string;   // the situation it addresses (so the user knows "when is this useful for me?")
  severity: Severity;    // default severity for diagnostics from this rule
  analyze: (text: string, ctx: AnalysisContext) => Diagnostic[];
}

/*=========================================
// Analysis result
=========================================*/

export interface AnalysisResult {
  score: number;           // 0-100
  diagnostics: Diagnostic[];
  output: string;          // rewrite meta-prompt — correction instruction sent to another LLM
  originalText: string;    // original analyzed text
  positiveTraits: string[]; // positive aspects of the prompt (when clean)
}
