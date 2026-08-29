#!/usr/bin/env node
// Deterministic scoring aggregator — implements 심사 기준표 section 4 (채점·합산 프로토콜)
// exactly as arithmetic, so no LLM is ever asked to do the math (and can't fudge it).
//
// Input: a directory containing 9 JSON files, one per judge, each following the
// output schema in rubric.json's outputSchemaExample (judge_id, group, scores[]).
// Output: aggregate.json with per-item means/stddev/dissent, category subtotals,
// the final 100-point total in both equal-weight and --weighted mode, the letter
// grade, and every red flag / killer question / one-line verdict collected verbatim.
//
// Usage:
//   node aggregate.mjs --scores judge-reports/run-1/scores --out judge-reports/run-1/aggregate.json [--weighted]

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const args = { weighted: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--scores") args.scores = argv[++i];
    else if (a === "--out") args.out = argv[++i];
    else if (a === "--weighted") args.weighted = true;
  }
  return args;
}

function mean(xs) {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function stddevPopulation(xs) {
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
}

const EXPECTED_JUDGE_IDS = ["F1", "F2", "F3", "E1", "E2", "E3", "I1", "I2", "I3"];

async function loadJudgeFiles(dir) {
  const entries = await fs.readdir(dir);
  const judges = [];
  for (const entry of entries) {
    if (!entry.endsWith(".json")) continue;
    const raw = await fs.readFile(path.join(dir, entry), "utf-8");
    judges.push(JSON.parse(raw));
  }
  return judges;
}

function validate(judges, warnings) {
  const seen = new Set(judges.map((j) => j.judge_id));
  for (const id of EXPECTED_JUDGE_IDS) {
    if (!seen.has(id)) warnings.push(`missing judge: ${id}`);
  }
  for (const j of judges) {
    if (!EXPECTED_JUDGE_IDS.includes(j.judge_id)) {
      warnings.push(`unexpected judge_id: ${j.judge_id}`);
    }
    const codes = new Set((j.scores || []).map((s) => s.code));
    for (const code of ["A1", "A2", "A3", "A4", "B1", "B2", "B3", "B4", "C1", "C2", "C3", "C4"]) {
      if (!codes.has(code)) warnings.push(`${j.judge_id} missing score for ${code}`);
    }
    for (const s of j.scores || []) {
      if (typeof s.score !== "number" || s.score < 0 || s.score > 5) {
        warnings.push(`${j.judge_id} ${s.code}: score out of range (${s.score})`);
      }
      if (Math.round(s.score * 2) !== s.score * 2) {
        warnings.push(`${j.judge_id} ${s.code}: score not on 0.5 step (${s.score})`);
      }
    }
  }
}

function buildItemAggregate(code, judges, rubric) {
  const cat = code[0];
  const responsibleGroup = rubric.categories[cat].responsibleGroup;
  const factor = rubric.weightedMode.factor;

  const raw = [];
  for (const j of judges) {
    const s = (j.scores || []).find((x) => x.code === code);
    if (!s) continue;
    raw.push({
      judge_id: j.judge_id,
      judge_name: j.judge_name,
      group: j.group,
      score: s.score,
      confidence: s.confidence,
      reason: s.reason,
      evidence: s.evidence,
    });
  }

  const values = raw.map((r) => r.score);
  const equalMean = values.length ? mean(values) : 0;
  const sd = values.length > 1 ? stddevPopulation(values) : 0;

  let weightedMean = equalMean;
  if (raw.length) {
    let num = 0;
    let den = 0;
    for (const r of raw) {
      const w = r.group === responsibleGroup ? factor : 1.0;
      num += r.score * w;
      den += w;
    }
    weightedMean = num / den;
  }

  const dissent = sd >= rubric.dissent.stdDevThreshold;
  let dissentDetail = null;
  if (dissent && raw.length) {
    const sorted = [...raw].sort((a, b) => a.score - b.score);
    dissentDetail = { lowest: sorted[0], highest: sorted[sorted.length - 1] };
  }

  return {
    code,
    name: rubric.categories[cat].items[code].name,
    finalWeight: rubric.categories[cat].items[code].finalWeight,
    raw,
    equalMean,
    weightedMean,
    stddev: sd,
    dissent,
    dissentDetail,
  };
}

function gradeFor(score, grades) {
  for (const g of grades) {
    if (score >= g.min) return g;
  }
  return grades[grades.length - 1];
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.scores || !args.out) {
    console.error("Usage: aggregate.mjs --scores <dir> --out <file.json> [--weighted]");
    process.exit(1);
  }

  const rubric = JSON.parse(await fs.readFile(path.join(__dirname, "..", "rubric.json"), "utf-8"));
  const judges = await loadJudgeFiles(args.scores);

  const warnings = [];
  validate(judges, warnings);

  const allCodes = Object.values(rubric.categories).flatMap((c) => Object.keys(c.items));
  const items = {};
  for (const code of allCodes) {
    items[code] = buildItemAggregate(code, judges, rubric);
  }

  const categoryTotals = {};
  for (const [catKey, cat] of Object.entries(rubric.categories)) {
    let equalSubtotal = 0;
    let weightedSubtotal = 0;
    for (const code of Object.keys(cat.items)) {
      const it = items[code];
      equalSubtotal += (it.equalMean / 5) * it.finalWeight;
      weightedSubtotal += (it.weightedMean / 5) * it.finalWeight;
    }
    categoryTotals[catKey] = { name: cat.name, equalSubtotal, weightedSubtotal };
  }

  const totalEqual = Object.values(categoryTotals).reduce((a, c) => a + c.equalSubtotal, 0);
  const totalWeighted = Object.values(categoryTotals).reduce((a, c) => a + c.weightedSubtotal, 0);
  const divergence = Math.abs(totalEqual - totalWeighted);
  const reportBoth = divergence >= rubric.weightedMode.reportBothIfDivergenceAtLeast;

  const primaryMode = args.weighted ? "weighted" : "equal";
  const primaryTotal = primaryMode === "weighted" ? totalWeighted : totalEqual;
  const grade = gradeFor(primaryTotal, rubric.grades);

  const redFlags = judges.flatMap((j) => (j.red_flags || []).map((text) => ({ judge_id: j.judge_id, judge_name: j.judge_name, text })));
  const killerQuestions = judges.map((j) => ({ judge_id: j.judge_id, judge_name: j.judge_name, text: j.killer_question }));
  const verdicts = judges.map((j) => ({ judge_id: j.judge_id, judge_name: j.judge_name, text: j.one_line_verdict }));

  const aggregate = {
    generatedAt: new Date().toISOString(),
    primaryMode,
    warnings,
    items,
    categoryTotals,
    total: { equal: totalEqual, weighted: totalWeighted, divergence, reportBoth, primary: primaryTotal },
    grade,
    redFlags,
    killerQuestions,
    verdicts,
    dissentItems: Object.values(items).filter((i) => i.dissent).map((i) => i.code),
  };

  await fs.mkdir(path.dirname(args.out), { recursive: true });
  await fs.writeFile(args.out, JSON.stringify(aggregate, null, 2));
  console.log(`Aggregate written to ${args.out}`);
  console.log(`Total (equal-weight): ${totalEqual.toFixed(1)} / 100 — grade ${gradeFor(totalEqual, rubric.grades).grade}`);
  console.log(`Total (weighted):     ${totalWeighted.toFixed(1)} / 100 — grade ${gradeFor(totalWeighted, rubric.grades).grade}`);
  if (reportBoth) console.log(`NOTE: equal vs weighted totals diverge by ${divergence.toFixed(1)} (>= 5) — report both in the writeup.`);
  if (warnings.length) console.log(`Warnings:\n- ${warnings.join("\n- ")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
