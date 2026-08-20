import type {Metadata} from 'next';
import { Outfit, Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css'; // Global styles

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'EcoArbor Studio - Precision Ecological Modeler',
  description: 'A scientifically accurate arboricultural estimator utilizing peer-reviewed allometric and ecohydrological models.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`${outfit.variable} ${plusJakarta.variable} ${jetbrainsMono.variable}`}>
      <body suppressHydrationWarning className="bg-slate-950 font-sans antialiased selection:bg-emerald-500/30 selection:text-emerald-200">{children}</body>
    </html>
  );
}

