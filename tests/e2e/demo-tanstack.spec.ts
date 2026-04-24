import { test, expect } from '@playwright/test';
import { openWorkspaceFromInspector, shadowQuerySelector } from './inspector';

const BASE = 'http://localhost:3002';

test.describe('demos/tanstack', () => {
  test('페이지가 정상 로드된다', async ({ page }) => {
    const response = await page.goto(BASE);
    expect(response?.status()).toBe(200);
    await expect(page.locator('#root')).not.toBeEmpty();
  });

  test('Inspector shadow host가 마운트된다', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForSelector('[data-rfm-shadow-host]', { state: 'attached', timeout: 5000 });
    const hasHost = await page.evaluate(() => !!document.querySelector('[data-rfm-shadow-host]'));
    expect(hasHost).toBe(true);
  });

  test('Inspector 버튼이 shadow DOM 안에 렌더된다', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForSelector('[data-rfm-shadow-host]', { state: 'attached', timeout: 5000 });
    const hasButton = await shadowQuerySelector(page, 'button[data-rfm-overlay]');
    expect(hasButton).toBe(true);
  });

  test('Inspector 버튼 클릭 시 workspace 창이 바로 열린다', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForSelector('[data-rfm-shadow-host]', { state: 'attached', timeout: 5000 });
    const popup = await openWorkspaceFromInspector(page);
    await expect(popup).toHaveURL(/__rfm=graph/);
    await expect(popup.getByText('Flowmap Workspace')).toBeVisible();
  });

  test('workspace 창이 tanstack route context를 표시한다', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForSelector('[data-rfm-shadow-host]', { state: 'attached', timeout: 5000 });

    const popup = await openWorkspaceFromInspector(page);
    await expect(popup.getByText(/^[1-9]\d* active routes$/)).toBeVisible();
  });
});
