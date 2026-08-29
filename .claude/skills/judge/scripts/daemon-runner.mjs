#!/usr/bin/env node
// Internal helper spawned detached by browser-step.mjs. Keeps one headless
// chromium process alive across many separate `node browser-step.mjs ...`
// invocations, so a browsing session (cookies, localStorage, open tab, typed-
// but-not-submitted form fields) survives between steps instead of resetting
// on every CLI call. Do not invoke directly.
//
// Usage: node daemon-runner.mjs <sessionDir>

import { chromium } from "playwright";
import fs from "node:fs/promises";
import net from "node:net";
import path from "node:path";

async function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
    srv.on("error", reject);
  });
}

async function main() {
  const sessionDir = process.argv[2];
  if (!sessionDir) {
    console.error("Usage: daemon-runner.mjs <sessionDir>");
    process.exit(1);
  }
  await fs.mkdir(sessionDir, { recursive: true });
  const port = await freePort();
  const browser = await chromium.launch({ headless: true, args: [`--remote-debugging-port=${port}`] });

  const daemonPath = path.join(sessionDir, "daemon.json");
  await fs.writeFile(daemonPath, JSON.stringify({ pid: process.pid, port, startedAt: new Date().toISOString() }, null, 2));

  const shutdown = async () => {
    await browser.close().catch(() => {});
    await fs.rm(daemonPath, { force: true }).catch(() => {});
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  await new Promise(() => {}); // keep the event loop alive indefinitely
}

main();
