import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';

import { BacktestService } from './services/backtest.service';
import { FundService } from '../../core/services/fund.service';
import {
  BacktestConfig,
  BacktestResult,
  BacktestStrategy,
  FundAllocation,
  BacktestRequest,
  PREDEFINED_STRATEGIES,
  INVESTMENT_AMOUNTS,
  INVESTMENT_PERIODS
} from './models/backtest.model';
import { FundInfo } from '../../models/fund.model';

@Component({
  selector: 'app-backtest',
  templateUrl: './backtest.component.html',
  styleUrls: ['./backtest.component.scss']
})
export class BacktestComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // 表单和配置
  backtestForm: FormGroup;
  availableStrategies: BacktestStrategy[] = PREDEFINED_STRATEGIES;
  availableFunds: FundInfo[] = [];
  selectedFunds: FundAllocation[] = [];

  // 预设选项
  investmentAmounts = INVESTMENT_AMOUNTS;
  investmentPeriods = INVESTMENT_PERIODS;

  // 状态管理
  isLoading = false;
  isRunningBacktest = false;
  backtestResult: BacktestResult | null = null;
  selectedStrategy: BacktestStrategy | null = null;

  // 错误处理
  errorMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private backtestService: BacktestService,
    private fundService: FundService
  ) {
    this.initForm();
  }

  ngOnInit() {
    this.loadAvailableFunds();
    this.loadStrategies();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initForm() {
    this.backtestForm = this.fb.group({
      // 策略选择
      strategy: ['', Validators.required],

      // 基金选择
      funds: this.fb.array([], Validators.minLength(1)),

      // 时间范围
      dateRange: this.fb.group({
        startDate: [null, Validators.required],
        endDate: [null, Validators.required]
      }),

      // 投资配置
      investment: this.fb.group({
        amount: [1000, [Validators.required, Validators.min(100)]],
        frequency: ['monthly', Validators.required],
        dayOfMonth: [1, [Validators.min(1), Validators.max(28)]]
      }),

      // 高级选项
      benchmark: ['']
    });

    // 监听投资频率变化
    this.backtestForm.get('investment.frequency')?.valueChanges.subscribe(frequency => {
      const dayOfMonthControl = this.backtestForm.get('investment.dayOfMonth');
      if (frequency === 'monthly') {
        dayOfMonthControl?.setValidators([Validators.min(1), Validators.max(28)]);
      } else {
        dayOfMonthControl?.clearValidators();
      }
      dayOfMonthControl?.updateValueAndValidity();
    });
  }

  private loadAvailableFunds() {
    // 这里应该加载用户关注的基金列表
    // 暂时使用模拟数据
    this.mockAvailableFunds();
  }

  private mockAvailableFunds() {
    // 模拟基金数据
    this.availableFunds = [
      {
        id: 'fund_0001',
        code: '110022',
        name: '易方达消费行业',
        type: 'stock',
        currentNav: 2.3456,
        yesterdayNav: 2.3123,
        weekNav: 2.2890,
        monthNav: 2.1987,
        yearNav: 2.0123,
        lastUpdate: new Date()
      },
      {
        id: 'fund_0002',
        code: '161725',
        name: '招商中证白酒',
        type: 'index',
        currentNav: 1.7890,
        yesterdayNav: 1.7654,
        weekNav: 1.7432,
        monthNav: 1.6987,
        yearNav: 1.5432,
        lastUpdate: new Date()
      },
      {
        id: 'fund_0003',
        code: '000001',
        name: '华夏成长',
        type: 'hybrid',
        currentNav: 3.4567,
        yesterdayNav: 3.4321,
        weekNav: 3.3987,
        monthNav: 3.2345,
        yearNav: 2.9876,
        lastUpdate: new Date()
      }
    ];
  }

  private loadStrategies() {
    this.backtestService.getStrategies()
      .pipe(takeUntil(this.destroy$))
      .subscribe(strategies => {
        this.availableStrategies = strategies;
        // 默认选择第一个策略
        if (strategies.length > 0) {
          this.backtestForm.patchValue({ strategy: strategies[0].id });
          this.selectedStrategy = strategies[0];
        }
      });
  }

  onStrategyChange(strategy: BacktestStrategy) {
    this.selectedStrategy = strategy;
    this.backtestForm.patchValue({ strategy: strategy.id });
  }

  onDateRangeChange(dateRange: { startDate: Date; endDate: Date }) {
    this.backtestForm.patchValue({
      dateRange: {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      }
    });
  }

  onFundsChange(funds: FundAllocation[]) {
    this.selectedFunds = funds;
    this.backtestForm.patchValue({ funds });
  }

  runBacktest() {
    if (this.backtestForm.invalid || this.selectedFunds.length === 0) {
      this.markFormGroupTouched(this.backtestForm);
      this.errorMessage = '请完善回测配置信息';
      return;
    }

    this.isRunningBacktest = true;
    this.errorMessage = null;
    this.backtestResult = null;

    const config: BacktestConfig = {
      strategy: this.selectedStrategy!,
      funds: this.selectedFunds,
      dateRange: {
        startDate: this.backtestForm.value.dateRange.startDate,
        endDate: this.backtestForm.value.dateRange.endDate
      },
      investment: this.backtestForm.value.investment,
      benchmark: this.backtestForm.value.benchmark || undefined
    };

    const request: BacktestRequest = {
      config,
      includeBenchmark: !!config.benchmark
    };

    this.backtestService.runBacktest(request)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isRunningBacktest = false)
      )
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.backtestResult = response.data;
          } else {
            this.errorMessage = response.error || '回测执行失败';
          }
        },
        error: (error) => {
          console.error('回测执行错误:', error);
          this.errorMessage = '回测执行过程中发生错误';
        }
      });
  }

  resetForm() {
    this.backtestForm.reset();
    this.selectedFunds = [];
    this.backtestResult = null;
    this.selectedStrategy = null;
    this.errorMessage = null;
  }

  exportReport() {
    if (!this.backtestResult) return;

    const config: BacktestConfig = {
      strategy: this.selectedStrategy!,
      funds: this.selectedFunds,
      dateRange: {
        startDate: this.backtestForm.value.dateRange.startDate,
        endDate: this.backtestForm.value.dateRange.endDate
      },
      investment: this.backtestForm.value.investment,
      benchmark: this.backtestForm.value.benchmark || undefined
    };

    this.backtestService.exportBacktestReport(this.backtestResult, config)
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `回测报告_${new Date().toISOString().split('T')[0]}.csv`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        },
        error: (error) => {
          console.error('导出报告失败:', error);
          this.errorMessage = '导出报告失败';
        }
      });
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  // 辅助方法
  get isValidForm(): boolean {
    return this.backtestForm.valid && this.selectedFunds.length > 0;
  }

  get hasResults(): boolean {
    return this.backtestResult !== null;
  }
}