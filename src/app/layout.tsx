import type { Metadata } from "next";
import {
  Bebas_Neue,
  Archivo_Narrow,
  Inter,
  JetBrains_Mono,
  Anton,
  Caveat,
  Permanent_Marker,
} from "next/font/google";
import { Providers } from "@/lib/contexts/Providers";
import "./globals.css";

const bebas = Bebas_Neue({
  variable: "--ff-bebas",
  subsets: ["latin"],
  weight: ["400"],
});

const archivo = Archivo_Narrow({
  variable: "--ff-archivo",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const inter = Inter({
  variable: "--ff-inter",
  subsets: ["latin"],
  weight: ["400", "600"],
});

const jetMono = JetBrains_Mono({
  variable: "--ff-jetmono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const anton = Anton({
  variable: "--ff-anton",
  subsets: ["latin"],
  weight: ["400"],
});

const caveat = Caveat({
  variable: "--ff-caveat",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const marker = Permanent_Marker({
  variable: "--ff-marker",
  subsets: ["latin"],
  weight: ["400"],
});

const fonts = [bebas, archivo, inter, jetMono, anton, caveat, marker];
const fontVars = fonts.map((f) => f.variable).join(" ");

export const metadata: Metadata = {
  title: "runStats — Make every run unforgettable",
  description:
    "Generate share-ready milestone images from your Strava runs. PRs, streaks, goals, weekly recaps.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${fontVars} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
