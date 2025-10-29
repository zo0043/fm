import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'currencyFormat'
})
export class CurrencyPipe implements PipeTransform {

  transform(value: number, currency: string = '¥'): string {
    if (value === null || value === undefined) {
      return '';
    }

    return `${currency}${value.toLocaleString('zh-CN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }

}