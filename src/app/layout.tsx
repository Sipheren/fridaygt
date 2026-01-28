import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/header";
import { auth } from "@/lib/auth";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthSessionProvider } from "@/components/session-provider";
import packageJson from "../../package.json";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FridayGT - Racing Lap Times & Run Lists",
  description: "Track your Gran Turismo 7 lap times and manage Friday night run lists",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthSessionProvider>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
            <Header user={session?.user} version={packageJson.version} />
            <main className="container mx-auto px-4 py-6">
              {children}
            </main>
            <footer className="py-6 text-sm">
              <div className="grid grid-cols-2 items-center gap-8">
                <div className="text-left">
                  <span className="text-secondary">sipheren.com</span>
                </div>
                <div className="text-right">
                  <span className="text-muted-foreground">{new Date().getFullYear()}</span>
                </div>
              </div>
            </footer>
          </ThemeProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
