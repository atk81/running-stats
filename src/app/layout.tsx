import type { Metadata } from "next";
import {
  Bebas_Neue,
  Archivo_Narrow,
  Space_Grotesk,
  Inter,
  JetBrains_Mono,
  Anton,
  Caveat,
  Permanent_Marker,
} from "next/font/google";
import "./globals.css";

const bebas = Bebas_Neue({
  variable: "--ff-bebas",
  subsets: ["latin"],
  weight: ["400"],
});

const archivo = Archivo_Narrow({
  variable: "--ff-archivo",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const space = Space_Grotesk({
  variable: "--ff-space",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--ff-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetMono = JetBrains_Mono({
  variable: "--ff-jetmono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const anton = Anton({
  variable: "--ff-anton",
  subsets: ["latin"],
  weight: ["400"],
});

const caveat = Caveat({
  variable: "--ff-caveat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const marker = Permanent_Marker({
  variable: "--ff-marker",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "runStats — Make every run unforgettable",
  description:
    "Generate share-ready milestone images from your Strava runs. PRs, streaks, goals, weekly recaps.",
};

const fontVars = [
  bebas.variable,
  archivo.variable,
  space.variable,
  inter.variable,
  jetMono.variable,
  anton.variable,
  caveat.variable,
  marker.variable,
].join(" ");

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${fontVars} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
