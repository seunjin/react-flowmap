'use client';

import { useEffect } from 'react';
import { GraphWindow } from 'react-flowmap/graph-window';

export default function RfmGraphPage() {
  useEffect(() => {
    document.title = 'React Flowmap — Graph';
  }, []);

  return <GraphWindow />;
}
