import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  buildFiberRelationships,
  findAllInstanceRectsBySymbolId,
  findAllMountedRfmComponents,
  findComponentRectByEl,
  findDomChildren,
  findDomParent,
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
  metaSymbolId?: string;
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
  metaSymbolId = 'symbol:src/components/user-meta.tsx#UserMeta',
  firstCardProps = { itemId: 'card-a' },
}: AttachFiberOptions): { firstCardEl: HTMLElement; secondCardEl: HTMLElement; secondMetaEl: HTMLElement } {
  const app = document.createElement('main');
  const pageRoot = document.createElement('section');
  const firstCardEl = document.createElement('article');
  const secondCardEl = document.createElement('article');
  const firstMetaEl = document.createElement('span');
  const secondMetaEl = document.createElement('span');
  const overlay = document.createElement('div');
  const overlayChild = document.createElement('button');

  overlay.setAttribute('data-rfm-overlay', '');
  overlay.appendChild(overlayChild);
  firstCardEl.appendChild(firstMetaEl);
  secondCardEl.appendChild(secondMetaEl);
  pageRoot.append(firstCardEl, secondCardEl);
  app.append(pageRoot, overlay);
  document.body.appendChild(app);

  setRect(pageRoot, new DOMRect(0, 0, 300, 200));
  setRect(firstCardEl, new DOMRect(10, 20, 100, 40));
  setRect(secondCardEl, new DOMRect(150, 20, 80, 50));
  setRect(firstMetaEl, new DOMRect(20, 30, 40, 12));
  setRect(secondMetaEl, new DOMRect(170, 32, 44, 12));
  setRect(overlayChild, new DOMRect(0, 0, 10, 10));

  const pageComp = makeRfmComponent(pageSymbolId, '10', { route: 'user' });
  const firstCardComp = makeRfmComponent(cardSymbolId, '20', firstCardProps);
  const secondCardComp = makeRfmComponent(cardSymbolId, '20', { itemId: 'card-b' });
  const firstMetaComp = makeRfmComponent(metaSymbolId, '30', { label: 'meta-a' });
  const secondMetaComp = makeRfmComponent(metaSymbolId, '30', { label: 'meta-b' });
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
    child: firstMetaComp,
    sibling: null,
    stateNode: firstCardEl,
    memoizedProps: null,
  };
  const secondCardHost: TestFiberNode = {
    type: 'article',
    return: secondCardComp,
    child: secondMetaComp,
    sibling: null,
    stateNode: secondCardEl,
    memoizedProps: null,
  };
  const firstMetaHost: TestFiberNode = {
    type: 'span',
    return: firstMetaComp,
    child: null,
    sibling: null,
    stateNode: firstMetaEl,
    memoizedProps: null,
  };
  const secondMetaHost: TestFiberNode = {
    type: 'span',
    return: secondMetaComp,
    child: null,
    sibling: null,
    stateNode: secondMetaEl,
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
  firstMetaComp.return = firstCardHost;
  firstMetaComp.child = firstMetaHost;
  secondMetaComp.return = secondCardHost;
  secondMetaComp.child = secondMetaHost;
  overlayComp.child = overlayHost;

  Object.assign(pageRoot, { [key]: pageHost });
  Object.assign(firstCardEl, { [key]: firstCardHost });
  Object.assign(secondCardEl, { [key]: secondCardHost });
  Object.assign(firstMetaEl, { [key]: firstMetaHost });
  Object.assign(secondMetaEl, { [key]: secondMetaHost });
  Object.assign(overlayChild, { [key]: overlayHost });

  return { firstCardEl, secondCardEl, secondMetaEl };
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
    const metaSymbolId = 'symbol:src/components/user-meta.tsx#UserMeta';

    const { firstCardEl } = attachFiberTree({
      key: fiberKey,
      pageSymbolId,
      cardSymbolId,
      metaSymbolId,
    });

    expect(findAllMountedRfmComponents()).toEqual([
      { symbolId: pageSymbolId, loc: '10' },
      { symbolId: cardSymbolId, loc: '20' },
      { symbolId: metaSymbolId, loc: '30' },
    ]);
    expect(buildFiberRelationships()).toEqual({
      [pageSymbolId]: [cardSymbolId],
      [cardSymbolId]: [metaSymbolId],
    });
    expect(findElBySymbolId(cardSymbolId)).toBe(firstCardEl);
    expect(getPropsForSymbolId(cardSymbolId)).toEqual({ itemId: 'card-a' });
    expect(findAllInstanceRectsBySymbolId(cardSymbolId)).toEqual([
      new DOMRect(10, 20, 100, 40),
      new DOMRect(150, 20, 80, 50),
    ]);
  });

  it('uses the exact mounted element for instance-specific rects and relation targets', () => {
    const fiberKey = '__reactFiber$instance';
    const cardSymbolId = 'symbol:src/components/user-card.tsx#UserCard';
    const metaSymbolId = 'symbol:src/components/user-meta.tsx#UserMeta';

    const { secondCardEl, secondMetaEl } = attachFiberTree({
      key: fiberKey,
      cardSymbolId,
      metaSymbolId,
    });

    expect(findComponentRectByEl(secondCardEl, cardSymbolId)).toEqual(
      new DOMRect(150, 20, 80, 50)
    );
    expect(findDomParent(secondMetaEl, metaSymbolId)).toEqual({
      symbolId: cardSymbolId,
      name: 'UserCard',
      el: secondCardEl,
    });
    expect(findDomChildren(secondCardEl, cardSymbolId)).toEqual([
      {
        symbolId: metaSymbolId,
        name: 'UserMeta',
        el: secondMetaEl,
      },
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
