import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';

import { AppModule } from './app/app.module';

platformBrowserDynamic()
  .bootstrapModule(AppModule)
  .catch(err => console.error(err));