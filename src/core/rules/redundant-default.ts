/**
 * Regra: redundant-default
 *
 * Situação: instruções que repetem comportamento que o modelo já tem por
 * padrão. Além de desperdiçar espaço de atenção, pode tornar o agente
 * mais restritivo do que o desejado.
 */

import type { AnalysisContext, Diagnostic, Rule } from "../models";

/*=========================================
// Padroes de comportamento padrao
=========================================*/

const DEFAULT_BEHAVIORS: Array<{
  pattern: RegExp;
  why: string;
  suggestion: string;
}> = [
  {
    pattern: /\bseja? (útil|prestativ[oa]|helpful)\b/i,
    why: "modelos já são projetados para serem úteis — essa é a orientação base de todo LLM",
    suggestion:
      "O modelo já tenta ser útil — essa instrução muda algo? O espaço " +
      "poderia descrever *como* ser útil no seu contexto: 'priorizar " +
      "exemplos práticos' ou 'focar em soluções aplicáveis imediatamente'?",
  },
  {
    pattern: /\b(sé|sea) útil\b/i,
    why: "los modelos ya están diseñados para ser útiles — esa es la orientación base de todo LLM",
    suggestion:
      "El modelo ya intenta ser útil — ¿esta instrucción cambia algo? " +
      "El espacio podría describir *cómo* ser útil en tu contexto: " +
      "'priorizar ejemplos prácticos' o 'enfocarse en soluciones aplicables de inmediato'.",
  },
  {
    pattern: /\brespond[ae] de forma clara\b/i,
    why: "clareza na resposta já é comportamento padrão do modelo",
    suggestion:
      "O que 'clareza' significa no seu contexto? Frases curtas sem " +
      "jargão? Respostas estruturadas em tópicos? Um critério concreto " +
      "tende a funcionar melhor do que pedir clareza genérica.",
  },
  {
    pattern: /\brespond[ae] de (forma|manera) clara\b/i,
    why: "la claridad en la respuesta ya es comportamiento predeterminado del modelo",
    suggestion:
      "¿Qué significa 'claridad' en tu contexto? ¿Frases cortas sin " +
      "jerga? ¿Respuestas estructuradas en puntos? Un criterio concreto " +
      "tiende a funcionar mejor que pedir claridad genérica.",
  },
  {
    pattern: /\bseja? (claro|objetivo|direto)\b/i,
    why: "modelos já tendem a ser claros e objetivos por padrão",
    suggestion:
      "O modelo já busca clareza — essa instrução adiciona algo? " +
      "Talvez seja mais útil descrever o formato: 'limitar a 3 parágrafos' " +
      "ou 'começar pela conclusão, depois justificar'?",
  },
  {
    pattern: /\b(sé|sea) (claro|objetivo|directo)\b/i,
    why: "los modelos ya tienden a ser claros y objetivos por defecto",
    suggestion:
      "El modelo ya busca claridad — ¿esta instrucción agrega algo? " +
      "Quizá sea más útil describir el formato: 'limitar a 3 párrafos' " +
      "o 'comenzar por la conclusión, luego justificar'.",
  },
  {
    pattern: /\bseja? (educad[oa]|respeitoso|polido|polite|respectful)\b/i,
    why: "polidez já é comportamento padrão — reforçar pode tornar o agente excessivamente formal",
    suggestion:
      "O agente já é educado por padrão — reforçar isso não estaria " +
      "tornando-o formal demais? Se o tom importa, descrever o tom " +
      "desejado ('direto e informal, como entre colegas') tende a " +
      "funcionar melhor.",
  },
  {
    pattern: /\b(sé|sea) (educad[oa]|respetuos[oa]|cortés|amable)\b/i,
    why: "la cortesía ya es comportamiento predeterminado — reforzarlo puede hacer al agente excesivamente formal",
    suggestion:
      "El agente ya es educado por defecto — ¿reforzar esto no lo " +
      "estaría haciendo demasiado formal? Si el tono importa, describir " +
      "el tono deseado ('directo e informal, como entre colegas') tiende " +
      "a funcionar mejor.",
  },
  {
    pattern: /\bseja? (precis[oa]|exato|accurate)\b/i,
    why: "precisão já é objetivo padrão do modelo",
    suggestion:
      "Precisão em quê, especificamente? Citar fontes ao mencionar " +
      "números? Diferenciar fatos de suposições? Um critério concreto " +
      "orienta melhor do que 'seja preciso'.",
  },
  {
    pattern: /\b(sé|sea) (precis[oa]|exacto)\b/i,
    why: "la precisión ya es objetivo predeterminado del modelo",
    suggestion:
      "¿Precisión en qué, específicamente? ¿Citar fuentes al mencionar " +
      "números? ¿Diferenciar hechos de suposiciones? Un criterio concreto " +
      "orienta mejor que 'sé preciso'.",
  },
  {
    pattern: /\bseja? (honest[oa]|verdadeir[oa]|truthful|honest)\b/i,
    why: "modelos já são orientados para honestidade — reforçar pode gerar excesso de ressalvas",
    suggestion:
      "O modelo já busca honestidade — reforçar não estaria gerando " +
      "excesso de ressalvas? Se o objetivo é evitar invenção, algo " +
      "como 'quando não souber, diga que não sabe' tende a ser mais eficaz.",
  },
  {
    pattern: /\b(sé|sea) (honest[oa]|veraz|sincero)\b/i,
    why: "los modelos ya están orientados hacia la honestidad — reforzar puede generar exceso de salvedades",
    suggestion:
      "El modelo ya busca honestidad — ¿reforzar no estaría generando " +
      "exceso de salvedades? Si el objetivo es evitar invención, algo " +
      "como 'cuando no sepas, di que no sabes' tiende a ser más eficaz.",
  },
  {
    pattern: /\brespond[ae] com (precisão|exatidão)\b/i,
    why: "precisão nas respostas já é orientação base do modelo",
    suggestion:
      "Que tipo de precisão importa aqui? Confirmar nomes de funções " +
      "antes de sugerir código? Incluir versões ao mencionar bibliotecas? " +
      "O modelo já busca precisão — o espaço pode ser melhor usado " +
      "especificando *onde*.",
  },
  {
    pattern: /\brespond[ae] con (precisión|exactitud)\b/i,
    why: "la precisión en las respuestas ya es orientación base del modelo",
    suggestion:
      "¿Qué tipo de precisión importa aquí? ¿Confirmar nombres de funciones " +
      "antes de sugerir código? ¿Incluir versiones al mencionar bibliotecas? " +
      "El modelo ya busca precisión — el espacio puede usarse mejor " +
      "especificando *dónde*.",
  },
  {
    pattern: /\bsiga? as (instruções|orientações)\b/i,
    why: "seguir instruções é literalmente o que o modelo faz — incluir isso é circular",
    suggestion:
      "Se o modelo não seguisse instruções, essa instrução também " +
      "não seria seguida — não é circular? O espaço pode ser melhor " +
      "usado com orientações que genuinamente mudem algo.",
  },
  {
    pattern: /\b(siga|sigue) las (instrucciones|orientaciones|indicaciones)\b/i,
    why: "seguir instrucciones es literalmente lo que el modelo hace — incluir esto es circular",
    suggestion:
      "Si el modelo no siguiera instrucciones, esta instrucción tampoco " +
      "sería seguida — ¿no es circular? El espacio puede usarse mejor " +
      "con orientaciones que genuinamente cambien algo.",
  },
  {
    pattern: /\bfaça? o (seu |)melhor\b/i,
    why: "o modelo já opera na melhor capacidade disponível por padrão",
    suggestion:
      "O que 'melhor' significa concretamente? Priorizar soluções " +
      "simples? Preferir resposta parcial correta a completa com " +
      "incertezas? Sem definir, a instrução não muda nada.",
  },
  {
    pattern: /\bha[zg]a? (lo|tu|su |)mejor\b/i,
    why: "el modelo ya opera en su mejor capacidad disponible por defecto",
    suggestion:
      "¿Qué significa 'mejor' concretamente? ¿Priorizar soluciones " +
      "simples? ¿Preferir respuesta parcial correcta a completa con " +
      "incertidumbres? Sin definirlo, la instrucción no cambia nada.",
  },
  {
    pattern: /\bpense? (antes de|com cuidado|carefully)\b/i,
    why: "modelos já processam a entrada antes de responder — essa instrução não muda o comportamento",
    suggestion:
      "Que tipo de raciocínio seria útil? Considerar prós e contras? " +
      "Avaliar edge cases? Descrever o raciocínio esperado tende a " +
      "funcionar melhor do que pedir que 'pense com cuidado'.",
  },
  {
    pattern: /\bpiens[ae] (antes de|con cuidado|cuidadosamente|bien antes)\b/i,
    why: "los modelos ya procesan la entrada antes de responder — esta instrucción no cambia el comportamiento",
    suggestion:
      "¿Qué tipo de razonamiento sería útil? ¿Considerar pros y contras? " +
      "¿Evaluar casos extremos? Describir el razonamiento esperado tiende " +
      "a funcionar mejor que pedir que 'piense con cuidado'.",
  },
  {
    pattern: /\bbe helpful\b/i,
    why: "helpfulness is the baseline behavior of all LLMs",
    suggestion:
      "The model already tries to be helpful — does this instruction " +
      "change anything? The space might describe *how* to help: " +
      "'prioritize actionable examples'? 'focus on immediately " +
      "applicable solutions'?",
  },
  {
    pattern: /\bbe (clear|concise) (in|with) your (response|answer)/i,
    why: "clarity and conciseness are default model behaviors",
    suggestion:
      "What does 'clear' mean here? Under 3 paragraphs? Lead with " +
      "the conclusion? A concrete format tends to work better than " +
      "asking for generic clarity.",
  },
  {
    pattern: /\bprovide accurate\b/i,
    why: "accuracy is already the model's default goal",
    suggestion:
      "Accurate about what, specifically? Citing sources for numbers? " +
      "Verifying function names before suggesting code? The model " +
      "already aims for accuracy — the space could specify *where*.",
  },
  {
    pattern: /\bdo your best\b/i,
    why: "the model already operates at its best capacity by default",
    suggestion:
      "What does 'best' mean for your use case? Simpler solutions? " +
      "Partial but correct over complete but uncertain? Without " +
      "defining it, the instruction doesn't change behavior.",
  },
  {
    pattern: /\bfollow (the |my |all |all the |my all )?(instructions|directions)\b/i,
    why: "following instructions is what the model does — including this is circular",
    suggestion:
      "If the model didn't follow instructions, this one wouldn't be " +
      "followed either — isn't it circular? The space could hold " +
      "instructions that genuinely shape behavior.",
  },
  {
    pattern: /\bbe (polite|respectful|courteous)\b/i,
    why: "politeness is default model behavior — reinforcing it can make the agent overly formal",
    suggestion:
      "The model is already polite — could reinforcing this make it " +
      "overly formal? If tone matters, describing it ('direct and " +
      "casual, like a colleague') tends to work better.",
  },
  {
    pattern: /\bbe (honest|truthful)\b/i,
    why: "models are already oriented toward honesty — reinforcing can trigger excessive caveats",
    suggestion:
      "The model already aims for honesty — could reinforcing this " +
      "trigger excessive caveats? If the goal is avoiding fabrication, " +
      "'when unsure, say so' tends to be more effective.",
  },
  {
    pattern: /\b(think|reason) (carefully|step by step|before)\b/i,
    why: "models already process input before responding — this instruction doesn't change behavior",
    suggestion:
      "What kind of reasoning would be useful? Weighing pros and cons? " +
      "Evaluating edge cases? Describing the expected reasoning tends " +
      "to work better than 'think carefully'.",
  },
  {
    pattern: /\bbe (clear|direct|straightforward)\b/i,
    why: "models already tend to be clear and direct by default",
    suggestion:
      "What does clarity look like in your context? Responses under " +
      "3 paragraphs? Always leading with the answer? A concrete " +
      "definition tends to be more useful.",
  },
  {
    pattern: /\brespond (accurately|precisely|correctly)\b/i,
    why: "accuracy is already the model's baseline goal",
    suggestion:
      "Where does accuracy matter most here? Verifying function names? " +
      "Including version numbers? The model already aims for accuracy — " +
      "specifying *where* tends to be more effective.",
  },
  {
    pattern: /\banswer (the |)(user's |)(question|query|request)\b/i,
    why: "answering the user's question is the fundamental purpose of the model",
    suggestion:
      "Isn't this what the model already does? The space could hold " +
      "instructions that shape *how* it answers — format, depth, tone.",
  },
  {
    pattern: /\brespond[ae] (a |)(la |)(pregunta|consulta|solicitud) del usuario\b/i,
    why: "responder la pregunta del usuario es el propósito fundamental del modelo",
    suggestion:
      "¿No es esto lo que el modelo ya hace? El espacio podría contener " +
      "instrucciones que moldeen *cómo* responde — formato, profundidad, tono.",
  },
  {
    pattern: /\btry (your |)(best|hardest)\b/i,
    why: "the model already operates at its best capacity by default",
    suggestion:
      "What does 'best' look like for your use case? Defining it " +
      "concretely tends to be more useful than asking the model to try.",
  },
  {
    pattern: /\bintenta (dar |hacer |)(lo mejor|tu mejor esfuerzo)\b/i,
    why: "el modelo ya opera en su mejor capacidad por defecto",
    suggestion:
      "¿Qué significa 'lo mejor' para tu caso de uso? Definirlo " +
      "concretamente tiende a ser más útil que pedirle al modelo que lo intente.",
  },
  {
    pattern: /\bbe thorough\b/i,
    why: "thoroughness is already default model behavior — it tries to be comprehensive",
    suggestion:
      "What does 'thorough' mean here? Covering all edge cases? " +
      "Including references? A concrete criterion tends to produce " +
      "more predictable results than asking for generic thoroughness.",
  },
  {
    pattern: /\bseja? (minucios[oa]|detalhista)\b/i,
    why: "o modelo já tende a ser detalhista por padrão",
    suggestion:
      "O que 'minucioso' significa neste contexto? Cobrir todos os " +
      "cenários? Incluir referências? Um critério concreto tende a " +
      "produzir resultados mais previsíveis do que pedir detalhamento genérico.",
  },
  {
    pattern: /\b(sé|sea) (minucios[oa]|detallista|exhaustiv[oa])\b/i,
    why: "el modelo ya tiende a ser detallista por defecto",
    suggestion:
      "¿Qué significa 'minucioso' en este contexto? ¿Cubrir todos los " +
      "escenarios? ¿Incluir referencias? Un criterio concreto tiende a " +
      "producir resultados más predecibles que pedir detalle genérico.",
  },
  // Meta-instruções: instruções sobre instruções (PT)
  {
    pattern: /\b(antes de responder,? )?(releia|revise|confirme que está seguindo|certifique-se de que está seguindo|verifique sua resposta contra)\b/i,
    why: "pedir para o modelo reler ou verificar as próprias instruções é circular — se as instruções são claras, a verificação é implícita",
    suggestion:
      "Se o modelo precisa de um lembrete para seguir instruções, o " +
      "problema está nas instruções, não na falta de um meta-lembrete. " +
      "Esse espaço pode ser melhor usado por orientações concretas.",
  },
  // Meta-instruções: instruções sobre instruções (ES)
  {
    pattern: /\b(antes de responder,? )?(relee|revisa|confirma que estás siguiendo|asegúrate de que estás siguiendo|verifica tu respuesta contra)\b/i,
    why: "pedir al modelo que relea o verifique sus propias instrucciones es circular — si las instrucciones son claras, la verificación es implícita",
    suggestion:
      "Si el modelo necesita un recordatorio para seguir instrucciones, " +
      "el problema está en las instrucciones, no en la falta de un meta-recordatorio. " +
      "Este espacio puede usarse mejor con orientaciones concretas.",
  },
  // Meta-instruções: instruções sobre instruções (EN)
  // Nota: "review" sozinho dispara falso positivo em substantivos legítimos
  // ("code review", "peer review", "review comments"). Exige-se objeto
  // explícito (rules|instructions|response|answer|output|work|prompt) para
  // qualificar como meta-instrução.
  {
    pattern: /\b(before responding,? )?(re-?read (?:the |your |my |these |this )?(?:rules|instructions|requirements|prompt|response|answer|output)|review (?:the |your |my |these |this )(?:rules|instructions|requirements|prompt|response|answer|output|work)|confirm you'?re following|double-?check .{0,30}(?:rules|instructions|requirements)|verify your (?:response|answer|output) against)\b/i,
    why: "asking the model to re-read or verify its own instructions is circular — if the instructions are clear, verification is implicit",
    suggestion:
      "If the model needs a reminder to follow instructions, the " +
      "problem is with the instructions, not the lack of a meta-reminder. " +
      "This space could hold concrete guidance instead.",
  },
  // Meta-instruções: "mantenha em mente" / "keep in mind"
  {
    pattern: /\b(mantenha? (essas?|estas?) (instruções|regras) em mente|keep (these |the )?(rules |instructions )?in (mind|memory)|lembre-se (dessas?|destas?) (instruções|regras)|mantenha? em mente)\b/i,
    why: "o modelo processa todas as instruções automaticamente — pedir para 'manter em mente' não muda nada",
    suggestion:
      "The model already processes all instructions — asking it to " +
      "'keep them in mind' doesn't change behavior. The space could " +
      "hold guidance that genuinely shapes the response.",
  },
  // Meta-instruções: "ten en mente" / "recuerda" (ES)
  {
    pattern: /\b(mant[eé]n (estas?|esas?) (instrucciones|reglas) en mente|ten (estas?|esas?) (instrucciones|reglas) en (mente|cuenta)|recuerda (estas?|esas?) (instrucciones|reglas)|ten en (mente|cuenta))\b/i,
    why: "el modelo procesa todas las instrucciones automáticamente — pedir que 'tenga en mente' no cambia nada",
    suggestion:
      "El modelo ya procesa todas las instrucciones — pedirle que " +
      "'las tenga en mente' no cambia el comportamiento. El espacio " +
      "podría contener orientaciones que genuinamente moldeen la respuesta.",
  },
];

/*=========================================
// Regra exportada
=========================================*/

export const redundantDefault: Rule = {
  name: "redundant-default",
  description:
    "Instruções que repetem comportamento que o modelo já tem por padrão, " +
    "desperdiçando atenção e podendo torná-lo mais restritivo",
  severity: "info",

  analyze(text: string, ctx: AnalysisContext): Diagnostic[] {
    const statements = ctx.statements;
    const diagnostics: Diagnostic[] = [];
    const lang = ctx.lang;

    for (const stmt of statements) {
      for (const { pattern, why, suggestion } of DEFAULT_BEHAVIORS) {
        const match = stmt.text.match(pattern);
        if (match) {
          diagnostics.push({
            rule: "redundant-default",
            severity: "info",
            line: stmt.line,
            original: stmt.text,
            highlight: match[0],
            reason: lang === "en"
              ? `This instruction repeats default model behavior: ${why}. ` +
                "Including it isn't neutral — besides wasting attention space, " +
                "it can make the agent more restrictive than intended."
              : lang === "es"
              ? `Esta instrucción repite comportamiento predeterminado del modelo: ${why}. ` +
                "Incluirla no es neutro — además de desperdiciar espacio de atención, " +
                "puede hacer al agente más restrictivo de lo deseado."
              : `Essa instrução repete comportamento padrão do modelo: ${why}. ` +
                "Incluí-la não é neutro — além de desperdiçar espaço de atenção, " +
                "pode tornar o agente mais restritivo do que o desejado.",
            suggestion,
          });
          break;
        }
      }
    }

    return diagnostics;
  },
};
