import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { ApiConfigService } from './api-config.service';
import { STORAGE_KEYS } from '../../shared/constants/app.constants';

/**
 * 关注列表服务
 * 管理用户的基金关注列表，支持本地持久化和 API 同步
 *
 * 使用方法：
 * constructor(private watchlistService: WatchlistService) {}
 * this.watchlistService.watchlist$.subscribe(list => ...);
 */

export interface WatchlistItem {
  fundId: string;
  fundCode: string;
  fundName: string;
  addedAt: Date;
  notes?: string;
}

@Injectable({
  providedIn: 'root'
})
export class WatchlistService {
  private watchlistSubject = new BehaviorSubject<WatchlistItem[]>([]);
  public watchlist$ = this.watchlistSubject.asObservable();

  // 加载状态
  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();

  constructor(
    private http: HttpClient,
    private apiConfig: ApiConfigService
  ) {
    this.loadFromStorage();
  }

  /**
   * 获取当前关注列表
   */
  get watchlist(): WatchlistItem[] {
    return this.watchlistSubject.value;
  }

  /**
   * 获取关注的基金 ID 列表
   */
  get watchedFundIds(): string[] {
    return this.watchlist.map(item => item.fundId);
  }

  /**
   * 检查基金是否在关注列表中
   */
  isWatched(fundId: string): boolean {
    return this.watchlist.some(item => item.fundId === fundId);
  }

  /**
   * 添加到关注列表
   */
  add(fund: { id: string; code: string; name: string }, notes?: string): Observable<boolean> {
    if (this.isWatched(fund.id)) {
      return of(true); // 已存在
    }

    const newItem: WatchlistItem = {
      fundId: fund.id,
      fundCode: fund.code,
      fundName: fund.name,
      addedAt: new Date(),
      notes,
    };

    // 本地更新
    const updatedList = [...this.watchlist, newItem];
    this.updateWatchlist(updatedList);

    // 同步到服务器
    return this.syncToServer('add', fund.id).pipe(
      map(() => true),
      catchError(error => {
        console.error('同步关注列表失败:', error);
        return of(true); // 本地已添加，返回成功
      })
    );
  }

  /**
   * 从关注列表移除
   */
  remove(fundId: string): Observable<boolean> {
    if (!this.isWatched(fundId)) {
      return of(true); // 不存在
    }

    // 本地更新
    const updatedList = this.watchlist.filter(item => item.fundId !== fundId);
    this.updateWatchlist(updatedList);

    // 同步到服务器
    return this.syncToServer('remove', fundId).pipe(
      map(() => true),
      catchError(error => {
        console.error('同步关注列表失败:', error);
        return of(true); // 本地已移除，返回成功
      })
    );
  }

  /**
   * 切换关注状态
   */
  toggle(fund: { id: string; code: string; name: string }): Observable<boolean> {
    if (this.isWatched(fund.id)) {
      return this.remove(fund.id);
    } else {
      return this.add(fund);
    }
  }

  /**
   * 更新备注
   */
  updateNotes(fundId: string, notes: string): void {
    const updatedList = this.watchlist.map(item => {
      if (item.fundId === fundId) {
        return { ...item, notes };
      }
      return item;
    });
    this.updateWatchlist(updatedList);
  }

  /**
   * 从服务器加载关注列表
   */
  loadFromServer(): Observable<WatchlistItem[]> {
    this.loadingSubject.next(true);

    return this.http.get<WatchlistItem[]>(`${this.apiConfig.fundsUrl}/watchlist`).pipe(
      tap(list => {
        this.updateWatchlist(list);
        this.loadingSubject.next(false);
      }),
      catchError(error => {
        console.error('从服务器加载关注列表失败:', error);
        this.loadingSubject.next(false);
        // 返回本地缓存的数据
        return of(this.watchlist);
      })
    );
  }

  /**
   * 清空关注列表
   */
  clear(): void {
    this.updateWatchlist([]);
  }

  /**
   * 获取关注列表数量
   */
  get count(): number {
    return this.watchlist.length;
  }

  // ============= 私有方法 =============

  private updateWatchlist(list: WatchlistItem[]): void {
    this.watchlistSubject.next(list);
    this.saveToStorage(list);
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.WATCHLIST);
      if (stored) {
        const list = JSON.parse(stored) as WatchlistItem[];
        // 转换日期字符串为 Date 对象
        const parsedList = list.map(item => ({
          ...item,
          addedAt: new Date(item.addedAt),
        }));
        this.watchlistSubject.next(parsedList);
      }
    } catch (error) {
      console.error('加载本地关注列表失败:', error);
    }
  }

  private saveToStorage(list: WatchlistItem[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.WATCHLIST, JSON.stringify(list));
    } catch (error) {
      console.error('保存本地关注列表失败:', error);
    }
  }

  private syncToServer(action: 'add' | 'remove', fundId: string): Observable<any> {
    const url = `${this.apiConfig.fundsUrl}/${fundId}/watch`;

    if (action === 'add') {
      return this.http.post(url, {});
    } else {
      return this.http.delete(url);
    }
  }
}
