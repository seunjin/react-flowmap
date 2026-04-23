import { test, expect } from '@playwright/test';
import { clickInspectorButton, shadowQuerySelector } from './inspector';

const BASE = 'http://localhost:3001';

test.describe('demos/react', () => {
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

  test('Inspector 버튼 클릭 시 사이드바가 열린다', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForSelector('[data-rfm-shadow-host]', { state: 'attached', timeout: 5000 });
    await clickInspectorButton(page);
    // 사이드바: data-rfm-overlay 속성을 가진 div (FloatingSidebar)
    const hasSidebar = await shadowQuerySelector(page, '[data-rfm-sidebar]');
    expect(hasSidebar).toBe(true);
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
