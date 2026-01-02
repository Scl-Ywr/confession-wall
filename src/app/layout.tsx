import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/theme/ThemeContext";
import { LikeProvider } from "@/context/LikeContext";
import { ChatProvider } from "@/context/ChatContext";
import { Providers } from "./providers";
import { VideoPlayerProvider } from "@/context/VideoPlayerContext";
import { BackgroundProvider } from "@/context/BackgroundContext";

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
      <head>
        {/* Resource hint for better performance */}
        <link rel="preconnect" href="https://challenges.cloudflare.com" />
        <link rel="dns-prefetch" href="https://challenges.cloudflare.com" />
        {/* Turnstile 脚本由组件动态加载，避免阻塞页面渲染 */}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <AuthProvider>
            <BackgroundProvider>
              <ChatProvider>
                <Providers>
                  <LikeProvider>
                    <VideoPlayerProvider>
                      {children}
                    </VideoPlayerProvider>
                  </LikeProvider>
                </Providers>
              </ChatProvider>
            </BackgroundProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
