#!/usr/bin/env node
/*=========================================
// merge-retry.js
//
// Utilitário pós-retry. Quando um provider falha em N prompts numa
// rodada full do benchmark (ex: Gemini hitando 429 depois do rate limit
// diário), você roda o runner de novo *só* com aquele provider e os
// prompts faltantes:
//
//   node whorl/benchmark/runner.js --providers=gemini --prompts=p1,p2,p3
//
// Isso cria uma Run nova no results.json só com esses resultados. O
// problema é que a API /api/benchmark e a página /whet-benchmark sempre
// leem "a rodada mais recente" — então a Run nova, que tem só 1 provider
// com alguns prompts, vira o novo default e *esconde* todos os outros
// providers da Run anterior.
//
// Este script resolve isso: pega a Run mais recente (a "retry"), mescla
// seus resultados OK dentro da Run anterior (substituindo os errors que
// batem com mesmo provider+promptId), e deleta a Run retry. Os erros
// que permaneceram (porque o retry também falhou) ficam no lugar.
//
// Uso:
//   node whorl/benchmark/merge-retry.js           # merge padrão (última → penúltima)
//   node whorl/benchmark/merge-retry.js --dry-run # só mostra o que faria
//
// Este script é cirúrgico. Não cria/perde informação — apenas move os
// novos OKs pro lugar certo e descarta o wrapper da Run retry.
=========================================*/

"use strict";

const fs = require("node:fs");
const path = require("node:path");

const RESULTS_PATH = path.join(__dirname, "results.json");

const dryRun = process.argv.includes("--dry-run");

function main() {
  const raw = fs.readFileSync(RESULTS_PATH, "utf-8");
  const file = JSON.parse(raw);

  if (!file.runs || file.runs.length < 2) {
    console.error("erro: precisa de pelo menos 2 runs pra mesclar (a retry e a alvo).");
    process.exit(1);
  }

  const retry = file.runs[file.runs.length - 1];
  const target = file.runs[file.runs.length - 2];

  console.log(`retry  : ${retry.runFinishedAt} (${retry.results.length} results)`);
  console.log(`target : ${target.runFinishedAt} (${target.results.length} results)`);
  console.log();

  const retryOks = retry.results.filter((r) => !r.error);
  const retryErrs = retry.results.filter((r) => r.error);

  if (retryOks.length === 0) {
    console.error("erro: retry não tem nenhum resultado OK pra mesclar. Cancelando.");
    process.exit(1);
  }

  let replaced = 0;
  let skipped = 0;
  const plannedChanges = [];

  for (const ok of retryOks) {
    const idx = target.results.findIndex(
      (x) => x.provider === ok.provider && x.promptId === ok.promptId && x.error,
    );
    if (idx >= 0) {
      plannedChanges.push({
        action: "replace",
        idx,
        provider: ok.provider,
        promptId: ok.promptId,
        oldError: target.results[idx].error?.slice(0, 60) + "...",
        newDelta: ok.delta,
      });
      if (!dryRun) target.results[idx] = ok;
      replaced++;
    } else {
      // Promise: o retry trouxe um OK pra um prompt que na target já estava OK.
      // Pode acontecer se o usuário rodou com --prompts incluindo um que não era erro.
      // Pula sem bagunçar o dado.
      plannedChanges.push({
        action: "skip",
        provider: ok.provider,
        promptId: ok.promptId,
      });
      skipped++;
    }
  }

  for (const change of plannedChanges) {
    if (change.action === "replace") {
      console.log(
        `  ${dryRun ? "[dry]" : "✓"} ${change.provider.padEnd(20)} ${change.promptId.padEnd(30)} Δ=+${change.newDelta}`,
      );
    } else {
      console.log(
        `  ⚠    ${change.provider.padEnd(20)} ${change.promptId.padEnd(30)} (já estava OK na target — pulado)`,
      );
    }
  }

  console.log();
  console.log(
    `${dryRun ? "[dry] " : ""}resumo: ${replaced} replaced, ${skipped} skipped, ${retryErrs.length} ainda com erro no retry`,
  );

  if (retryErrs.length > 0) {
    console.log();
    console.log("prompts que continuaram errando no retry (vão permanecer errored na target):");
    for (const e of retryErrs) {
      console.log(`  ${e.provider.padEnd(20)} ${e.promptId.padEnd(30)} ${(e.error || "").slice(0, 60)}`);
    }
  }

  if (dryRun) {
    console.log();
    console.log("dry-run: nenhuma mudança escrita.");
    return;
  }

  // Remove a Run retry (já mesclada). Salva.
  file.runs.pop();
  fs.writeFileSync(RESULTS_PATH, JSON.stringify(file, null, 2));
  console.log();
  console.log(`ok: ${replaced} entradas mescladas na target, Run retry removida. results.json atualizado.`);
}

main();
