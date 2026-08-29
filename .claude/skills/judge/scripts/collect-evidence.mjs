#!/usr/bin/env node
// Zero-config cold-open pass: desktop + mobile screenshot of the landing page,
// load timing, console/network diagnostics. No knowledge of the app's UI is
// needed, so this always runs first regardless of what the app is.
//
// This does NOT touch the core flow (login, submit, click through, etc.) —
// that requires deciding what to click, which differs per app and can't be
// hardcoded here. That part is handled by an exploring subagent driving
// browser-step.mjs interactively (see SKILL.md) instead of a pre-written
// per-app script.
//
// Usage:
//   node collect-evidence.mjs --url https://example.com --out judge-reports/run-1/evidence

import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

function parseArgs(argv) {
  const args = { out: "judge-reports/evidence" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--url") args.url = argv[++i];
    else if (a === "--out") args.out = argv[++i];
  }
  return args;
}

function attachDiagnostics(page, bucket) {
  page.on("console", (msg) => { if (msg.type() === "error") bucket.consoleErrors.push(msg.text()); });
  page.on("requestfailed", (req) => bucket.failedRequests.push({ url: req.url(), failure: req.failure()?.errorText }));
  page.on("response", (res) => { if (res.status() >= 500) bucket.serverErrors.push({ url: res.url(), status: res.status() }); });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.url) {
    console.error("Missing --url");
    process.exit(1);
  }
  const shotDir = path.join(args.out, "screenshots");
  await fs.mkdir(shotDir, { recursive: true });

  const diag = { consoleErrors: [], failedRequests: [], serverErrors: [] };
  const manifest = { url: args.url, collectedAt: new Date().toISOString(), generic: {} };

  const browser = await chromium.launch();

  {
    const context = await browser.newContext();
    const page = await context.newPage();
    attachDiagnostics(page, diag);
    const start = Date.now();
    let loadError = null;
    try {
      await page.goto(args.url, { waitUntil: "load", timeout: 30000 });
    } catch (err) {
      loadError = String(err.message ?? err);
    }
    const loadMs = Date.now() - start;
    const shot = path.join(shotDir, "01-landing-desktop.png");
    await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
    manifest.generic.landingDesktop = { screenshot: shot, loadMs, loadError };
    await context.close();
  }

  {
    const context = await browser.newContext({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    attachDiagnostics(page, diag);
    let loadError = null;
    try {
      await page.goto(args.url, { waitUntil: "load", timeout: 30000 });
    } catch (err) {
      loadError = String(err.message ?? err);
    }
    const shot = path.join(shotDir, "02-landing-mobile.png");
    await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
    manifest.generic.landingMobile = { screenshot: shot, loadError };
    await context.close();
  }

  await browser.close();

  manifest.diagnostics = diag;
  const manifestPath = path.join(args.out, "evidence.json");
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`Cold-open evidence written to ${manifestPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
