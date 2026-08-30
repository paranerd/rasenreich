import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Garden Grinder',
  description: 'Baue deinen eigenen Rasenpflegebetrieb auf.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
