import type { Metadata } from "next";
import { Architects_Daughter } from "next/font/google";
import { WalletProvider } from "@/context/WalletContext";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

const geist = Architects_Daughter({subsets:['latin'],variable:'--font-sans', weight: '400'});

export const metadata: Metadata = {
  title: "Stacks Storage — Encrypted File Marketplace",
  description:
    "Upload, encrypt, and sell access to files on IPFS. Powered by Stacks blockchain and x402 payments.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body
        className={`min-h-screen flex flex-col antialiased ${geist.className}`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <WalletProvider>
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
          </WalletProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
