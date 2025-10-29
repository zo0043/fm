import { Injectable } from '@angular/core';
import { FundService, Fund } from './fund.service';
import { Observable, of } from 'rxjs';
import { map, delay } from 'rxjs/operators';

// 导入导出相关库（需要在package.json中添加）
// import * as XLSX from 'xlsx';
// import jsPDF from 'jspdf';
// import html2canvas from 'html2canvas';

export interface ExportOptions {
  format: 'excel' | 'pdf' | 'csv';
  includeCharts?: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
  columns?: string[];
  fileName?: string;
}

export interface ExportProgress {
  percentage: number;
  status: 'preparing' | 'processing' | 'completed' | 'error';
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class ExportService {

  constructor(private fundService: FundService) {}

  /**
   * 导出基金数据
   */
  exportFunds(funds: Fund[], options: ExportOptions): Observable<ExportProgress> {
    return new Observable<ExportProgress>(observer => {
      observer.next({ percentage: 0, status: 'preparing', message: '准备导出数据...' });

      setTimeout(() => {
        observer.next({ percentage: 20, status: 'processing', message: '处理数据中...' });

        setTimeout(() => {
          observer.next({ percentage: 60, status: 'processing', message: '生成文件中...' });

          try {
            switch (options.format) {
              case 'excel':
                this.exportToExcel(funds, options);
                break;
              case 'pdf':
                this.exportToPDF(funds, options);
                break;
              case 'csv':
                this.exportToCSV(funds, options);
                break;
            }

            observer.next({ percentage: 100, status: 'completed', message: '导出完成！' });
            observer.complete();
          } catch (error) {
            observer.error({ percentage: 0, status: 'error', message: '导出失败：' + error });
          }
        }, 1000);
      }, 500);
    });
  }

  /**
   * 导出为Excel文件
   */
  private exportToExcel(funds: Fund[], options: ExportOptions): void {
    try {
      // 准备数据
      const exportData = funds.map(fund => {
        const row: any = {
          '基金代码': fund.code,
          '基金名称': fund.name,
          '基金类型': fund.type,
          '基金经理': fund.manager,
          '单位净值': fund.nav,
          '累计净值': fund.totalNav,
          '日涨跌幅(%)': (fund.dailyChange * 100).toFixed(2),
          '日涨跌额': fund.dailyChangeAmount,
          '周涨跌幅(%)': (fund.weeklyChange * 100).toFixed(2),
          '月涨跌幅(%)': (fund.monthlyChange * 100).toFixed(2),
          '年涨跌幅(%)': (fund.yearlyChange * 100).toFixed(2),
          '风险等级': fund.riskLevel,
          '状态': fund.status,
          '最小申购金额': fund.minAmount,
          '成立日期': fund.establishDate,
          '最后更新': fund.lastUpdated
        };

        // 如果指定了列，只导出指定列
        if (options.columns && options.columns.length > 0) {
          const filteredRow: any = {};
          options.columns.forEach(column => {
            if (row[column] !== undefined) {
              filteredRow[column] = row[column];
            }
          });
          return filteredRow;
        }

        return row;
      });

      // 创建工作簿
      const ws_name = "基金数据";
      const wb_name = options.fileName || `基金数据_${this.formatDate(new Date())}.xlsx`;

      // 模拟Excel导出（实际需要xlsx库）
      console.log('导出Excel数据:', exportData);
      console.log('文件名:', wb_name);

      // 实际导出代码（需要安装xlsx库）
      /*
      import * as XLSX from 'xlsx';

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      // 设置列宽
      const colWidths = Object.keys(exportData[0] || {}).map(() => ({ wch: 15 }));
      ws['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, ws_name);
      XLSX.writeFile(wb, wb_name);
      */

      // 模拟下载
      this.downloadFile(exportData, wb_name, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    } catch (error) {
      console.error('Excel导出失败:', error);
      throw error;
    }
  }

  /**
   * 导出为PDF文件
   */
  private exportToPDF(funds: Fund[], options: ExportOptions): void {
    try {
      const fileName = options.fileName || `基金报告_${this.formatDate(new Date())}.pdf`;

      // 模拟PDF生成（实际需要jspdf和html2canvas库）
      console.log('导出PDF数据:', funds);
      console.log('文件名:', fileName);

      // 实际PDF导出代码示例
      /*
      import jsPDF from 'jspdf';
      import html2canvas from 'html2canvas';

      const pdf = new jsPDF();

      // 添加标题
      pdf.setFontSize(18);
      pdf.text('基金数据报告', 105, 20, { align: 'center' });

      // 添加日期
      pdf.setFontSize(12);
      pdf.text(`生成日期: ${this.formatDate(new Date())}`, 105, 30, { align: 'center' });

      // 添加表格数据
      let yPosition = 50;
      pdf.setFontSize(10);

      funds.forEach((fund, index) => {
        if (yPosition > 270) { // 换页
          pdf.addPage();
          yPosition = 20;
        }

        pdf.text(`${index + 1}. ${fund.name} (${fund.code})`, 20, yPosition);
        pdf.text(`净值: ${fund.nav} | 涨跌幅: ${(fund.dailyChange * 100).toFixed(2)}%`, 25, yPosition + 5);
        yPosition += 15;
      });

      pdf.save(fileName);
      */

      // 模拟下载
      this.downloadFile(funds, fileName, 'application/pdf');

    } catch (error) {
      console.error('PDF导出失败:', error);
      throw error;
    }
  }

  /**
   * 导出为CSV文件
   */
  private exportToCSV(funds: Fund[], options: ExportOptions): void {
    try {
      const fileName = options.fileName || `基金数据_${this.formatDate(new Date())}.csv`;

      // 准备CSV数据
      const headers = ['基金代码', '基金名称', '基金类型', '单位净值', '累计净值', '日涨跌幅(%)', '风险等级', '状态'];
      const csvContent = [
        headers.join(','),
        ...funds.map(fund => [
          fund.code,
          fund.name,
          fund.type,
          fund.nav,
          fund.totalNav,
          (fund.dailyChange * 100).toFixed(2),
          fund.riskLevel,
          fund.status
        ].join(','))
      ].join('\n');

      console.log('导出CSV数据:', csvContent);
      console.log('文件名:', fileName);

      // 实际CSV导出
      this.downloadCSVFile(csvContent, fileName);

    } catch (error) {
      console.error('CSV导出失败:', error);
      throw error;
    }
  }

  /**
   * 导出图表为图片
   */
  exportChartAsImage(chartElement: HTMLElement, fileName?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const outputFileName = fileName || `图表_${this.formatDate(new Date())}.png`;

        // 模拟图表导出（实际需要html2canvas库）
        console.log('导出图表:', chartElement);
        console.log('文件名:', outputFileName);

        // 实际图表导出代码
        /*
        import html2canvas from 'html2canvas';

        html2canvas(chartElement).then(canvas => {
          const link = document.createElement('a');
          link.download = outputFileName;
          link.href = canvas.toDataURL();
          link.click();
          resolve();
        }).catch(error => {
          reject(error);
        });
        */

        // 模拟成功
        setTimeout(() => resolve(), 1000);

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 导出完整报告（包含数据和图表）
   */
  exportCompleteReport(funds: Fund[], chartElements: HTMLElement[], options: ExportOptions): Observable<ExportProgress> {
    return new Observable<ExportProgress>(observer => {
      observer.next({ percentage: 0, status: 'preparing', message: '准备完整报告...' });

      setTimeout(() => {
        observer.next({ percentage: 30, status: 'processing', message: '处理基金数据...' });

        setTimeout(() => {
          observer.next({ percentage: 60, status: 'processing', message: '生成图表截图...' });

          setTimeout(() => {
            observer.next({ percentage: 90, status: 'processing', message: '生成PDF报告...' });

            try {
              const fileName = options.fileName || `基金完整报告_${this.formatDate(new Date())}.pdf`;
              console.log('导出完整报告:', { funds, chartElementsCount: chartElements.length });
              console.log('文件名:', fileName);

              // 实际完整报告导出代码
              /*
              import jsPDF from 'jspdf';
              import html2canvas from 'html2canvas';

              const pdf = new jsPDF();

              // 添加封面
              pdf.setFontSize(24);
              pdf.text('基金监控报告', 105, 50, { align: 'center' });

              pdf.setFontSize(14);
              pdf.text(`生成日期: ${this.formatDate(new Date())}`, 105, 70, { align: 'center' });
              pdf.text(`基金数量: ${funds.length}`, 105, 85, { align: 'center' });

              // 添加数据摘要
              pdf.addPage();
              pdf.setFontSize(18);
              pdf.text('数据摘要', 20, 20);

              // 添加图表
              for (let i = 0; i < chartElements.length; i++) {
                if (i > 0) pdf.addPage();

                html2canvas(chartElements[i]).then(canvas => {
                  const imgData = canvas.toDataURL('image/png');
                  pdf.addImage(imgData, 'PNG', 20, 40, 170, 100);
                });
              }

              pdf.save(fileName);
              */

              observer.next({ percentage: 100, status: 'completed', message: '完整报告导出完成！' });
              observer.complete();

            } catch (error) {
              observer.error({ percentage: 0, status: 'error', message: '报告导出失败：' + error });
            }
          }, 2000);
        }, 1500);
      }, 1000);
    });
  }

  /**
   * 模拟文件下载
   */
  private downloadFile(data: any, fileName: string, mimeType: string): void {
    const content = JSON.stringify(data, null, 2);
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = outputFileName;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  /**
   * 下载CSV文件
   */
  private downloadCSVFile(csvContent: string, fileName: string): void {
    const BOM = '\uFEFF'; // 添加BOM以支持中文
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = outputFileName;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  /**
   * 格式化日期
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${year}${month}${day}_${hours}${minutes}`;
  }

  /**
   * 获取导出模板配置
   */
  getExportTemplates(): { name: string; columns: string[]; description: string }[] {
    return [
      {
        name: '基础信息',
        columns: ['基金代码', '基金名称', '基金类型', '基金经理', '成立日期'],
        description: '包含基金的基础信息'
      },
      {
        name: '净值数据',
        columns: ['基金代码', '基金名称', '单位净值', '累计净值', '日涨跌幅(%)', '日涨跌额'],
        description: '包含基金净值和涨跌数据'
      },
      {
        name: '收益率分析',
        columns: ['基金代码', '基金名称', '周涨跌幅(%)', '月涨跌幅(%)', '年涨跌幅(%)'],
        description: '包含各时间段的收益率数据'
      },
      {
        name: '风险评估',
        columns: ['基金代码', '基金名称', '风险等级', '状态', '最小申购金额'],
        description: '包含风险相关信息'
      },
      {
        name: '完整信息',
        columns: [], // 空数组表示所有列
        description: '包含所有可用信息'
      }
    ];
  }
}