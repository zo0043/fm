'use client';

import React from 'react';

// 结构化数据组件，用于SEO优化
export default function StructuredData() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: '基金监控系统',
    url: 'https://fund-monitor.example.com',
    description: '现代化的基金监控与分析系统，实时监控基金市场动态，把握投资机会',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://fund-monitor.example.com/search?q={search_term_string}',
      'query-input': 'required name=search_term_string'
    }
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}