/* global localStorage */
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assetsDir = resolve(rootDir, 'docs/assets');

const demos = [
  {
    id: 'react',
    command: 'pnpm',
    args: ['demo:react'],
    url: 'http://localhost:3001',
    screenshot: 'flowmap-demo-react.png',
  },
  {
    id: 'tanstack',
    command: 'pnpm',
    args: ['demo:tanstack'],
    url: 'http://localhost:3002',
    screenshot: 'flowmap-demo-tanstack.png',
  },
  {
    id: 'next',
    command: 'pnpm',
    args: ['demo:next'],
    url: 'http://localhost:3003',
    screenshot: 'flowmap-demo-next.png',
  },
];

const ownedProcesses = [];
let stopping = false;

async function canReach(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    return response.status < 500;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

function startDemo(demo) {
  const child = spawn(demo.command, demo.args, {
    cwd: rootDir,
    env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' },
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  child.stdout.on('data', (chunk) => {
    const output = String(chunk).trim();
    if (output && !stopping) console.log(`[${demo.id}] ${output}`);
  });
  child.stderr.on('data', (chunk) => {
    const output = String(chunk).trim();
    if (output && !stopping) console.error(`[${demo.id}] ${output}`);
  });

  ownedProcesses.push(child);
}

function killProcessGroup(child, signal) {
  if (!child.pid) return;
  try {
    process.kill(-child.pid, signal);
  } catch {
    child.kill(signal);
  }
}

async function stopOwnedProcesses() {
  stopping = true;
  await Promise.all(ownedProcesses.map((child) => new Promise((resolveStop) => {
    if (child.exitCode !== null || child.killed) {
      resolveStop();
      return;
    }

    const forceKill = setTimeout(() => {
      killProcessGroup(child, 'SIGKILL');
      resolveStop();
    }, 2000);

    child.once('exit', () => {
      clearTimeout(forceKill);
      resolveStop();
    });

    killProcessGroup(child, 'SIGTERM');
  })));
}

async function ensureDemoRunning(demo) {
  if (await canReach(demo.url)) {
    console.log(`[${demo.id}] using existing server`);
    return;
  }

  startDemo(demo);
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (await canReach(demo.url)) return;
    await new Promise((resolveWait) => setTimeout(resolveWait, 500));
  }

  throw new Error(`Timed out waiting for ${demo.id} at ${demo.url}`);
}

async function captureApp(browser, demo) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 980 }, deviceScaleFactor: 1 });
  await page.addInitScript(() => {
    localStorage.removeItem('rfm-active');
  });
  await page.goto(demo.url);
  await page.getByRole('heading', { name: 'Flowmap Ops' }).waitFor();
  await page.waitForSelector('[data-rfm-shadow-host]', { state: 'attached', timeout: 10_000 });
  await page.screenshot({ path: resolve(assetsDir, demo.screenshot) });
  await page.close();
}

async function captureWorkspace(browser) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 980 }, deviceScaleFactor: 1 });
  await page.addInitScript(() => {
    localStorage.removeItem('rfm-active');
  });
  await page.goto('http://localhost:3003');
  await page.waitForSelector('[data-rfm-shadow-host]', { state: 'attached', timeout: 10_000 });
  const popupPromise = page.waitForEvent('popup');
  await page.locator('button[data-rfm-overlay]').click();
  const popup = await popupPromise;
  await popup.setViewportSize({ width: 1440, height: 980 });
  await popup.getByText('Flowmap', { exact: true }).waitFor();
  await popup.locator('button[title="ServerOverview"]').click();
  await popup.screenshot({ path: resolve(assetsDir, 'flowmap-workspace-next.png') });
  await popup.close();
  await page.close();
}

async function main() {
  await mkdir(assetsDir, { recursive: true });

  for (const demo of demos) {
    await ensureDemoRunning(demo);
  }

  const browser = await chromium.launch();
  try {
    for (const demo of demos) {
      await captureApp(browser, demo);
    }
    await captureWorkspace(browser);
  } finally {
    await browser.close();
  }

  console.log(`Screenshots written to ${assetsDir}`);
}

try {
  await main();
} finally {
  await stopOwnedProcesses();
}
