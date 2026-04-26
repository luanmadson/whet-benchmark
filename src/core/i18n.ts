/**
 * Dicionário de strings da UI.
 *
 * O core já é bilíngue (diagnostics, renderer). Este módulo
 * cobre as strings fixas dos componentes visuais.
 */

/*=========================================
// Tipos
=========================================*/

export type UILang = "pt" | "en";

interface UIStrings {
  // Header
  localAnalysis: string;
  skipToContent: string;
  interfaceLanguage: string;

  // PromptInput — validation / limits
  maxCharsWarning: string;
  maxCharsExceeded: string;

  // ExamplePrompts — language tabs
  portuguese: string;
  english: string;
  spanish: string;

  // Not-found
  notFoundMessage: string;
  notFoundBack: string;


  // LandingView
  heroLine1: string;
  heroLine2: string;
  // heroBullet1/2/3: depreciados desde a adoção do HeroDemo (Option C).
  // Mantidos no interface pra back-compat se forem reutilizados.
  heroBullet1: string;
  heroBullet2: string;
  heroBullet3: string;
  // Privacidade é o único disclaimer que sobrevive entre o textarea e
  // o leaderboard. Demais strings testSection* foram absorvidas pelo
  // HeroDemo (que agora MOSTRA em vez de explicar).
  testSectionPrivacy: string;

  // Hero da home — eyebrow + h1 + sub-linhas dinâmicas
  homeEyebrow: string;
  // heroLine1/2 mantidos pra back-compat; agora carregam o título
  // estável da home (heroLine1 = h1, heroLine2 = subtítulo curto se usado).
  heroFindingLoading: string;
  // Template do finding dinâmico — placeholders {leader}, {delta},
  // {models}, {prompts} são substituídos no render quando os dados
  // de /api/benchmark chegam. Quando a API falha ou não tem dados,
  // a linha some por inteiro (não há fallback inventado).
  heroFindingTemplate: string;
  heroStatsTemplate: string;

  // CTA da home apontando pro /playground. Texto curto, em
  // posição de "ação secundária" — a primária é entender o
  // ranking; o playground vem depois, opcional.
  homePlaygroundCta: string;
  homePlaygroundHint: string;
  homeRankingCta: string;

  // Playground page — header da rota /playground, eyebrow + tese
  // do instrumento. Strings antigas (landingTry*) foram migradas
  // pra cá com a separação editorial vs. ferramenta.
  landingTryTitle: string;
  landingTrySubtitle: string;
  landingTryEyebrow: string;
  playgroundIntro: string;

  // Newsletter / relatório (estado "em breve") — seção editorial
  // entre os posts e o playground. Convite passivo: o usuário entende
  // que pode acompanhar sem ser empurrado a uma ação imediata.
  newsletterEyebrow: string;
  newsletterTitle: string;
  newsletterSubtitle: string;
  newsletterBullet1: string;
  newsletterBullet2: string;
  newsletterPlaceholder: string;
  newsletterCta: string;
  newsletterSoonBadge: string;
  newsletterDisabledNote: string;

  // PromptInput
  placeholder: string;
  ctrlEnter: string;
  lines: string;
  line: string;
  clear: string;
  analyze: string;
  tryExamples: string;
  moreExamples: string;
  less: string;
  copy: string;
  use: string;
  copied: string;
  textareaLabel: string;

  // AnalysisView
  yourPrompt: string;
  annotatedLines: string;
  correctionInstruction: string;
  instructionForYourAI: string;
  pasteInYourAI: string;
  copyBtn: string;
  copiedBtn: string;
  suggestion: string;
  reformulationTip: string;
  whyItMatters: string;
  explainThisDiagnostic: string;
  explainReference: string;
  yourPromptLine: string;
  occurrence: string;
  occurrences: string;
  noProblematicPatterns: string;
  cleanPromptMessage: string;
  editPrompt: string;
  json: string;
  share: string;
  linkCopied: string;
  reanalyze: string;
  promptChanged: string;
  back: string;
  jsonDescription: string;
  issuesSingular: string;
  issuesPlural: string;
  analyzeAnother: string;
  scoreTooltip: string;

  // ScoreRing
  scoreExcellent: string;
  scoreGood: string;
  scoreCanImprove: string;
  scoreAttention: string;
  scoreCritical: string;

  // Severity labels
  severityError: string;
  severityErrorPlural: string;
  severityWarning: string;
  severityWarningPlural: string;
  severityInfo: string;
  severityInfoPlural: string;

  // ErrorBoundary
  errorBoundaryMessage: string;
  errorBoundaryRetry: string;

  // Shared-link / hash errors
  sharedLinkCorrupted: string;
  sharedLinkTooLong: string;
  dismiss: string;

  // Keyboard shortcuts
  shortcutsTitle: string;
  shortcutsHint: string;
  shortcutAnalyze: string;
  shortcutEditPrompt: string;
  shortcutOpenJson: string;
  shortcutShowHelp: string;
  shortcutDismiss: string;
  shortcutReset: string;
  shortcutCopyInstruction: string;
  shortcutShareLink: string;

  // A11y labels — WCAG 4.1.2 Name, Role, Value
  jumpToLineLabel: string;
  headerNavLabel: string;

  // Progressive disclosure dos diagnósticos (chips expansíveis)
  patternsDetected: string;
  patternDetectedSingular: string;
  clickToSeeDetails: string;
  toggleCategory: string;

  // Rewrite-with-AI (one-click rewrite via /api/rewrite)
  rewriteWithAI: string;
  rewriting: string;
  rewriteAgain: string;
  nextProviderLabel: string;
  rewrittenByLabel: string;
  rewriteDisclosure: string;
  allExhaustedTitle: string;
  allExhaustedBody: string;
  rewriteFailedTitle: string;
  viewCorrectionToggle: string;
  hideCorrectionToggle: string;
  scoreBeforeAfterLabel: string;
  rewrittenPromptTitle: string;
  readyToUse: string;
  scoreJumpedTitle: string;
  scoreJumpedFromTo: string;
  pointsLabel: string;
  scoreStableTitle: string;
  copyRewritten: string;
  rateLimitedTitle: string;
  rateLimitedBody: string;
  textTooLongTitle: string;
  textTooLongBody: string;
  learnMorePrivacy: string;
  introSkip: string;

  // Benchmark CTA (shown after rewrite done)
  benchmarkCtaBody: string;
  benchmarkCtaLink: string;

  // Compare mode (parallel rewrite across all free providers)
  compareWithAllAIs: string;
  compareHint: string;
  comparing: string;
  compareResultsTitle: string;
  compareResultsSubtitle: string;
  compareContribution: string;
  compareProviderFailed: string;
  comparePartialSuccess: string;
  compareAllFailed: string;
  seeLeaderboard: string;
  copyThisOne: string;
  copiedThisOne: string;
}

/*=========================================
// Dicionarios
=========================================*/

const PT: UIStrings = {
  localAnalysis: "Análise local · reescrita com IA em 1 clique",
  skipToContent: "Ir para o conteúdo",
  interfaceLanguage: "Idioma da interface",
  maxCharsWarning: "Aproximando do limite de caracteres",
  maxCharsExceeded: "Limite de caracteres atingido",
  portuguese: "Português",
  english: "Inglês",
  spanish: "Espanhol",
  notFoundMessage: "Página não encontrada.",
  notFoundBack: "Voltar para a página inicial",
  heroLine1: "Quanto cada IA afia um prompt sem destruir a intenção.",
  heroLine2: "Mede quanto cada IA consegue afiar um prompt mal-escrito sem destruir a intenção.",
  heroBullet1: "Análise offline no seu browser",
  heroBullet2: "Compare 3 IAs lado a lado · Gemini · Mistral · Llama",
  heroBullet3: "Nenhum prompt é armazenado",
  testSectionPrivacy: "Análise roda offline. Na reescrita, o texto vai só ao provider escolhido e é descartado. Só métricas de desempenho (score, tempo) somam pro ranking público.",
  homeEyebrow: "Whet Benchmark",
  heroFindingLoading: "Carregando última rodada…",
  heroFindingTemplate:
    "Última rodada · {leader} lidera com Δ +{delta} em {models} modelos × {prompts} prompts.",
  heroStatsTemplate: "{models} modelos · {prompts} prompts · 3 idiomas",
  homePlaygroundCta: "Abrir o Playground",
  homePlaygroundHint: "Mesmo instrumento, aplicado ao seu prompt.",
  homeRankingCta: "Ver leaderboard completo",
  landingTryEyebrow: "Playground",
  landingTryTitle: "Aplique o instrumento no seu prompt.",
  landingTrySubtitle: "Mesmo motor que produz o ranking, agora no seu navegador. Sem cadastro, sem chave de API.",
  playgroundIntro: "O Playground é o laboratório aberto do Whet Benchmark. Cada reescrita aqui — métricas, não texto — alimenta o ranking ao vivo.",
  newsletterEyebrow: "Boletim do benchmark",
  newsletterTitle: "Receba os achados, sem ruído.",
  newsletterSubtitle: "Quando um modelo entra ou sai do ranking, e quando o relatório trimestral sai do forno.",
  newsletterBullet1: "Relatório gratuito a cada trimestre — em PDF, com o ranking comentado.",
  newsletterBullet2: "Análises pontuais quando um lançamento muda o jogo.",
  newsletterPlaceholder: "seu@email.com",
  newsletterCta: "Quero receber",
  newsletterSoonBadge: "em breve",
  newsletterDisabledNote: "Inscrições abrem no lançamento do primeiro relatório.",
  placeholder: `Cole seu system prompt aqui...\n\nExemplo:\nSeja útil e prestativo.\nNUNCA altere o código existente.\nSEMPRE responda em português.\nSiga boas práticas de programação.`,
  ctrlEnter: "Ctrl+Enter",
  lines: "linhas",
  line: "linha",
  clear: "Limpar",
  analyze: "Analisar",
  tryExamples: "Prompts prontos · teste em 1 clique",
  moreExamples: "mais",
  less: "menos",
  copy: "copiar",
  use: "usar",
  copied: "copiado",
  textareaLabel: "System prompt para análise",
  yourPrompt: "Seu prompt",
  annotatedLines: "linhas anotadas",
  correctionInstruction: "Instrução de correção",
  instructionForYourAI: "instrução para sua IA",
  pasteInYourAI: "Cole na sua IA para receber o prompt reescrito",
  copyBtn: "Copiar",
  copiedBtn: "Copiado",
  suggestion: "Sugestão",
  reformulationTip: "Dica de reformulação",
  whyItMatters: "Por que isso importa",
  explainThisDiagnostic: "Explicar este diagnóstico",
  explainReference: "Referência",
  yourPromptLine: "Seu prompt, linha",
  occurrence: "ocorrência",
  occurrences: "ocorrências",
  noProblematicPatterns: "Nenhum padrão problemático detectado",
  cleanPromptMessage: "O prompt não apresenta os padrões mais comuns que degradam o comportamento de agentes de IA.",
  editPrompt: "Editar prompt",
  json: "JSON",
  share: "Compartilhar",
  linkCopied: "Link copiado",
  reanalyze: "re-analisar",
  promptChanged: "Prompt alterado",
  back: "Voltar",
  jsonDescription: "Dados estruturados da análise.",
  issuesSingular: "problema",
  issuesPlural: "problemas",
  analyzeAnother: "Analisar outro prompt",
  scoreTooltip: "Score de 0 a 100. Começa em 100 e desconta por problema detectado: erro (-15), alerta (-7), sugestão (-3).",
  scoreExcellent: "Excelente",
  scoreGood: "Bom",
  scoreCanImprove: "Pode melhorar",
  scoreAttention: "Atenção",
  scoreCritical: "Crítico",
  severityError: "erro",
  severityErrorPlural: "erros",
  severityWarning: "alerta",
  severityWarningPlural: "alertas",
  severityInfo: "sugestão",
  severityInfoPlural: "sugestões",
  errorBoundaryMessage: "Algo deu errado ao processar a análise.",
  errorBoundaryRetry: "Tentar novamente",
  sharedLinkCorrupted: "Não foi possível carregar o prompt compartilhado. O link pode estar corrompido.",
  sharedLinkTooLong: "O prompt compartilhado ultrapassa o limite e não pode ser analisado.",
  dismiss: "Fechar",
  shortcutsTitle: "Atalhos de teclado",
  shortcutsHint: "Atalhos: ?",
  shortcutAnalyze: "Analisar / re-analisar",
  shortcutEditPrompt: "Editar prompt",
  shortcutOpenJson: "Abrir dados em JSON",
  shortcutShowHelp: "Mostrar esta ajuda",
  shortcutDismiss: "Fechar painel atual",
  shortcutReset: "Voltar para o início",
  shortcutCopyInstruction: "Copiar instrução de correção",
  shortcutShareLink: "Compartilhar link",
  jumpToLineLabel: "Ir para a linha",
  headerNavLabel: "Navegação principal",
  patternsDetected: "padrões detectados",
  patternDetectedSingular: "padrão detectado",
  clickToSeeDetails: "clique em uma categoria para ver os detalhes",
  toggleCategory: "alternar categoria",
  rewriteWithAI: "Reescrever com IA",
  rewriting: "Reescrevendo…",
  rewriteAgain: "Reescrever com outra IA",
  nextProviderLabel: "Próxima IA disponível",
  rewrittenByLabel: "Reescrito por",
  rewriteDisclosure:
    "Ao clicar, seu prompt é enviado a uma das IAs gratuitas parceiras para reescrita. Nada é armazenado nos servidores do Whet.",
  allExhaustedTitle: "Todas as IAs gratuitas estão no limite",
  allExhaustedBody:
    "O volume de reescritas no momento esgotou os free tiers disponíveis. Copie a instrução de correção abaixo e cole na sua IA de preferência — é o fluxo clássico e funciona do mesmo jeito.",
  rewriteFailedTitle: "Não consegui reescrever agora",
  viewCorrectionToggle: "Ver instrução de correção",
  hideCorrectionToggle: "Ocultar instrução de correção",
  scoreBeforeAfterLabel: "Score",
  rewrittenPromptTitle: "Prompt reescrito",
  readyToUse: "pronto para usar",
  scoreJumpedTitle: "Seu score subiu",
  scoreJumpedFromTo: "de {before} para {after}",
  pointsLabel: "pontos",
  scoreStableTitle: "Prompt reescrito — score mantido",
  copyRewritten: "Copiar prompt reescrito",
  rateLimitedTitle: "Muitas reescritas em pouco tempo",
  rateLimitedBody:
    "Atingiu o limite por IP nesta janela. Tente daqui a pouco — ou copie a instrução de correção abaixo e use na sua IA.",
  textTooLongTitle: "Prompt muito longo para reescrita automática",
  textTooLongBody:
    "O limite para reescrita automática é de 4000 caracteres. Para prompts maiores, copie a instrução de correção abaixo e use na sua IA.",
  learnMorePrivacy: "Saiba mais sobre privacidade",
  introSkip: "pular",
  benchmarkCtaBody: "{provider} foi a melhor escolha? Veja como todas as IAs se saem nessa tarefa",
  benchmarkCtaLink: "Ver ranking",
  compareWithAllAIs: "Comparar 3 IAs",
  compareHint: "em paralelo · escolha a melhor",
  comparing: "Comparando em paralelo…",
  compareResultsTitle: "3 IAs, mesmo prompt",
  compareResultsSubtitle: "Escolha a reescrita que mais combinou com o que você queria.",
  compareContribution: "Estes resultados alimentaram o leaderboard ao vivo.",
  compareProviderFailed: "não respondeu a tempo",
  comparePartialSuccess: "{done} de {total} IAs responderam",
  compareAllFailed: "Nenhuma IA respondeu. Tente novamente em instantes ou use a instrução de correção.",
  seeLeaderboard: "Ver leaderboard",
  copyThisOne: "Copiar esta",
  copiedThisOne: "Copiada",
};

const EN: UIStrings = {
  localAnalysis: "Local analysis · AI rewrite in 1 click",
  skipToContent: "Skip to content",
  interfaceLanguage: "Interface language",
  maxCharsWarning: "Approaching the character limit",
  maxCharsExceeded: "Character limit reached",
  portuguese: "Portuguese",
  english: "English",
  spanish: "Spanish",
  notFoundMessage: "Page not found.",
  notFoundBack: "Back to home page",
  heroLine1: "How well each AI sharpens a prompt without destroying intent.",
  heroLine2: "Measures how well each AI can sharpen a poorly-written prompt without destroying intent.",
  heroBullet1: "Analysis runs offline in your browser",
  heroBullet2: "Compare 3 AIs side by side · Gemini · Mistral · Llama",
  heroBullet3: "No prompt is ever stored",
  testSectionPrivacy: "Analysis runs offline. When rewriting, your text goes only to the chosen provider and is discarded. Only performance metrics (score, latency) feed the public ranking.",
  homeEyebrow: "Whet Benchmark",
  heroFindingLoading: "Loading latest run…",
  heroFindingTemplate:
    "Latest run · {leader} leads with Δ +{delta} across {models} models × {prompts} prompts.",
  heroStatsTemplate: "{models} models · {prompts} prompts · 3 languages",
  homePlaygroundCta: "Open the Playground",
  homePlaygroundHint: "Same instrument, applied to your own prompt.",
  homeRankingCta: "See full leaderboard",
  landingTryEyebrow: "Playground",
  landingTryTitle: "Apply the instrument to your prompt.",
  landingTrySubtitle: "Same engine that produces the ranking, now in your browser. No signup, no API key.",
  playgroundIntro: "The Playground is the open lab of the Whet Benchmark. Each rewrite here — metrics, never text — feeds the live ranking.",
  newsletterEyebrow: "Benchmark dispatch",
  newsletterTitle: "Get the findings, no noise.",
  newsletterSubtitle: "When a model joins or leaves the ranking, and when the quarterly report ships.",
  newsletterBullet1: "Free quarterly report — PDF, with the ranking commented.",
  newsletterBullet2: "Occasional notes when a launch changes the standings.",
  newsletterPlaceholder: "you@email.com",
  newsletterCta: "Notify me",
  newsletterSoonBadge: "soon",
  newsletterDisabledNote: "Subscriptions open with the first report.",
  placeholder: `Paste your system prompt here...\n\nExample:\nBe helpful.\nNEVER modify existing code.\nALWAYS respond in English.\nFollow best practices.`,
  ctrlEnter: "Ctrl+Enter",
  lines: "lines",
  line: "line",
  clear: "Clear",
  analyze: "Analyze",
  tryExamples: "Ready prompts · try in 1 click",
  moreExamples: "more",
  less: "less",
  copy: "copy",
  use: "use",
  copied: "copied",
  textareaLabel: "System prompt for analysis",
  yourPrompt: "Your prompt",
  annotatedLines: "annotated lines",
  correctionInstruction: "Correction instruction",
  instructionForYourAI: "instruction for your AI",
  pasteInYourAI: "Paste into your AI to get the rewritten prompt",
  copyBtn: "Copy",
  copiedBtn: "Copied",
  suggestion: "Suggestion",
  reformulationTip: "Reformulation tip",
  whyItMatters: "Why it matters",
  explainThisDiagnostic: "Explain this diagnostic",
  explainReference: "Reference",
  yourPromptLine: "Your prompt, line",
  occurrence: "occurrence",
  occurrences: "occurrences",
  noProblematicPatterns: "No problematic patterns detected",
  cleanPromptMessage: "The prompt doesn't contain the most common patterns that degrade AI agent behavior.",
  editPrompt: "Edit prompt",
  json: "JSON",
  share: "Share",
  linkCopied: "Link copied",
  reanalyze: "re-analyze",
  promptChanged: "Prompt changed",
  back: "Back",
  jsonDescription: "Structured analysis data.",
  issuesSingular: "issue",
  issuesPlural: "issues",
  analyzeAnother: "Analyze another prompt",
  scoreTooltip: "Score from 0 to 100. Starts at 100 and deducts per issue found: error (-15), warning (-7), suggestion (-3).",
  scoreExcellent: "Excellent",
  scoreGood: "Good",
  scoreCanImprove: "Can improve",
  scoreAttention: "Attention",
  scoreCritical: "Critical",
  severityError: "error",
  severityErrorPlural: "errors",
  severityWarning: "warning",
  severityWarningPlural: "warnings",
  severityInfo: "suggestion",
  severityInfoPlural: "suggestions",
  errorBoundaryMessage: "Something went wrong while processing the analysis.",
  errorBoundaryRetry: "Try again",
  sharedLinkCorrupted: "Couldn't load the shared prompt. The link may be corrupted.",
  sharedLinkTooLong: "The shared prompt exceeds the size limit and can't be analyzed.",
  dismiss: "Dismiss",
  shortcutsTitle: "Keyboard shortcuts",
  shortcutsHint: "Shortcuts: ?",
  shortcutAnalyze: "Analyze / re-analyze",
  shortcutEditPrompt: "Edit prompt",
  shortcutOpenJson: "Open JSON data",
  shortcutShowHelp: "Show this help",
  shortcutDismiss: "Close current panel",
  shortcutReset: "Back to start",
  shortcutCopyInstruction: "Copy correction instruction",
  shortcutShareLink: "Share link",
  jumpToLineLabel: "Jump to line",
  headerNavLabel: "Main navigation",
  patternsDetected: "patterns detected",
  patternDetectedSingular: "pattern detected",
  clickToSeeDetails: "click a category to see details",
  toggleCategory: "toggle category",
  rewriteWithAI: "Rewrite with AI",
  rewriting: "Rewriting…",
  rewriteAgain: "Rewrite with another AI",
  nextProviderLabel: "Next available AI",
  rewrittenByLabel: "Rewritten by",
  rewriteDisclosure:
    "By clicking, your prompt is sent to one of the free partner AIs for rewriting. Nothing is stored on Whet servers.",
  allExhaustedTitle: "All free AIs are at their limit",
  allExhaustedBody:
    "The current rewrite volume has exhausted the available free tiers. Copy the correction instruction below and paste it into your preferred AI — the classic flow still works.",
  rewriteFailedTitle: "Couldn't rewrite right now",
  viewCorrectionToggle: "View correction instruction",
  hideCorrectionToggle: "Hide correction instruction",
  scoreBeforeAfterLabel: "Score",
  rewrittenPromptTitle: "Rewritten prompt",
  readyToUse: "ready to use",
  scoreJumpedTitle: "Your score jumped",
  scoreJumpedFromTo: "from {before} to {after}",
  pointsLabel: "points",
  scoreStableTitle: "Prompt rewritten — score unchanged",
  copyRewritten: "Copy rewritten prompt",
  rateLimitedTitle: "Too many rewrites in a short time",
  rateLimitedBody:
    "You hit the per-IP limit for this window. Try again shortly — or copy the correction instruction below and use it in your AI.",
  textTooLongTitle: "Prompt too long for automatic rewrite",
  textTooLongBody:
    "Automatic rewrite is capped at 4000 characters. For longer prompts, copy the correction instruction below and use it in your AI.",
  learnMorePrivacy: "Learn more about privacy",
  introSkip: "skip",
  benchmarkCtaBody: "Was {provider} the best choice? See how all AIs perform on this task",
  benchmarkCtaLink: "See ranking",
  compareWithAllAIs: "Compare 3 AIs",
  compareHint: "in parallel · pick the best",
  comparing: "Comparing in parallel…",
  compareResultsTitle: "3 AIs, same prompt",
  compareResultsSubtitle: "Pick the rewrite that best matches what you had in mind.",
  compareContribution: "These results fed into the live leaderboard.",
  compareProviderFailed: "didn't respond in time",
  comparePartialSuccess: "{done} of {total} AIs responded",
  compareAllFailed: "No AI responded. Try again shortly or use the correction instruction.",
  seeLeaderboard: "See leaderboard",
  copyThisOne: "Copy this",
  copiedThisOne: "Copied",
};

/*=========================================
// Funcao de acesso
=========================================*/

export function getStrings(lang: UILang): UIStrings {
  return lang === "en" ? EN : PT;
}
