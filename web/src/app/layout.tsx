// Pass-through root layout — the real <html>/<body> + providers live in
// src/app/[locale]/layout.tsx (next-intl [locale] segment convention).
// Next 16 still requires an app/ root layout to exist; this one only forwards
// children so it doesn't double-wrap <html>.
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
