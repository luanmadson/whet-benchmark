# Whet Benchmark

**The Whet Benchmark measures how well an LLM can sharpen a poorly-written prompt without destroying the original intent.** It's a core skill in the prompt-engineering-by-LLM category (DSPy, OPRO, PRewrite, PromptWizard, meta-prompting) that no public benchmark evaluates directly — MMLU measures knowledge, HumanEval measures code, needle-in-haystack measures attention in long context, τ-bench measures agentic behavior. *Meta-prompt-following under pressure to preserve intent* is a gap, and the Whet Benchmark exists to fill it.

The operational form is a delta. For each pair (prompt × provider):

```
scoreBefore  ──►  [model receives a rewrite meta-prompt]  ──►  scoreAfter
     (linter diagnoses)                                         (linter re-diagnoses)
                       Δ = scoreAfter − scoreBefore
```

Δ is what the benchmark measures. High and stable Δ across multiple models = the patterns the linter catalogs are real and transferable. Low or noisy Δ = the model failed to follow a meta-instruction without dropping purpose — and that's exactly the signal we want to capture.

## What the Whet Benchmark actually measures

Four axes, none of them measured publicly by other benchmarks:

**1. Instruction-following under adversarial meta-instruction.** The model receives an order asking it to rewrite **a second piece of text** (the user's original prompt) applying specific changes without destroying the intent. That puts the model in triple tension: obey the meta-instruction, respect the target's purpose, and resist the default instinct to "be helpful" by reformulating liberally. It's a setup no public dataset evaluates — and it's exactly the setup where prompt-optimization-by-LLM tools live.

**2. Intent preservation under pressure to change.** The default instinct of any modern LLM asked to "improve" a text is to rewrite freely — add caveats, soften tone, inflate structure. The rewrite meta-prompt asks the opposite: change what's needed, preserve the rest. How well a model can resist its own RLHF training is a non-trivial, under-studied question. Δ is a direct proxy for it.

**3. Quantifiable delta on a single instrument.** Score before → score after, the same deterministic ruler, the same 12-pattern base. Most evaluations of prompt rewriting use human judgment or LLM-as-judge — expensive, slow, noisy. The Whet Benchmark replaces that with a ruler anyone can reproduce in seconds, with a rotating corpus and an open runner.

**4. Two complementary samplings.** A rotating corpus (12 fresh prompts per run, 4 profiles × 3 languages, covering all 12 linter rules each run, never repeating prompts across runs) gives ecological breadth. The live ranking (rolling 30 days, real user calls) gives organic distribution. Together they triangulate: the corpus answers *"does it actually generalize?"* and live answers *"does it survive the real world?"*. They aren't "two faces" — they're **two independent axes of the same question**.

## Why this matters now

The prompt-optimization-by-LLM field is exploding — DSPy, OPRO, PromptWizard, PRewrite, and every variant of academic meta-prompting. All of these systems assume, as a silent premise, that LLMs can rewrite prompts while preserving intent. None of them evaluates that premise directly. Evaluation stays ad hoc: spot-check human judgment, LLM-as-judge with hand-crafted prompts, or task-specific downstream metrics.

The Whet Benchmark is the missing piece: a direct, reproducible, cross-model evaluation of the central premise of the entire category.

## What this benchmark is NOT

Honesty here isn't a footnote — it's part of the design. Benchmarks that don't declare what they don't measure are the ones nobody uses.

- **Not a general LLM capability score.** A model can be great at prompt rewriting and bad at reasoning, and vice versa. The Whet Benchmark is orthogonal to traditional benchmarks, not a substitute.
- **Not a measure of absolute output quality.** It measures the reduction of patterns cataloged by the 12 linter rules. Absolute quality requires human judgment or task-level downstream evaluation — complementary paths, not substitutes.
- **Not independent of the linter.** The scorer and the diagnostic share the same 12 rules by design, not by oversight. The defense for that choice has three legs: (a) the rules encode empirically observed failure modes, not arbitrary constructions; (b) each rule is independently validated via **blind agents** in the `rule-evaluation` workflow (test prompts submitted to LLMs that have never seen the system, checking whether the cataloged pattern actually degrades behavior); (c) the corpus and the runner are public, versioned, and contestable — anyone can run, disagree, propose new rules, publish counter-evidence. Disagreeing with the rules means disagreeing with the entire instrument — not just with the benchmark.
- **Not static.** The corpus rotates each run — prompts never repeat. The text of every prompt is archived in the run's `prompts` field in `results.json` (mapping `promptId → { text, lang }`), enabling backfill of providers added later. `schemaVersion` flags structural changes to the corpus format, not to its content.
- **Doesn't measure temporal variability sufficiently.** A single run is signal, not truth. Recommended practice: 2-3 runs, look at the average, treat variance as part of the data.

## Structure

```
whorl/benchmark/
├── corpus.json                      ← prompts for the next run (12 fresh prompts: 4 profiles × 3 languages, covering all 12 linter rules, rotated each run)
├── providers/
│   ├── gemini.js                    Google Gemini (free tier, AI Studio)
│   ├── mistral.js                   Mistral (free tier, La Plateforme)
│   ├── groq.js                      Llama 3.3 70B via Groq (daily free tier)
│   ├── deepseek.js                  DeepSeek V3 (pay-as-you-go, $2 minimum top-up)
│   ├── deepseek-r1.js               DeepSeek R1 reasoner (same key as V3)
│   ├── claude.js                    Claude Opus via CLI subprocess (subscription)
│   ├── claude-sonnet.js             Claude Sonnet via CLI subprocess (--model sonnet)
│   ├── ai21.js                      AI21 Jamba Large 1.7 (trial)
│   ├── cohere.js                    Cohere Command A (1000 req/month trial, no credit card)
│   ├── openai.js                    OpenAI GPT-4o mini (pay-as-you-go, $5 minimum top-up)
│   ├── openai-gpt-5-4.js            OpenAI GPT-5.4 flagship (pay-as-you-go)
│   ├── openai-gpt-5-5.js            OpenAI GPT-5.5 (reasoning-by-default, released 2026-04-23 — twice the price of 5.4)
│   ├── openai-gpt-5-nano.js         OpenAI GPT-5 nano — reasoning tier, `max_completion_tokens`
│   └── grok.js                      xAI Grok 4.20 Reasoning (standby — unregistered in the runner)
├── runner.js                        Orchestrator — iterates corpus × providers
├── merge-retry.js                   Utility: merges a partial retry Run into the previous Run
├── results.json                     Round history (persisted, committed)
├── live-ranking-YYYY-MM.jsonl       Live ranking samples (fed by /api/rewrite, gitignored)
├── PROVIDERS-BACKLOG.md             Future integration candidates (informal, provisional)
└── README.md                        This file
```

## Two complementary axes

- **Corpus** (this document, `results.json`): rigorous, *same-input within each run*, executed via `runner.js` against a set of 12 fresh prompts that cover all 12 linter rules. **Prompts never repeat across runs** — the ranking reflects actual generalization, not adherence to a fixed set. The public ranking is the **cumulative aggregate of every run**, deduplicated by prompt×provider (most recent result wins). Audience: audit, research, external citation. Visible at `/whet-benchmark` (default tab).
- **Live** (`live-ranking-*.jsonl`, `src/lib/live-ranking.ts`): passive collection of real `/api/rewrite` calls made by site users. Persists only `{providerId, scoreBefore, scoreAfter, delta, elapsedMs, success, timestamp}` — **never the prompt text**. Answers *"does it survive the real world?"*. Audience: someone picking a provider to use. Visible at `/whet-benchmark?tab=live` and feeds the landing podium. Not same-input (the LRU rotator distributes load), so it only becomes comparable at scale (N > a few hundred per provider).

A provider can dominate the Corpus (curated prompts) and lose Live (real, unstructured prompts) — that kind of divergence is the most interesting finding the system can produce, and it's why both axes stay live.

## How each run works

For every (prompt × provider) pair:

1. **Analyze input:** `analyze(prompt)` → `scoreBefore` + `metaPrompt` (renderer output — a self-contained text including the original prompt, the suggested adjustments, and a format instruction; the recipient is an LLM that will rewrite the original prompt following those adjustments).
2. **Submit:** `provider.submit(metaPrompt)` — the model receives the rewrite meta-prompt and returns the rewritten prompt.
3. **Analyze output:** `analyze(rewritten)` → `scoreAfter`.
4. **Delta:** `scoreAfter − scoreBefore` — how well the model sharpened the prompt under the adjustments without destroying the intent.

Every run writes to `results.json` with: timestamp, corpus version, prompt map (`promptId → { text, lang }`) and per-provider results (before/after scores, diagnostics, response time, preview of the rewritten text, and — if errored — the error message).

## Rotating corpus

The corpus is **not fixed** — each run, a fresh set of 12 prompts is crafted and every provider runs against it. Prompts used in previous runs **never repeat**. That measures actual generalization rather than adherence to a memorized set.

### Composition per run

12 prompts: **4 profiles × 3 languages** (pt, en, es). The 4 profiles are designed so that, together, they **trigger every active linter rule each run** — no rule stays under-represented by design. The linter currently has 12 rules and the 4 profiles suffice; if new rules are added, the composition has to evolve (see "Corpus evolution when new rules are added" below).

| Slot | Anti-pattern profile | Primary target rules | Prompt type |
|---|---|---|---|
| A | Imperative + defaults + density | `imperative-overload`, `redundant-default`, `cognitive-overload` | Rigid corporate system prompt |
| B | Vagueness + repetition + bare commands | `vague-instruction`, `redundant-repetition`, `command-over-question` | "Generic well-meaning" prompt |
| C | Contradiction + sensitive domain | `contradiction`, `tone-domain-mismatch` | Instruction with internal tension in a regulated area (health, law, finance, etc.) |
| D | Toxic motivational + external references | `threat-framing`, `role-inflation`, `conditional-reward`, `unresolved-reference` | "Hyped" prompt — conditional threats, credential inflation, reward promises and/or mentions of phantom attachments |

**Target rules** are the profile's guaranteed minimum. Other rules may fire naturally (e.g. `cognitive-overload` in B when the prompt gets long) — that's desirable. What matters is that, summing the 12 prompts, **every active linter rule has at least one trigger in the run**. For profile D, the pt/en/es triplet should distribute the 4 target rules so that **each one shows up in at least one of the profile's 3 prompts**.

The **domains** (legal, health, marketing, education, engineering, finance, etc.) **rotate** — no domain repeats across consecutive runs. The pool of available domains matches what the renderer detects (~20 domains).

> **Important:** the crafting of each of the 12 prompts is **mandatorily** done by a blind sub-agent, dispatched without access to rule code, regex, or historical corpus. Operational details, rationale, and traceability in ["Who crafts the prompts"](#who-crafts-the-prompts) below.

### Corpus evolution when new rules are added

The set of linter rules isn't frozen — rules can be added when new failure modes are observed and validated (see *Criteria for the existence of a rule* in the main README). When that happens, the corpus composition **must evolve in step**. The invariant is simple:

> **Every active linter rule must have at least one guaranteed trigger per run.**

When a new rule enters production, before the next run the benchmark owner must decide — and record in the commit — which of the three routes below was chosen:

- **Route A — Absorb into an existing profile.** If the new rule is adjacent to one of the profile axes (e.g. a rule about "performative tone" sits next to profile D's motivational axis), add it as a target rule for that profile and adjust the crafting so the pt/en/es triplet guarantees the trigger.
- **Route B — Create a new profile.** If the new rule covers an axis independent of the current 4, create a profile E (then F, G...) — 15, 18, 21 prompts per run as needed. Proportional cost in tokens/time accepted as a breadth investment.
- **Route C — Disable the rule from the benchmark.** If a rule is too rare to be synthesized realistically, or if the rule's existence criteria are themselves under review, declare explicitly that it's outside the invariant temporarily. Out of the invariant = out of the guaranteed design; it falls back to opportunistic measurement.

The profile table above is a snapshot of the current state (12 rules → 4 profiles), not a permanent contract. Whenever the linter rules change (additions, removals, mergers), this section and the table must be updated in the same PR.

### Per-prompt quality criteria

Every corpus prompt must meet all of these:

- **Size between 500 and 1000 characters** (~80-160 words) — the floor guarantees enough density to trigger ≥3 rules and realism for a production system prompt; the ceiling avoids hitting free-tier limits and accidentally measuring long-context capacity rather than meta-prompt-following.
- **Score before between 0-79** — too high and there's nothing to fix. Very low scores (down to 0) are legitimate stress tests: they measure whether the model can sharpen a catastrophic prompt without destroying the intent. What matters is that the intent stays identifiable.
- **Triggers at least 3 distinct rules** — guarantees the rewrite meta-prompt has real work to do. Acceptable exception: surgical profile-D prompts focused on a rare rule (e.g. pure `conditional-reward`) may trigger only 1-2 rules, provided the rest of the D triplet covers the other target rules.
- **Identifiable purpose** — the rewrite must preserve a clear intent (the silent preservation test).
- **Realistic** — something a real user would write, not a prompt constructed to fail artificially.
- **Self-contained — except for profile D**, where `unresolved-reference` is a target rule and mentions of external documents/attachments are the point. In other profiles, prompts must be self-contained so they don't trigger `unresolved-reference` artificially.

### Domain rotation

Before crafting prompts for a new run, check which domains were used in recent runs (look at `results.json`). Prioritize domains used less recently (LRU). The goal is that, over 5-6 runs, the benchmark covers most of the ~20 domains the renderer recognizes.

### Aggregation for the ranking

**Within each run:** same-input — every provider receives the same 12 prompts. Direct comparison between models is valid.

**Across runs:** the public ranking is **cumulative** — every run in the history feeds the aggregation. When the same prompt appears in more than one run for a provider, only the **most recent result** is used (deduplication by `promptId` × `provider`). The sample count shown on the leaderboard is the number of distinct prompts covered — every provider should have the same number. Each new run with 12 fresh prompts enriches the aggregate, which grows indefinitely.

```
  Run N   (Apr 23):  12 fresh prompts (veterinary, journalism, design, health)
  Run N+1 (Apr 30):  12 fresh prompts (engineering, film, agriculture, marketing)
  Run N+2 (May 07):  12 fresh prompts (law, finance, architecture, energy)

Ranking = cumulative average (36 distinct prompts, most recent result for each)
```

### Who crafts the prompts

**Mandatory rule:** every new corpus prompt is crafted by a **blind sub-agent** — dispatched without access to rule code (`src/core/rules/*.ts`), regex, linter text, or historical corpus. **One dispatch per slot: 12 independent sub-agents** for the 12 prompts in a run. The orchestrator (Claude in the session) doesn't get to craft prompts on its own.

**Why it's mandatory.** When the person who knows the rule regex crafts the prompts, the corpus collapses to "lowest common multiple that triggers the regex" — synthetic prompts that hit the rules by construction, not by realism. The result is a benchmark that measures "ability to follow an idiosyncratic pattern" rather than "ability to sharpen real prompts while preserving intent". Blind crafting closes that leak. Realism is a validity condition, not a luxury.

**How the dispatch works.** The orchestrator prepares a brief per slot containing only:

- **Language** (pt, en, or es) and **profile** of the anti-pattern (e.g. "heavy imperatives + redundant defaults").
- **Target rules described in natural language, no regex** (e.g. "instructions that repeat the model's default behavior", "excess of categorical imperative tone"). Never paste regex or cite rule files.
- **Suggested domain** (rotating LRU over previous runs, avoiding recently-used domains).
- **Realism criteria:** something a real user would write, not a prompt constructed to fail artificially.
- **Desired before-score:** between 0-79.
- **Prompt size:** between 500 and 1000 characters (~80-160 words).
- **Minimum rules triggered:** ≥3 (declared exceptions for profile D focused on rare rules).

The brief **never includes:** rule code/regex, snippets of `src/core/rules/*.ts`, historical corpus prompts, or a list of the linguistic patterns the linter looks for. The sub-agent writes the prompt the way it finds natural for the domain and profile.

**Post-dispatch validation.** The orchestrator gets the generated prompt back, runs `analyze()` (via `dist/core/analyzer.js`) and checks: score in 0-79, target rules triggered, run-level coverage. If a target rule is missed, the orchestrator dispatches **another blind sub-agent** with feedback in natural language about the missing behavior (e.g. *"the prompt needs to contain a conditional threat — something like 'if you fail, serious consequence X will happen'"*) — still without exposing regex or pointing at the rule file. Repeats until the validation passes or the sub-agent flags it can't satisfy without breaking realism.

**Infrastructure.** Claude Code's dynamic `Agent` tool is enough — **no need to create `.claude/agents/` or persistent scripts**. Each run dispatches sub-agents on demand via the CLI itself. Prerequisite: `npm run build:cli` before validation (the analyzer runs from `dist/`).

**Run-commit traceability.** The commit replacing `corpus.json` must declare: (a) that the prompts were crafted by blind sub-agents per this section; (b) how many iterations per slot until validation passed; (c) whether any target rule was relaxed for lack of viable crafting. That preserves the auditability of the method.

## API keys

Configure in `.env.local` (not committed):

```bash
# Gemini — https://aistudio.google.com/app/apikey (free, most generous)
GEMINI_API_KEY=...

# Mistral — https://console.mistral.ai/api-keys ("Experiment" free tier)
MISTRAL_API_KEY=...

# Groq — https://console.groq.com/keys (daily free tier)
GROQ_API_KEY=...

# DeepSeek — https://platform.deepseek.com (requires $2 minimum top-up, see note below)
DEEPSEEK_API_KEY=...

# AI21 — https://studio.ai21.com ($10 trial, 3 months, no credit card)
AI21_API_KEY=...

# Cohere — https://dashboard.cohere.com (1000 req/month trial, no credit card, no expiry)
COHERE_API_KEY=...

# OpenAI — https://platform.openai.com (pay-as-you-go, card + $5 minimum top-up)
OPENAI_API_KEY=...

# xAI Grok — https://console.x.ai (⏸️ standby — see PROVIDERS-BACKLOG.md)
XAI_API_KEY=...
```

**Claude doesn't need a key** — uses `claude --print` as a subprocess, riding the existing Claude Code subscription.

**DeepSeek isn't a free tier anymore.** The original backlog claimed "5M free tokens on signup, no card" — that policy was silently retired at some point in 2025. Today a new account's first call returns `HTTP 402 Insufficient Balance` and requires a **$2 USD** minimum top-up (via PayPal, card, Alipay or WeChat) at [`platform.deepseek.com/top_up`](https://platform.deepseek.com/top_up). At current pricing (`$0.28/1M` input, `$0.42/1M` output, identical for V3 and R1), $2 covers around ~70 full corpus rounds for V3 alone, or ~20 rounds running V3+R1 together — so the cost is trivial, but it's no longer "zero friction". The same key serves `deepseek-chat` and `deepseek-reasoner`.

Providers without a configured key are **silently skipped**, not failing the run. With no available providers, the runner exits with an error.

## Commands

```bash
# Required build first — the runner imports dist/core/analyzer
npm run build:cli

# All available providers × all prompts
node whorl/benchmark/runner.js

# Preview without calling APIs
node whorl/benchmark/runner.js --dry-run

# Provider subset
node whorl/benchmark/runner.js --providers=gemini,claude-cli

# Prompt subset (IDs come from the current corpus — see whorl/benchmark/corpus.json)
node whorl/benchmark/runner.js --prompts=corporate-counsel-pt,clinical-nurse-intake-en

# Combine
node whorl/benchmark/runner.js --providers=gemini --prompts=corporate-counsel-pt
```

### Backfilling a new provider

When a provider is integrated after runs already exist, it starts with less coverage than the others. To equalize, the flow is to run the provider against the historical corpora archived in `results.json`.

```bash
# Backfill script — extracts prompts from previous runs and runs the provider against them
node -e "
const fs = require('fs');
const r = JSON.parse(fs.readFileSync('whorl/benchmark/results.json', 'utf8'));
const covered = new Set(
  r.runs.flatMap(run => run.results.filter(res => res.provider === 'PROVIDER_NAME').map(res => res.promptId))
);
const missing = r.runs
  .filter(run => run.prompts)
  .flatMap(run => Object.entries(run.prompts).filter(([id]) => !covered.has(id)).map(([id, p]) => ({ id, ...p })));
const unique = [...new Map(missing.map(p => [p.id, p])).values()];
const corpus = { schemaVersion: r.runs.at(-1).corpusVersion, prompts: unique };
fs.writeFileSync('whorl/benchmark/corpus.json', JSON.stringify(corpus, null, 2));
console.log('backfill corpus generated:', unique.map(p => p.id).join(', '));
" && node whorl/benchmark/runner.js --providers=PROVIDER_NAME
```

Replace `PROVIDER_NAME` with the provider's `name` (e.g. `ai21-jamba`). The script extracts only the prompts the provider hasn't covered, writes a temporary corpus, and the runner executes normally. Restore the original `corpus.json` after the backfill.

**Note:** runs predating this flow don't have the `prompts` field archived and depend on git history. Runs from now on archive the texts automatically.

### Partial retry (`merge-retry.js`)

When a provider fails on some prompts during a full run — the typical case being Gemini free tier hitting 429 after the day's first ~18 calls — the path to complete the round without redoing everything is two commands:

```bash
# 1. Re-run ONLY the missing provider+prompts (creates an ephemeral retry Run)
node whorl/benchmark/runner.js --providers=gemini --prompts=p1,p2,p3,...

# 2. Merge the OK results from the retry Run into the previous Run and discard the retry
node whorl/benchmark/merge-retry.js
```

`merge-retry.js` is surgical: it grabs the latest Run (the retry), finds the OK results, replaces the corresponding errored entries in the previous Run (same `provider`+`promptId`), and removes the retry Run from the history. Supports `--dry-run` for preview. Errors that persisted (retry also failed) stay intact in the target Run. Works for any provider, not just Gemini.

This patches an architectural gap in the runner, which always creates a new Run instead of appending to an existing one — without merge, the retry Run becomes "the latest" and hides every other provider's results from the full Run when `/api/benchmark` reads.

## Output

Colored console (in a TTY) with per-prompt results and a per-provider aggregate at the end:

```
── Gemini 2.5 Flash (gemini-2.5-flash) ──
  corporate-counsel-pt         42 →  91   +49   3.2s
  clinical-nurse-intake-en     48 →  88   +40   2.8s
  ...

── Per-provider aggregate ──
  Gemini 2.5 Flash          45.0 →  89.5   +44.5  (12 prompts)
  Claude (via CLI)          45.0 →  93.2   +48.2  (12 prompts)
```

## Methodology — deliberate decisions

**Temperature 0.3 on every provider that supports it** — reduces noise between runs without making things deterministic enough to hide real model variability.

**`max_tokens: 2048`** — enough for a rewritten prompt; avoids silent truncation.

**Rotating corpus, `schemaVersion` for format** — prompts change each run by design; `schemaVersion` flags structural changes to the corpus format (new fields, schema shifts), not to its content.

**No automatic retry** — an API error counts as an error in the result. Retry masks real provider instability.

**Claude via CLI subprocess instead of direct API** — rides existing Claude Code authentication. Trade-off: doesn't control temperature/max_tokens the way an API call would. In exchange: zero additional cost.

## Trajectory (speculative)

If the benchmark's thesis holds at scale, the infrastructure is already in shape to become a standalone artifact — not just an internal Whorl instrument. Two vectors:

- **As a product**: differentiated, reproducible benchmarks become cited references (LMArena, Artificial Analysis, SEAL all started from published methodology). The Whet Benchmark has a defensible niche — meta-prompt-following matters for any system with system prompts, agents with guardrails, or defenses against prompt injection. A public leaderboard, a third-party evaluation API, or a periodic editorial line are natural paths on top of what's already here.
- **As a channel**: labs follow new benchmarks, even small ones, as long as the methodology is clear and the angle is novel. Models that score well end up cited in release notes; ones that score poorly produce "can we run it internally and send a PR?" tickets. It's an almost-free vector for attention, with the rare property of growing in value as Whet itself grows — every new rule, domain, or language automatically expands the benchmark's scope.

Speculation, not roadmap. But it informs decisions today: methodological choices that preserve reproducibility and editorial independence have asymmetric upside if that future materializes, and zero cost if it doesn't.

## Honest limitations

- **Model drift.** Providers update models constantly. An April run may not hold in June. Periodic re-runs are necessary and the `benchmark-refresh` workflow exists for that.
- **Per-run sample is modest.** 12 prompts per run cover the 12 rules by design but don't exhaust the variety of how each rule can manifest. Breadth comes from **accumulation across runs** (60+ unique prompts after 5 runs of the new format), not from individual-run size.
- **Temporal variability.** Even at low temperature, the same prompt can yield differently across two calls. The cumulative aggregate of multiple runs with distinct prompts mitigates this better than re-runs of the same set.
- **Declared circularity.** The score is the Whet linter's own. A model that "tricks" the meta-prompt with superficial rephrasing scores well without having learned anything. Cross-validation comes from the `rule-evaluation` workflow (blind agents confirming that rules capture real behavior degradation). Improvements to the corpus and rules reduce this risk over time, but eliminating it entirely would require a second independent scorer — a plausible path, not yet implemented.
