import type { Metadata } from "next";
import { Lora, Anton } from "next/font/google";
import "./globals.css";

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  display: "swap",
});

const anton = Anton({
  variable: "--font-anton",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Day Day Ceramics",
  description: "Handmade ceramics, thrown one at a time.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${lora.variable} ${anton.variable} h-full`}>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
