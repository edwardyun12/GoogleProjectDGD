#!/usr/bin/env node
// Generic, site-agnostic browser driver for an exploring Claude subagent.
//
// No selectors are pre-written per app. Every call returns a snapshot of the
// current page's interactive elements (role + accessible name + a ready-to-use
// locator string), so the calling agent reads that, decides what to do next in
// plain terms, and issues the next call.
//
// A real browsing session (cookies, localStorage, the open tab, typed-but-not-
// submitted form fields) must survive between separate CLI invocations, since
// each call is its own short-lived Node process. That rules out Playwright's
// own connect()-to-launchServer() protocol: contexts created by a connect()
// client are torn down the moment that client disconnects, even without an
// explicit close() (verified empirically). Attaching over raw CDP does not
// have that problem — a `chromium.launch()` in a detached background process
// (see daemon-runner.mjs) exposes a debugging port, and each step here just
// `connectOverCDP`s to it, reuses the one open page, and exits without ever
// closing the browser. The daemon is keyed on the DIRECTORY of --state, not
// the filename — two --state files in the same directory share one daemon
// and one browser profile (same cookies). For a new session (fresh visitor /
// fresh account / a mobile profile), use a state path in its own directory,
// e.g. run/session-b/state.json alongside run/session-a/state.json above —
// that spins up a second daemon with no cookies carried over.
//
// First call for a session:
//   node browser-step.mjs --state run/session-a/state.json --start --url https://site.example [--mobile]
//   (--mobile only resizes the viewport to 375x667 on that session's first
//   --start call; it does not set isMobile/hasTouch UA hints, since those are
//   context-creation-only options and this tool always reuses chromium's
//   already-open default context rather than creating an isolated one.)
//
// Subsequent calls (read the JSON printed by the previous call to decide these):
//   node browser-step.mjs --state run/session-a/state.json --snapshot
//   node browser-step.mjs --state run/session-a/state.json --click-text "Contact"
//   node browser-step.mjs --state run/session-a/state.json --click '#submit-button'
//   node browser-step.mjs --state run/session-a/state.json --fill-text "Email" --value "a@b.com"
//   node browser-step.mjs --state run/session-a/state.json --fill 'input[name="email"]' --value "a@b.com"
//   node browser-step.mjs --state run/session-a/state.json --press Enter
//   node browser-step.mjs --state run/session-a/state.json --back
//   node browser-step.mjs --state run/session-a/state.json --reload
//   node browser-step.mjs --state run/session-a/state.json --wait 1000
//   node browser-step.mjs --state run/session-a/state.json --block "**/api/**"   # abort matching requests from now on
//   node browser-step.mjs --state run/session-a/state.json --goto https://site.example/other-page
//
// End of a session (always call this — it kills the background chromium):
//   node browser-step.mjs --state run/session-a/state.json --stop
//
// Every call appends one entry to <session-dir>/evidence.json so the final
// report can be built from that single accumulated file.

import { chromium } from "playwright";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import fssync from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DAEMON_RUNNER = path.join(__dirname, "daemon-runner.mjs");

const CLICKABLE_ROLES = ["button", "link", "menuitem", "tab", "checkbox", "radio", "switch"];
const FILLABLE_ROLES = ["textbox", "searchbox", "combobox"];

function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === "--state") a.state = argv[++i];
    else if (k === "--start" || k === "--init") { a.action = "start"; }
    else if (k === "--url") a.url = argv[++i];
    else if (k === "--mobile") a.mobile = true;
    else if (k === "--snapshot") a.action = "snapshot";
    else if (k === "--click") { a.action = "click"; a.locator = argv[++i]; }
    else if (k === "--click-text") { a.action = "click-text"; a.text = argv[++i]; }
    else if (k === "--fill") { a.action = "fill"; a.locator = argv[++i]; }
    else if (k === "--fill-text") { a.action = "fill-text"; a.text = argv[++i]; }
    else if (k === "--value") a.value = argv[++i];
    else if (k === "--press") { a.action = "press"; a.key = argv[++i]; }
    else if (k === "--back") a.action = "back";
    else if (k === "--forward") a.action = "forward";
    else if (k === "--reload") a.action = "reload";
    else if (k === "--wait") { a.action = "wait"; a.ms = Number(argv[++i]); }
    else if (k === "--block") { a.action = "block"; a.pattern = argv[++i]; }
    else if (k === "--unblock-all") a.action = "unblock-all";
    else if (k === "--goto") { a.action = "goto"; a.gotoUrl = argv[++i]; }
    else if (k === "--stop") a.action = "stop";
  }
  return a;
}

function pidAlive(pid) {
  try { process.kill(pid, 0); return true; } catch { return false; }
}

async function ensureDaemon(sessionDir) {
  await fs.mkdir(sessionDir, { recursive: true });
  await fs.mkdir(path.join(sessionDir, "screenshots"), { recursive: true });
  const daemonPath = path.join(sessionDir, "daemon.json");

  if (fssync.existsSync(daemonPath)) {
    const info = JSON.parse(await fs.readFile(daemonPath, "utf-8"));
    if (pidAlive(info.pid)) return info;
    await fs.rm(daemonPath, { force: true });
  }

  const child = spawn(process.execPath, [DAEMON_RUNNER, sessionDir], { detached: true, stdio: "ignore" });
  child.unref();

  for (let i = 0; i < 50; i++) {
    await new Promise((r) => setTimeout(r, 200));
    if (fssync.existsSync(daemonPath)) {
      try { return JSON.parse(await fs.readFile(daemonPath, "utf-8")); } catch { /* file mid-write, retry */ }
    }
  }
  throw new Error("daemon did not start within 10s");
}

async function collectInteractive(page) {
  return page.evaluate(() => {
    function accessibleName(el) {
      const aria = el.getAttribute("aria-label");
      if (aria && aria.trim()) return aria.trim();
      const labelledby = el.getAttribute("aria-labelledby");
      if (labelledby) {
        const txt = labelledby.split(/\s+/).map((id) => document.getElementById(id)?.innerText || "").join(" ").trim();
        if (txt) return txt;
      }
      if (el.id) {
        const lbl = document.querySelector(`label[for="${el.id}"]`);
        if (lbl && lbl.innerText.trim()) return lbl.innerText.trim();
      }
      const closestLabel = el.closest("label");
      if (closestLabel && closestLabel.innerText.trim()) return closestLabel.innerText.trim();
      if (el.placeholder) return el.placeholder.trim();
      if ((el.tagName === "INPUT") && ["submit", "button"].includes((el.type || "").toLowerCase()) && el.value) return el.value.trim();
      if (el.title && el.title.trim()) return el.title.trim();
      const txt = (el.innerText || el.textContent || "").trim().replace(/\s+/g, " ");
      return txt.slice(0, 100);
    }
    function roleOf(el) {
      const explicit = el.getAttribute("role");
      if (explicit) return explicit;
      const tag = el.tagName.toLowerCase();
      if (tag === "a" && el.hasAttribute("href")) return "link";
      if (tag === "button") return "button";
      if (tag === "select") return "combobox";
      if (tag === "textarea") return "textbox";
      if (tag === "input") {
        const t = (el.getAttribute("type") || "text").toLowerCase();
        if (["submit", "button", "reset"].includes(t)) return "button";
        if (t === "checkbox") return "checkbox";
        if (t === "radio") return "radio";
        if (t === "search") return "searchbox";
        return "textbox";
      }
      return "generic";
    }
    function nthPath(el) {
      const parts = [];
      let node = el;
      // No shallow depth cap: a shallow cap truncates the path above the
      // point where it's actually unique on deeply-nested (e.g. React) DOM,
      // so multiple elements collide on the same selector and .first() can
      // silently click the wrong one. Walk all the way to <body> instead.
      for (let depth = 0; depth < 40 && node && node.nodeType === 1 && node.tagName !== "BODY"; depth++) {
        const parent = node.parentElement;
        if (!parent) break;
        const siblings = Array.from(parent.children).filter((c) => c.tagName === node.tagName);
        const idx = siblings.indexOf(node) + 1;
        parts.unshift(`${node.tagName.toLowerCase()}:nth-of-type(${idx})`);
        node = parent;
      }
      return parts.length ? `body > ${parts.join(" > ")}` : "body";
    }
    function locatorFor(el) {
      if (el.id && /^[A-Za-z][\w-]*$/.test(el.id)) return `#${el.id}`;
      const testid = el.getAttribute("data-testid") || el.getAttribute("data-test");
      if (testid) return `[data-testid="${testid}"]`;
      const name = el.getAttribute("name");
      if (name) return `${el.tagName.toLowerCase()}[name="${name}"]`;
      return nthPath(el);
    }
    const candidates = Array.from(document.querySelectorAll('button, a, input, textarea, select, [role], [onclick], [tabindex]'));
    const seen = new Set();
    const results = [];
    for (const el of candidates) {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      const visible = rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
      if (!visible) continue;
      const role = roleOf(el);
      const name = accessibleName(el);
      if (!name) continue;
      const locator = locatorFor(el);
      const key = `${role}|${name}|${locator}`;
      if (seen.has(key)) continue;
      seen.add(key);
      results.push({ role, name, locator });
      if (results.length >= 80) break;
    }
    return results;
  });
}

async function appendEvidence(dir, entry) {
  const evPath = path.join(dir, "evidence.json");
  let evidence = { runDir: dir, steps: [] };
  if (fssync.existsSync(evPath)) evidence = JSON.parse(await fs.readFile(evPath, "utf-8"));
  evidence.steps.push(entry);
  await fs.writeFile(evPath, JSON.stringify(evidence, null, 2));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.state) {
    console.error("Missing --state <path>");
    process.exit(1);
  }
  const sessionDir = path.dirname(args.state);
  const daemonPath = path.join(sessionDir, "daemon.json");

  if (args.action === "stop") {
    if (fssync.existsSync(daemonPath)) {
      const info = JSON.parse(await fs.readFile(daemonPath, "utf-8"));
      if (pidAlive(info.pid)) process.kill(info.pid, "SIGTERM");
      await fs.rm(daemonPath, { force: true }).catch(() => {});
    }
    console.log(JSON.stringify({ action: "stop", stopped: true }));
    return;
  }

  if (!args.action) {
    console.error("No action given. Use --start/--snapshot/--click/--click-text/--fill/--fill-text/--press/--back/--forward/--reload/--wait/--block/--unblock-all/--goto/--stop");
    process.exit(1);
  }

  const daemon = await ensureDaemon(sessionDir);
  const browser = await chromium.connectOverCDP(`http://localhost:${daemon.port}`);

  // A freshly launched chromium already has one default context/blank tab
  // open (true even headless), so always reuse contexts()[0] rather than
  // creating a second one. (Creating a fresh isolated context and closing
  // the default one was tried and reliably crashed the whole browser —
  // headless chromium quits the instant zero pages are open anywhere, and
  // there is no ordering of "create new page" / "close old context" that
  // avoids a zero-page instant in between.)
  let context = browser.contexts()[0];
  if (!context) context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  let page = context.pages()[0];
  if (!page) page = await context.newPage();
  if (args.action === "start" && args.mobile) {
    // isMobile/hasTouch are context-creation-only options we can't retrofit
    // onto the reused default context, but resizing the viewport is enough
    // to catch real layout breakage (the thing this flag is actually for).
    await page.setViewportSize({ width: 375, height: 667 }).catch(() => {});
  }

  const diag = { consoleErrors: [], failedRequests: [], serverErrors: [] };
  page.on("console", (m) => { if (m.type() === "error") diag.consoleErrors.push(m.text()); });
  page.on("requestfailed", (r) => diag.failedRequests.push({ url: r.url(), failure: r.failure()?.errorText }));
  page.on("response", (r) => { if (r.status() >= 500) diag.serverErrors.push({ url: r.url(), status: r.status() }); });

  if (args.action === "block") await page.route(args.pattern, (route) => route.abort());
  if (args.action === "unblock-all") await page.unrouteAll({ behavior: "ignoreErrors" });

  const start = Date.now();
  let error = null;
  try {
    switch (args.action) {
      case "start":
        if (args.url) await page.goto(args.url, { waitUntil: "load", timeout: 30000 });
        break;
      case "goto":
        await page.goto(args.gotoUrl, { waitUntil: "load", timeout: 30000 });
        break;
      case "snapshot":
      case "block":
      case "unblock-all":
        break;
      case "click":
        await page.locator(args.locator).first().click({ timeout: 10000 });
        break;
      case "click-text": {
        const items = await collectInteractive(page);
        const hit = items.find((i) => CLICKABLE_ROLES.includes(i.role) && i.name.toLowerCase().includes(args.text.toLowerCase()));
        if (!hit) throw new Error(`no clickable element matching text "${args.text}" — see interactive list for options`);
        await page.locator(hit.locator).first().click({ timeout: 10000 });
        break;
      }
      case "fill":
        await page.locator(args.locator).first().fill(args.value ?? "", { timeout: 10000 });
        break;
      case "fill-text": {
        const items = await collectInteractive(page);
        const hit = items.find((i) => FILLABLE_ROLES.includes(i.role) && i.name.toLowerCase().includes(args.text.toLowerCase()));
        if (!hit) throw new Error(`no input matching text "${args.text}" — see interactive list for options`);
        await page.locator(hit.locator).first().fill(args.value ?? "", { timeout: 10000 });
        break;
      }
      case "press":
        await page.keyboard.press(args.key);
        break;
      case "back":
        await page.goBack({ waitUntil: "load", timeout: 15000 });
        break;
      case "forward":
        await page.goForward({ waitUntil: "load", timeout: 15000 });
        break;
      case "reload":
        await page.reload({ waitUntil: "load", timeout: 15000 });
        break;
      case "wait":
        await page.waitForTimeout(args.ms ?? 1000);
        break;
      default:
        throw new Error(`unknown action: ${args.action}`);
    }
    await page.waitForTimeout(300); // let post-action network/UI settle
  } catch (err) {
    error = String(err.message ?? err);
  }
  const elapsedMs = Date.now() - start;

  const daemonInfo = JSON.parse(await fs.readFile(daemonPath, "utf-8").catch(() => "{}"));
  daemonInfo.stepCount = (daemonInfo.stepCount ?? 0) + 1;
  const stepNum = daemonInfo.stepCount;
  await fs.writeFile(daemonPath, JSON.stringify(daemonInfo, null, 2)).catch(() => {});

  const shotPath = path.join(sessionDir, "screenshots", `step-${String(stepNum).padStart(3, "0")}-${args.action}.png`);
  await page.screenshot({ path: shotPath, fullPage: true }).catch(() => {});

  let interactive = [];
  let url = null;
  let title = null;
  let bodyText = "";
  try {
    url = page.url();
    title = await page.title();
    bodyText = (await page.evaluate(() => document.body?.innerText?.slice(0, 1500) ?? "")) || "";
    interactive = (await collectInteractive(page)).slice(0, 60);
  } catch { /* page may be closed/errored; leave defaults */ }

  const result = {
    step: stepNum,
    action: args.action,
    requestedLocatorOrText: args.locator ?? args.text ?? args.gotoUrl ?? args.key ?? args.pattern ?? null,
    elapsedMs,
    error,
    url,
    title,
    bodyTextExcerpt: bodyText,
    screenshot: shotPath,
    interactive,
    diagnostics: diag,
    timestamp: new Date().toISOString(),
  };

  // Deliberately never call browser.close() here — the whole point of the
  // CDP daemon is that this process's connection is disposable while the
  // context/page underneath keeps running. Just let the process exit.

  await appendEvidence(sessionDir, result);
  console.log(JSON.stringify(result, null, 2));
  // The CDP connection above is deliberately never closed (closing it would
  // tear down the shared context), which leaves an open WebSocket handle
  // that would otherwise keep this process's event loop alive forever.
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
