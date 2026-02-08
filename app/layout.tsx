import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GitHire — GitHub Profile to Hiring Insights",
  description:
    "Analyze any developer's GitHub profile and produce a comprehensive, hiring-grade evaluation with scores, strengths, weaknesses, and a final recommendation.",
};

/** Set theme before paint to avoid flash (runs inlined before React). */
const themeScript = `
(function(){
  var t = typeof localStorage !== 'undefined' ? localStorage.getItem('githire-theme') : null;
  document.documentElement.setAttribute('data-theme', t === 'light' || t === 'dark' ? t : 'dark');
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased noise`}
      >
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
