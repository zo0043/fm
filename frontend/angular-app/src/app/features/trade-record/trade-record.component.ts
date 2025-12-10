import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { TradeRecordService } from './services/trade-record.service';
import { TradeRecord, TradeQuery, TradeResponse } from './models/trade-record.model';
import { TradeRecordDialogComponent } from './components/trade-record-dialog/trade-record-dialog.component';

@Component({
  selector: 'app-trade-record',
  templateUrl: './trade-record.component.html',
  styleUrls: ['./trade-record.component.scss']
})
export class TradeRecordComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // 交易记录数据
  trades: TradeRecord[] = [];
  loading = false;
  error: string | null = null;
  total = 0;
  page = 1;
  pageSize = 20;

  // 筛选条件
  filter: TradeQuery = {};

  constructor(
    private tradeService: TradeRecordService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.loadTrades();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // 加载交易记录
  loadTrades(page: number = 1) {
    this.loading = true;
    this.error = null;
    this.page = page;

    const query = { ...this.filter, page, pageSize: this.pageSize };

    this.tradeService.getTradeRecords(query)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loading = false)
      )
      .subscribe({
        next: (response: TradeResponse) => {
          if (response.success) {
            this.trades = response.data;
            this.total = response.pagination.total;
          } else {
            this.error = response.error || '加载交易记录失败';
            this.snackBar.open(this.error, '关闭', { duration: 3000 });
          }
        },
        error: (err) => {
          console.error('加载交易记录失败:', err);
          this.error = '加载交易记录失败，请稍后重试';
          this.snackBar.open(this.error, '关闭', { duration: 3000 });
        }
      });
  }

  // 添加交易记录
  addTrade() {
    const dialogRef = this.dialog.open(TradeRecordDialogComponent, {
      width: '600px',
      disableClose: true,
      data: { mode: 'create' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadTrades();
        this.snackBar.open('交易记录添加成功', '关闭', { duration: 2000 });
      }
    });
  }

  // 编辑交易记录
  editTrade(trade: TradeRecord) {
    const dialogRef = this.dialog.open(TradeRecordDialogComponent, {
      width: '600px',
      disableClose: true,
      data: { mode: 'edit', trade }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadTrades();
        this.snackBar.open('交易记录更新成功', '关闭', { duration: 2000 });
      }
    });
  }

  // 删除交易记录
  deleteTrade(trade: TradeRecord) {
    if (confirm(`确定要删除交易记录 ${trade.fundName} (${trade.fundCode}) 的记录吗？`)) {
      this.tradeService.deleteTradeRecord(trade.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.loadTrades();
              this.snackBar.open('交易记录删除成功', '关闭', { duration: 2000 });
            } else {
              this.snackBar.open(response.error || '删除失败', '关闭', { duration: 3000 });
            }
          },
          error: (err) => {
            console.error('删除交易记录失败:', err);
            this.snackBar.open('删除交易记录失败，请稍后重试', '关闭', { duration: 3000 });
          }
        });
    }
  }

  // 搜索交易记录
  searchTrades() {
    this.loadTrades(1);
  }

  // 重置筛选条件
  resetFilter() {
    this.filter = {};
    this.loadTrades(1);
  }

  // 处理分页变化
  onPageChange(page: number) {
    this.loadTrades(page);
  }

  // 格式化货币显示
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY'
    }).format(amount);
  }

  // 格式化日期显示
  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('zh-CN');
  }
}