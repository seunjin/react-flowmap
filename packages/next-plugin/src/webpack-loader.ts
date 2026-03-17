import { relative } from 'node:path';
import { transformFlowmap } from '@react-flowmap/babel-plugin';

interface LoaderOptions {
  root: string;
  contextImport?: string;
  exclude?: RegExp[];
}

// webpack loader — Next.js가 각 JSX/TSX 파일을 처리할 때 호출됩니다
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function rfmWebpackLoader(this: any, source: string): void {
  const callback = this.async();
  const opts: LoaderOptions = this.getOptions() as LoaderOptions;
  const fileId: string = this.resourcePath as string;

  const relPath = relative(opts.root, fileId).replace(/\\/g, '/');

  const result = transformFlowmap(source, fileId, {
    relPath,
    contextImport: opts.contextImport,
    exclude: opts.exclude,
  });

  if (!result) {
    callback(null, source);
    return;
  }

  callback(null, result.code, result.map as Parameters<typeof callback>[2]);
}
