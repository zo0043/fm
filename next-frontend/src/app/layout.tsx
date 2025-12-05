import type { Metadata } from "next";
import "./globals.css";
import ThemeWrapper from './_components/ThemeWrapper';
import LayoutContent from './_components/LayoutContent';

export const metadata: Metadata = {
  title: "基金监控系统",
  description: "现代化的基金监控与分析系统",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className="antialiased"
        style={{ margin: 0, padding: 0 }}
      >
        <ThemeWrapper>
          <LayoutContent>
            {children}
          </LayoutContent>
        </ThemeWrapper>
      </body>
    </html>
  );
}
