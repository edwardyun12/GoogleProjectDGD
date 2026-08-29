#!/usr/bin/env node
// Renders the final judge report as a single HTML fragment (Artifact-ready:
// no <!DOCTYPE>/<html>/<head>/<body> — those get added at publish time).
// All numbers come straight from aggregate.json and the 9 judge score files —
// this script never recomputes or restates a number that wasn't already
// computed by aggregate.mjs, per the "no LLM arithmetic" rule.
//
// Usage: node render-report.mjs --run judge-reports/<RUN> --out <file.html>

import fs from "node:fs/promises";
import fssync from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--run") a.run = argv[++i];
    else if (argv[i] === "--out") a.out = argv[++i];
  }
  return a;
}

const GROUP_LABEL = { founder: "창업자", engineer: "엔지니어", investor: "투자자" };
const GROUP_TITLE = {
  F1: "두 번째 창업, 소셜 앱", F2: "부트스트랩, 흑자 운영", F3: "크리에이터·커뮤니티",
  E1: "백엔드·인프라", E2: "ML·오디오/모델", E3: "프로덕트 프론트엔드",
  I1: "시드 VC", I2: "그로스·시리즈A", I3: "엔젤 · 음악/엔터 도메인",
};
const ORDER = ["F1", "F2", "F3", "E1", "E2", "E3", "I1", "I2", "I3"];

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const agg = JSON.parse(await fs.readFile(path.join(args.run, "aggregate.json"), "utf-8"));
  const coldopen = JSON.parse(await fs.readFile(path.join(args.run, "coldopen", "evidence.json"), "utf-8"));
  const targetUrl = coldopen.url;
  let siteTitle = targetUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
  try {
    const exploreDirs = await fs.readdir(path.join(args.run, "explore"));
    for (const d of exploreDirs) {
      const evPath = path.join(args.run, "explore", d, "evidence.json");
      if (fssync.existsSync(evPath)) {
        const ev = JSON.parse(await fs.readFile(evPath, "utf-8"));
        const withTitle = ev.steps?.find((s) => s.title);
        if (withTitle) { siteTitle = withTitle.title; break; }
      }
    }
  } catch { /* no explore/ dir this run — keep the domain fallback */ }
  const judgeFiles = await fs.readdir(path.join(args.run, "scores"));
  const judges = {};
  for (const f of judgeFiles) {
    const j = JSON.parse(await fs.readFile(path.join(args.run, "scores", f), "utf-8"));
    judges[j.judge_id] = j;
  }

  const rubric = JSON.parse(await fs.readFile(path.join(path.dirname(new URL(import.meta.url).pathname), "..", "rubric.json"), "utf-8"));

  const catRows = (catKey) => Object.entries(rubric.categories[catKey].items).map(([code, def]) => {
    const it = agg.items[code];
    return { code, name: def.name, weight: def.finalWeight, mean: it.equalMean, sd: it.stddev, dissent: it.dissent, raw: it.raw };
  });

  const cats = ["A", "B", "C"].map((k) => ({
    key: k,
    name: rubric.categories[k].name,
    weightPct: rubric.categories[k].weight * 100,
    subtotal: agg.categoryTotals[k].equalSubtotal,
    rows: catRows(k),
  }));

  const scoreBar = (mean) => `<div class="bar"><div class="bar-fill" style="width:${(mean / 5 * 100).toFixed(1)}%"></div></div>`;

  const tableRows = (rows) => rows.map((r) => `
    <tr class="${r.dissent ? "is-dissent" : ""}">
      <td class="code">${esc(r.code)}</td>
      <td class="name">${esc(r.name)}</td>
      <td class="num weight">${r.weight.toFixed(2)}%</td>
      <td class="mean-cell">${scoreBar(r.mean)}<span class="num mean">${r.mean.toFixed(2)}</span></td>
      <td class="num sd">${r.sd.toFixed(2)}${r.dissent ? ' <span class="dissent-flag" title="표준편차 ≥ 1.2 — 소수의견 보존됨">●</span>' : ""}</td>
    </tr>`).join("");

  const dissentCards = agg.dissentItems.map((code) => {
    const it = agg.items[code];
    const cat = Object.values(rubric.categories).find((c) => c.items[code]);
    const lo = it.dissentDetail.lowest, hi = it.dissentDetail.highest;
    return `
    <article class="dissent-card">
      <h3>${esc(code)} · ${esc(cat.items[code].name)} <span class="sd-badge">σ ${it.stddev.toFixed(2)}</span></h3>
      <div class="dissent-pair">
        <div class="dissent-side low">
          <div class="dissent-score">${lo.score.toFixed(1)} <span class="who">${esc(lo.judge_name)} · ${esc(GROUP_LABEL[lo.group])}</span></div>
          <p>${esc(lo.reason)}</p>
          <p class="evidence">${esc(lo.evidence)}</p>
        </div>
        <div class="dissent-side high">
          <div class="dissent-score">${hi.score.toFixed(1)} <span class="who">${esc(hi.judge_name)} · ${esc(GROUP_LABEL[hi.group])}</span></div>
          <p>${esc(hi.reason)}</p>
          <p class="evidence">${esc(hi.evidence)}</p>
        </div>
      </div>
    </article>`;
  }).join("");

  const judgeCard = (id) => {
    const j = judges[id];
    return `
    <article class="judge-card group-${j.group}">
      <header>
        <span class="judge-id">${esc(id)}</span>
        <div>
          <div class="judge-name">${esc(j.judge_name)}</div>
          <div class="judge-title">${esc(GROUP_TITLE[id])}</div>
        </div>
      </header>
      <p class="verdict">${esc(j.one_line_verdict)}</p>
      <p class="killer">“${esc(j.killer_question)}”</p>
      ${j.red_flags?.length ? `<ul class="flags">${j.red_flags.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>` : ""}
    </article>`;
  };

  const zeroCodes = Object.entries(agg.items).filter(([, it]) => it.equalMean === 0).map(([c]) => c);
  const personName = siteTitle.split(/[—-]/)[0].trim();
  const domainLabel = targetUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");

  const html = `<title>${esc(personName)} 심사기록</title>
<style>
:root{
  --paper:#F1F2F6; --paper-raised:#FFFFFF; --ink:#1B2130; --ink-soft:#4B5265;
  --line:#D8DAE2; --accent:#B98A2E; --accent-soft:#E9D9B8;
  --founder:#B4587A; --engineer:#3E8A83; --investor:#5B5F97;
  --dissent:#C0472B; --dissent-bg:#FBEAE6;
  --font-display:'Fraunces',Georgia,'Noto Serif KR',serif;
  --font-body:'IBM Plex Sans','IBM Plex Sans KR',-apple-system,sans-serif;
  --font-mono:'IBM Plex Mono',ui-monospace,monospace;
}
@media (prefers-color-scheme: dark){
  :root:not([data-theme="light"]){
    --paper:#14161C; --paper-raised:#1C1F28; --ink:#E7E5DD; --ink-soft:#A9AEC0;
    --line:#333849; --accent:#D9A94A; --accent-soft:#4A3E22;
    --founder:#D98CAB; --engineer:#6FC2BA; --investor:#9498D9;
    --dissent:#E27B62; --dissent-bg:#3A2420;
  }
}
:root[data-theme="dark"]{
  --paper:#14161C; --paper-raised:#1C1F28; --ink:#E7E5DD; --ink-soft:#A9AEC0;
  --line:#333849; --accent:#D9A94A; --accent-soft:#4A3E22;
  --founder:#D98CAB; --engineer:#6FC2BA; --investor:#9498D9;
  --dissent:#E27B62; --dissent-bg:#3A2420;
}
*{box-sizing:border-box}
body{background:var(--paper);color:var(--ink);font-family:var(--font-body);line-height:1.55;margin:0}
.wrap{max-width:900px;margin:0 auto;padding:48px 24px 96px}
h1,h2,h3{font-family:var(--font-display);text-wrap:balance;margin:0 0 .4em}
::selection{background:var(--accent-soft)}

.masthead{display:flex;justify-content:space-between;align-items:flex-end;gap:24px;border-bottom:2px solid var(--ink);padding-bottom:24px;margin-bottom:8px;flex-wrap:wrap}
.masthead .eyebrow{font-family:var(--font-mono);font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-soft);margin-bottom:10px}
.masthead h1{font-size:34px;font-weight:600}
.masthead .target{font-family:var(--font-mono);font-size:14px;color:var(--ink-soft);margin-top:6px}
.grade-badge{text-align:center;flex-shrink:0}
.grade-badge .letter{font-family:var(--font-display);font-size:64px;font-weight:600;color:var(--accent);line-height:1}
.grade-badge .score{font-family:var(--font-mono);font-size:14px;color:var(--ink-soft);font-variant-numeric:tabular-nums}
.grade-badge .desc{font-size:12px;color:var(--ink-soft);max-width:140px}

.meta-row{display:flex;gap:24px;flex-wrap:wrap;font-family:var(--font-mono);font-size:12px;color:var(--ink-soft);margin:14px 0 36px}
.meta-row span b{color:var(--ink);font-weight:500}

.context-box{background:var(--paper-raised);border:1px solid var(--line);border-left:4px solid var(--accent);border-radius:2px;padding:20px 24px;margin-bottom:44px}
.context-box p{margin:0 0 10px;font-size:15px}
.context-box p:last-child{margin-bottom:0}
.context-box .zero-list{font-family:var(--font-mono);font-size:13px;color:var(--ink-soft)}

section{margin-bottom:52px}
section > h2{font-size:22px;border-bottom:1px solid var(--line);padding-bottom:10px;margin-bottom:22px}

.cat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.cat-card{background:var(--paper-raised);border:1px solid var(--line);border-radius:4px;padding:18px 20px}
.cat-card h3{font-size:15px;font-weight:600;margin-bottom:2px}
.cat-card .weight{font-family:var(--font-mono);font-size:11px;color:var(--ink-soft);text-transform:uppercase;letter-spacing:.05em}
.cat-card .subtotal{font-family:var(--font-mono);font-size:28px;margin-top:10px;font-variant-numeric:tabular-nums}
.cat-card .subtotal small{font-size:14px;color:var(--ink-soft)}
.cat-card .bar{margin-top:8px}

table{width:100%;border-collapse:collapse;font-size:14px}
.table-wrap{overflow-x:auto;border:1px solid var(--line);border-radius:4px}
thead th{text-align:left;font-family:var(--font-mono);font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--ink-soft);border-bottom:1px solid var(--line);padding:10px 12px;background:var(--paper-raised)}
tbody td{padding:10px 12px;border-bottom:1px solid var(--line);vertical-align:middle}
tbody tr:last-child td{border-bottom:none}
tbody tr.is-dissent{background:var(--dissent-bg)}
td.code{font-family:var(--font-mono);color:var(--ink-soft);white-space:nowrap}
td.num{font-family:var(--font-mono);font-variant-numeric:tabular-nums;white-space:nowrap}
.mean-cell{display:flex;align-items:center;gap:10px;min-width:160px}
.bar{flex:1;height:6px;background:var(--line);border-radius:3px;overflow:hidden}
.bar-fill{height:100%;background:var(--accent);border-radius:3px}
.dissent-flag{color:var(--dissent);font-size:9px}

.dissent-card{background:var(--paper-raised);border:1px solid var(--line);border-radius:4px;padding:20px 22px;margin-bottom:16px}
.dissent-card h3{font-size:16px;display:flex;align-items:center;gap:10px}
.sd-badge{font-family:var(--font-mono);font-size:11px;color:var(--dissent);border:1px solid var(--dissent);border-radius:20px;padding:2px 9px}
.dissent-pair{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:12px}
.dissent-side{border-left:3px solid var(--line);padding-left:14px}
.dissent-side.low{border-color:var(--ink-soft)}
.dissent-side.high{border-color:var(--accent)}
.dissent-score{font-family:var(--font-mono);font-size:20px;font-variant-numeric:tabular-nums;margin-bottom:4px}
.dissent-score .who{font-family:var(--font-body);font-size:12px;color:var(--ink-soft);margin-left:8px}
.dissent-side p{margin:4px 0;font-size:13.5px}
.dissent-side .evidence{color:var(--ink-soft);font-size:12px;font-style:italic}

.group-legend{display:flex;gap:18px;margin-bottom:20px;font-size:13px;flex-wrap:wrap}
.group-legend span{display:inline-flex;align-items:center;gap:6px}
.dot{width:9px;height:9px;border-radius:50%;display:inline-block}
.dot.founder{background:var(--founder)} .dot.engineer{background:var(--engineer)} .dot.investor{background:var(--investor)}

.judge-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.judge-card{background:var(--paper-raised);border:1px solid var(--line);border-top:3px solid var(--ink);border-radius:4px;padding:18px}
.judge-card.group-founder{border-top-color:var(--founder)}
.judge-card.group-engineer{border-top-color:var(--engineer)}
.judge-card.group-investor{border-top-color:var(--investor)}
.judge-card header{display:flex;gap:10px;align-items:baseline;margin-bottom:12px}
.judge-id{font-family:var(--font-mono);font-size:11px;color:var(--ink-soft);border:1px solid var(--line);border-radius:3px;padding:1px 6px}
.judge-name{font-weight:600;font-size:15px}
.judge-title{font-size:11px;color:var(--ink-soft)}
.judge-card .verdict{font-size:13px;margin-bottom:10px}
.judge-card .killer{font-family:var(--font-display);font-style:italic;font-size:14px;color:var(--ink-soft);margin-bottom:10px}
.flags{margin:0;padding-left:18px;font-size:12px;color:var(--dissent)}
.flags li{margin-bottom:2px}

footer{border-top:1px solid var(--line);padding-top:20px;font-size:12px;color:var(--ink-soft);font-family:var(--font-mono)}
footer p{margin:0 0 8px}

@media (max-width:720px){
  .cat-grid,.judge-grid{grid-template-columns:1fr}
  .dissent-pair{grid-template-columns:1fr}
  .masthead{flex-direction:column;align-items:flex-start}
}
</style>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">

<div class="wrap">
  <div class="masthead">
    <div>
      <div class="eyebrow">9인 심사위원단 · 자동 채점 리포트</div>
      <h1>${esc(personName)}</h1>
      <div class="target">${esc(domainLabel)} · ${esc(siteTitle)}</div>
    </div>
    <div class="grade-badge">
      <div class="letter">${esc(agg.grade.grade)}</div>
      <div class="score">${agg.total.primary.toFixed(1)} / 100</div>
      <div class="desc">${esc(agg.grade.desc)}</div>
    </div>
  </div>
  <div class="meta-row">
    <span>실행 시각 <b>${esc(agg.generatedAt.slice(0, 16).replace("T", " "))}</b></span>
    <span>채점 모드 <b>${agg.primaryMode === "weighted" ? "전문성 가중 (×1.5)" : "동일 가중"}</b></span>
    <span>동일가중 총점 <b>${agg.total.equal.toFixed(1)}</b> · 가중 총점 <b>${agg.total.weighted.toFixed(1)}</b> (차이 ${agg.total.divergence.toFixed(1)}점, ${agg.total.reportBoth ? "병기 필요" : "5점 미만이라 병기 생략"})</span>
  </div>

  <div class="context-box">
    <p><strong>대상은 스타트업 피칭이 아니라 개인 소프트웨어 엔지니어 포트폴리오입니다.</strong> 이번 회차는 9인 채점 파이프라인 자체를 실제 라이브 웹앱으로 검증하는 목적으로 실행되었고, 발표/기획 자료는 아직 제출되지 않았습니다 — 심사 규율(rubric.json 4.5)에 따라 <span class="zero-list">A3(기획 대비 구현 일치도)</span>는 전원 <em>"제시되지 않음"</em>으로 0점 처리됩니다.</p>
    <p>같은 이유로 GTM·비즈니스 카테고리(B/C)의 상당수 항목도 실제로 존재하지 않는 것(초대 기능, 결제, 시장 규모 서술 등)에 대해 정직하게 0점입니다 — <span class="zero-list">${zeroCodes.join(", ")}</span>. 이는 채점 실패가 아니라 "본 것만 채점한다"는 규율이 정확히 작동한 결과이며, 총점이 낮게 나온 것은 포트폴리오에 스타트업 심사 기준을 그대로 적용했기 때문입니다. A 카테고리(기획 의도대로 작동)만 놓고 보면 평가는 실제로 우호적입니다.</p>
  </div>

  <section>
    <h2>대분류 요약</h2>
    <div class="cat-grid">
      ${cats.map((c) => `
      <div class="cat-card">
        <h3>${esc(c.key)} · ${esc(c.name)}</h3>
        <div class="weight">비중 ${c.weightPct.toFixed(0)}%</div>
        <div class="subtotal">${c.subtotal.toFixed(1)}<small> / ${c.weightPct.toFixed(1)}</small></div>
        <div class="bar"><div class="bar-fill" style="width:${(c.subtotal / c.weightPct * 100).toFixed(1)}%"></div></div>
      </div>`).join("")}
    </div>
  </section>

  <section>
    <h2>12개 세부 항목 (9인 평균)</h2>
    <div class="table-wrap">
      <table>
        <thead><tr><th>코드</th><th>항목</th><th>가중치</th><th>평균 (0–5)</th><th>표준편차</th></tr></thead>
        <tbody>
          ${cats.map((c) => tableRows(c.rows)).join("")}
        </tbody>
      </table>
    </div>
  </section>

  ${agg.dissentItems.length ? `
  <section>
    <h2>소수 의견 보존 (표준편차 ≥ 1.2)</h2>
    ${dissentCards}
  </section>` : ""}

  <section>
    <h2>9인 심사위원 개별 소견</h2>
    <div class="group-legend">
      <span><i class="dot founder"></i>창업자</span>
      <span><i class="dot engineer"></i>엔지니어</span>
      <span><i class="dot investor"></i>투자자</span>
    </div>
    <div class="judge-grid">
      ${ORDER.map(judgeCard).join("")}
    </div>
  </section>

  <footer>
    <p>채점 방식: 9인이 서로의 점수를 모르는 상태로 독립 채점(병렬 서브에이전트) → aggregate.mjs가 4.1–4.5 산식을 결정론적으로 계산 → 이 리포트는 그 출력을 그대로 표시(재계산 없음).</p>
    <p>증거 수집: 콜드오픈 패스(랜딩 데스크톱/모바일) + 핸즈온 탐색 3세션(신규 방문·리로드·뒤로가기·모바일 375px·네트워크 강제 실패, 총 ~35회 액션). 탐색 중 발견한 도구 자체의 버그(모바일 뷰포트 미적용, selector 경로 깊이 부족)는 즉시 수정 후 재검증했습니다.</p>
  </footer>
</div>`;

  await fs.mkdir(path.dirname(args.out), { recursive: true });
  await fs.writeFile(args.out, html);
  console.log(`Report written to ${args.out}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
