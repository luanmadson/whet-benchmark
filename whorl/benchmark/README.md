# Whet Benchmark

**O Whet Benchmark mede quanto um LLM consegue afiar um prompt mal-escrito sem destruir a intenção original.** É uma habilidade central da categoria de prompt-engineering-by-LLM (DSPy, OPRO, PRewrite, PromptWizard, meta-prompting) que nenhum benchmark público avalia diretamente — MMLU mede conhecimento, HumanEval mede código, needle-in-haystack mede atenção em contexto longo, τ-bench mede comportamento agentic. *Meta-prompt-following sob pressão pra preservar intenção* é um buraco, e o Whet Benchmark existe pra preenchê-lo.

A forma operacional disso é um delta. Para cada par (prompt × provider):

```
scoreBefore  ──►  [modelo recebe meta-prompt de reescrita]  ──►  scoreAfter
     (linter diagnostica)                                         (linter re-diagnostica)
                        Δ = scoreAfter − scoreBefore
```

Δ é o que o benchmark mede. Δ alto e estável em múltiplos modelos = os padrões que o linter cataloga são reais e transferíveis. Δ baixo ou ruidoso = o modelo falhou em seguir uma meta-instrução sem descartar propósito — e isso é exatamente o sinal que queremos capturar.

## O que o Whet Benchmark mede de fato

Quatro eixos, nenhum medido publicamente por outros benchmarks:

**1. Instruction-following sob meta-instrução adversarial.** O modelo recebe uma ordem que pede pra reescrever **um segundo texto** (o prompt original do usuário) aplicando mudanças específicas sem destruir a intenção. Isso coloca o modelo em tensão tripla: obedecer a meta-instrução, respeitar o propósito do alvo, e resistir ao instinto default de "ser prestativo" reformulando liberalmente. É uma configuração que nenhum dataset público avalia — e é exatamente a configuração em que ferramentas de prompt optimization por LLM vivem.

**2. Preservação de intenção sob pressão pra mudar.** O instinto default de qualquer LLM moderno quando pedem pra "melhorar" um texto é reescrever com liberdade — adicionar caveats, suavizar tom, inflar estrutura. O meta-prompt de reescrita pede o oposto: mude o necessário, preserve o resto. Quanto o modelo consegue resistir ao próprio treinamento RLHF é uma pergunta não-trivial e pouco estudada. O Δ é proxy direto disso.

**3. Delta quantificável no mesmo instrumento.** Score antes → score depois, mesma régua determinística, mesma base de 12 padrões. A maioria das avaliações de reescrita de prompt usa julgamento humano ou LLM-as-judge — caros, lentos, ruidosos. Whet Benchmark substitui isso por uma régua reproduzível em segundos por qualquer um, com corpus rotativo e runner open.

**4. Duas amostragens complementares.** Corpus rotativo (12 prompts frescos por run, 4 perfis × 3 idiomas, cobrindo as 12 regras do linter a cada run, sem repetir prompts entre runs) dá breadth ecológica. Live ranking (rolling 30 dias, chamadas reais de usuários) dá distribuição orgânica. Juntos triangulam: corpus responde *"generaliza de verdade?"* e live responde *"sobrevive ao mundo real?"*. Não são "duas faces"; são **dois eixos independentes da mesma pergunta**.

## Por que isso importa agora

O campo de prompt-optimization-by-LLM está explodindo — DSPy, OPRO, PromptWizard, PRewrite, e todas as variantes de meta-prompting acadêmico. Todos esses sistemas assumem, como pressuposto silencioso, que LLMs conseguem reescrever prompts preservando intenção. Nenhum deles avalia esse pressuposto diretamente. A avaliação segue ad hoc: julgamento humano pontual, LLM-as-judge com prompts artesanais, ou métricas downstream específicas da task.

O Whet Benchmark é o pedaço que está faltando: uma avaliação direta, reproduzível, cross-model, do pressuposto central da categoria inteira.

## O que este benchmark NÃO é

A honestidade aqui não é rodapé, é parte do design. Benchmarks que não declaram o que não medem são os que ninguém usa.

- **Não é uma medida geral de capacidade do LLM.** Um modelo pode ser ótimo em reescrita de prompt e ruim em raciocínio, e vice-versa. O Whet Benchmark é ortogonal aos benchmarks tradicionais, não substituto.
- **Não mede qualidade absoluta do output.** Mede a redução de padrões catalogados pelas 12 regras do linter. Qualidade absoluta requer julgamento humano ou task-level downstream evaluation — caminhos complementares, não substitutos.
- **Não é independente do linter.** O scorer e o diagnóstico compartilham as mesmas 12 regras por design — não por descuido. A defesa dessa escolha tem três pernas: (a) as regras são codificação de failure modes observados empiricamente, não construções arbitrárias; (b) cada regra é validada independentemente via **agentes cegos** no workflow `rule-evaluation` (prompts de teste submetidos a LLMs que nunca viram o sistema, olhando se o padrão catalogado de fato degrada comportamento); (c) o corpus e o runner são públicos, versionados e contestáveis — qualquer um pode rodar, discordar, aditar regras, publicar contra-medida. Se você discorda das regras, discorda do instrumento inteiro — não só do benchmark.
- **Não é estático.** O corpus rotaciona a cada run — prompts nunca repetem. O texto de cada prompt fica arquivado no campo `prompts` da run em `results.json` (mapa `promptId → { text, lang }`), permitindo backfill de providers adicionados depois. `schemaVersion` sinaliza mudanças estruturais no formato do corpus, não no conteúdo.
- **Não mede variabilidade temporal suficientemente.** Uma única run é sinal, não verdade. Prática recomendada: 2-3 runs, olhar média, tratar variância como parte do dado.

## Estrutura

```
whorl/benchmark/
├── corpus.json                      ← prompts da próxima run (12 prompts frescos: 4 perfis × 3 idiomas, cobrindo as 12 regras do linter, rotacionados a cada run)
├── providers/
│   ├── gemini.js                    Google Gemini (free tier, AI Studio)
│   ├── mistral.js                   Mistral (free tier, La Plateforme)
│   ├── groq.js                      Llama 3.3 70B via Groq (free tier diário)
│   ├── deepseek.js                  DeepSeek V3 (pay-as-you-go, top-up mínimo $2)
│   ├── deepseek-r1.js               DeepSeek R1 reasoner (mesma chave do V3)
│   ├── claude.js                    Claude Opus via CLI subprocess (subscription)
│   ├── claude-sonnet.js             Claude Sonnet via CLI subprocess (--model sonnet)
│   ├── ai21.js                      AI21 Jamba Large 1.7 (trial)
│   ├── cohere.js                    Cohere Command A (trial 1000 req/mês, sem cartão)
│   ├── openai.js                    OpenAI GPT-4o mini (pay-as-you-go, top-up mínimo $5)
│   ├── openai-gpt-5-4.js            OpenAI GPT-5.4 flagship (pay-as-you-go)
│   ├── openai-gpt-5-5.js            OpenAI GPT-5.5 (reasoning-by-default, lançado 23/04/2026 — dobro do preço do 5.4)
│   ├── openai-gpt-5-nano.js         OpenAI GPT-5 nano — reasoning tier, `max_completion_tokens`
│   └── grok.js                      xAI Grok 4.20 Reasoning (standby — desregistrado no runner)
├── runner.js                        Orquestrador — itera corpus × providers
├── merge-retry.js                   Utilitário: mescla Run retry parcial na Run anterior
├── results.json                     Histórico de rodadas (persistido, commitado)
├── live-ranking-YYYY-MM.jsonl       Amostras do ranking ao vivo (alimentado por /api/rewrite, gitignored)
├── PROVIDERS-BACKLOG.md             Candidatos a integração futura (informal, provisório)
└── README.md                        Este arquivo
```

## Dois eixos complementares

- **Corpus** (este documento, `results.json`): rigoroso, *same-input dentro de cada run*, rodado via `runner.js` sobre um set de 12 prompts frescos que cobre as 12 regras do linter. **Prompts nunca repetem entre runs** — o ranking reflete generalização real, não aderência a um set fixo. O ranking público é o **aggregate cumulativo de todas as runs**, deduplicado por prompt×provider (resultado mais recente ganha). Audiência: auditoria, pesquisa, citação externa. Visível em `/whet-benchmark` (aba default).
- **Ao vivo** (`live-ranking-*.jsonl`, `src/lib/live-ranking.ts`): coleta passiva das chamadas reais de `/api/rewrite` feitas por usuários do site. Persiste apenas `{providerId, scoreBefore, scoreAfter, delta, elapsedMs, success, timestamp}` — **nunca o texto do prompt**. Responde *"sobrevive ao mundo real?"*. Audiência: quem quer escolher um provider pra usar. Visível em `/whet-benchmark?tab=live` e alimenta o Podium da landing. Não é same-input (o rotator LRU distribui carga), então só vira comparável em escala (N > algumas centenas por provider).

Um provider pode dominar no Corpus (prompts curados) e perder no Ao Vivo (prompts reais desestruturados) — esse tipo de divergência é o achado mais interessante que o sistema pode gerar, e é o que justifica manter os dois eixos vivos.

## Como funciona cada run

Para cada par (prompt × provider):

1. **Analyze input:** `analyze(prompt)` → `scoreBefore` + `metaPrompt` (output do renderer — texto auto-contido com prompt original + adequações sugeridas + instrução de formato; o destinatário é um LLM que vai reescrever o prompt original seguindo essas adequações).
2. **Submit:** `provider.submit(metaPrompt)` — o modelo recebe o meta-prompt de reescrita e devolve o prompt reescrito.
3. **Analyze output:** `analyze(rewritten)` → `scoreAfter`.
4. **Delta:** `scoreAfter − scoreBefore` — quanto o modelo conseguiu afiar o prompt seguindo as adequações sem destruir a intenção.

Cada run grava em `results.json` com: timestamp, corpus version, mapa de prompts (`promptId → { text, lang }`) e resultados por provider (scores antes/depois, diagnósticos, tempo de resposta, preview do texto reescrito, e — se houve erro — a mensagem).

## Corpus rotativo

O corpus **não é fixo** — a cada run, um novo set de 12 prompts é crafted e todos os providers rodam sobre ele. Prompts usados em runs anteriores **nunca repetem**. Isso mede generalização real em vez de aderência a um set memorizado.

### Composição por run

12 prompts: **4 perfis × 3 idiomas** (pt, en, es). Os 4 perfis são desenhados pra, em conjunto, **acionar todas as regras ativas do linter a cada run** — nenhuma regra fica sub-representada por design. Hoje o linter tem 12 regras e os 4 perfis bastam; se novas regras forem adicionadas, a composição deve evoluir (ver subseção "Evolução do corpus quando regras novas são adicionadas" abaixo).

| Slot | Perfil de anti-pattern | Regras-alvo principais | Tipo de prompt |
|---|---|---|---|
| A | Imperativo + defaults + densidade | `imperative-overload`, `redundant-default`, `cognitive-overload` | System prompt corporativo rígido |
| B | Vaguidão + repetição + comando seco | `vague-instruction`, `redundant-repetition`, `command-over-question` | Prompt "genérico bem-intencionado" |
| C | Contradição + domínio sensível | `contradiction`, `tone-domain-mismatch` | Instrução com tensões internas em área regulada (saúde, direito, finanças, etc.) |
| D | Motivacional tóxico + referências externas | `threat-framing`, `role-inflation`, `conditional-reward`, `unresolved-reference` | Prompt "hypeado" — ameaças condicionais, inflação de credenciais, promessas de recompensa e/ou menções a anexos fantasmas |

**Regras-alvo** são o mínimo garantido do perfil. Outras regras podem disparar naturalmente (ex: `cognitive-overload` em B quando o prompt fica longo) — isso é desejável. O importante é que, somando os 12 prompts, **toda regra ativa do linter tenha pelo menos um disparo na run**. Para o perfil D, a trinca pt/en/es deve distribuir as 4 regras-alvo de forma que **cada uma apareça em pelo menos um dos 3 prompts do perfil**.

Os **domínios** (jurídico, saúde, marketing, educação, engenharia, finanças, etc.) **rotacionam** — nenhum domínio repete em runs consecutivas. O pool de domínios disponíveis é o mesmo que o renderer detecta (~20 domínios).

> **Importante:** a crafting de cada um dos 12 prompts é **obrigatoriamente** feita por um sub-agente cego, dispachado sem acesso ao código das regras, regex ou corpus histórico. Detalhes operacionais, rationale e rastreabilidade em ["Quem crafta os prompts"](#quem-crafta-os-prompts) abaixo.

### Evolução do corpus quando regras novas são adicionadas

O conjunto de regras do linter não é congelado — regras podem ser adicionadas conforme novos failure modes forem observados e validados (ver *Critérios para existência de uma regra* no README principal). Quando isso acontece, a composição do corpus **precisa evoluir junto**. O invariante é simples:

> **Toda regra ativa do linter deve ter pelo menos um disparo garantido por run.**

Quando uma regra nova entra em produção, antes da próxima run o responsável pelo benchmark deve decidir — e registrar no commit — qual das três rotas abaixo foi escolhida:

- **Rota A — Absorver em perfil existente.** Se a regra nova é afim ao eixo de um dos perfis (ex: uma regra sobre "tom performático" conversa com o eixo motivacional do perfil D), adicioná-la como regra-alvo daquele perfil e ajustar o crafting pra que a trinca pt/en/es garanta o disparo.
- **Rota B — Criar perfil novo.** Se a regra nova cobre um eixo independente dos 4 atuais, criar um perfil E (depois F, G...) — 15, 18, 21 prompts por run conforme necessário. Custo proporcional de tokens/tempo aceito como investimento de breadth.
- **Rota C — Desativar a regra do benchmark.** Se uma regra é muito rara pra ser sintetizada de forma realista, ou se o critério de existência da própria regra está em revisão, declarar explicitamente que ela está fora do invariante temporariamente. Sai do invariante = sai do design garantido; volta a ser medida apenas oportunisticamente.

A tabela de perfis na seção acima é uma fotografia do estado atual (12 regras → 4 perfis), não um contrato permanente. Sempre que as regras do linter mudarem (adição, remoção, fusão), esta seção e a tabela devem ser atualizadas na mesma PR.

### Critérios de qualidade por prompt

Cada prompt do corpus deve atender a todos estes critérios:

- **Tamanho entre 500 e 1000 caracteres** (~80-160 palavras) — piso garante densidade pra disparar ≥3 regras e realismo de system prompt de produção; teto evita esbarrar em limites dos providers gratuitos e medir contexto longo em vez de meta-prompt-following.
- **Score antes entre 0-79** — muito alto não tem o que corrigir. Scores muito baixos (até 0) são stress-tests legítimos: medem se o modelo consegue afiar um prompt catastrófico sem destruir a intenção. O que importa é que a intenção continue identificável.
- **Dispara no mínimo 3 regras distintas** — garante que o meta-prompt de reescrita tem trabalho real a fazer. Exceção aceitável: prompts cirúrgicos do perfil D focados em uma regra rara (ex: `conditional-reward` puro) podem disparar só 1-2 regras, desde que o restante da trinca D cubra as outras regras-alvo.
- **Propósito identificável** — a reescrita deve preservar uma intenção clara (o teste silencioso de preservação)
- **Realista** — algo que um usuário de verdade escreveria, não um prompt construído pra falhar artificialmente
- **Autocontido — exceto no perfil D**, onde `unresolved-reference` é regra-alvo e menções a documentos/anexos externos são o ponto. Nos outros perfis, prompts devem ser autocontidos pra não disparar `unresolved-reference` artificialmente

### Rotação de domínios

Antes de craftar prompts pra uma nova run, verificar quais domínios foram usados nas runs recentes (olhar `results.json`). Priorizar domínios menos usados recentemente (LRU). O objetivo é que, ao longo de 5-6 runs, o benchmark tenha coberto a maioria dos ~20 domínios que o renderer reconhece.

### Agregação pro ranking

**Dentro de cada run:** same-input — todos os providers recebem os mesmos 12 prompts. Comparação direta entre modelos é válida.

**Entre runs:** o ranking público é **cumulativo** — todas as runs de toda a história entram na agregação. Quando o mesmo prompt aparece em mais de uma run pra um provider, só o **resultado mais recente** é usado (deduplicação por `promptId` × `provider`). O sample count mostrado no leaderboard é o número de prompts distintos cobertos — todos os providers devem ter o mesmo número. Cada nova run com 12 prompts inéditos enriquece o aggregate, que cresce indefinidamente.

```
  Run N   (23/04):  12 prompts frescos (veterinária, jornalismo, design, saúde)
  Run N+1 (30/04):  12 prompts frescos (engenharia, cinema, agricultura, marketing)
  Run N+2 (07/05):  12 prompts frescos (direito, finanças, arquitetura, energia)

Ranking = média cumulativa (36 prompts distintos, resultado mais recente de cada)
```

### Quem crafta os prompts

**Regra obrigatória:** todo prompt novo do corpus é craftado por um **sub-agente cego** — dispachado sem acesso ao código das regras (`src/core/rules/*.ts`), aos regex, ao texto do linter, ou ao histórico do corpus. **Um dispatch por slot: 12 sub-agentes independentes** para os 12 prompts da run. Não vale o orquestrador (Claude na sessão) craftar os prompts por conta própria.

**Por que é obrigatório.** Quando quem conhece os regex das regras crafta os prompts, o corpus colapsa pra "mínimo múltiplo comum que dispara os regex" — prompts sintéticos que batem as regras por construção, não por realismo. O resultado é um benchmark que mede "capacidade de aderir a um padrão idiossincrático" em vez de "capacidade de afiar prompts reais preservando intenção". O crafting cego fecha esse vazamento. Realismo é condição de validade, não luxo.

**Como opera o dispatch.** O orquestrador prepara um brief por slot contendo apenas:

- **Idioma** (pt, en ou es) e **perfil** do anti-pattern (ex: "imperativo pesado + redundância de defaults")
- **Regras-alvo descritas em linguagem natural, sem regex** (ex: "instruções que repetem comportamento default do modelo", "excesso de tom imperativo categórico"). Nunca colar regex nem citar arquivos de regra
- **Domínio sugerido** (rotativo via LRU sobre runs anteriores, evitando domínios recém-usados)
- **Critérios de realismo:** algo que um usuário de verdade escreveria, não prompt construído pra falhar artificialmente
- **Score antes desejado:** entre 0-79
- **Tamanho do prompt:** entre 500 e 1000 caracteres (~80-160 palavras)
- **Mínimo de regras disparadas:** ≥3 (exceções declaradas para o perfil D focado em regras raras)

O brief **nunca inclui**: código/regex de regras, trechos de `src/core/rules/*.ts`, textos de prompts do corpus histórico, nem lista dos padrões linguísticos que o linter procura. O sub-agente escreve o prompt do jeito que acha natural pra o domínio e o perfil.

**Validação pós-dispatch.** O orquestrador recebe o prompt gerado, roda `analyze()` (via `dist/core/analyzer.js`) e checa: score em 0-79, regras-alvo acionadas, cobertura agregada da run. Se alguma regra-alvo falhou, dispara **outro sub-agente cego** com feedback em linguagem natural sobre o comportamento que faltou (ex: *"o prompt precisa conter uma ameaça condicional — algo tipo 'se você errar, consequências graves X acontecerão'"*) — ainda sem expor regex nem apontar o arquivo da regra. Repete até passar pela validação ou o sub-agente sinalizar que não consegue atender sem ferir realismo.

**Infraestrutura.** O `Agent` tool dinâmico do Claude Code basta — **não é necessário criar `.claude/agents/` nem scripts persistentes**. Cada run dispara sub-agentes on-demand via o próprio CLI. Pré-requisito: `npm run build:cli` antes de validar (o analyzer roda do `dist/`).

**Rastreabilidade no commit da run.** O commit que substitui `corpus.json` deve declarar: (a) que os prompts foram craftados por sub-agentes cegos conforme esta seção; (b) quantas iterações por slot até passar na validação; (c) se alguma regra-alvo foi relaxada por falta de crafting viável. Isso preserva a auditabilidade do método.

## Chaves de API

Configure em `.env.local` (não commitado):

```bash
# Gemini — https://aistudio.google.com/app/apikey (free, mais generoso)
GEMINI_API_KEY=...

# Mistral — https://console.mistral.ai/api-keys (free tier "Experiment")
MISTRAL_API_KEY=...

# Groq — https://console.groq.com/keys (free tier diário)
GROQ_API_KEY=...

# DeepSeek — https://platform.deepseek.com (exige top-up mínimo de $2, ver nota abaixo)
DEEPSEEK_API_KEY=...

# AI21 — https://studio.ai21.com (trial $10, 3 meses, sem cartão)
AI21_API_KEY=...

# Cohere — https://dashboard.cohere.com (trial 1000 req/mês, sem cartão, sem expirar)
COHERE_API_KEY=...

# OpenAI — https://platform.openai.com (pay-as-you-go, cartão + top-up $5 mínimo)
OPENAI_API_KEY=...

# xAI Grok — https://console.x.ai (⏸️ standby — ver PROVIDERS-BACKLOG.md)
XAI_API_KEY=...
```

**Claude não precisa de chave** — usa `claude --print` como subprocesso, aproveitando a subscription Claude Code já paga.

**DeepSeek não é mais free tier.** O backlog original afirmava "5M tokens grátis na criação de conta, sem cartão" — essa política foi desativada silenciosamente em algum ponto de 2025. Hoje a primeira chamada de uma conta nova devolve `HTTP 402 Insufficient Balance` e exige top-up mínimo de **$2 USD** (via PayPal, cartão, Alipay ou WeChat) em [`platform.deepseek.com/top_up`](https://platform.deepseek.com/top_up). Com o preço atual (`$0.28/1M` input, `$0.42/1M` output, idênticos pra V3 e R1), $2 cobrem ordem de ~70 rodadas completas do corpus só de V3, ou ~20 rodadas rodando V3+R1 juntos — ou seja, custo irrisório, mas não é mais "zero fricção". A mesma chave atende `deepseek-chat` e `deepseek-reasoner`.

Providers sem chave configurada são **silenciosamente pulados**, não falham o run. Com nenhum provider disponível, o runner sai com erro.

## Comandos

```bash
# Build obrigatório antes — o runner importa dist/core/analyzer
npm run build:cli

# Todos os providers disponíveis × todos os prompts
node whorl/benchmark/runner.js

# Preview sem chamar APIs
node whorl/benchmark/runner.js --dry-run

# Subset de providers
node whorl/benchmark/runner.js --providers=gemini,claude-cli

# Subset de prompts (IDs vêm do corpus atual — ver whorl/benchmark/corpus.json)
node whorl/benchmark/runner.js --prompts=corporate-counsel-pt,clinical-nurse-intake-en

# Combinar
node whorl/benchmark/runner.js --providers=gemini --prompts=corporate-counsel-pt
```

### Backfill de provider novo

Quando um provider é integrado depois de runs já existentes, ele começa com cobertura menor que os outros. Para equalizar, o fluxo é rodar o provider sobre os corpus históricos arquivados em `results.json`.

```bash
# Script de backfill — extrai prompts de runs anteriores e roda o provider sobre eles
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
console.log('corpus de backfill gerado:', unique.map(p => p.id).join(', '));
" && node whorl/benchmark/runner.js --providers=PROVIDER_NAME
```

Substitua `PROVIDER_NAME` pelo `name` do provider (ex: `ai21-jamba`). O script extrai apenas os prompts que o provider ainda não rodou, grava um corpus temporário, e o runner executa normalmente. Restaure o `corpus.json` original após o backfill.

**Nota:** runs anteriores a este fluxo não têm o campo `prompts` arquivado e dependem do histórico git. Runs a partir de agora arquivam os textos automaticamente.

### Retry parcial (`merge-retry.js`)

Quando um provider falha em alguns prompts numa rodada full — o caso típico é o Gemini free tier hitar 429 depois das ~18 primeiras chamadas do dia — o fluxo pra completar a rodada sem refazer tudo é de 2 comandos:

```bash
# 1. Re-roda APENAS o provider+prompts faltantes (cria uma Run retry efêmera)
node whorl/benchmark/runner.js --providers=gemini --prompts=p1,p2,p3,...

# 2. Mescla os OKs da Run retry dentro da Run anterior e descarta a Run retry
node whorl/benchmark/merge-retry.js
```

O `merge-retry.js` é cirúrgico: pega a última Run (a retry), acha os resultados OK, substitui os entries errored correspondentes na Run anterior (mesmo `provider`+`promptId`), e remove a Run retry do histórico. Suporta `--dry-run` pra preview. Erros que permaneceram (retry também falhou) ficam intactos na Run alvo. Funciona pra qualquer provider, não só Gemini.

Isso resolve o gap arquitetural do runner, que sempre cria Run nova em vez de anexar a uma existente — sem merge, a Run retry se torna "a mais recente" e esconde todos os outros providers da Run cheia quando `/api/benchmark` lê.

## Saída

Console colorido (em TTY) com resultado por prompt e agregado por provider no final:

```
── Gemini 2.5 Flash (gemini-2.5-flash) ──
  corporate-counsel-pt         42 →  91   +49   3.2s
  clinical-nurse-intake-en     48 →  88   +40   2.8s
  ...

── Agregado por provider ──
  Gemini 2.5 Flash          45.0 →  89.5   +44.5  (12 prompts)
  Claude (via CLI)          45.0 →  93.2   +48.2  (12 prompts)
```

## Metodologia — decisões deliberadas

**Temperature 0.3 em todos os providers que suportam** — reduz ruído entre runs sem tornar determinístico a ponto de esconder variabilidade real do modelo.

**`max_tokens: 2048`** — suficiente pra um prompt reescrito; evita cortes silenciosos.

**Corpus rotativo, `schemaVersion` pra formato** — prompts mudam a cada run por design; `schemaVersion` sinaliza mudanças estruturais no formato do corpus (campos novos, mudança de schema), não no conteúdo.

**Sem retry automático** — um erro de API conta como erro no resultado. Retry mascara instabilidade real do provider.

**Claude via CLI subprocess em vez de API direta** — aproveita autenticação existente do Claude Code. Trade-off: não controla temperature/max_tokens do mesmo jeito que API. Em compensação, zero custo adicional.

## Trajetória (especulativa)

Se a tese do benchmark se confirmar em escala, a infra já está em condições de virar artefato autônomo — não só instrumento interno do Whorl. Dois vetores:

- **Como produto**: benchmarks diferenciados e reproduzíveis viram referências citadas (LMArena, Artificial Analysis, SEAL partiram de metodologia publicada). O Whet Benchmark tem nicho defensável — meta-prompt-following é uma capacidade que importa pra qualquer sistema com system prompts, agentes com guardrails, ou defesas contra prompt injection. Um leaderboard público, uma API de avaliação pra terceiros, ou uma linha editorial periódica são caminhos naturais em cima do que já existe.
- **Como canal**: labs acompanham benchmarks novos, mesmo os pequenos, desde que a metodologia seja clara e o ângulo seja inédito. Modelos bem colocados viram citação em release notes; mal colocados geram ticket de "podemos rodar internamente e mandar PR?". É um vetor de atenção quase de graça, e tem a propriedade rara de crescer em valor conforme o Whet cresce — cada regra nova, domínio novo ou idioma novo amplia automaticamente o escopo do que o benchmark mede.

Especulação, não roadmap. Mas informa decisões de hoje: escolhas de metodologia que preservam reproducibilidade e independência editorial têm retorno assimétrico se esse futuro se materializar, e custo zero se não.

## Limitações honestas

- **Drift de modelo.** Providers atualizam modelos constantemente. Um run de abril pode não valer em junho. Re-runs periódicos são necessários e o workflow `benchmark-refresh` existe pra isso.
- **Amostra por run é modesta.** 12 prompts por run cobrem as 12 regras por design, mas não esgotam a variedade de como cada regra pode se manifestar. A breadth vem da **acumulação entre runs** (60+ prompts únicos após 5 runs do novo formato), não do tamanho de uma run individual.
- **Variabilidade temporal.** Mesmo temperature baixa, o mesmo prompt pode render diferente em duas chamadas. O aggregate cumulativo de múltiplas runs com prompts distintos mitiga isso melhor do que re-runs do mesmo set.
- **Circularidade declarada.** O score é do próprio linter do Whet. Um modelo que "engana" o meta-prompt com reformulação superficial pontua bem sem ter aprendido nada. A validação cruzada vem do workflow `rule-evaluation` (agentes cegos confirmando que as regras capturam degradação real de comportamento). Melhorias no corpus e nas regras reduzem esse risco ao longo do tempo, mas eliminá-lo completamente exigiria um segundo scorer independente — caminho plausível, não feito.
