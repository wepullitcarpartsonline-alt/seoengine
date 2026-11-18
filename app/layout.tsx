import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Part SEO Engine — Used OEM Auto Parts from Verified Salvage Yards',
  description:
    'Search live used OEM auto parts inventory across all connected salvage yards. Compare prices, verify fitment, and Buy It Now on eBay.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-100 text-gray-900 antialiased">
        {children}
        <footer className="border-t border-gray-200 bg-white py-6">
          <div className="mx-auto max-w-7xl px-4 text-center text-xs text-gray-400">
            Part SEO Engine — used OEM auto parts from verified salvage yards. Purchases are
            completed on eBay with the seller.
          </div>
        </footer>
      </body>
    </html>
  );
}
