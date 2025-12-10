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
exports.FundDetailComponent = void 0;
var core_1 = require("@angular/core");
var rxjs_1 = require("rxjs");
var operators_1 = require("rxjs/operators");
var app_constants_1 = require("../../shared/constants/app.constants");
var FundDetailComponent = function () {
    var _classDecorators = [(0, core_1.Component)({
            selector: 'app-fund-detail',
            templateUrl: './fund-detail.component.html',
            styleUrls: ['./fund-detail.component.scss']
        })];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var FundDetailComponent = _classThis = /** @class */ (function () {
        function FundDetailComponent_1(route, router, fundDetailService, fundService, watchlistService, snackBar) {
            this.route = route;
            this.router = router;
            this.fundDetailService = fundDetailService;
            this.fundService = fundService;
            this.watchlistService = watchlistService;
            this.snackBar = snackBar;
            this.destroy$ = new rxjs_1.Subject();
            // 基金数据
            this.fund = null;
            this.fundId = '';
            this.navHistory = [];
            this.fundNews = [];
            this.fundAnnouncements = [];
            // 状态管理
            this.isLoading = true;
            this.isNewsLoading = false;
            this.isAnnouncementsLoading = false;
            this.isHistoryLoading = false;
            this.error = null;
            // 标签页控制
            this.selectedTab = 0;
            // 图表相关
            this.chartPeriod = '1Y';
            // 历史净值查询相关
            this.historyStartDate = new Date();
            this.historyEndDate = new Date();
            this.historyData = [];
            this.historyDisplayedColumns = ['date', 'nav', 'totalNav', 'dailyChange'];
        }
        FundDetailComponent_1.prototype.ngOnInit = function () {
            var _this = this;
            // 初始化历史净值查询日期范围（默认查询最近1年）
            this.historyEndDate = new Date();
            this.historyStartDate = new Date();
            this.historyStartDate.setFullYear(this.historyEndDate.getFullYear() - 1);
            this.route.params.subscribe(function (params) {
                _this.fundId = params['id'];
                if (_this.fundId) {
                    _this.loadFundDetail();
                    _this.loadNavHistory();
                    _this.loadNews();
                    _this.loadAnnouncements();
                }
                else {
                    _this.error = '无效的基金ID';
                    _this.isLoading = false;
                }
            });
        };
        FundDetailComponent_1.prototype.ngOnDestroy = function () {
            this.destroy$.next();
            this.destroy$.complete();
        };
        FundDetailComponent_1.prototype.loadFundDetail = function () {
            var _this = this;
            this.isLoading = true;
            this.error = null;
            this.fundDetailService.getFundDetail({
                fundId: this.fundId,
                includeHoldings: true,
                includeNews: false,
                includeAnnouncements: false
            }).pipe((0, operators_1.takeUntil)(this.destroy$), (0, operators_1.finalize)(function () { return _this.isLoading = false; }), (0, operators_1.catchError)(function (error) {
                console.error('加载基金详情失败:', error);
                _this.error = '加载基金信息失败，请稍后重试';
                throw error;
            })).subscribe(function (response) {
                if (response.success && response.data) {
                    _this.fund = response.data;
                }
                else {
                    _this.error = response.error || '基金信息加载失败';
                }
            });
        };
        FundDetailComponent_1.prototype.loadNavHistory = function () {
            var _this = this;
            var endDate = new Date();
            var startDate = new Date();
            startDate.setFullYear(endDate.getFullYear() - 3); // 默认加载3年数据
            this.fundDetailService.getNavHistory(this.fundId, startDate, endDate)
                .pipe((0, operators_1.takeUntil)(this.destroy$))
                .subscribe(function (history) {
                _this.navHistory = history;
            });
        };
        FundDetailComponent_1.prototype.loadNews = function () {
            var _this = this;
            this.isNewsLoading = true;
            this.fundDetailService.getFundNews(this.fundId, 5)
                .pipe((0, operators_1.takeUntil)(this.destroy$), (0, operators_1.finalize)(function () { return _this.isNewsLoading = false; }))
                .subscribe(function (news) {
                _this.fundNews = news;
            });
        };
        FundDetailComponent_1.prototype.loadAnnouncements = function () {
            var _this = this;
            this.isAnnouncementsLoading = true;
            this.fundDetailService.getFundAnnouncements(this.fundId, 5)
                .pipe((0, operators_1.takeUntil)(this.destroy$), (0, operators_1.finalize)(function () { return _this.isAnnouncementsLoading = false; }))
                .subscribe(function (announcements) {
                _this.fundAnnouncements = announcements;
            });
        };
        FundDetailComponent_1.prototype.onTabChange = function (index) {
            this.selectedTab = index;
        };
        FundDetailComponent_1.prototype.onChartPeriodChange = function (period) {
            this.chartPeriod = period;
        };
        FundDetailComponent_1.prototype.onRefresh = function () {
            this.loadFundDetail();
            this.loadNavHistory();
        };
        FundDetailComponent_1.prototype.onAddToWatchlist = function (fundId) {
            var _this = this;
            if (!this.fund)
                return;
            this.watchlistService.add({
                id: fundId,
                code: this.fund.code,
                name: this.fund.name
            }).pipe((0, operators_1.takeUntil)(this.destroy$))
                .subscribe({
                next: function () {
                    var _a;
                    _this.snackBar.open("\u5DF2\u5C06 ".concat((_a = _this.fund) === null || _a === void 0 ? void 0 : _a.name, " \u6DFB\u52A0\u5230\u5173\u6CE8\u5217\u8868"), '关闭', {
                        duration: app_constants_1.TIME_CONSTANTS.SNACKBAR_DURATION
                    });
                },
                error: function (error) {
                    console.error('添加关注失败:', error);
                    _this.snackBar.open('添加关注失败', '关闭', {
                        duration: app_constants_1.TIME_CONSTANTS.SNACKBAR_DURATION
                    });
                }
            });
        };
        FundDetailComponent_1.prototype.onRemoveFromWatchlist = function (fundId) {
            var _this = this;
            this.watchlistService.remove(fundId)
                .pipe((0, operators_1.takeUntil)(this.destroy$))
                .subscribe({
                next: function () {
                    var _a;
                    _this.snackBar.open("\u5DF2\u5C06 ".concat((_a = _this.fund) === null || _a === void 0 ? void 0 : _a.name, " \u4ECE\u5173\u6CE8\u5217\u8868\u79FB\u9664"), '关闭', {
                        duration: app_constants_1.TIME_CONSTANTS.SNACKBAR_DURATION
                    });
                },
                error: function (error) {
                    console.error('移除关注失败:', error);
                    _this.snackBar.open('移除关注失败', '关闭', {
                        duration: app_constants_1.TIME_CONSTANTS.SNACKBAR_DURATION
                    });
                }
            });
        };
        // 切换关注状态
        FundDetailComponent_1.prototype.toggleWatchlist = function () {
            if (this.isWatchlisted) {
                this.onRemoveFromWatchlist(this.fundId);
            }
            else {
                this.onAddToWatchlist(this.fundId);
            }
        };
        FundDetailComponent_1.prototype.onGoBack = function () {
            this.router.navigate(['/funds']);
        };
        // 格式化方法
        FundDetailComponent_1.prototype.formatPercent = function (value) {
            return "".concat(value >= 0 ? '+' : '').concat((value * 100).toFixed(2), "%");
        };
        FundDetailComponent_1.prototype.formatCurrency = function (value) {
            return "\u00A5".concat(value.toFixed(4));
        };
        FundDetailComponent_1.prototype.formatDate = function (date) {
            return date.toLocaleDateString('zh-CN');
        };
        FundDetailComponent_1.prototype.getFundTypeLabel = function (type) {
            var typeLabels = {
                'stock': '股票型',
                'bond': '债券型',
                'hybrid': '混合型',
                'index': '指数型',
                'etf': 'ETF',
                'qdii': 'QDII'
            };
            return typeLabels[type] || type;
        };
        FundDetailComponent_1.prototype.getNewsImportanceColor = function (importance) {
            var colors = {
                'high': '#f44336',
                'medium': '#ff9800',
                'low': '#4caf50'
            };
            return colors[importance] || '#666';
        };
        FundDetailComponent_1.prototype.getNewsImportanceLabel = function (importance) {
            var labels = {
                'high': '重要',
                'medium': '中等',
                'low': '一般'
            };
            return labels[importance] || importance;
        };
        FundDetailComponent_1.prototype.getFilteredNavHistory = function () {
            if (!this.navHistory.length)
                return [];
            var now = new Date();
            var cutoffDate = new Date();
            switch (this.chartPeriod) {
                case '1M':
                    cutoffDate.setMonth(now.getMonth() - 1);
                    break;
                case '3M':
                    cutoffDate.setMonth(now.getMonth() - 3);
                    break;
                case '6M':
                    cutoffDate.setMonth(now.getMonth() - 6);
                    break;
                case '1Y':
                    cutoffDate.setFullYear(now.getFullYear() - 1);
                    break;
                case '3Y':
                    cutoffDate.setFullYear(now.getFullYear() - 3);
                    break;
                default:
                    return this.navHistory;
            }
            return this.navHistory.filter(function (item) { return new Date(item.date) >= cutoffDate; });
        };
        // 计算统计数据
        FundDetailComponent_1.prototype.getNavStatistics = function () {
            if (!this.navHistory.length)
                return null;
            var filteredHistory = this.getFilteredNavHistory();
            var navValues = filteredHistory.map(function (item) { return item.nav; });
            var returns = filteredHistory.slice(1).map(function (item, index) {
                return (item.nav - filteredHistory[index].nav) / filteredHistory[index].nav;
            });
            var startNav = navValues[0];
            var endNav = navValues[navValues.length - 1];
            var totalReturn = (endNav - startNav) / startNav;
            var maxNav = Math.max.apply(Math, navValues);
            var minNav = Math.min.apply(Math, navValues);
            var maxDrawdown = (maxNav - minNav) / maxNav;
            var avgReturn = returns.length > 0 ? returns.reduce(function (sum, r) { return sum + r; }, 0) / returns.length : 0;
            var volatility = returns.length > 1 ? this.calculateStandardDeviation(returns) : 0;
            var sharpeRatio = volatility > 0 ? (avgReturn * 252) / (volatility * Math.sqrt(252)) : 0;
            return {
                totalReturn: totalReturn,
                maxDrawdown: maxDrawdown,
                volatility: volatility * Math.sqrt(252),
                sharpeRatio: sharpeRatio,
                startNav: startNav,
                endNav: endNav,
                maxNav: maxNav,
                minNav: minNav
            };
        };
        FundDetailComponent_1.prototype.calculateStandardDeviation = function (values) {
            var avg = values.reduce(function (sum, value) { return sum + value; }, 0) / values.length;
            var squaredDiffs = values.map(function (value) { return Math.pow(value - avg, 2); });
            var avgSquaredDiff = squaredDiffs.reduce(function (sum, value) { return sum + value; }, 0) / values.length;
            return Math.sqrt(avgSquaredDiff);
        };
        Object.defineProperty(FundDetailComponent_1.prototype, "isWatchlisted", {
            // 检查基金是否在关注列表中
            get: function () {
                return this.watchlistService.isWatched(this.fundId);
            },
            enumerable: false,
            configurable: true
        });
        // 获取基金评级颜色
        FundDetailComponent_1.prototype.getRatingColor = function (rating) {
            if (rating >= 4.5)
                return '#4caf50';
            if (rating >= 3.5)
                return '#8bc34a';
            if (rating >= 2.5)
                return '#ff9800';
            return '#f44336';
        };
        // 获取基金评级文本
        FundDetailComponent_1.prototype.getRatingText = function (rating) {
            if (rating >= 4.5)
                return '优秀';
            if (rating >= 3.5)
                return '良好';
            if (rating >= 2.5)
                return '一般';
            return '较差';
        };
        // 加载基金历史净值数据
        FundDetailComponent_1.prototype.loadFundHistoryData = function () {
            var _this = this;
            if (!this.fund || !this.fund.code) {
                return;
            }
            this.isHistoryLoading = true;
            // 格式化日期
            var formattedStartDate = this.historyStartDate.toISOString().split('T')[0];
            var formattedEndDate = this.historyEndDate.toISOString().split('T')[0];
            this.fundService.getFundNavFromEastmoney(this.fund.code, 1, 1000, // 获取足够多的数据
            formattedStartDate, formattedEndDate).pipe((0, operators_1.takeUntil)(this.destroy$), (0, operators_1.finalize)(function () { return _this.isHistoryLoading = false; })).subscribe({
                next: function (data) {
                    _this.historyData = data;
                    _this.snackBar.open('历史净值数据加载成功', '关闭', {
                        duration: app_constants_1.TIME_CONSTANTS.SNACKBAR_DURATION
                    });
                },
                error: function (error) {
                    console.error('加载历史净值数据失败:', error);
                    _this.snackBar.open('历史净值数据加载失败', '关闭', {
                        duration: app_constants_1.TIME_CONSTANTS.SNACKBAR_DURATION
                    });
                }
            });
        };
        // 导出历史净值数据
        FundDetailComponent_1.prototype.exportHistoryData = function () {
            var _a;
            if (this.historyData.length === 0) {
                return;
            }
            // 生成CSV内容
            var headers = ['日期', '单位净值', '累计净值', '日涨跌幅(%)'];
            var rows = this.historyData.map(function (item) { return [
                item.date,
                item.nav,
                item.totalNav,
                (item.dailyChange * 100).toFixed(2)
            ]; });
            var csvContent = __spreadArray([
                headers.join(',')
            ], rows.map(function (row) { return row.join(','); }), true).join('\n');
            // 创建下载链接
            var blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
            var link = document.createElement('a');
            var url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', "fund_history_".concat(((_a = this.fund) === null || _a === void 0 ? void 0 : _a.code) || this.fundId, "_").concat(new Date().toISOString().split('T')[0], ".csv"));
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            this.snackBar.open('历史净值数据导出成功', '关闭', {
                duration: app_constants_1.TIME_CONSTANTS.SNACKBAR_DURATION
            });
        };
        return FundDetailComponent_1;
    }());
    __setFunctionName(_classThis, "FundDetailComponent");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        FundDetailComponent = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return FundDetailComponent = _classThis;
}();
exports.FundDetailComponent = FundDetailComponent;
