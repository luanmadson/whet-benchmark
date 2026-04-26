/**
 * Metadados das regras — fonte única de verdade.
 *
 * Usado pela UI e pelo renderer.
 * Cada regra tem título curto (para headers) e intro contextual
 * (para explicar ao usuário quando aquilo é relevante).
 */

import type { Diagnostic } from "./models";

/*=========================================
// Metadados das regras
=========================================*/

export interface RuleMeta {
  title: string;
  intro: string;
}

const RULE_META_PT: Record<string, RuleMeta> = {
  "imperative-overload": {
    title: "Tom imperativo",
    intro:
      "Essas instruções precisam ser tão rígidas? Linguagem imperativa tende a gerar agentes cautelosos que gastam energia avaliando regras em vez de atender ao propósito.",
  },
  "redundant-default": {
    title: "Instruções redundantes",
    intro:
      "Essas instruções mudam algo que o modelo não faria sozinho? Reforçar comportamento padrão não é neutro — pode desperdiçar atenção e tornar o agente mais restritivo.",
  },
  "cognitive-overload": {
    title: "Sobrecarga cognitiva",
    intro:
      "O agente precisa de tantas instruções? Menos instruções bem calibradas costumam superar muitas genéricas competindo por atenção.",
  },
  "vague-instruction": {
    title: "Instruções vagas",
    intro:
      "O agente sabe o que fazer com essas instruções? Orientações genéricas demais não mudam o comportamento de forma previsível.",
  },
  "redundant-repetition": {
    title: "Repetições",
    intro:
      "Repetir reforça ou dilui? A mesma ideia com palavras diferentes tende a competir consigo mesma por atenção.",
  },
  "command-over-question": {
    title: "Comandos sem propósito",
    intro:
      "O agente sabe *por que* precisa fazer isso? Comandos que explicam o motivo — ou que convidam a avaliar — tendem a produzir adesão mais inteligente do que comandos diretos.",
  },
  "threat-framing": {
    title: "Ameaças condicionais",
    intro:
      "Consequências negativas motivam um humano? Talvez. Um modelo? Ameaças condicionais tendem a gerar excesso de ressalvas e cautela paralisante — o modelo gasta energia antecipando falha em vez de focar no resultado.",
  },
  "role-inflation": {
    title: "Inflação de papel",
    intro:
      "Superlativos e credenciais fictícias mudam o comportamento do modelo? Quase nunca — o modelo já tenta dar a melhor resposta possível. Descrever a perspectiva concreta tende a orientar mais do que rotular o agente como 'o melhor do mundo'.",
  },
  "conditional-reward": {
    title: "Recompensa condicional",
    intro:
      "Prometer gorjeta ou avaliação positiva motiva um modelo? Não — ele não recebe nada e sabe disso. Esse framing desloca atenção do propósito real para uma transação fictícia. Descrever o que está em jogo tende a ancorar melhor.",
  },
  "tone-domain-mismatch": {
    title: "Tom casual em domínio sensível",
    intro:
      "Pedir tom casual num domínio como direito, saúde ou finanças não é neutro — nessas áreas, a formalidade sinaliza responsabilidade e ajuda o usuário a calibrar o peso da resposta. Um bom caminho é descrever o propósito por trás do tom ('linguagem acessível', 'sem jargão desnecessário') em vez do tom em si.",
  },
  "contradiction": {
    title: "Contradições",
    intro:
      "Duas instruções puxando para direções opostas no mesmo prompt forçam o agente a adivinhar qual lado priorizar. O resultado tende a ser inconsistente — às vezes inclina pra um lado, às vezes pro outro. Resolver a tensão (ou condicionar uma à outra) costuma dar mais previsibilidade.",
  },
  "unresolved-reference": {
    title: "Referências externas",
    intro:
      "Estas instruções remetem a artefatos que o modelo não terá acesso — documentos anexos, templates, apêndices. A instrução degrada silenciosamente: o modelo ignora, alucina o conteúdo, ou pede esclarecimento. Incluir o conteúdo essencial diretamente no prompt tende a resolver.",
  },
};

const RULE_META_EN: Record<string, RuleMeta> = {
  "imperative-overload": {
    title: "Imperative tone",
    intro:
      "Do these instructions need to be so rigid? Imperative language tends to produce cautious agents that spend energy evaluating rules instead of serving the purpose.",
  },
  "redundant-default": {
    title: "Redundant instructions",
    intro:
      "Do these instructions change something the model wouldn't do on its own? Reinforcing default behavior isn't neutral — it can waste attention and make the agent more restrictive.",
  },
  "cognitive-overload": {
    title: "Cognitive overload",
    intro:
      "Does the agent need this many instructions? Fewer well-calibrated instructions tend to outperform many generic ones competing for attention.",
  },
  "vague-instruction": {
    title: "Vague instructions",
    intro:
      "Does the agent know what to do with these instructions? Overly generic guidance doesn't change behavior predictably.",
  },
  "redundant-repetition": {
    title: "Repetitions",
    intro:
      "Does repeating reinforce or dilute? The same idea in different words tends to compete with itself for attention.",
  },
  "command-over-question": {
    title: "Commands without purpose",
    intro:
      "Does the agent know *why* it needs to do this? Commands that explain the reason — or invite evaluation — tend to produce smarter compliance than direct commands.",
  },
  "threat-framing": {
    title: "Conditional threats",
    intro:
      "Do negative consequences motivate a human? Maybe. A model? Conditional threats tend to generate excessive caveats and paralyzing caution — the model spends energy anticipating failure instead of focusing on the result.",
  },
  "role-inflation": {
    title: "Role inflation",
    intro:
      "Do superlatives and fictional credentials change the model's behavior? Rarely — the model already tries to give the best possible response. Describing the concrete perspective tends to guide more than labeling the agent as 'the world's best'.",
  },
  "conditional-reward": {
    title: "Conditional reward",
    intro:
      "Does promising a tip or a 5-star rating motivate a model? No — it gets nothing and knows it. This framing shifts attention from the real purpose to a fictional transaction. Describing what's actually at stake tends to anchor better.",
  },
  "tone-domain-mismatch": {
    title: "Casual tone in a sensitive domain",
    intro:
      "Asking for a casual tone in a domain like law, health, or finance isn't neutral — in these areas, formality signals accountability and helps the user calibrate the weight of the answer. A better path is to describe the purpose behind the tone ('accessible language', 'no unnecessary jargon') instead of the tone itself.",
  },
  "contradiction": {
    title: "Contradictions",
    intro:
      "Two instructions pulling in opposite directions in the same prompt force the agent to guess which side to prioritize. The result tends to be inconsistent — sometimes leaning one way, sometimes the other. Resolving the tension (or conditioning one on the other) usually gives more predictability.",
  },
  "unresolved-reference": {
    title: "External references",
    intro:
      "These instructions refer to artifacts the model won't have access to — attached documents, templates, appendices. The instruction degrades silently: the model ignores it, hallucinates the content, or asks for clarification. Including the essential content directly in the prompt tends to resolve this.",
  },
};

/** Retrocompatibilidade: alias para PT */
export const RULE_META = RULE_META_PT;

export function getRuleMeta(lang: "pt" | "en"): Record<string, RuleMeta> {
  return lang === "en" ? RULE_META_EN : RULE_META_PT;
}

/*=========================================
// Agrupamento por regra
=========================================*/

export function groupByRule(diagnostics: Diagnostic[]): Map<string, Diagnostic[]> {
  const grouped = new Map<string, Diagnostic[]>();
  for (const d of diagnostics) {
    const list = grouped.get(d.rule) || [];
    list.push(d);
    grouped.set(d.rule, list);
  }
  return grouped;
}
