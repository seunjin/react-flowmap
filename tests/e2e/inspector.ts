import type { Page } from '@playwright/test';

/** Shadow DOM 안의 inspector button 가져오기 */
export async function getInspectorButton(page: Page) {
  return page.evaluateHandle(() => {
    const host = document.querySelector('[data-rfm-shadow-host]');
    if (!host || !host.shadowRoot) return null;
    return host.shadowRoot.querySelector('button[data-rfm-overlay]');
  });
}

/** Shadow DOM 안의 특정 요소 존재 여부 확인 */
export async function shadowQuerySelector(page: Page, selector: string): Promise<boolean> {
  return page.evaluate((sel) => {
    const host = document.querySelector('[data-rfm-shadow-host]');
    if (!host || !host.shadowRoot) return false;
    return !!host.shadowRoot.querySelector(sel);
  }, selector);
}

/** Inspector button 클릭 */
export async function clickInspectorButton(page: Page) {
  await page.locator('button[data-rfm-overlay]').click();
}

/** Inspector button 클릭 후 workspace popup 대기 */
export async function openWorkspaceFromInspector(page: Page) {
  const popupPromise = page.waitForEvent('popup');
  await clickInspectorButton(page);
  const popup = await popupPromise;
  await popup.waitForLoadState('domcontentloaded');
  return popup;
}
