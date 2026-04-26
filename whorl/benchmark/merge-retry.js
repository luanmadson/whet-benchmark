#!/usr/bin/env node
/*=========================================
// merge-retry.js
//
// Post-retry utility. When a provider fails on N prompts during a
// full benchmark run (e.g. Gemini hitting 429 after the daily rate
// limit), you re-run the runner with *just* that provider and the
// missing prompts:
//
//   node whorl/benchmark/runner.js --providers=gemini --prompts=p1,p2,p3
//
// That creates a new Run in results.json containing only those
// results. The problem: the /api/benchmark endpoint and the
// /whet-benchmark page always read "the most recent run" — so the
// new Run, which only has 1 provider with a handful of prompts,
// becomes the new default and *hides* every other provider from
// the previous Run.
//
// This script fixes that: it grabs the most recent Run (the
// "retry"), merges its OK results into the previous Run (replacing
// errors that match the same provider+promptId), and deletes the
// retry Run. Errors that persisted (because the retry also failed)
// stay where they were.
//
// Usage:
//   node whorl/benchmark/merge-retry.js           # default merge (latest → previous)
//   node whorl/benchmark/merge-retry.js --dry-run # only print what it would do
//
// This script is surgical. It doesn't create or lose information —
// it just moves the new OKs into the right place and discards the
// retry Run wrapper.
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
    console.error("error: needs at least 2 runs to merge (the retry and the target).");
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
    console.error("error: retry has no OK results to merge. Aborting.");
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
      // Promise: the retry brought an OK for a prompt that was already OK
      // in the target. Can happen if the user ran with --prompts including
      // one that wasn't actually errored. Skip without messing with the data.
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
        `  ⚠    ${change.provider.padEnd(20)} ${change.promptId.padEnd(30)} (already OK in target — skipped)`,
      );
    }
  }

  console.log();
  console.log(
    `${dryRun ? "[dry] " : ""}summary: ${replaced} replaced, ${skipped} skipped, ${retryErrs.length} still errored in retry`,
  );

  if (retryErrs.length > 0) {
    console.log();
    console.log("prompts that kept erroring in the retry (will remain errored in target):");
    for (const e of retryErrs) {
      console.log(`  ${e.provider.padEnd(20)} ${e.promptId.padEnd(30)} ${(e.error || "").slice(0, 60)}`);
    }
  }

  if (dryRun) {
    console.log();
    console.log("dry-run: no changes written.");
    return;
  }

  // Remove the (now-merged) retry Run. Save.
  file.runs.pop();
  fs.writeFileSync(RESULTS_PATH, JSON.stringify(file, null, 2));
  console.log();
  console.log(`ok: ${replaced} entries merged into target, retry Run removed. results.json updated.`);
}

main();
