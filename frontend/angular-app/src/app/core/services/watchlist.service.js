"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WatchlistService = void 0;
var core_1 = require("@angular/core");
var rxjs_1 = require("rxjs");
var operators_1 = require("rxjs/operators");
var app_constants_1 = require("../../shared/constants/app.constants");
var WatchlistService = function () {
    var _classDecorators = [(0, core_1.Injectable)({
            providedIn: 'root'
        })];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var WatchlistService = _classThis = /** @class */ (function () {
        function WatchlistService_1(http, apiConfig) {
            this.http = http;
            this.apiConfig = apiConfig;
            this.watchlistSubject = new rxjs_1.BehaviorSubject([]);
            this.watchlist$ = this.watchlistSubject.asObservable();
            // 加载状态
            this.loadingSubject = new rxjs_1.BehaviorSubject(false);
            this.loading$ = this.loadingSubject.asObservable();
            this.loadFromStorage();
        }
        Object.defineProperty(WatchlistService_1.prototype, "watchlist", {
            /**
             * 获取当前关注列表
             */
            get: function () {
                return this.watchlistSubject.value;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(WatchlistService_1.prototype, "watchedFundIds", {
            /**
             * 获取关注的基金 ID 列表
             */
            get: function () {
                return this.watchlist.map(function (item) { return item.fundId; });
            },
            enumerable: false,
            configurable: true
        });
        /**
         * 检查基金是否在关注列表中
         */
        WatchlistService_1.prototype.isWatched = function (fundId) {
            return this.watchlist.some(function (item) { return item.fundId === fundId; });
        };
        /**
         * 添加到关注列表
         */
        WatchlistService_1.prototype.add = function (fund, notes) {
            if (this.isWatched(fund.id)) {
                return (0, rxjs_1.of)(true); // 已存在
            }
            var newItem = {
                fundId: fund.id,
                fundCode: fund.code,
                fundName: fund.name,
                addedAt: new Date(),
                notes: notes,
            };
            // 本地更新
            var updatedList = __spreadArray(__spreadArray([], this.watchlist, true), [newItem], false);
            this.updateWatchlist(updatedList);
            // 同步到服务器
            return this.syncToServer('add', fund.id).pipe((0, operators_1.map)(function () { return true; }), (0, operators_1.catchError)(function (error) {
                console.error('同步关注列表失败:', error);
                return (0, rxjs_1.of)(true); // 本地已添加，返回成功
            }));
        };
        /**
         * 从关注列表移除
         */
        WatchlistService_1.prototype.remove = function (fundId) {
            if (!this.isWatched(fundId)) {
                return (0, rxjs_1.of)(true); // 不存在
            }
            // 本地更新
            var updatedList = this.watchlist.filter(function (item) { return item.fundId !== fundId; });
            this.updateWatchlist(updatedList);
            // 同步到服务器
            return this.syncToServer('remove', fundId).pipe((0, operators_1.map)(function () { return true; }), (0, operators_1.catchError)(function (error) {
                console.error('同步关注列表失败:', error);
                return (0, rxjs_1.of)(true); // 本地已移除，返回成功
            }));
        };
        /**
         * 切换关注状态
         */
        WatchlistService_1.prototype.toggle = function (fund) {
            if (this.isWatched(fund.id)) {
                return this.remove(fund.id);
            }
            else {
                return this.add(fund);
            }
        };
        /**
         * 更新备注
         */
        WatchlistService_1.prototype.updateNotes = function (fundId, notes) {
            var updatedList = this.watchlist.map(function (item) {
                if (item.fundId === fundId) {
                    return __assign(__assign({}, item), { notes: notes });
                }
                return item;
            });
            this.updateWatchlist(updatedList);
        };
        /**
         * 从服务器加载关注列表
         */
        WatchlistService_1.prototype.loadFromServer = function () {
            var _this = this;
            this.loadingSubject.next(true);
            return this.http.get("".concat(this.apiConfig.fundsUrl, "/watchlist")).pipe((0, operators_1.tap)(function (list) {
                _this.updateWatchlist(list);
                _this.loadingSubject.next(false);
            }), (0, operators_1.catchError)(function (error) {
                console.error('从服务器加载关注列表失败:', error);
                _this.loadingSubject.next(false);
                // 返回本地缓存的数据
                return (0, rxjs_1.of)(_this.watchlist);
            }));
        };
        /**
         * 清空关注列表
         */
        WatchlistService_1.prototype.clear = function () {
            this.updateWatchlist([]);
        };
        Object.defineProperty(WatchlistService_1.prototype, "count", {
            /**
             * 获取关注列表数量
             */
            get: function () {
                return this.watchlist.length;
            },
            enumerable: false,
            configurable: true
        });
        // ============= 私有方法 =============
        WatchlistService_1.prototype.updateWatchlist = function (list) {
            this.watchlistSubject.next(list);
            this.saveToStorage(list);
        };
        WatchlistService_1.prototype.loadFromStorage = function () {
            try {
                var stored = localStorage.getItem(app_constants_1.STORAGE_KEYS.WATCHLIST);
                if (stored) {
                    var list = JSON.parse(stored);
                    // 转换日期字符串为 Date 对象
                    var parsedList = list.map(function (item) { return (__assign(__assign({}, item), { addedAt: new Date(item.addedAt) })); });
                    this.watchlistSubject.next(parsedList);
                }
            }
            catch (error) {
                console.error('加载本地关注列表失败:', error);
            }
        };
        WatchlistService_1.prototype.saveToStorage = function (list) {
            try {
                localStorage.setItem(app_constants_1.STORAGE_KEYS.WATCHLIST, JSON.stringify(list));
            }
            catch (error) {
                console.error('保存本地关注列表失败:', error);
            }
        };
        WatchlistService_1.prototype.syncToServer = function (action, fundId) {
            var url = "".concat(this.apiConfig.fundsUrl, "/").concat(fundId, "/watch");
            if (action === 'add') {
                return this.http.post(url, {});
            }
            else {
                return this.http.delete(url);
            }
        };
        return WatchlistService_1;
    }());
    __setFunctionName(_classThis, "WatchlistService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        WatchlistService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return WatchlistService = _classThis;
}();
exports.WatchlistService = WatchlistService;
