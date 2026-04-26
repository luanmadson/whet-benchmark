# Whet Benchmark

[![npm](https://img.shields.io/npm/v/@trywhet/cli?color=3b82f6&label=%40trywhet%2Fcli)](https://www.npmjs.com/package/@trywhet/cli)
[![license](https://img.shields.io/npm/l/@trywhet/cli?color=64748b)](./LICENSE)

**Whet é um benchmark.** Mede quanto cada LLM consegue afiar um prompt mal-escrito sem destruir a intenção original — *meta-prompt-following sob pressão pra preservar propósito*. É um buraco que MMLU, HumanEval e HLE não cobrem: benchmarks tradicionais medem o que o modelo sabe ou consegue gerar, não o quão bem ele entende uma instrução ruim e reformula sem perder o que importava.

Metodologia aberta, dados abertos, código aberto (este repo). Cada rodada é reproduzível a partir do `corpus.json` e do `runner.js`. O delta antes-depois — `86 → 100` — é a métrica central; quanto mais alto e estável em modelos diferentes, mais forte a evidência de que os padrões catalogados são reais e transferíveis.

Resultados ao vivo em **[trywhet.com/whet-benchmark](https://trywhet.com/whet-benchmark)**.

## O que mora aqui

```
src/
├── core/             Engine do linter — 12 regras + analyzer + renderer + i18n
└── cli/              Entry point da versão de terminal
bin/
└── whet.js           Wrapper que aponta pro bundle compilado em dist/cli/
whorl/
└── benchmark/        Runner do cross-model benchmark
    ├── runner.js          CLI runner (--providers, --prompts, --dry-run)
    ├── corpus.json        Prompts deliberadamente mal-escritos (rotativo)
    ├── results.json       Histórico cumulativo de todas as runs
    ├── providers/         Adapters por provider (Gemini, Mistral, Groq, …)
    ├── README.md          Tese, metodologia, decisões editoriais
    └── PROVIDERS-BACKLOG.md  Notas sobre providers futuros / em standby
tests/                 109 testes unitários + integração CLI
package.json           Publica o @trywhet/cli no npm
tsconfig.cli.json      Compila core + cli pra dist/
```

## CLI

```bash
# Uso rápido (sem instalar nada permanente)
npx @trywhet/cli prompt.txt
echo "Você é o melhor do mundo..." | npx @trywhet/cli -

# Instalação global
npm install -g @trywhet/cli
whet prompt.txt

# JSON output pra integração
whet prompt.txt --json
```

Exit code 0 quando o score é ≥ 90, 1 entre 60 e 89, 2 abaixo de 60 ou na presença de erros — feito pra servir de step num pre-commit ou CI check. Saída ANSI colorida em TTY, plain text quando a stdout é pipe/redirect.

## Rodando o benchmark

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
COHERE_API_KEY=...      # https://dashboard.cohere.com (trial 1k req/mês)
OPENAI_API_KEY=...      # https://platform.openai.com (top-up $5)
EOF

npm run benchmark:dry         # lista quais providers estão configurados
npm run benchmark             # roda os 12 prompts atuais em todos
node whorl/benchmark/runner.js --providers=gemini,claude-cli
```

Provider sem chave configurada é pulado silenciosamente. Claude via CLI aproveita a subscription do Claude Code — não precisa de chave.

## Regras detectadas

12 regras estáticas, cada uma com base em experiência real (ver critérios em `whorl/benchmark/README.md`):

| Regra | Endereça |
|---|---|
| `redundant-default` | Instruções que repetem comportamento já default do modelo |
| `imperative-overload` | Excesso de SEMPRE/NUNCA/É OBRIGATÓRIO que paralisa o agente |
| `cognitive-overload` | Volume de instruções acima do limite de eficácia (com tolerância pra prompts bem estruturados) |
| `contradiction` | Pares de instruções opostas no mesmo prompt |
| `vague-instruction` | Instruções genéricas demais pra ter efeito |
| `redundant-repetition` | Mesma ideia repetida em outras palavras |
| `command-over-question` | Comandos sem propósito explicado |
| `threat-framing` | Ameaças que geram cautela paralisante em vez de orientar |
| `role-inflation` | Inflação de credenciais que não muda comportamento |
| `conditional-reward` | Promessas de recompensa que são vazias pra um modelo |
| `tone-domain-mismatch` | Tom casual em domínio sensível (jurídico, saúde, finanças) |
| `unresolved-reference` | Referências a artefatos externos não fornecidos |

PT, EN e ES — cada regra cobre os três idiomas. Detalhes de filosofia, critérios pra criar regra nova e exemplos em `whorl/benchmark/README.md`.

## Tese e limitações

Resumo direto:

- **O que é.** Benchmark cumulativo cross-model com prompts deliberadamente mal-escritos, score antes/depois calculado pelo linter local, agregação por provider e por rodada.
- **O que mede.** Meta-prompt-following sob pressão pra preservar intenção. Habilidade de afiar entrada ruim sem destruir o propósito.
- **O que NÃO mede.** Qualidade absoluta do output, capacidade de raciocínio puro, conhecimento factual. Esses ângulos são cobertos por outros benchmarks (MMLU, HumanEval, HLE, Tau-bench).
- **Limitação assumida.** Score é internamente consistente mas não absoluto — é um agregado de quantos padrões catalogados foram resolvidos. Pra benchmark acadêmico ou veredicto definitivo, não substitui julgamento humano. Mas como referência reproduzível e cumulativa de comportamento real em prompt-rewriting, é um sinal útil que poucos benchmarks geram.

Tese inteira em `whorl/benchmark/README.md`. Editorial e movimentações no [blog](https://trywhet.com/blog).

## Contribuir

Issues e PRs bem-vindos. Antes de abrir:

- **Regra nova:** lê os 5 critérios em `whorl/benchmark/README.md` (não duplica default do modelo, base experiencial, muda comportamento, autossuficiente, tensões declaradas). Sem isso, a regra não vai mesclar.
- **Provider novo:** lê `whorl/benchmark/PROVIDERS-BACKLOG.md` pra ver se já tem nota, free tier validado, etc.
- **Bug:** mais útil se vier com prompt + saída esperada vs obtida.

## Site e produto

Este repositório tem o **benchmark** — engine, runner, corpus, resultados. O **site** (`trywhet.com`) com playground interativo, ranking ao vivo e blog editorial vive em repo separado privado, e consome este como pacote npm. Essa separação é proposital: lógica anti-abuso, secrets de produção e UI ficam fechados; o que importa pra quem cita o benchmark fica aberto.

## Licença

MIT. Detalhes em `LICENSE`.
