import { test, expect, type Page } from '@playwright/test';
import { openWorkspaceFromInspector, shadowQuerySelector } from './inspector';

const BASE = 'http://localhost:3003';

async function getStaticOwnerState(page: Page, ownerId: string) {
  return page.evaluate((targetOwnerId) => {
    const owner = Array.from(
      document.querySelectorAll<HTMLElement>('[data-rfm-static-owner]'),
    ).find((el) => el.dataset.rfmStaticOwner === targetOwnerId);
    if (!owner) return null;

    const rect = owner.getBoundingClientRect();
    return {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    };
  }, ownerId);
}

async function getRuntimeOwnerState(page: Page, symbolId: string) {
  return page.evaluate((targetSymbolId) => {
    const owner = Array.from(
      document.querySelectorAll<HTMLElement>('[data-rfm-owner]'),
    ).find((el) => el.dataset.rfmOwner === targetSymbolId);
    if (!owner) return null;

    const rect = owner.getBoundingClientRect();
    return {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    };
  }, symbolId);
}

async function getOwnerOverlayState(page: Page, symbolId: string, state = 'selected') {
  return page.evaluate(({ targetSymbolId, targetState }) => {
    const overlay = Array.from(
      document.querySelectorAll<HTMLElement>('[data-rfm-owner-overlay]'),
    ).find((el) =>
      el.dataset.rfmOwnerOverlayId === targetSymbolId
      && el.dataset.rfmOwnerOverlayState === targetState,
    );
    if (!overlay) return null;

    const rect = overlay.getBoundingClientRect();
    const styles = getComputedStyle(overlay);
    return {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      backgroundColor: styles.backgroundColor,
      label: overlay.querySelector<HTMLElement>('[data-rfm-owner-overlay-label]')?.textContent ?? '',
    };
  }, { targetSymbolId: symbolId, targetState: state });
}

async function getGraphCanvasTransform(page: Page) {
  return page.locator('[data-rfm-graph-canvas]').evaluate((el) => (
    (el as HTMLElement).style.transform
  ));
}

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
    await expect(popup.getByText('Flowmap', { exact: true })).toBeVisible();
    await expect(popup.getByRole('heading', { name: 'Flowmap Ops' })).toBeHidden();

    await popup.reload();
    await expect(popup.getByText('Flowmap', { exact: true })).toBeVisible();
    await expect(popup.getByRole('heading', { name: 'Flowmap Ops' })).toBeHidden();
  });

  test('Next workspace shows route nodes in the unified graph', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForSelector('[data-rfm-shadow-host]', { state: 'attached', timeout: 8000 });
    const popup = await openWorkspaceFromInspector(page);
    await expect(popup.getByText('Flowmap', { exact: true })).toBeVisible();
    await expect(popup.getByText('Static route shell')).toHaveCount(0);
    await expect(popup.locator('button[title="RootLayout"]')).toBeVisible();
  });

  test('Next workspace does not duplicate live client boundary nodes', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForSelector('[data-rfm-shadow-host]', { state: 'attached', timeout: 8000 });
    const popup = await openWorkspaceFromInspector(page);
    await expect(popup.getByText('Flowmap', { exact: true })).toBeVisible();
    await expect(popup.locator('button[title="RootLayout"]')).toHaveCount(1);
    await expect(popup.locator('button[title="DashboardPage"]')).toHaveCount(1);
    await expect(popup.locator('button[title="Header"]')).toHaveCount(1);
    await expect(popup.locator('button[title="ServerOverview"]')).toHaveCount(1);
    await expect(popup.locator('button[title="ServerWorkflow"]')).toHaveCount(1);
    await expect(popup.locator('button[title="ClientMetricCard"]')).toHaveCount(1);
    await expect(popup.locator('button[title="ClientFilterPanel"]')).toHaveCount(1);
  });

  test('Next explorer keeps imported components in their own files instead of inlining them under route files', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForSelector('[data-rfm-shadow-host]', { state: 'attached', timeout: 8000 });
    const popup = await openWorkspaceFromInspector(page);
    const explorer = popup.locator('aside').first();
    await expect(explorer.getByText('FlowmapProvider', { exact: true })).toHaveCount(0);
    await expect(explorer.getByText('Header', { exact: true })).toHaveCount(1);
    await expect(explorer.getByText('ServerOverview', { exact: true })).toHaveCount(1);
    await expect(explorer.getByText('ServerWorkflow', { exact: true })).toHaveCount(1);
  });

  test('Next server route detail shows parent layout and reachable client boundaries', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForSelector('[data-rfm-shadow-host]', { state: 'attached', timeout: 8000 });
    const popup = await openWorkspaceFromInspector(page);
    await popup.locator('button[title="DashboardPage"]').click();
    const inspector = popup.locator('aside').nth(1);
    await expect(inspector.getByText('Parent Layout')).toBeVisible();
    await expect(inspector.getByText('RootLayout')).toBeVisible();
    await expect(inspector.getByText('Client Boundaries Reached')).toBeVisible();
    await expect(inspector.getByText('ClientMetricCard')).toBeVisible();
    await expect(inspector.getByText('ClientFilterPanel')).toBeVisible();
    await expect(inspector.getByText('ClientInspectorChecklist')).toBeVisible();
    await expect(inspector.getByText('ClientSyncButton')).toBeVisible();
  });

  test('Next route nodes use rendered owner area when available', async ({ page }) => {
    const homeRouteId = 'route:src/app/page.tsx';

    await page.goto(BASE);
    await page.waitForSelector('[data-rfm-shadow-host]', { state: 'attached', timeout: 8000 });
    const popup = await openWorkspaceFromInspector(page);
    await expect(popup.getByText('Flowmap', { exact: true })).toBeVisible();

    await popup.locator('button[title="DashboardPage"]').click();
    const overlay = await getOwnerOverlayState(page, homeRouteId);
    expect(overlay).not.toBeNull();
    expect(overlay!.label).toBe('DashboardPage');
    expect(overlay!.height).toBeGreaterThan(200);
    expect(overlay!.backgroundColor).toBe('rgba(59, 130, 246, 0.05)');
  });

  test('Next layout route nodes do not draw viewport-sized owner overlays', async ({ page }) => {
    const rootLayoutId = 'route:src/app/layout.tsx';

    await page.goto(BASE);
    await page.waitForSelector('[data-rfm-shadow-host]', { state: 'attached', timeout: 8000 });
    const popup = await openWorkspaceFromInspector(page);
    await expect(popup.getByText('Flowmap', { exact: true })).toBeVisible();

    await popup.locator('button[title="RootLayout"]').click();
    await expect.poll(async () => await getOwnerOverlayState(page, rootLayoutId)).toBeNull();
  });

  test('Next reports route shows nested layout and report client boundaries', async ({ page }) => {
    await page.goto(`${BASE}/reports`);
    await page.waitForSelector('[data-rfm-shadow-host]', { state: 'attached', timeout: 8000 });
    const popup = await openWorkspaceFromInspector(page);
    await expect(popup.getByText('Flowmap', { exact: true })).toBeVisible();
    await expect(popup.locator('button[title="ReportsLayout"]')).toBeVisible();
    await expect(popup.locator('button[title="ReportsPage"]')).toBeVisible();
    await expect(popup.locator('button[title="ClientTimeline"]')).toBeVisible();
    await expect(popup.locator('button[title="ClientFilterPanel"]')).toBeVisible();

    await popup.locator('button[title="ReportsPage"]').click();
    const inspector = popup.locator('aside').nth(1);
    await expect(inspector.getByText('Parent Layout')).toBeVisible();
    await expect(inspector.getByText('ReportsLayout')).toBeVisible();
    await expect(inspector.getByText('ClientTimeline')).toBeVisible();
    await expect(inspector.getByText('ClientFilterPanel')).toBeVisible();
  });

  test('Next workspace follows client route transitions', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForSelector('[data-rfm-shadow-host]', { state: 'attached', timeout: 8000 });
    const popup = await openWorkspaceFromInspector(page);
    await expect(popup.getByText('Flowmap', { exact: true })).toBeVisible();

    await page.getByRole('link', { name: 'Reports' }).click();
    await expect(page).toHaveURL(`${BASE}/reports`);
    await expect(popup.locator('button[title="ReportsLayout"]')).toBeVisible();
    await expect(popup.locator('button[title="ReportsPage"]')).toBeVisible();
    await expect(popup.locator('button[title="ClientTimeline"]')).toBeVisible();

    await page.getByRole('link', { name: 'Dashboard' }).click();
    await expect(page).toHaveURL(BASE);
    await expect(popup.locator('button[title="DashboardPage"]')).toBeVisible();
    await expect(popup.locator('button[title="ServerOverview"]')).toBeVisible();
  });

  test('Next static server component nodes highlight their rendered owner area', async ({ page }) => {
    const overviewOwner = 'src/app/_components/ServerOverview.tsx#ServerOverview';
    const workflowOwner = 'src/app/_components/ServerWorkflow.tsx#ServerWorkflow';

    await page.goto(BASE);
    await page.waitForSelector('[data-rfm-shadow-host]', { state: 'attached', timeout: 8000 });
    const popup = await openWorkspaceFromInspector(page);
    await expect(popup.getByText('Flowmap', { exact: true })).toBeVisible();

    await popup.locator('button[title="ServerOverview"]').click();
    await expect.poll(async () => await getOwnerOverlayState(page, `static:${overviewOwner}`)).not.toBeNull();
    const overviewRect = await getStaticOwnerState(page, overviewOwner);
    expect(overviewRect).not.toBeNull();
    expect(overviewRect!.height).toBeGreaterThan(120);
    const overviewOverlay = await getOwnerOverlayState(page, `static:${overviewOwner}`);
    expect(overviewOverlay).not.toBeNull();
    expect(overviewOverlay!.label).toBe('ServerOverview');
    expect(overviewOverlay!.backgroundColor).toBe('rgba(59, 130, 246, 0.05)');

    await page.evaluate(() => window.scrollBy(0, 120));
    await expect.poll(async () => (await getStaticOwnerState(page, overviewOwner))?.top ?? overviewRect!.top).toBeLessThan(overviewRect!.top - 40);
    await expect.poll(async () => (await getOwnerOverlayState(page, `static:${overviewOwner}`))?.top ?? overviewOverlay!.top).toBeLessThan(overviewOverlay!.top - 40);

    await popup.locator('button[title="ServerWorkflow"]').click();
    await expect.poll(async () => await getOwnerOverlayState(page, `static:${workflowOwner}`)).not.toBeNull();
    const workflowRect = await getStaticOwnerState(page, workflowOwner);
    expect(workflowRect).not.toBeNull();
    expect(workflowRect!.height).toBeGreaterThan(120);
  });

  test('Next picker selects static server component DOM owners from the app screen', async ({ page }) => {
    const overviewOwner = 'src/app/_components/ServerOverview.tsx#ServerOverview';

    await page.goto(BASE);
    await page.waitForSelector('[data-rfm-shadow-host]', { state: 'attached', timeout: 8000 });
    const popup = await openWorkspaceFromInspector(page);
    await expect(popup.getByText('Flowmap', { exact: true })).toBeVisible();

    await popup.getByRole('button', { name: 'Pick element' }).click();
    await expect(popup.getByRole('button', { name: 'Picking…' })).toBeVisible();
    const ownerRect = await getStaticOwnerState(page, overviewOwner);
    expect(ownerRect).not.toBeNull();
    await page.mouse.click(
      ownerRect!.left + 24,
      ownerRect!.top + 24,
    );

    await expect.poll(async () => await getOwnerOverlayState(page, `static:${overviewOwner}`)).not.toBeNull();
    const inspector = popup.locator('aside').nth(1);
    await expect(inspector.getByText('Static DOM owner. Live props are not available')).toBeVisible();
  });

  test('Next live client component nodes highlight their rendered owner area', async ({ page }) => {
    const metricOwner = 'symbol:src/components/ClientMetricCard.tsx#ClientMetricCard';

    await page.goto(BASE);
    await page.waitForSelector('[data-rfm-shadow-host]', { state: 'attached', timeout: 8000 });
    const popup = await openWorkspaceFromInspector(page);
    await expect(popup.getByText('Flowmap', { exact: true })).toBeVisible();

    await popup.locator('button[title="ClientMetricCard"]').click();
    await expect.poll(async () => await getOwnerOverlayState(page, metricOwner)).not.toBeNull();
    const metricRect = await getRuntimeOwnerState(page, metricOwner);
    expect(metricRect).not.toBeNull();
    expect(metricRect!.height).toBeGreaterThan(100);
    const metricOverlay = await getOwnerOverlayState(page, metricOwner);
    expect(metricOverlay).not.toBeNull();
    expect(metricOverlay!.label).toBe('ClientMetricCard');
    expect(metricOverlay!.backgroundColor).toBe('rgba(59, 130, 246, 0.05)');
  });

  test('Next graph viewport keeps user pan after graph updates', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForSelector('[data-rfm-shadow-host]', { state: 'attached', timeout: 8000 });
    const popup = await openWorkspaceFromInspector(page);
    await expect(popup.getByText('Flowmap', { exact: true })).toBeVisible();

    const viewport = popup.locator('[data-rfm-graph-viewport]');
    await expect(viewport).toBeVisible();
    const box = await viewport.boundingBox();
    expect(box).not.toBeNull();

    const before = await getGraphCanvasTransform(popup);
    await popup.mouse.move(box!.x + 24, box!.y + 24);
    await popup.mouse.down();
    await popup.mouse.move(box!.x + 144, box!.y + 84, { steps: 4 });
    await popup.mouse.up();

    const moved = await getGraphCanvasTransform(popup);
    expect(moved).not.toBe(before);

    await popup.locator('button[title="ServerOverview"]').click();
    await popup.waitForTimeout(500);
    expect(await getGraphCanvasTransform(popup)).toBe(moved);
  });

});
