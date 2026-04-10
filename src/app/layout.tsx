import type { Metadata } from "next";
import "./globals.css";
import { TerminalLayout } from "@/components/terminal/TerminalLayout";

export const metadata: Metadata = {
  title: "ARGOS TERMINAL // EU Legislative Intelligence",
  description: "Eliminating information asymmetry between lobbyists and citizens.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full">
        <TerminalLayout>{children}</TerminalLayout>
      </body>
    </html>
  );
}
