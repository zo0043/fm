import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();

  private loadingMessageSubject = new BehaviorSubject<string>('加载中...');
  public loadingMessage$ = this.loadingMessageSubject.asObservable();

  show(message: string = '加载中...'): void {
    this.loadingMessageSubject.next(message);
    this.loadingSubject.next(true);
  }

  hide(): void {
    this.loadingSubject.next(false);
  }

  get isLoading(): boolean {
    return this.loadingSubject.value;
  }

  get currentMessage(): string {
    return this.loadingMessageSubject.value;
  }
}