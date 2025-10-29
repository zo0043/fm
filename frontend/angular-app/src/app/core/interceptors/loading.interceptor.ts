import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpResponse
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { finalize, tap } from 'rxjs/operators';
import { LoadingService } from '../services/loading.service';

@Injectable()
export class LoadingInterceptor implements HttpInterceptor {
  private activeRequests = 0;

  constructor(private loadingService: LoadingService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // 跳过某些不需要显示加载状态的请求
    if (this.shouldSkipLoading(req)) {
      return next.handle(req);
    }

    this.activeRequests++;
    this.loadingService.show();

    return next.handle(req).pipe(
      finalize(() => {
        this.activeRequests--;
        if (this.activeRequests === 0) {
          this.loadingService.hide();
        }
      }),
      tap({
        error: () => {
          this.activeRequests--;
          if (this.activeRequests === 0) {
            this.loadingService.hide();
          }
        }
      })
    );
  }

  private shouldSkipLoading(req: HttpRequest<any>): boolean {
    const skipUrls = [
      '/health',
      '/status',
      '/auth/refresh',
      '/assets/'
    ];

    return skipUrls.some(url => req.url.includes(url));
  }
}