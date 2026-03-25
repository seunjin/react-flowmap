import { test, expect } from '@playwright/test';
import { clickInspectorButton, shadowQuerySelector } from './inspector';

const BASE = 'http://localhost:3003';

test.describe('demos/next', () => {
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

  test('Inspector 버튼 클릭 시 사이드바가 열리고 컴포넌트가 나열된다', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForSelector('[data-rfm-shadow-host]', { state: 'attached', timeout: 8000 });
    await clickInspectorButton(page);
    await page.waitForTimeout(500);
    const hasSidebar = await shadowQuerySelector(page, '[data-rfm-sidebar]');
    expect(hasSidebar).toBe(true);
    // 컴포넌트 추적 확인 — Header, ComponentA, ComponentB, Badge가 트리에 표시
    const sidebarText = await page.evaluate(() => {
      const host = document.querySelector('[data-rfm-shadow-host]');
      return host?.shadowRoot?.textContent ?? '';
    });
    expect(sidebarText).toContain('Header');
    expect(sidebarText).toContain('ComponentA');
  });

  test('/rfm-graph 페이지가 로드된다', async ({ page }) => {
    const response = await page.goto(`${BASE}/rfm-graph`);
    expect(response?.status()).toBe(200);
  });
});
