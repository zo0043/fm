import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TradeRecordComponent } from './trade-record.component';

const routes: Routes = [
  {
    path: '',
    component: TradeRecordComponent,
    data: {
      title: '交易记录',
      breadcrumb: '交易记录管理'
    }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TradeRecordRoutingModule { }