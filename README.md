# Whet Benchmark

[![npm](https://img.shields.io/npm/v/@trywhet/cli?color=3b82f6&label=%40trywhet%2Fcli)](https://www.npmjs.com/package/@trywhet/cli)
[![license](https://img.shields.io/npm/l/@trywhet/cli?color=64748b)](./LICENSE)

**Whet is a benchmark.** It measures how well each LLM can sharpen a poorly-written prompt without destroying the original intent — *meta-prompt-following under pressure to preserve purpose*. It's a gap that MMLU, HumanEval and HLE don't cover: traditional benchmarks measure what the model knows or can generate, not how well it understands a bad instruction and reformulates it without losing what mattered.

Open methodology, open data, open code (this repo). Every run is reproducible from `corpus.json` and `runner.js`. The before-after delta — `86 → 100` — is the core metric; the higher and more stable across different models, the stronger the evidence that the patterns this catalog targets are real and transferable.

Live results at **[trywhet.com/whet-benchmark](https://trywhet.com/whet-benchmark)**.

## What lives here

```
src/
├── core/             Linter engine — 12 rules + analyzer + renderer + i18n
└── cli/              Terminal entry point
bin/
└── whet.js           Wrapper pointing at the compiled bundle in dist/cli/
whorl/
└── benchmark/        Cross-model benchmark runner
    ├── runner.js          CLI runner (--providers, --prompts, --dry-run)
    ├── corpus.json        Deliberately bad prompts (rotating)
    ├── results.json       Cumulative history of every run
    ├── providers/         Per-provider adapters (Gemini, Mistral, Groq, …)
    ├── README.md          Thesis, methodology, editorial decisions
    └── PROVIDERS-BACKLOG.md  Notes on candidate / standby providers
tests/                 109 unit tests + CLI integration
package.json           Publishes @trywhet/cli on npm
tsconfig.cli.json      Compiles core + cli into dist/
```

## CLI

```bash
# Quick use (no permanent install)
npx @trywhet/cli prompt.txt
echo "You are the world's best..." | npx @trywhet/cli -

# Global install
npm install -g @trywhet/cli
whet prompt.txt

# JSON output for integration
whet prompt.txt --json
```

Exit code 0 when the score is ≥ 90, 1 between 60 and 89, 2 below 60 or on errors — designed to slot into a pre-commit step or CI check. ANSI-colored output in a TTY, plain text when stdout is piped or redirected.

## Running the benchmark

```bash
git clone https://github.com/luanmadson/whet-benchmark
cd whet-benchmark
npm install
cat > .env.local <<EOF
GEMINI_API_KEY=...      # https://aistudio.google.com/app/apikey
MISTRAL_API_KEY=...     # https://console.mistral.ai/api-keys
GROQ_API_KEY=...        # https://console.groq.com/keys
DEEPSEEK_API_KEY=...    # https://platform.deepseek.com (top-up $2)
AI21_API_KEY=...        # https://studio.ai21.com/account/api-key
COHERE_API_KEY=...      # https://dashboard.cohere.com (1k req/month trial)
OPENAI_API_KEY=...      # https://platform.openai.com (top-up $5)
EOF

npm run benchmark:dry         # lists which providers are configured
npm run benchmark             # runs the current 12 prompts on all of them
node whorl/benchmark/runner.js --providers=gemini,claude-cli
```

A provider with no key configured is silently skipped. Claude via CLI rides on the existing Claude Code subscription — no key needed.

## Rules detected

12 static rules, each rooted in observed failure modes (criteria in `whorl/benchmark/README.md`):

| Rule | Targets |
|---|---|
| `redundant-default` | Instructions that repeat behavior the model already does by default |
| `imperative-overload` | Excess of ALWAYS/NEVER/MUST that paralyzes the agent |
| `cognitive-overload` | Instruction volume above the effectiveness limit (with tolerance for well-structured prompts) |
| `contradiction` | Pairs of opposing instructions in the same prompt |
| `vague-instruction` | Instructions too generic to have any real effect |
| `redundant-repetition` | Same idea restated in different words |
| `command-over-question` | Commands without an explained purpose |
| `threat-framing` | Threats that produce paralyzing caution rather than guidance |
| `role-inflation` | Credential inflation that doesn't change behavior |
| `conditional-reward` | Promises of reward that mean nothing to a model |
| `tone-domain-mismatch` | Casual tone in sensitive domains (legal, health, finance) |
| `unresolved-reference` | References to external artifacts that aren't provided |

PT, EN, and ES — every rule covers the three languages. Philosophy details, criteria for adding new rules, and examples in `whorl/benchmark/README.md`.

## Thesis and limitations

Quick version:

- **What it is.** A cumulative cross-model benchmark on deliberately-bad prompts, with before/after scores from a local linter, aggregated per provider and per round.
- **What it measures.** Meta-prompt-following under pressure to preserve intent. The ability to sharpen a bad input without destroying its purpose.
- **What it does NOT measure.** Absolute output quality, raw reasoning capability, or factual knowledge. Those angles belong to other benchmarks (MMLU, HumanEval, HLE, Tau-bench).
- **Honest limitation.** The score is internally consistent but not absolute — it's an aggregate of how many cataloged patterns were resolved. As an academic benchmark or a definitive verdict, it doesn't replace human judgment. As a reproducible, cumulative reference for actual prompt-rewriting behavior, it's a signal that few benchmarks generate.

Full thesis in `whorl/benchmark/README.md`. Editorial coverage and movement in the [blog](https://trywhet.com/blog).

## Contributing

Issues and PRs welcome. Before opening:

- **New rule:** read the 5 criteria in `whorl/benchmark/README.md` (doesn't duplicate model defaults, grounded in real cases, changes behavior, self-sufficient, declared tensions). Without that, the rule won't merge.
- **New provider:** read `whorl/benchmark/PROVIDERS-BACKLOG.md` to check if it's already noted, free tier validated, etc.
- **Bug:** most useful with a prompt + expected vs actual output.

## Site and product

This repository holds the **benchmark** — engine, runner, corpus, results. The **site** (`trywhet.com`) with its interactive playground, live ranking, and editorial blog lives in a separate private repo and consumes this one as an npm package. The split is deliberate: anti-abuse logic, production secrets, and UI stay closed; what matters for anyone citing the benchmark stays open.

## License

MIT. Details in `LICENSE`.
