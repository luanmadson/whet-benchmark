# Backlog de providers pro benchmark

Arquivo **provisório e informal** — consolida as pesquisas de free tiers feitas em conversa pra orientar decisões futuras de expansão do corpus de providers. Cadastro, geração de chave e configuração de `.env.local` são trabalho manual. Este documento serve como mapa do terreno, não roadmap comprometido.

## Critério editorial (relembre antes de adicionar)

O Whet Benchmark mede **meta-prompt-following sob pressão pra preservar intenção** — uma capacidade, não um ranking de inteligência. Provider novo só agrega sinal quando traz **família de modelo distinta** (filosofia de treino, arquitetura ou lab diferente). Rodar o mesmo modelo em infra diferente não agrega, exceto se for pra sustentar uma sub-tese explícita de infra-independência. Ver `whorl/benchmark/README.md` → tese e "O que este benchmark NÃO é".

## Estado atual

Já no corpus: Gemini (Google), Mistral (Mistral), Llama 3.3 70B (Meta via Groq), **Claude Opus 4.7 + Sonnet (Anthropic via CLI)**, DeepSeek V3 + R1 (DeepSeek), Jamba Large 1.7 (AI21), Command A (Cohere), GPT-4o mini + GPT-5.4 + GPT-5.5 + GPT-5 nano (OpenAI). 8 famílias (4 modelos OpenAI pra comparar gerações e tiers), todos ocidentais exceto DeepSeek.

Em standby: **Grok 4.20 Reasoning (xAI)** — provider implementado e testado, mas aguardando decisão sobre Data Sharing opt-in (ver seção Tier 1 abaixo).

> **DeepSeek V3 + R1 integrados** (abril/2026, Run 9). A hipótese do backlog foi testada: *reasoning ajuda ou atrapalha numa tarefa mecânica de reescrita?* → **quase indiferente**. R1 entregou delta médio de +40.6 contra +39.7 de V3 — vantagem de ~1 ponto de score a custo ~2.6× maior por chamada (reasoning_content consome o budget de output). Sinal: pra esta tarefa específica, reasoning não vale o custo.
>
> **Trial defasado.** A informação "5M tokens de trial sem cartão" deste backlog não se aplica mais. Contas novas criadas hoje retornam `HTTP 402 Insufficient Balance` na primeira chamada. Top-up mínimo de **$2 USD** via PayPal/cartão/Alipay/WeChat em [`platform.deepseek.com/top_up`](https://platform.deepseek.com/top_up) destrava a conta. O custo real da operação é irrisório (~$0.03 por rodada full do corpus com V3), mas a fricção editorial deixou de ser "zero cadastro".

> **Zhipu GLM descartado** (abril/2026). Portal principal (`open.bigmodel.cn`) inacessível para usuários brasileiros. Portal internacional (`z.ai`) existe mas acrescenta fricção desnecessária. Valor editorial marginal frente ao DeepSeek já no corpus. Provider `zhipu.js` criado mas não recomendado para uso.

## Tier 1 — maior ganho por esforço

### ~~AI21 Jamba (Large + Mini)~~ ✅ integrado (abril/2026)
- Provider `ai21.js` criado, registrado no runner. Modelo `jamba-large-1.7`, endpoint `api.ai21.com/studio/v1/chat/completions`. Env var: `AI21_API_KEY`.

### xAI Grok ⏸️ standby (abril/2026)
- Provider `grok.js` implementado (modelo `grok-4.20-reasoning`, endpoint `api.x.ai/v1/responses` — Responses API, shape `{ model, input }`, não é OpenAI-compat). Env var: `XAI_API_KEY`.
- **Desregistrado do runner** (linha comentada em `runner.js`). Pra reativar: descomentar o `require("./providers/grok")`.
- Hipótese a validar quando rodar: alinhamento menos restritivo → melhor preservação da meta-instrução de reescrita (menor instinto RLHF de "suavizar" o prompt original).
- **Trial automático não existe mais.** A informação "$25 em créditos de trial, sem cartão" deste backlog **está defasada**. Contas novas começam com zero crédito e a primeira chamada retorna `HTTP 403 "team doesn't have credits or licenses"`.
- **Caminho de desbloqueio (Data Sharing for Credits).** `console.x.ai` → Settings → Data Sharing → toggle "Share API Inputs for Model Training". Libera $150/mês em créditos renováveis. Pré-requisitos:
  - **Top-up mínimo de $5** na conta antes do toggle ficar elegível (one-shot, não recorrente).
  - Só admins do team conseguem ativar.
  - Decisão **irreversível**: uma vez opt-in, não tem opt-out.
  - Países elegíveis (Brasil geralmente está, confirmar no próprio toggle).
- **Trade-off editorial:** aceitável pro corpus (prompts do corpus já são públicos em `results.json`), então o data sharing não compromete nada que ainda não esteja commitado. $5 one-shot libera centenas de runs full por mês.
- **Decisão adiada** em abril/2026 — aguarda definição sobre top-up + opt-in.

## Tier 2 — completam gaps com retorno marginal menor

### ~~Cohere Command A~~ ✅ integrado (abril/2026)
- Provider `cohere.js` criado, registrado no runner. Modelo `command-a-03-2025`, endpoint `api.cohere.com/v2/chat` (Chat API v2 — shape parecido com OpenAI, response via `message.content[].text`). Env var: `COHERE_API_KEY`.
- Trial 1000 req/mês confirmado válido em abril/2026 — sem cartão, sem expirar, 20 calls/min no Chat.
- **Backfill completo (abril/2026, 50/50 prompts)**: rodada inicial de 9 prompts do corpus v3 + backfill sobre 41 prompts históricos reconstruídos dos commits `45eb6900`, `74ab0aea`, `1ab8706d`, `7e067f12` de `corpus.json`. Paridade com todos os outros providers no aggregate cumulativo — 41/41 sucesso, sem nenhum erro.
- **Resultado**: Δ médio cumulativo de **+41.0** (43.0 → 85.5 sobre 50 prompts). Posição 8/9 no leaderboard cumulativo — acima do Gemini 2.5 Flash (+40.0), abaixo dos DeepSeek (+44.6/+44.7). Hipótese de alinhamento distinto confirmada em parte: não destrói, mas fica consistentemente abaixo dos flagships — pode ser RLHF mais conservador que reescreve menos agressivamente.
- **Observação operacional**: latências muito voláteis (5s a 88s na mesma run). Vale checar no eixo "Ao vivo" depois; se padrão persistir com usuários reais, é sinal de infra Cohere, não ruído.

### ~~OpenAI (4 modelos: GPT-4o mini + GPT-5.4 + GPT-5.5 + GPT-5 nano)~~ ✅ integrados (abril/2026)
Integração em três movimentos, com achado editorial forte sobre gradiente intra-família.

**Setup comum:** endpoint `api.openai.com/v1/chat/completions` (Chat Completions API padrão). Env var: `OPENAI_API_KEY`. Integração via pay-as-you-go puro — **trial automático descontinuado em meados de 2025** e Data Sharing Program terminou em 30/abr/2025. Exige cartão + top-up mínimo de $5. Custo real de um backfill full de 50 prompts: ~$0.05 (mini), ~$0.05 (nano), ~$1.13 (5.4).

**Providers implementados:**

- `openai.js` → `gpt-4o-mini` (modelo legacy, aposentado do ChatGPT em 13/fev/2026 mas ainda disponível na API). Shape padrão: `temperature: 0.3`, `max_tokens: 2048`.
- `openai-gpt-5-4.js` → `gpt-5.4` (flagship da geração anterior, lançado 5/mar/2026). Exige `max_completion_tokens` no lugar de `max_tokens`. Aceita `temperature: 0.3`. Preço: $2.50/M input, $15/M output.
- `openai-gpt-5-5.js` → `gpt-5.5` (flagship atual, lançado 23/04/2026). **Reasoning-by-default** — recusou os 62 prompts da primeira run com `HTTP 400` porque a config inicial imitava o 5.4 (com temperature). Ajustado pra `reasoning_effort: "low"` + `max_completion_tokens: 8000` pra coerência com o nano. Default do modelo seria `"medium"`; usar `low` mantém comparabilidade interna entre providers reasoning do benchmark. Preço dobrou vs. 5.4: $5/M input, $30/M output. Contexto 1M.
- `openai-gpt-5-nano.js` → `gpt-5-nano` (tier reasoning barato da geração nova). Exige `max_completion_tokens` (8000, porque consome muito em reasoning tokens) + `reasoning_effort: "low"`. **Não aceita temperature custom** (só `1` default) — trade-off declarado, em linha com Claude via CLI.

**Resultado (50/50 prompts cada, zero erros):**

| Modelo | Δ cumulativo | Posição (de 12) |
|---|---|---|
| GPT-5.4 | **+46.4** | 4º (top 5) |
| GPT-5 nano | +37.0 | 11º |
| GPT-4o mini | +34.2 | último |

**Achado editorial:** gradiente de **12 pontos** dentro da mesma família entre mini legacy e flagship novo. Hipótese inicial ("OpenAI é sistemicamente conservadora em reescrita") era **parcialmente errada** — é só verdade pro tier barato e pra geração antiga. A OpenAI investiu pesado em instruction following no GPT-5, mas o ganho não desceu uniformemente pros tiers menores. GPT-5 nano melhorou só +2.8 sobre o gpt-4o-mini, enquanto o flagship pulou +12. Tipo de divergência intra-família que o Whet Benchmark está posicionado pra expor publicamente.

**Hipótese residual:** o nano sendo reasoning-tier com `reasoning_effort: "low"` pode estar subutilizando o modelo — ensaiar com `reasoning_effort: "medium"` pra ver se a posição muda (trade-off: ~2x mais tokens de reasoning cobrados).

---

**Abril/2026 · GPT-5.5 — 4º modelo da família (backfill igualitário)**

Segundo movimento da integração OpenAI, feito no dia seguinte ao lançamento do 5.5 (23/04/2026).

- **Cobertura:** backfill de 62 prompts (todos os que o 5.4 tinha rodado até então — 50 do histórico + 12 da Rodada 2). Entrada igualitária, 5.4 mantido sem alteração.
- **Primeira tentativa:** 62/62 falharam com `HTTP 400: "Unsupported value: 'temperature' does not support 0.3"`. Revelou que o 5.5 é reasoning-by-default — diferença silenciosa vs. 5.4 que quem só trocar o model string vai descobrir do jeito difícil. Run inválida removida do `results.json` antes da segunda tentativa.
- **Segunda tentativa:** 62/62 OK com `reasoning_effort: "low"` + sem temperature + `max_completion_tokens: 8000`.
- **Resultado nos 62 prompts em comum:**

| Métrica | GPT-5.4 | GPT-5.5 |
|---|---|---|
| Δ médio | +47.0 | +47.3 |
| Score depois (média) | 90.4 | 90.8 |
| Latência média | 4.7s | 7.4s (+60%) |
| Head-to-head | 20 vitórias | 24 vitórias (18 empates) |
| Preço por 1M input/output | $2.50 / $15 | $5 / $30 (2×) |

**Achado editorial:** reasoning-by-default no flagship novo **não se pagou** pra meta-prompt-following. O Δ subiu 0.3 ponto — ruído numa escala que oscila 14 pontos em amostras pequenas. Confirma, de outro ângulo, o mesmo padrão visto com DeepSeek R1 vs. V3 (reasoning ~+1 ponto ao custo de 2-2.6× mais tokens): **pra tarefas mecânicas de reescrita preservando intenção, chain-of-thought interna não é o gargalo**. O que melhora o delta é seguir direito a meta-instrução, não pensar mais antes de responder.

**Toque na hipótese residual do nano:** o 5.5 rodou com `reasoning_effort: "low"` (mesmo setting do nano) e ficou tecnicamente empatado com o 5.4 chat. Isso é evidência adicional de que rodar reasoning em `low` não **subutiliza** o modelo pra esse tipo de task — o teto de Δ parece ser outro, não o budget de reasoning. A hipótese não foi fechada, mas perdeu peso.

**Post publicado:** [trywhet.com/blog/gpt-5-5-mesma-nota-mais-lento](https://trywhet.com/blog/gpt-5-5-mesma-nota-mais-lento).

### Alibaba Qwen3 (via DashScope International)
- **Acesso**: `dashscope-intl.aliyuncs.com`. 1M input + 1M output tokens free, 90 dias, endpoint de Singapura (endpoint US não tem free quota).
- **Modelos**: `qwen3-max`, `qwen3-32b`, `qwen-plus`.
- **Valor**: segunda família chinesa. Adiciona robustez ao cluster chinês sem ser redundância com DeepSeek (família distinta). Retorno marginal menor porque DeepSeek já representa o ângulo chinês.
- **Implementação**: OpenAI-compatible no `compatible-mode/v1/chat/completions`.
- **Env var sugerido**: `DASHSCOPE_API_KEY`.

## Tier 3 — valor editorial baixo ou fricção alta

### MiniMax (M1 / M2)
- **Acesso**: `platform.minimax.io`. Trial declarado até novembro/2026, sem cartão.
- **Modelos**: `MiniMax-Text-01`, `MiniMax-M1`.
- **Valor**: terceira família chinesa, especialização em long-context — não é central pra tarefa de reescrita de prompt. Valor editorial mais baixo.
- **Implementação**: shape próprio, não OpenAI-compat direto.
- **Env var sugerido**: `MINIMAX_API_KEY`.

## Ordem de execução sugerida

1. ~~**AI21 Jamba**~~ — integrado
2. **xAI Grok** — ⏸️ standby (implementado mas desregistrado; aguarda top-up $5 + opt-in Data Sharing)
3. ~~**Cohere**~~ — integrado
4. ~~**OpenAI GPT-4o-mini**~~ — integrado (pay-as-you-go, $5 top-up)
5. **Qwen3** — reforça o cluster chinês, 90 dias de free tier
6. **MiniMax** — último, menor valor marginal

## Não recomendados

- **Zhipu GLM**: portal principal inacessível para usuários BR sem VPN; valor editorial sobreponível ao DeepSeek já no corpus.
- **Cohere free tier para produção**: trial key é só experimental, uso comercial exige key paga.
- **Moonshot Kimi**: exige $1 de recarga mínima, pequena fricção, valor marginal baixo.
- **Reka**: sem free tier identificado.
- **Hugging Face Inference API**: throttled agressivamente, mau encaixe pra uso one-shot do benchmark.
- **Replicate**: créditos expiram, não persistente.
- **Perplexity Sonar**: modelo RAG, categoria diferente da tarefa.

## Observações

Este backlog pode ficar defasado. Free tiers mudam, modelos são aposentados, novos labs aparecem. Revisar antes de onboarding novo — o estado aqui reflete abril/2026.
