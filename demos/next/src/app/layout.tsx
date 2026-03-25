import type { Metadata } from 'next';
import { FlowmapProvider } from '@/components/FlowmapProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'react-flowmap — Next.js demo',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <FlowmapProvider />
      </body>
    </html>
  );
}
