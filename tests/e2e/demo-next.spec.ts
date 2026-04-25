import { test, expect } from '@playwright/test';
import { openWorkspaceFromInspector, shadowQuerySelector } from './inspector';

const BASE = 'http://localhost:3003';

test.describe('demos/next', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem('rfm-active');
    });
  });

  test('페이지가 정상 로드된다', async ({ page }) => {
    const response = await page.goto(BASE);
    expect(response?.status()).toBe(200);
  });

  test('Inspector shadow host가 마운트된다', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForSelector('[data-rfm-shadow-host]', { state: 'attached', timeout: 8000 });
    const hasHost = await page.evaluate(() => !!document.querySelector('[data-rfm-shadow-host]'));
    expect(hasHost).toBe(true);
  });

  test('Inspector 버튼이 shadow DOM 안에 렌더된다', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForSelector('[data-rfm-shadow-host]', { state: 'attached', timeout: 8000 });
    const hasButton = await shadowQuerySelector(page, 'button[data-rfm-overlay]');
    expect(hasButton).toBe(true);
  });

  test('Inspector 버튼 클릭 시 workspace 창이 바로 열린다', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForSelector('[data-rfm-shadow-host]', { state: 'attached', timeout: 8000 });
    const popup = await openWorkspaceFromInspector(page);
    await expect(popup).toHaveURL(/__rfm=graph/);
    await expect(popup.getByText('Flowmap Workspace')).toBeVisible();
  });

  test('Next workspace shows route nodes in the unified graph', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForSelector('[data-rfm-shadow-host]', { state: 'attached', timeout: 8000 });
    const popup = await openWorkspaceFromInspector(page);
    await expect(popup.getByText('Flowmap Workspace')).toBeVisible();
    await expect(popup.getByText('Static route shell')).toHaveCount(0);
    await expect(popup.locator('button[title="RootLayout"]')).toBeVisible();
  });

  test('Next workspace does not duplicate live client boundary nodes', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForSelector('[data-rfm-shadow-host]', { state: 'attached', timeout: 8000 });
    const popup = await openWorkspaceFromInspector(page);
    await expect(popup.getByText('Flowmap Workspace')).toBeVisible();
    await expect(popup.locator('button[title="RootLayout"]')).toHaveCount(1);
    await expect(popup.locator('button[title="HomePage"]')).toHaveCount(1);
    await expect(popup.locator('button[title="Header"]')).toHaveCount(1);
    await expect(popup.locator('button[title="ComponentA"]')).toHaveCount(1);
    await expect(popup.locator('button[title="ComponentB"]')).toHaveCount(1);
    await expect(popup.locator('button[title="Badge"]')).toHaveCount(1);
  });

  test('Next explorer keeps imported components in their own files instead of inlining them under route files', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForSelector('[data-rfm-shadow-host]', { state: 'attached', timeout: 8000 });
    const popup = await openWorkspaceFromInspector(page);
    const explorer = popup.locator('aside').first();
    await expect(explorer.getByText('FlowmapProvider', { exact: true })).toHaveCount(0);
    await expect(explorer.getByText('Header', { exact: true })).toHaveCount(1);
    await expect(explorer.getByText('ComponentA', { exact: true })).toHaveCount(1);
    await expect(explorer.getByText('ComponentB', { exact: true })).toHaveCount(1);
  });

});
