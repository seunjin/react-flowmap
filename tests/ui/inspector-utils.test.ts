import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  buildFiberRelationships,
  findAllInstanceRectsBySymbolId,
  findAllMountedRfmComponents,
  findElBySymbolId,
  getPropsForSymbolId,
  invalidateMountedRfmSnapshot,
} from '../../src/ui/inspector/utils';

type TestFiberNode = {
  type: unknown;
  return: TestFiberNode | null;
  child: TestFiberNode | null;
  sibling: TestFiberNode | null;
  stateNode: unknown;
  memoizedProps: Record<string, unknown> | null;
};

type AttachFiberOptions = {
  key: string;
  pageSymbolId?: string;
  cardSymbolId?: string;
  firstCardProps?: Record<string, unknown>;
};

function makeRfmComponent(symbolId: string, loc: string, props: Record<string, unknown> | null): TestFiberNode {
  const type = Object.assign(function TestComponent() {}, {
    __rfm_symbolId: symbolId,
    __rfm_loc: loc,
  });

  return {
    type,
    return: null,
    child: null,
    sibling: null,
    stateNode: null,
    memoizedProps: props,
  };
}

function setRect(el: HTMLElement, rect: DOMRect): void {
  Object.defineProperty(el, 'getBoundingClientRect', {
    configurable: true,
    value: () => rect,
  });
}

function attachFiberTree({
  key,
  pageSymbolId = 'symbol:src/pages/user-page.tsx#UserPage',
  cardSymbolId = 'symbol:src/components/user-card.tsx#UserCard',
  firstCardProps = { itemId: 'card-a' },
}: AttachFiberOptions): { firstCardEl: HTMLElement } {
  const app = document.createElement('main');
  const pageRoot = document.createElement('section');
  const firstCardEl = document.createElement('article');
  const secondCardEl = document.createElement('article');
  const overlay = document.createElement('div');
  const overlayChild = document.createElement('button');

  overlay.setAttribute('data-rfm-overlay', '');
  overlay.appendChild(overlayChild);
  pageRoot.append(firstCardEl, secondCardEl);
  app.append(pageRoot, overlay);
  document.body.appendChild(app);

  setRect(pageRoot, new DOMRect(0, 0, 300, 200));
  setRect(firstCardEl, new DOMRect(10, 20, 100, 40));
  setRect(secondCardEl, new DOMRect(150, 20, 80, 50));
  setRect(overlayChild, new DOMRect(0, 0, 10, 10));

  const pageComp = makeRfmComponent(pageSymbolId, '10', { route: 'user' });
  const firstCardComp = makeRfmComponent(cardSymbolId, '20', firstCardProps);
  const secondCardComp = makeRfmComponent(cardSymbolId, '20', { itemId: 'card-b' });
  const overlayComp = makeRfmComponent('symbol:src/overlay.tsx#OverlayButton', '99', { hidden: true });

  const pageHost: TestFiberNode = {
    type: 'section',
    return: pageComp,
    child: firstCardComp,
    sibling: null,
    stateNode: pageRoot,
    memoizedProps: null,
  };
  const firstCardHost: TestFiberNode = {
    type: 'article',
    return: firstCardComp,
    child: null,
    sibling: null,
    stateNode: firstCardEl,
    memoizedProps: null,
  };
  const secondCardHost: TestFiberNode = {
    type: 'article',
    return: secondCardComp,
    child: null,
    sibling: null,
    stateNode: secondCardEl,
    memoizedProps: null,
  };
  const overlayHost: TestFiberNode = {
    type: 'button',
    return: overlayComp,
    child: null,
    sibling: null,
    stateNode: overlayChild,
    memoizedProps: null,
  };

  pageComp.child = pageHost;
  firstCardComp.return = pageHost;
  firstCardComp.child = firstCardHost;
  firstCardComp.sibling = secondCardComp;
  secondCardComp.return = pageHost;
  secondCardComp.child = secondCardHost;
  overlayComp.child = overlayHost;

  Object.assign(pageRoot, { [key]: pageHost });
  Object.assign(firstCardEl, { [key]: firstCardHost });
  Object.assign(secondCardEl, { [key]: secondCardHost });
  Object.assign(overlayChild, { [key]: overlayHost });

  return { firstCardEl };
}

describe('inspector mounted snapshot helpers', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    invalidateMountedRfmSnapshot();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    invalidateMountedRfmSnapshot();
  });

  it('reuses one mounted snapshot across global component lookups', () => {
    const fiberKey = '__reactFiber$test';
    const pageSymbolId = 'symbol:src/pages/user-page.tsx#UserPage';
    const cardSymbolId = 'symbol:src/components/user-card.tsx#UserCard';

    const { firstCardEl } = attachFiberTree({
      key: fiberKey,
      pageSymbolId,
      cardSymbolId,
    });

    expect(findAllMountedRfmComponents()).toEqual([
      { symbolId: pageSymbolId, loc: '10' },
      { symbolId: cardSymbolId, loc: '20' },
    ]);
    expect(buildFiberRelationships()).toEqual({
      [pageSymbolId]: [cardSymbolId],
    });
    expect(findElBySymbolId(cardSymbolId)).toBe(firstCardEl);
    expect(getPropsForSymbolId(cardSymbolId)).toEqual({ itemId: 'card-a' });
    expect(findAllInstanceRectsBySymbolId(cardSymbolId)).toEqual([
      new DOMRect(10, 20, 100, 40),
      new DOMRect(150, 20, 80, 50),
    ]);
  });

  it('rebuilds the mounted snapshot after invalidation so new fibers are picked up', () => {
    const fiberKey = '__reactFiber$refresh';
    const cardSymbolId = 'symbol:src/components/user-card.tsx#UserCard';

    const { firstCardEl } = attachFiberTree({
      key: fiberKey,
      cardSymbolId,
    });

    expect(findElBySymbolId(cardSymbolId)).toBe(firstCardEl);
    expect(getPropsForSymbolId(cardSymbolId)).toEqual({ itemId: 'card-a' });

    document.body.innerHTML = '';
    const { firstCardEl: replacementEl } = attachFiberTree({
      key: fiberKey,
      cardSymbolId,
      firstCardProps: { itemId: 'card-c' },
    });

    invalidateMountedRfmSnapshot();

    expect(findElBySymbolId(cardSymbolId)).toBe(replacementEl);
    expect(getPropsForSymbolId(cardSymbolId)).toEqual({ itemId: 'card-c' });
  });
});
