//=========================================
// Namespace cli
// Entry point do Whet como ferramenta de linha de comando.
// Reutiliza o core integralmente — nenhuma regra é reimplementada aqui.
//=========================================

import { readFileSync } from "node:fs";
import { analyze } from "../core/analyzer";
import type { Diagnostic } from "../core/models";

/*=========================================
// ANSI helpers (sem depender de chalk/picocolors)
=========================================*/

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const BLUE = "\x1b[34m";
const GREEN = "\x1b[32m";
const GRAY = "\x1b[90m";

const SEVERITY_COLOR: Record<Diagnostic["severity"], string> = {
  error: RED,
  warning: YELLOW,
  info: BLUE,
};

const SEVERITY_TAG: Record<Diagnostic["severity"], string> = {
  error: "ERROR  ",
  warning: "WARNING",
  info: "INFO   ",
};

function colorize(color: string, text: string): string {
  if (!process.stdout.isTTY) return text;
  return `${color}${text}${RESET}`;
}

/*=========================================
// Leitura de input (arquivo, stdin, inline)
=========================================*/

async function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolve(data));
  });
}

function usage(): string {
  return [
    "whet — analisa um system prompt e imprime os problemas encontrados",
    "",
    "Uso:",
    "  whet <arquivo.txt>        Analisa o conteúdo do arquivo",
    "  whet -                    Lê o prompt de stdin",
    "  whet --help               Mostra esta mensagem",
    "",
    "Flags:",
    "  --json                    Emite o resultado completo em JSON (sem cores)",
    "  --no-reverse              Oculta a instrução de correção",
    "",
    "Saída:",
    "  Código 0  — score ≥ 90 (prompt saudável)",
    "  Código 1  — score 60–89 (tem avisos)",
    "  Código 2  — score < 60 ou contém erros",
  ].join("\n");
}

/*=========================================
// Formatacao do output human-readable
=========================================*/

function scoreBand(score: number): string {
  if (score >= 90) return colorize(GREEN, `${score}/100 ok`);
  if (score >= 60) return colorize(YELLOW, `${score}/100 atenção`);
  return colorize(RED, `${score}/100 crítico`);
}

function formatDiagnostic(d: Diagnostic): string {
  const tag = colorize(SEVERITY_COLOR[d.severity] + BOLD, `[${SEVERITY_TAG[d.severity]}]`);
  const rule = colorize(DIM, d.rule);
  const location = d.line ? colorize(DIM, ` (linha ${d.line})`) : "";
  const lines: string[] = [`${tag} ${rule}${location}`];
  lines.push(`  ${colorize(GRAY, "trecho:")} ${d.original}`);
  if (d.highlight) lines.push(`  ${colorize(GRAY, "gatilho:")} ${colorize(SEVERITY_COLOR[d.severity], d.highlight)}`);
  lines.push(`  ${colorize(GRAY, "sugestão:")} ${d.suggestion}`);
  if (d.tip) lines.push(`  ${colorize(GRAY, "dica:")} ${d.tip}`);
  return lines.join("\n");
}

function render(text: string, opts: { json: boolean; noReverse: boolean }): { output: string; code: number } {
  const result = analyze(text);

  if (opts.json) {
    return {
      output: JSON.stringify(
        {
          score: result.score,
          diagnostics: result.diagnostics,
          positiveTraits: result.positiveTraits,
          output: result.output,
        },
        null,
        2,
      ),
      code: result.score >= 90 ? 0 : result.score >= 60 ? 1 : 2,
    };
  }

  const parts: string[] = [];
  parts.push(`${colorize(BOLD, "whet")} · ${scoreBand(result.score)}`);

  if (result.diagnostics.length === 0) {
    parts.push("");
    parts.push(colorize(GREEN, "nenhum padrão problemático detectado"));
    if (result.positiveTraits.length > 0) {
      parts.push("");
      parts.push(colorize(DIM, "pontos positivos:"));
      for (const trait of result.positiveTraits) {
        parts.push(`  ${colorize(GREEN, "·")} ${trait}`);
      }
    }
  } else {
    const counts = { error: 0, warning: 0, info: 0 };
    for (const d of result.diagnostics) counts[d.severity]++;
    parts.push(
      colorize(DIM, `${counts.error} erro(s), ${counts.warning} aviso(s), ${counts.info} sugestão(ões)`),
    );
    parts.push("");
    for (const d of result.diagnostics) {
      parts.push(formatDiagnostic(d));
      parts.push("");
    }
    if (!opts.noReverse) {
      parts.push(colorize(BOLD, "instrução de correção (cole na sua IA):"));
      parts.push("");
      parts.push(result.output);
    }
  }

  const code = result.score >= 90 ? 0 : result.score >= 60 ? 1 : 2;
  return { output: parts.join("\n"), code };
}

/*=========================================
// Main
=========================================*/

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write(usage() + "\n");
    process.exit(argv.length === 0 ? 1 : 0);
  }

  const json = argv.includes("--json");
  const noReverse = argv.includes("--no-reverse");
  const positional = argv.filter((a) => !a.startsWith("-") || a === "-");

  if (positional.length === 0) {
    process.stderr.write(colorize(RED, "erro: informe um arquivo ou use '-' para ler do stdin") + "\n");
    process.exit(2);
  }

  const source = positional[0];
  let text: string;
  try {
    text = source === "-" ? await readStdin() : readFileSync(source, "utf8");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(colorize(RED, `erro ao ler ${source}: ${msg}`) + "\n");
    process.exit(2);
  }

  if (!text.trim()) {
    process.stderr.write(colorize(RED, "erro: input vazio") + "\n");
    process.exit(2);
  }

  const { output, code } = render(text, { json, noReverse });
  process.stdout.write(output + "\n");
  process.exit(code);
}

main();
