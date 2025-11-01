import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-date-range-picker',
  templateUrl: './date-range-picker.component.html',
  styleUrls: ['./date-range-picker.component.scss']
})
export class DateRangePickerComponent {
  @Input() startDate: Date | null = null;
  @Input() endDate: Date | null = null;
  @Input() minDate: Date | null = null;
  @Input() maxDate: Date | null = null;
  @Output() dateRangeChange = new EventEmitter<{ startDate: Date; endDate: Date }>();

  // 预设时间范围
  presetRanges = [
    { label: '最近3个月', value: 3 },
    { label: '最近6个月', value: 6 },
    { label: '最近1年', value: 12 },
    { label: '最近3年', value: 36 },
    { label: '最近5年', value: 60 },
    { label: '最近10年', value: 120 }
  ];

  selectedPreset: number | null = null;

  constructor() {
    // 设置默认最大日期为今天
    this.maxDate = new Date();
    // 设置默认最小日期为10年前
    const minDate = new Date();
    minDate.setFullYear(minDate.getFullYear() - 10);
    this.minDate = minDate;
  }

  onStartDateChange(date: Date) {
    this.startDate = date;
    this.emitDateRange();
    this.clearPresetSelection();
  }

  onEndDateChange(date: Date) {
    this.endDate = date;
    this.emitDateRange();
    this.clearPresetSelection();
  }

  onPresetSelect(months: number) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    this.startDate = startDate;
    this.endDate = endDate;
    this.selectedPreset = months;

    this.emitDateRange();
  }

  private emitDateRange() {
    if (this.startDate && this.endDate) {
      this.dateRangeChange.emit({
        startDate: this.startDate,
        endDate: this.endDate
      });
    }
  }

  private clearPresetSelection() {
    this.selectedPreset = null;
  }

  getDurationText(): string {
    if (!this.startDate || !this.endDate) {
      return '请选择时间范围';
    }

    const diffTime = Math.abs(this.endDate.getTime() - this.startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffMonths / 12);

    if (diffYears > 0) {
      return `${diffYears}年${diffMonths % 12}个月`;
    } else if (diffMonths > 0) {
      return `${diffMonths}个月`;
    } else {
      return `${diffDays}天`;
    }
  }

  isValidRange(): boolean {
    if (!this.startDate || !this.endDate) {
      return false;
    }

    return this.startDate < this.endDate;
  }
}