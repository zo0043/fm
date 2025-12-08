import type { Metadata } from "next";
import "./globals.css";
import ThemeWrapper from './_components/ThemeWrapper';
import LayoutContent from './_components/LayoutContent';
import QueryProvider from './_components/QueryProvider';
import StructuredData from './_components/StructuredData';

export const metadata: Metadata = {
  title: "基金监控系统",
  description: "现代化的基金监控与分析系统",
  keywords: ["基金监控", "基金分析", "基金净值", "基金走势"],
  authors: [{ name: "基金监控系统团队" }],
  creator: "基金监控系统团队",
  publisher: "基金监控系统团队",
  openGraph: {
    title: "基金监控系统",
    description: "现代化的基金监控与分析系统，实时监控基金市场动态，把握投资机会",
    type: "website",
    url: "https://fund-monitor.example.com",
    siteName: "基金监控系统",
  },
  twitter: {
    card: "summary_large_image",
    title: "基金监控系统",
    description: "现代化的基金监控与分析系统，实时监控基金市场动态，把握投资机会",
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
        {/* 结构化数据 */}
        <StructuredData />
      </head>
      <body
        className="antialiased"
        style={{ margin: 0, padding: 0 }}
      >
        <ThemeWrapper>
          <QueryProvider>
            <LayoutContent>
              {children}
            </LayoutContent>
          </QueryProvider>
        </ThemeWrapper>
      </body>
    </html>
  );
}
