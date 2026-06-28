import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Morphoint — 시간을 엮는 도구",
  description:
    "사진 여러 장을 올리면 눈·코·입(또는 공통 지점)을 자동으로 맞춰 자연스럽게 변화하는 영상으로 만들어 드립니다. 아기의 성장, 같은 장소의 변화, 자라는 식물까지.",
  applicationName: "Morphoint",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Morphoint",
  },
  openGraph: {
    title: "Morphoint — 시간을 엮는 도구",
    description: "변화하는 사진을 자연스러운 영상으로.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className={`${geistSans.variable} h-full`}>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
