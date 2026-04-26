import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { getOwnerVisualRect } from '../../src/ui/inspector/ComponentOverlay';

function setRect(el: HTMLElement, rect: DOMRect): void {
  Object.defineProperty(el, 'getBoundingClientRect', {
    configurable: true,
    value: () => rect,
  });
}

function rectSnapshot(rect: DOMRect | null) {
  if (!rect) return null;
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  };
}

describe('getOwnerVisualRect', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1920,
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 1080,
    });
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('uses the owner marker rect by default even when a fixed child exists', () => {
    const owner = document.createElement('header');
    const fixedBar = document.createElement('div');
    fixedBar.style.position = 'fixed';
    owner.appendChild(fixedBar);
    document.body.appendChild(owner);

    setRect(owner, new DOMRect(17, 2, 1886, 56));
    setRect(fixedBar, new DOMRect(0, 0, 1920, 56));

    expect(rectSnapshot(getOwnerVisualRect(owner))).toEqual({
      left: 17,
      top: 2,
      width: 1886,
      height: 56,
    });
  });

  it('does not expand a visible owner marker to out-of-flow descendants by default', () => {
    const owner = document.createElement('section');
    const popover = document.createElement('div');
    owner.style.backgroundColor = '#ffffff';
    popover.style.position = 'absolute';
    owner.appendChild(popover);
    document.body.appendChild(owner);

    setRect(owner, new DOMRect(100, 100, 200, 100));
    setRect(popover, new DOMRect(250, 180, 80, 80));

    expect(rectSnapshot(getOwnerVisualRect(owner))).toEqual({
      left: 100,
      top: 100,
      width: 200,
      height: 100,
    });
  });

  it('uses data-rfm-owner-anchor as an explicit visual target', () => {
    const owner = document.createElement('header');
    const anchor = document.createElement('div');
    anchor.dataset.rfmOwnerAnchor = '';
    owner.appendChild(anchor);
    document.body.appendChild(owner);

    setRect(owner, new DOMRect(10, 10, 400, 300));
    setRect(anchor, new DOMRect(30, 40, 150, 80));

    expect(rectSnapshot(getOwnerVisualRect(owner))).toEqual({
      left: 30,
      top: 40,
      width: 150,
      height: 80,
    });
  });

  it('uses data-rfm-owner-anchor to target a fixed visual child explicitly', () => {
    const owner = document.createElement('header');
    const fixedBar = document.createElement('div');
    fixedBar.dataset.rfmOwnerAnchor = '';
    fixedBar.style.position = 'fixed';
    owner.appendChild(fixedBar);
    document.body.appendChild(owner);

    setRect(owner, new DOMRect(17, 2, 1886, 56));
    setRect(fixedBar, new DOMRect(0, 0, 1920, 56));

    expect(rectSnapshot(getOwnerVisualRect(owner))).toEqual({
      left: 0,
      top: 0,
      width: 1920,
      height: 56,
    });
  });

  it('excludes data-rfm-owner-ignore subtrees from fallback rects', () => {
    const owner = document.createElement('header');
    const child = document.createElement('div');
    const ignoredPopover = document.createElement('div');
    owner.style.display = 'contents';
    ignoredPopover.dataset.rfmOwnerIgnore = '';
    ignoredPopover.style.position = 'fixed';
    owner.append(child, ignoredPopover);
    document.body.appendChild(owner);

    setRect(owner, new DOMRect(0, 0, 0, 0));
    setRect(child, new DOMRect(10, 10, 200, 40));
    setRect(ignoredPopover, new DOMRect(0, 0, 1920, 700));

    expect(rectSnapshot(getOwnerVisualRect(owner))).toEqual({
      left: 10,
      top: 10,
      width: 200,
      height: 40,
    });
  });

  it('falls back to visible descendants for display contents owners', () => {
    const owner = document.createElement('section');
    const child = document.createElement('div');
    owner.style.display = 'contents';
    owner.appendChild(child);
    document.body.appendChild(owner);

    setRect(owner, new DOMRect(0, 0, 0, 0));
    setRect(child, new DOMRect(20, 30, 100, 40));

    expect(rectSnapshot(getOwnerVisualRect(owner))).toEqual({
      left: 20,
      top: 30,
      width: 100,
      height: 40,
    });
  });
});
