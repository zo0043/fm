import { Component, Input, Output, EventEmitter } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CommonModule } from '@angular/common';

export interface QuickExportOption {
  label: string;
  format: 'pdf' | 'excel';
  icon: string;
  tooltip?: string;
  color?: string;
}

@Component({
  selector: 'app-simple-export-button',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatTooltipModule],
  template: `
    <div class="export-actions">
      <button
        *ngFor="let option of options"
        mat-icon-button
        [color]="option.color || 'default'"
        (click)="onExportClick(option)"
        [matTooltip]="option.tooltip || option.label">
        <mat-icon>{{ option.icon }}</mat-icon>
      </button>
    </div>
  `,
  styles: [`
    .export-actions {
      display: flex;
      gap: 8px;
      align-items: center;
    }
  `]
})
export class SimpleExportButtonComponent {
  @Input() options: QuickExportOption[] = [];
  @Input() showQuickActions = false;
  @Output() exportClick = new EventEmitter<QuickExportOption>();

  onExportClick(option: QuickExportOption): void {
    this.exportClick.emit(option);
  }
}