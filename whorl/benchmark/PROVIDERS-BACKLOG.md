# Provider backlog for the benchmark

**Provisional and informal** file — consolidates the free-tier research done in conversation to guide future decisions on expanding the provider corpus. Signup, key generation, and `.env.local` configuration are manual work. This document is a map of the terrain, not a committed roadmap.

## Editorial criterion (revisit before adding)

The Whet Benchmark measures **meta-prompt-following under pressure to preserve intent** — a capability, not an intelligence ranking. A new provider only adds signal when it brings a **distinct model family** (different training philosophy, architecture, or lab). Running the same model on different infra adds nothing, except to support an explicit sub-thesis about infra independence. See `whorl/benchmark/README.md` → thesis and "What this benchmark is NOT".

## Current state

Already in the corpus: Gemini (Google), Mistral (Mistral), Llama 3.3 70B (Meta via Groq), **Claude Opus 4.7 + Sonnet (Anthropic via CLI)**, DeepSeek V3 + R1 (DeepSeek), Jamba Large 1.7 (AI21), Command A (Cohere), GPT-4o mini + GPT-5.4 + GPT-5.5 + GPT-5 nano (OpenAI). 8 families (4 OpenAI models to compare generations and tiers), all Western except DeepSeek.

In standby: **Grok 4.20 Reasoning (xAI)** — provider implemented and tested, but waiting on the Data Sharing opt-in decision (see Tier 1 below).

> **DeepSeek V3 + R1 integrated** (April 2026, Run 9). The backlog hypothesis was tested: *does reasoning help or hurt on a mechanical rewrite task?* → **almost indifferent**. R1 delivered an average delta of +40.6 against V3's +39.7 — a roughly 1-point edge at ~2.6× the cost per call (reasoning_content eats into the output budget). Signal: for this specific task, reasoning isn't worth the cost.
>
> **Trial outdated.** The "5M trial tokens, no card" line in this backlog no longer applies. New accounts created today return `HTTP 402 Insufficient Balance` on the first call. A **$2 USD** minimum top-up via PayPal/card/Alipay/WeChat at [`platform.deepseek.com/top_up`](https://platform.deepseek.com/top_up) unlocks the account. Real-world cost is trivial (~$0.03 per full corpus run with V3), but the editorial friction is no longer "zero signup".

> **Zhipu GLM dropped** (April 2026). Main portal (`open.bigmodel.cn`) inaccessible for Brazilian users. International portal (`z.ai`) exists but adds unnecessary friction. Marginal editorial value next to DeepSeek already in the corpus. Provider `zhipu.js` exists but isn't recommended for use.

## Tier 1 — biggest gain per effort

### ~~AI21 Jamba (Large + Mini)~~ ✅ integrated (April 2026)
- Provider `ai21.js` created, registered in the runner. Model `jamba-large-1.7`, endpoint `api.ai21.com/studio/v1/chat/completions`. Env var: `AI21_API_KEY`.

### xAI Grok ⏸️ standby (April 2026)
- Provider `grok.js` implemented (model `grok-4.20-reasoning`, endpoint `api.x.ai/v1/responses` — Responses API, shape `{ model, input }`, not OpenAI-compatible). Env var: `XAI_API_KEY`.
- **Unregistered from the runner** (commented line in `runner.js`). To re-enable: uncomment `require("./providers/grok")`.
- Hypothesis to validate when running: less restrictive alignment → better preservation of the rewrite meta-instruction (less RLHF-driven instinct to "soften" the original prompt).
- **Automatic trial no longer exists.** The "$25 in trial credits, no card" line in this backlog **is outdated**. New accounts start with zero credit and the first call returns `HTTP 403 "team doesn't have credits or licenses"`.
- **Unblock path (Data Sharing for Credits).** `console.x.ai` → Settings → Data Sharing → toggle "Share API Inputs for Model Training". Unlocks $150/month in renewable credits. Prerequisites:
  - **Minimum $5 top-up** on the account before the toggle becomes eligible (one-shot, not recurring).
  - Only team admins can activate it.
  - **Irreversible** decision: once opted in, no opt-out.
  - Eligible countries (Brazil generally is, confirm in the toggle itself).
- **Editorial trade-off:** acceptable for the corpus (corpus prompts are already public in `results.json`), so data sharing doesn't compromise anything that isn't already committed. $5 one-shot unlocks hundreds of full runs per month.
- **Decision deferred** in April 2026 — pending a call on top-up + opt-in.

## Tier 2 — fill gaps with smaller marginal return

### ~~Cohere Command A~~ ✅ integrated (April 2026)
- Provider `cohere.js` created, registered in the runner. Model `command-a-03-2025`, endpoint `api.cohere.com/v2/chat` (Chat API v2 — shape similar to OpenAI's, response via `message.content[].text`). Env var: `COHERE_API_KEY`.
- 1000 req/month trial confirmed valid in April 2026 — no card, no expiry, 20 calls/min on Chat.
- **Full backfill (April 2026, 50/50 prompts)**: initial run of 9 prompts from corpus v3 + backfill over 41 historical prompts reconstructed from commits `45eb6900`, `74ab0aea`, `1ab8706d`, `7e067f12` of `corpus.json`. Parity with every other provider in the cumulative aggregate — 41/41 success, no errors.
- **Result**: cumulative average Δ of **+41.0** (43.0 → 85.5 over 50 prompts). Position 8/9 on the cumulative leaderboard — above Gemini 2.5 Flash (+40.0), below the DeepSeeks (+44.6/+44.7). Distinct-alignment hypothesis partially confirmed: doesn't destroy, but consistently lands below the flagships — possibly more conservative RLHF that rewrites less aggressively.
- **Operational note**: very volatile latency (5s to 88s in the same run). Worth checking on the "Live" axis later; if the pattern persists with real users, that's Cohere infra signal, not noise.

### ~~OpenAI (4 models: GPT-4o mini + GPT-5.4 + GPT-5.5 + GPT-5 nano)~~ ✅ integrated (April 2026)
Integrated in three movements, with a strong editorial finding about intra-family gradient.

**Common setup:** endpoint `api.openai.com/v1/chat/completions` (standard Chat Completions API). Env var: `OPENAI_API_KEY`. Pure pay-as-you-go integration — **automatic trial discontinued in mid-2025** and the Data Sharing Program ended on 2025-04-30. Requires a card + $5 minimum top-up. Real-world cost of a full 50-prompt backfill: ~$0.05 (mini), ~$0.05 (nano), ~$1.13 (5.4).

**Implemented providers:**

- `openai.js` → `gpt-4o-mini` (legacy model, retired from ChatGPT on 2026-02-13 but still available via the API). Default shape: `temperature: 0.3`, `max_tokens: 2048`.
- `openai-gpt-5-4.js` → `gpt-5.4` (previous-generation flagship, released 2026-03-05). Requires `max_completion_tokens` instead of `max_tokens`. Accepts `temperature: 0.3`. Pricing: $2.50/M input, $15/M output.
- `openai-gpt-5-5.js` → `gpt-5.5` (current flagship, released 2026-04-23). **Reasoning-by-default** — refused 62/62 prompts on the first run with `HTTP 400` because the initial config copied 5.4's (with temperature). Adjusted to `reasoning_effort: "low"` + `max_completion_tokens: 8000` for consistency with nano. The model's default is `"medium"`; using `low` keeps internal comparability between the benchmark's reasoning providers. Price doubled vs 5.4: $5/M input, $30/M output. 1M context.
- `openai-gpt-5-nano.js` → `gpt-5-nano` (cheap reasoning tier of the new generation). Requires `max_completion_tokens` (8000, because it eats heavily into reasoning tokens) + `reasoning_effort: "low"`. **Doesn't accept custom temperature** (`1` only by default) — declared trade-off, in line with Claude via CLI.

**Result (50/50 prompts each, zero errors):**

| Model | Cumulative Δ | Position (of 12) |
|---|---|---|
| GPT-5.4 | **+46.4** | 4th (top 5) |
| GPT-5 nano | +37.0 | 11th |
| GPT-4o mini | +34.2 | last |

**Editorial finding:** **12-point** gradient inside the same family between legacy mini and new flagship. The initial hypothesis ("OpenAI is systemically conservative on rewriting") was **partially wrong** — only true for the cheap tier and the older generation. OpenAI invested heavily in instruction following for GPT-5, but the gain didn't trickle down evenly to the smaller tiers. GPT-5 nano improved only +2.8 over gpt-4o-mini, while the flagship jumped +12. Exactly the kind of intra-family divergence the Whet Benchmark is positioned to expose publicly.

**Residual hypothesis:** nano being a reasoning tier with `reasoning_effort: "low"` may be underutilizing the model — worth testing with `reasoning_effort: "medium"` to see if its position changes (trade-off: ~2× more reasoning tokens charged).

---

**April 2026 · GPT-5.5 — 4th model in the family (equal-footing backfill)**

Second movement of the OpenAI integration, done the day after the 5.5 launch (2026-04-23).

- **Coverage:** 62-prompt backfill (every prompt 5.4 had run by then — 50 historical + 12 from Round 2). Equal-footing entry; 5.4 left untouched.
- **First attempt:** 62/62 failed with `HTTP 400: "Unsupported value: 'temperature' does not support 0.3"`. Revealed that 5.5 is reasoning-by-default — a silent difference vs 5.4 that anyone just swapping the model string discovers the hard way. Invalid run removed from `results.json` before the second attempt.
- **Second attempt:** 62/62 OK with `reasoning_effort: "low"` + no temperature + `max_completion_tokens: 8000`.
- **Result on the 62 shared prompts:**

| Metric | GPT-5.4 | GPT-5.5 |
|---|---|---|
| Mean Δ | +47.0 | +47.3 |
| Mean after-score | 90.4 | 90.8 |
| Mean latency | 4.7s | 7.4s (+60%) |
| Head-to-head | 20 wins | 24 wins (18 ties) |
| Price per 1M input/output | $2.50 / $15 | $5 / $30 (2×) |

**Editorial finding:** reasoning-by-default on the new flagship **didn't pay off** for meta-prompt-following. Δ moved 0.3 points — noise on a scale that swings 14 points on small samples. Confirms, from another angle, the same pattern seen with DeepSeek R1 vs V3 (reasoning ~+1 point at 2-2.6× the tokens): **for mechanical rewriting tasks that preserve intent, internal chain-of-thought isn't the bottleneck**. What raises the delta is following the meta-instruction well, not thinking longer before responding.

**Touch on the nano residual hypothesis:** 5.5 ran with `reasoning_effort: "low"` (same setting as nano) and tied technically with 5.4 chat. That's additional evidence that running reasoning at `low` doesn't **underutilize** the model for this kind of task — the Δ ceiling looks like something else, not the reasoning budget. The hypothesis isn't closed, but it lost weight.

**Published post:** [trywhet.com/blog/gpt-5-5-mesma-nota-mais-lento](https://trywhet.com/blog/gpt-5-5-mesma-nota-mais-lento).

### Alibaba Qwen3 (via DashScope International)
- **Access**: `dashscope-intl.aliyuncs.com`. 1M input + 1M output free tokens, 90 days, Singapore endpoint (US endpoint has no free quota).
- **Models**: `qwen3-max`, `qwen3-32b`, `qwen-plus`.
- **Value**: second Chinese family. Adds robustness to the Chinese cluster without being redundant with DeepSeek (distinct family). Smaller marginal return because DeepSeek already represents the Chinese angle.
- **Implementation**: OpenAI-compatible at `compatible-mode/v1/chat/completions`.
- **Suggested env var**: `DASHSCOPE_API_KEY`.

## Tier 3 — low editorial value or high friction

### MiniMax (M1 / M2)
- **Access**: `platform.minimax.io`. Trial declared through November 2026, no card.
- **Models**: `MiniMax-Text-01`, `MiniMax-M1`.
- **Value**: third Chinese family, specialized in long-context — not central to the prompt-rewriting task. Lower editorial value.
- **Implementation**: own shape, not directly OpenAI-compatible.
- **Suggested env var**: `MINIMAX_API_KEY`.

## Suggested execution order

1. ~~**AI21 Jamba**~~ — integrated
2. **xAI Grok** — ⏸️ standby (implemented but unregistered; awaits $5 top-up + Data Sharing opt-in)
3. ~~**Cohere**~~ — integrated
4. ~~**OpenAI GPT-4o-mini**~~ — integrated (pay-as-you-go, $5 top-up)
5. **Qwen3** — reinforces the Chinese cluster, 90-day free tier
6. **MiniMax** — last, smallest marginal value

## Not recommended

- **Zhipu GLM**: main portal inaccessible to BR users without VPN; editorial value overlaps DeepSeek already in the corpus.
- **Cohere free tier for production**: trial key is experimental only, commercial use needs a paid key.
- **Moonshot Kimi**: requires $1 minimum top-up, small friction, marginal value.
- **Reka**: no identified free tier.
- **Hugging Face Inference API**: aggressively throttled, poor fit for the benchmark's one-shot use.
- **Replicate**: credits expire, not persistent.
- **Perplexity Sonar**: RAG model, different category from the task.

## Notes

This backlog can go stale. Free tiers change, models retire, new labs appear. Review before onboarding new providers — the state here reflects April 2026.
