"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.FundService = void 0;
var core_1 = require("@angular/core");
var http_1 = require("@angular/common/http");
var rxjs_1 = require("rxjs");
var operators_1 = require("rxjs/operators");
var app_constants_1 = require("../../shared/constants/app.constants");
/**
 * 基金服务
 * 提供基金数据的获取、缓存和管理功能
 *
 * 使用方法：
 * constructor(private fundService: FundService) {}
 * this.fundService.getFunds().subscribe(response => ...);
 */
var FundService = function () {
    var _classDecorators = [(0, core_1.Injectable)({
            providedIn: 'root'
        })];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var FundService = _classThis = /** @class */ (function () {
        function FundService_1(http, mockDataService, apiConfig) {
            this.http = http;
            this.mockDataService = mockDataService;
            this.apiConfig = apiConfig;
            this.apiUrl = '/api/funds';
            this.fundsSubject = new rxjs_1.BehaviorSubject([]);
            this.funds$ = this.fundsSubject.asObservable();
            // 数据来源标识
            this._isUsingMockData = false;
            // 添加缓存机制
            this.navDataCache = new Map();
            this.cacheExpiry = app_constants_1.TIME_CONSTANTS.CACHE_EXPIRY;
        }
        Object.defineProperty(FundService_1.prototype, "isUsingMockData", {
            get: function () {
                return this._isUsingMockData;
            },
            enumerable: false,
            configurable: true
        });
        /**
         * 获取基金列表
         */
        FundService_1.prototype.getFunds = function (filter, page, pageSize) {
            var _this = this;
            if (filter === void 0) { filter = {}; }
            if (page === void 0) { page = 1; }
            if (pageSize === void 0) { pageSize = app_constants_1.PAGINATION.DEFAULT_PAGE_SIZE; }
            var params = new http_1.HttpParams()
                .set('page', page.toString())
                .set('pageSize', pageSize.toString());
            if (filter.search) {
                params = params.set('search', filter.search);
            }
            if (filter.type) {
                params = params.set('type', filter.type);
            }
            if (filter.riskLevel) {
                params = params.set('riskLevel', filter.riskLevel);
            }
            if (filter.status) {
                params = params.set('status', filter.status);
            }
            if (filter.sortBy) {
                params = params.set('sortBy', filter.sortBy);
            }
            if (filter.sortOrder) {
                params = params.set('sortOrder', filter.sortOrder);
            }
            return this.http.get(this.apiConfig.fundsUrl, { params: params }).pipe((0, operators_1.tap)(function (response) {
                _this._isUsingMockData = false;
                if (page === 1) {
                    _this.fundsSubject.next(response.funds);
                }
            }), (0, operators_1.catchError)(function (error) {
                console.error('获取基金列表失败:', error);
                _this._isUsingMockData = true;
                return _this.getMockFunds(filter, page, pageSize);
            }));
        };
        /**
         * 获取基金详情
         */
        FundService_1.prototype.getFundDetail = function (id) {
            var _this = this;
            return this.http.get("".concat(this.apiConfig.fundsUrl, "/").concat(id)).pipe((0, operators_1.tap)(function () { return _this._isUsingMockData = false; }), (0, operators_1.catchError)(function (error) {
                console.error('获取基金详情失败:', error);
                _this._isUsingMockData = true;
                return _this.getMockFund(id);
            }));
        };
        /**
         * 获取基金历史数据
         */
        FundService_1.prototype.getFundHistory = function (id, startDate, endDate) {
            var _this = this;
            var params = new http_1.HttpParams();
            if (startDate) {
                params = params.set('startDate', startDate);
            }
            if (endDate) {
                params = params.set('endDate', endDate);
            }
            return this.http.get("".concat(this.apiConfig.fundsUrl, "/").concat(id, "/history"), { params: params }).pipe((0, operators_1.tap)(function () { return _this._isUsingMockData = false; }), (0, operators_1.catchError)(function (error) {
                console.error('获取基金历史数据失败:', error);
                _this._isUsingMockData = true;
                return _this.getMockFundHistory(id);
            }));
        };
        /**
         * 使用代理获取基金净值数据（解决跨域问题）
         * 通过后端代理调用东方财富接口
         */
        FundService_1.prototype.getFundNavFromEastmoney = function (fundCode, page, pageSize, startDate, endDate) {
            var _this = this;
            if (page === void 0) { page = 1; }
            if (pageSize === void 0) { pageSize = 20; }
            // 检查缓存
            var cacheKey = "".concat(fundCode, "_").concat(page, "_").concat(pageSize, "_").concat(startDate || '', "_").concat(endDate || '');
            var cachedData = this.navDataCache.get(cacheKey);
            // 如果缓存存在且未过期，直接返回缓存数据
            if (cachedData && Date.now() - cachedData.timestamp < this.cacheExpiry) {
                this._isUsingMockData = false;
                return (0, rxjs_1.of)(cachedData.data);
            }
            // 通过后端代理调用（解决跨域）
            var proxyUrl = this.apiConfig.getEastmoneyNavUrl(fundCode, page, pageSize);
            return this.http.get(proxyUrl).pipe((0, operators_1.map)(function (response) {
                var historyData = response.data || [];
                // 按日期排序（从旧到新）
                historyData.sort(function (a, b) { return new Date(a.date).getTime() - new Date(b.date).getTime(); });
                // 应用日期范围过滤
                if (startDate) {
                    var start_1 = new Date(startDate);
                    historyData = historyData.filter(function (item) { return new Date(item.date) >= start_1; });
                }
                if (endDate) {
                    var end_1 = new Date(endDate);
                    end_1.setHours(23, 59, 59, 999);
                    historyData = historyData.filter(function (item) { return new Date(item.date) <= end_1; });
                }
                // 保存到缓存
                _this.navDataCache.set(cacheKey, {
                    data: historyData,
                    timestamp: Date.now()
                });
                _this._isUsingMockData = false;
                return historyData;
            }), (0, operators_1.catchError)(function (error) {
                console.error("\u83B7\u53D6\u57FA\u91D1".concat(fundCode, "\u51C0\u503C\u6570\u636E\u5931\u8D25:"), error);
                _this._isUsingMockData = true;
                // 返回模拟数据作为备选
                return _this.getMockFundHistory(fundCode);
            }));
        };
        /**
         * 清除指定基金的缓存数据
         */
        FundService_1.prototype.clearNavDataCache = function (fundCode) {
            var _this = this;
            if (fundCode) {
                // 清除指定基金的所有缓存
                var keysToDelete_1 = [];
                this.navDataCache.forEach(function (value, key) {
                    if (key.startsWith("".concat(fundCode, "_"))) {
                        keysToDelete_1.push(key);
                    }
                });
                keysToDelete_1.forEach(function (key) {
                    _this.navDataCache.delete(key);
                });
            }
            else {
                // 清除所有缓存
                this.navDataCache.clear();
            }
        };
        /**
         * 获取基金信息（适配新模型）
         */
        FundService_1.prototype.getFundInfo = function (id) {
            return this.mockDataService.getFundInfo(id);
        };
        /**
         * 获取基金K线图数据
         */
        FundService_1.prototype.getFundKLineData = function (id, days) {
            if (days === void 0) { days = 90; }
            return this.mockDataService.getKLineData(id, days);
        };
        /**
         * 获取基金涨跌信息
         */
        FundService_1.prototype.getFundTrendInfo = function (id) {
            return this.mockDataService.getTrendInfo(id);
        };
        /**
         * 转换历史数据为K线图数据格式
         */
        FundService_1.prototype.convertHistoryToKLineData = function (historyData) {
            return historyData.map(function (item) {
                var nav = item.nav;
                var totalNav = item.totalNav;
                var dailyChange = item.dailyChange;
                // 计算OHLC数据（简化处理，实际应用中需要真实数据）
                var open = nav * (1 - dailyChange * 0.5);
                var close = nav;
                var high = Math.max(open, close) * (1 + Math.random() * 0.01);
                var low = Math.min(open, close) * (1 - Math.random() * 0.01);
                return {
                    date: new Date(item.date),
                    open: parseFloat(open.toFixed(4)),
                    high: parseFloat(high.toFixed(4)),
                    low: parseFloat(low.toFixed(4)),
                    close: parseFloat(close.toFixed(4))
                };
            });
        };
        /**
         * 获取基金类型列表
         */
        FundService_1.prototype.getFundTypes = function () {
            return this.http.get("".concat(this.apiUrl, "/types")).pipe((0, operators_1.catchError)(function (error) {
                console.error('获取基金类型失败:', error);
                return (0, rxjs_1.of)(['股票型', '债券型', '混合型', '指数型', 'QDII', '货币型']);
            }));
        };
        /**
         * 获取风险等级列表
         */
        FundService_1.prototype.getRiskLevels = function () {
            return this.http.get("".concat(this.apiUrl, "/risk-levels")).pipe((0, operators_1.catchError)(function (error) {
                console.error('获取风险等级失败:', error);
                return (0, rxjs_1.of)(['低风险', '中低风险', '中等风险', '中高风险', '高风险']);
            }));
        };
        /**
         * 添加基金到关注列表
         */
        FundService_1.prototype.addToWatchlist = function (fundId) {
            return this.http.post("".concat(this.apiUrl, "/").concat(fundId, "/watch"), {}).pipe((0, operators_1.catchError)(function (error) {
                console.error('添加关注失败:', error);
                return (0, rxjs_1.of)({ success: false });
            }));
        };
        /**
         * 从关注列表移除基金
         */
        FundService_1.prototype.removeFromWatchlist = function (fundId) {
            return this.http.delete("".concat(this.apiUrl, "/").concat(fundId, "/watch")).pipe((0, operators_1.catchError)(function (error) {
                console.error('取消关注失败:', error);
                return (0, rxjs_1.of)({ success: false });
            }));
        };
        // Mock数据方法（用于开发测试）
        FundService_1.prototype.getMockFunds = function (filter, page, pageSize) {
            var mockFunds = this.generateMockFunds();
            return (0, rxjs_1.of)({
                funds: mockFunds.slice((page - 1) * pageSize, page * pageSize),
                total: mockFunds.length,
                page: page,
                pageSize: pageSize
            }).pipe((0, operators_1.delay)(500)); // 模拟网络延迟
        };
        FundService_1.prototype.getMockFund = function (id) {
            var mockFunds = this.generateMockFunds();
            var fund = mockFunds.find(function (f) { return f.id === id; });
            return (0, rxjs_1.of)(fund || mockFunds[0]).pipe((0, operators_1.delay)(300));
        };
        FundService_1.prototype.getMockFundHistory = function (id) {
            var history = [];
            var today = new Date();
            var nav = 1.0;
            for (var i = 252; i >= 0; i--) { // 一年的交易日
                var date = new Date(today);
                date.setDate(date.getDate() - i);
                // 模拟净值变化
                nav = nav * (1 + (Math.random() - 0.5) * 0.02); // 随机波动±2%
                var dailyChange = (Math.random() - 0.5) * 0.03; // 当日涨跌幅
                history.push({
                    date: date.toISOString().split('T')[0],
                    nav: parseFloat(nav.toFixed(4)),
                    totalNav: parseFloat((nav * 1.15).toFixed(4)),
                    dailyChange: parseFloat(dailyChange.toFixed(4))
                });
            }
            return (0, rxjs_1.of)(history).pipe((0, operators_1.delay)(400));
        };
        // 新增Mock数据方法
        FundService_1.prototype.getMockFundInfo = function (id) {
            var mockFunds = this.generateMockFundInfos();
            var fund = mockFunds.find(function (f) { return f.id === id; });
            return (0, rxjs_1.of)(fund || null).pipe((0, operators_1.delay)(300));
        };
        FundService_1.prototype.getMockKLineData = function (id, days) {
            var kLineData = [];
            var today = new Date();
            var currentNav = 1.0;
            for (var i = days; i >= 0; i--) {
                var date = new Date(today);
                date.setDate(date.getDate() - i);
                // 模拟OHLC数据
                var dailyChange = (Math.random() - 0.5) * 0.03; // ±3%波动
                var open_1 = currentNav;
                var close_1 = currentNav * (1 + dailyChange);
                var high = Math.max(open_1, close_1) * (1 + Math.random() * 0.02);
                var low = Math.min(open_1, close_1) * (1 - Math.random() * 0.02);
                kLineData.push({
                    date: date,
                    open: parseFloat(open_1.toFixed(4)),
                    high: parseFloat(high.toFixed(4)),
                    low: parseFloat(low.toFixed(4)),
                    close: parseFloat(close_1.toFixed(4))
                });
                currentNav = close_1;
            }
            return (0, rxjs_1.of)(kLineData).pipe((0, operators_1.delay)(400));
        };
        FundService_1.prototype.getMockTrendInfo = function (id) {
            var currentNav = 1.0 + (Math.random() - 0.3) * 0.5;
            var yesterdayNav = currentNav * (1 + (Math.random() - 0.5) * 0.03);
            var changeAmount = currentNav - yesterdayNav;
            var changePercent = (changeAmount / yesterdayNav) * 100;
            var trendInfo = {
                currentNav: currentNav,
                changeAmount: changeAmount,
                changePercent: changePercent,
                trend: changeAmount > 0 ? 'up' : changeAmount < 0 ? 'down' : 'flat'
            };
            return (0, rxjs_1.of)(trendInfo).pipe((0, operators_1.delay)(200));
        };
        FundService_1.prototype.generateMockFundInfos = function () {
            var mockFunds = [];
            var types = ['stock', 'bond', 'hybrid', 'index', 'etf', 'qdii'];
            for (var i = 1; i <= 20; i++) {
                var currentNav = 1.0 + (Math.random() - 0.3) * 0.5;
                var yesterdayNav = currentNav * (1 + (Math.random() - 0.5) * 0.03);
                mockFunds.push({
                    id: "fund_".concat(i.toString().padStart(4, '0')),
                    code: "".concat(Math.floor(Math.random() * 900000) + 100000),
                    name: "\u6A21\u62DF\u57FA\u91D1".concat(i),
                    type: types[Math.floor(Math.random() * types.length)],
                    currentNav: parseFloat(currentNav.toFixed(4)),
                    yesterdayNav: parseFloat(yesterdayNav.toFixed(4)),
                    weekNav: parseFloat((currentNav * (1 + (Math.random() - 0.5) * 0.05)).toFixed(4)),
                    monthNav: parseFloat((currentNav * (1 + (Math.random() - 0.5) * 0.1)).toFixed(4)),
                    yearNav: parseFloat((currentNav * (1 + (Math.random() - 0.5) * 0.3)).toFixed(4)),
                    lastUpdate: new Date()
                });
            }
            return mockFunds;
        };
        FundService_1.prototype.generateMockFunds = function () {
            var mockFunds = [];
            var types = ['股票型', '债券型', '混合型', '指数型', 'QDII', '货币型'];
            var riskLevels = ['低风险', '中低风险', '中等风险', '中高风险', '高风险'];
            var managers = ['张三', '李四', '王五', '赵六', '陈七', '刘八'];
            for (var i = 1; i <= 50; i++) {
                var nav = 1 + (Math.random() - 0.3) * 0.5; // 0.85-1.35
                var dailyChange = (Math.random() - 0.5) * 0.05; // -2.5% to +2.5%
                mockFunds.push({
                    id: "fund_".concat(i.toString().padStart(4, '0')),
                    code: "".concat(Math.floor(Math.random() * 900000) + 100000),
                    name: "\u6A21\u62DF\u57FA\u91D1".concat(i),
                    type: types[Math.floor(Math.random() * types.length)],
                    manager: managers[Math.floor(Math.random() * managers.length)],
                    establishDate: new Date(2020 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
                    nav: parseFloat(nav.toFixed(4)),
                    totalNav: parseFloat((nav * 1.15).toFixed(4)),
                    dailyChange: parseFloat(dailyChange.toFixed(4)),
                    dailyChangeAmount: parseFloat((nav * dailyChange).toFixed(4)),
                    weeklyChange: parseFloat(((Math.random() - 0.5) * 0.1).toFixed(4)),
                    monthlyChange: parseFloat(((Math.random() - 0.5) * 0.2).toFixed(4)),
                    yearlyChange: parseFloat(((Math.random() - 0.5) * 0.5).toFixed(4)),
                    minAmount: Math.floor(Math.random() * 9000) + 1000,
                    status: Math.random() > 0.1 ? '正常' : '暂停',
                    riskLevel: riskLevels[Math.floor(Math.random() * riskLevels.length)],
                    lastUpdated: new Date().toISOString()
                });
            }
            return mockFunds;
        };
        return FundService_1;
    }());
    __setFunctionName(_classThis, "FundService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        FundService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return FundService = _classThis;
}();
exports.FundService = FundService;
