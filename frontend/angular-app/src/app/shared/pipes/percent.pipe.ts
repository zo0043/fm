import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'percentFormat'
})
export class PercentPipe implements PipeTransform {

  transform(value: number, decimals: number = 2): string {
    if (value === null || value === undefined) {
      return '';
    }

    const formattedValue = (value * 100).toFixed(decimals);
    const numValue = parseFloat(formattedValue);

    return `${numValue > 0 ? '+' : ''}${numValue}%`;
  }

}