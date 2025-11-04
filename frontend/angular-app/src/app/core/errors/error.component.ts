import { Component, Input, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatCard } from '@angular/material/card';
import { MatCardContent } from '@angular/material/card';
import { MatIcon } from '@angular/icon';
import { ErrorInfo } from './error.model';

@Component({
  selector: 'app-error',
  template: './error.component.html',
  styleUrls: ['./error.component.scss']
})
export class ErrorComponent implements OnInit {
  @Input() show: boolean = false;
  @Input() error: ErrorInfo | null = null;
  @Input() loading: boolean = false;

  constructor(
    private errorHandler: ErrorService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    // 可以在这里订阅全局错误事件
    this.errorHandler.errorOccurred.subscribe(error => {
      this.showError(error);
    });
  }

  private showError(error: ErrorInfo): void {
    const message = error.message || '发生未知错误';
    const level = error.level || 'error';

    let snackBarRef: string;
    let snackBarClass = '';

    switch (level) {
      case 'critical':
        snackBarRef = 'error-snackbar';
        snackBarClass = 'mat-bg-warm';
        break;
      case 'error':
        snackBarRef = 'error-snackbar';
        snackBarClass = 'mat-bg-warm';
        break;
      case 'warning':
        snackBarRef = 'warning-snackbar';
        snackBarClass = 'mat-bg-yellow-700';
        break;
      default:
        snackBarRef = 'info-snackbar';
        snackBarClass = 'mat-bg-blue-600';
    }

    this.snackBar.open(
      snackBarRef,
      `${level === 'critical' ? 'error' : level === 'warning' ? 'warning' : 'info'}: 'info'}`,
      `${message}`,
      { duration: level === 'critical' ? 8000 : 4000 }
    );
  }

  private closeError(): void {
    this.error = null;
  }

  showSuccess(title: string, message: string): void {
    const snackBarRef = 'success-snackbar';
    this.snackBar.open(
      snackBarRef,
      `${message}`,
      { duration: 3000 }
    );
  }

  showError(title: string, message: string): void {
    const snackBarRef = 'error-snackbar';
    this.snackBar.open(
      snackBarRef,
      `${message}`,
      { duration: 6000 }
    );
  }
}

  getErrorClass(error: string): string {
    switch (error) {
      case 'critical':
        return 'mat-bg-warm';
      case 'error':
        return 'mat-bg-warm';
      case 'warning':
        return 'mat-bg-yellow-700';
      default:
        return 'mat-bg-blue-600';
    }
  }

  getErrorIcon(error: string): string {
    switch (error) {
      case 'critical':
        return 'error';
      case 'error':
        return 'warning';
      case 'warning':
        return 'warning';
      default:
        return 'info';
    }
  }
}