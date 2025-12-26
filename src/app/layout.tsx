import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/theme/ThemeContext";
import { LikeProvider } from "@/context/LikeContext";
import { ChatProvider } from "@/context/ChatContext";
import { Providers } from "./providers";
import { VideoPlayerProvider } from "@/context/VideoPlayerContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "表白墙",
  description: "一个功能完整的表白墙应用",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <AuthProvider>
            <ChatProvider>
              <Providers>
                <LikeProvider>
                  <VideoPlayerProvider>
                    {children}
                  </VideoPlayerProvider>
                </LikeProvider>
              </Providers>
            </ChatProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
