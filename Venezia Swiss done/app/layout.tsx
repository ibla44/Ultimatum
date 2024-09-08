import "./globals.css";
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { DeepgramContextProvider } from '../lib/contexts/DeepgramContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'App Note Vocali',
  description: 'Un\'app per prendere note vocali in italiano',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body className={inter.className}>
        <DeepgramContextProvider>
          {children}
        </DeepgramContextProvider>
      </body>
    </html>
  );
}
