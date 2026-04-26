import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { findComponentsAt } from '../../src/ui/inspector/utils';

function setRect(el: HTMLElement, rect: DOMRect): void {
  Object.defineProperty(el, 'getBoundingClientRect', {
    configurable: true,
    value: () => rect,
  });
}

describe('findComponentsAt static DOM owners', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1024,
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 768,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('returns a static selection for data-rfm-static-owner DOM markers', () => {
    const owner = document.createElement('article');
    owner.dataset.rfmStaticOwner = 'src/app/_components/PostCard.tsx#PostCard';
    const title = document.createElement('h2');
    owner.appendChild(title);
    document.body.appendChild(owner);

    setRect(owner, new DOMRect(40, 80, 320, 180));
    setRect(title, new DOMRect(56, 96, 200, 28));
    Object.defineProperty(document, 'elementsFromPoint', {
      configurable: true,
      value: vi.fn(() => [title, owner, document.body]),
    });

    const found = findComponentsAt(60, 100);

    expect(found[0]).toMatchObject({
      symbolId: 'static:src/app/_components/PostCard.tsx#PostCard',
      el: owner,
      loc: null,
    });
  });

  it('prefers the most specific visible owner when static markers are nested', () => {
    const parent = document.createElement('section');
    parent.dataset.rfmStaticOwner = 'src/app/page.tsx#DashboardPage';
    const child = document.createElement('article');
    child.dataset.rfmStaticOwner = 'src/app/_components/PostCard.tsx#PostCard';
    parent.appendChild(child);
    document.body.appendChild(parent);

    setRect(parent, new DOMRect(0, 0, 800, 600));
    setRect(child, new DOMRect(120, 100, 240, 160));
    Object.defineProperty(document, 'elementsFromPoint', {
      configurable: true,
      value: vi.fn(() => [child, parent, document.body]),
    });

    const found = findComponentsAt(140, 120);

    expect(found.map((item) => item.symbolId)).toEqual([
      'static:src/app/_components/PostCard.tsx#PostCard',
      'static:src/app/page.tsx#DashboardPage',
    ]);
  });
});
