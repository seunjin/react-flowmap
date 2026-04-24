import { test, expect } from '@playwright/test';
import { openWorkspaceFromInspector, shadowQuerySelector } from './inspector';

const BASE = 'http://localhost:3001';

test.describe('demos/react', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem('rfm-active');
    });
  });

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

  test('workspace 창 새로고침 후에도 그래프 데이터가 유지된다', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForSelector('[data-rfm-shadow-host]', { state: 'attached', timeout: 5000 });

    const popup = await openWorkspaceFromInspector(page);
    const mountedSymbols = popup.getByText(/mounted symbols$/).first();

    await expect(mountedSymbols).toHaveText(/^[1-9]\d* mounted symbols$/);
    await popup.reload();
    await popup.waitForLoadState('domcontentloaded');
    await expect(mountedSymbols).toHaveText(/^[1-9]\d* mounted symbols$/);
  });

  test('workspace 창이 react-router route context를 표시한다', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForSelector('[data-rfm-shadow-host]', { state: 'attached', timeout: 5000 });

    const popup = await openWorkspaceFromInspector(page);
    await expect(popup.getByText(/^[1-9]\d* active routes$/)).toBeVisible();
    await expect(popup.getByText('Route / | App > HomePage')).toBeVisible();
    await expect(popup.locator('button[title*=" - /"]')).toHaveCount(0);
  });

  test('컴포넌트를 선택해도 그래프는 route island 없이 component graph만 유지한다', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForSelector('[data-rfm-shadow-host]', { state: 'attached', timeout: 5000 });

    const popup = await openWorkspaceFromInspector(page);
    await expect(popup.locator('button[title="App"]').first()).not.toContainText('PAGE');
    await popup.locator('button[title="HomePage"]').first().click();
    await expect(popup.locator('button[title*=" - /"]')).toHaveCount(0);
  });

  test('react-router-dom 라우팅으로 상품 상세와 목록 사이를 이동한다', async ({ page }) => {
    await page.goto(BASE);

    await page.getByRole('button', { name: /무선 노이즈캔슬링 헤드폰/i }).click();
    await expect(page).toHaveURL(/\/product\/1$/);
    await expect(page.getByRole('button', { name: /목록으로/i })).toBeVisible();

    await page.getByRole('button', { name: /목록으로/i }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText('오늘의 추천 상품')).toBeVisible();
  });
});
