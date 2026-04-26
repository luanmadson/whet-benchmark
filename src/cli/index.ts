//=========================================
// Namespace cli
// Entry point for Whet as a command-line tool.
// Reuses the core fully — no rule is reimplemented here.
//=========================================

import { readFileSync } from "node:fs";
import { analyze } from "../core/analyzer";
import type { Diagnostic } from "../core/models";

/*=========================================
// ANSI helpers (no chalk/picocolors dependency)
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
// Input reading (file, stdin, inline)
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
    "whet — analyzes a system prompt and prints the issues found",
    "",
    "Usage:",
    "  whet <file.txt>           Analyze the file's contents",
    "  whet -                    Read the prompt from stdin",
    "  whet --help               Show this message",
    "",
    "Flags:",
    "  --json                    Emit the full result as JSON (no colors)",
    "  --no-reverse              Hide the correction instruction",
    "",
    "Exit codes:",
    "  0  — score ≥ 90 (healthy prompt)",
    "  1  — score 60–89 (has warnings)",
    "  2  — score < 60 or contains errors",
  ].join("\n");
}

/*=========================================
// Human-readable output formatting
=========================================*/

function scoreBand(score: number): string {
  if (score >= 90) return colorize(GREEN, `${score}/100 ok`);
  if (score >= 60) return colorize(YELLOW, `${score}/100 attention`);
  return colorize(RED, `${score}/100 critical`);
}

function formatDiagnostic(d: Diagnostic): string {
  const tag = colorize(SEVERITY_COLOR[d.severity] + BOLD, `[${SEVERITY_TAG[d.severity]}]`);
  const rule = colorize(DIM, d.rule);
  const location = d.line ? colorize(DIM, ` (line ${d.line})`) : "";
  const lines: string[] = [`${tag} ${rule}${location}`];
  lines.push(`  ${colorize(GRAY, "excerpt:")} ${d.original}`);
  if (d.highlight) lines.push(`  ${colorize(GRAY, "trigger:")} ${colorize(SEVERITY_COLOR[d.severity], d.highlight)}`);
  lines.push(`  ${colorize(GRAY, "suggestion:")} ${d.suggestion}`);
  if (d.tip) lines.push(`  ${colorize(GRAY, "tip:")} ${d.tip}`);
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
    parts.push(colorize(GREEN, "no problematic patterns detected"));
    if (result.positiveTraits.length > 0) {
      parts.push("");
      parts.push(colorize(DIM, "positive traits:"));
      for (const trait of result.positiveTraits) {
        parts.push(`  ${colorize(GREEN, "·")} ${trait}`);
      }
    }
  } else {
    const counts = { error: 0, warning: 0, info: 0 };
    for (const d of result.diagnostics) counts[d.severity]++;
    parts.push(
      colorize(DIM, `${counts.error} error(s), ${counts.warning} warning(s), ${counts.info} suggestion(s)`),
    );
    parts.push("");
    for (const d of result.diagnostics) {
      parts.push(formatDiagnostic(d));
      parts.push("");
    }
    if (!opts.noReverse) {
      parts.push(colorize(BOLD, "correction instruction (paste into your AI):"));
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
    process.stderr.write(colorize(RED, "error: pass a file or use '-' to read from stdin") + "\n");
    process.exit(2);
  }

  const source = positional[0];
  let text: string;
  try {
    text = source === "-" ? await readStdin() : readFileSync(source, "utf8");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(colorize(RED, `error reading ${source}: ${msg}`) + "\n");
    process.exit(2);
  }

  if (!text.trim()) {
    process.stderr.write(colorize(RED, "error: empty input") + "\n");
    process.exit(2);
  }

  const { output, code } = render(text, { json, noReverse });
  process.stdout.write(output + "\n");
  process.exit(code);
}

main();
