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
Object.defineProperty(exports, "__esModule", { value: true });
exports.FundDetailService = void 0;
var core_1 = require("@angular/core");
var http_1 = require("@angular/common/http");
var rxjs_1 = require("rxjs");
var operators_1 = require("rxjs/operators");
var FundDetailService = function () {
    var _classDecorators = [(0, core_1.Injectable)({
            providedIn: 'root'
        })];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var FundDetailService = _classThis = /** @class */ (function () {
        function FundDetailService_1(http) {
            this.http = http;
            this.apiUrl = '/api/funds/detail';
        }
        /**
         * 获取基金详细信息
         */
        FundDetailService_1.prototype.getFundDetail = function (query) {
            var _this = this;
            var params = new http_1.HttpParams()
                .set('fundId', query.fundId);
            if (query.includeHoldings !== undefined) {
                params = params.set('includeHoldings', query.includeHoldings.toString());
            }
            if (query.includeNews !== undefined) {
                params = params.set('includeNews', query.includeNews.toString());
            }
            if (query.includeAnnouncements !== undefined) {
                params = params.set('includeAnnouncements', query.includeAnnouncements.toString());
            }
            if (query.newsLimit) {
                params = params.set('newsLimit', query.newsLimit.toString());
            }
            if (query.announcementLimit) {
                params = params.set('announcementLimit', query.announcementLimit.toString());
            }
            return this.http.get(this.apiUrl, { params: params }).pipe((0, operators_1.catchError)(function (error) {
                console.error('获取基金详情失败:', error);
                return _this.generateMockFundDetail(query.fundId);
            }));
        };
        /**
         * 获取基金净值历史数据
         */
        FundDetailService_1.prototype.getNavHistory = function (fundId, startDate, endDate) {
            var _this = this;
            var params = new http_1.HttpParams().set('fundId', fundId);
            if (startDate) {
                params = params.set('startDate', startDate.toISOString().split('T')[0]);
            }
            if (endDate) {
                params = params.set('endDate', endDate.toISOString().split('T')[0]);
            }
            return this.http.get("".concat(this.apiUrl, "/nav-history"), { params: params }).pipe((0, operators_1.catchError)(function (error) {
                console.error('获取净值历史失败:', error);
                return _this.generateMockNavHistory(fundId, startDate, endDate);
            }));
        };
        /**
         * 获取基金相关新闻
         */
        FundDetailService_1.prototype.getFundNews = function (fundId, limit) {
            var _this = this;
            if (limit === void 0) { limit = 10; }
            var params = new http_1.HttpParams()
                .set('fundId', fundId)
                .set('limit', limit.toString());
            return this.http.get("".concat(this.apiUrl, "/news"), { params: params }).pipe((0, operators_1.catchError)(function (error) {
                console.error('获取基金新闻失败:', error);
                return _this.generateMockFundNews(fundId, limit);
            }));
        };
        /**
         * 获取基金公告
         */
        FundDetailService_1.prototype.getFundAnnouncements = function (fundId, limit) {
            var _this = this;
            if (limit === void 0) { limit = 10; }
            var params = new http_1.HttpParams()
                .set('fundId', fundId)
                .set('limit', limit.toString());
            return this.http.get("".concat(this.apiUrl, "/announcements"), { params: params }).pipe((0, operators_1.catchError)(function (error) {
                console.error('获取基金公告失败:', error);
                return _this.generateMockFundAnnouncements(fundId, limit);
            }));
        };
        /**
         * 搜索基金
         */
        FundDetailService_1.prototype.searchFunds = function (keyword) {
            var _this = this;
            var params = new http_1.HttpParams().set('keyword', keyword);
            return this.http.get("".concat(this.apiUrl, "/search"), { params: params }).pipe((0, operators_1.catchError)(function (error) {
                console.error('搜索基金失败:', error);
                return _this.generateMockSearchResults(keyword);
            }));
        };
        // Mock数据生成方法
        FundDetailService_1.prototype.generateMockFundDetail = function (fundId) {
            var mockDetail = this.createMockFundDetail(fundId);
            return (0, rxjs_1.of)({
                success: true,
                data: mockDetail,
                timestamp: new Date()
            }).pipe((0, operators_1.delay)(800));
        };
        FundDetailService_1.prototype.createMockFundDetail = function (fundId) {
            var baseInfo = this.getBaseFundInfo(fundId);
            return __assign(__assign({}, baseInfo), { fundCompany: '易方达基金管理有限公司', establishDate: new Date('2015-06-15'), fundScale: Math.random() * 100 + 10, managementFee: 0.015, custodyFee: 0.0025, purchaseFee: 0.0015, redemptionFee: 0.005, managers: this.createMockManagers(), holdings: this.createMockHoldings(), industries: this.createMockIndustries(), riskMetrics: this.createMockRiskMetrics(), performance: this.createMockPerformance(), dividends: this.createMockDividends() });
        };
        FundDetailService_1.prototype.getBaseFundInfo = function (fundId) {
            var funds = [
                {
                    id: 'fund_0001',
                    code: '110022',
                    name: '易方达消费行业',
                    type: 'stock',
                    currentNav: 2.3456,
                    yesterdayNav: 2.3123,
                    weekNav: 2.2890,
                    monthNav: 2.1987,
                    yearNav: 2.0123,
                    lastUpdate: new Date()
                },
                {
                    id: 'fund_0002',
                    code: '161725',
                    name: '招商中证白酒',
                    type: 'index',
                    currentNav: 1.7890,
                    yesterdayNav: 1.7654,
                    weekNav: 1.7432,
                    monthNav: 1.6987,
                    yearNav: 1.5432,
                    lastUpdate: new Date()
                }
            ];
            return funds.find(function (f) { return f.id === fundId; }) || funds[0];
        };
        FundDetailService_1.prototype.createMockManagers = function () {
            return [
                {
                    name: '张三',
                    experience: '8年',
                    education: '北京大学金融学硕士',
                    startDate: new Date('2018-03-15'),
                    description: '资深基金经理，擅长消费行业投资',
                    managedFunds: ['易方达消费行业', '易方达消费精选'],
                    performance: {
                        period: '2018-03-15 至今',
                        return: 125.6,
                        annualizedReturn: 18.2,
                        maxDrawdown: -15.3
                    }
                }
            ];
        };
        FundDetailService_1.prototype.createMockHoldings = function () {
            var stocks = [
                { code: '000001', name: '平安银行' },
                { code: '000002', name: '万科A' },
                { code: '000858', name: '五粮液' },
                { code: '600519', name: '贵州茅台' },
                { code: '600036', name: '招商银行' },
                { code: '000002', name: '中国平安' },
                { code: '600276', name: '恒瑞医药' },
                { code: '000651', name: '格力电器' },
                { code: '600031', name: '三一重工' },
                { code: '000876', name: '新希望' }
            ];
            var remainingWeight = 100;
            return stocks.map(function (stock, index) {
                var weight = index === stocks.length - 1 ? remainingWeight : Math.random() * 15 + 2;
                remainingWeight -= weight;
                return {
                    stockCode: stock.code,
                    stockName: stock.name,
                    shares: Math.floor(Math.random() * 10000 + 1000),
                    marketValue: Math.random() * 50000 + 5000,
                    weight: Math.min(weight, remainingWeight),
                    changePercent: (Math.random() - 0.5) * 10
                };
            });
        };
        FundDetailService_1.prototype.createMockIndustries = function () {
            var industries = [
                { name: '食品饮料', description: '白酒、乳制品、调味品等' },
                { name: '医药生物', description: '化学制药、中药、医疗器械等' },
                { name: '家用电器', description: '白色家电、小家电等' },
                { name: '房地产', description: '房地产开发、物业管理等' },
                { name: '金融服务', description: '银行、保险、证券等' },
                { name: '电子', description: '半导体、消费电子等' }
            ];
            var remainingWeight = 100;
            return industries.map(function (industry, index) {
                var weight = index === industries.length - 1 ? remainingWeight : Math.random() * 25 + 5;
                remainingWeight -= weight;
                return {
                    industryName: industry.name,
                    weight: Math.min(weight, remainingWeight),
                    changePercent: (Math.random() - 0.5) * 8,
                    description: industry.description
                };
            });
        };
        FundDetailService_1.prototype.createMockRiskMetrics = function () {
            return {
                standardDeviation: Math.random() * 0.3 + 0.1,
                beta: Math.random() * 0.4 + 0.8,
                sharpeRatio: Math.random() * 2 + 0.5,
                sortinoRatio: Math.random() * 2.5 + 0.8,
                informationRatio: Math.random() * 1.5 + 0.3,
                maxDrawdown: -(Math.random() * 0.3 + 0.1),
                volatility: Math.random() * 0.25 + 0.15,
                var95: -(Math.random() * 0.05 + 0.02),
                trackingError: Math.random() * 0.08 + 0.02
            };
        };
        FundDetailService_1.prototype.createMockPerformance = function () {
            return {
                recentReturns: {
                    oneDay: (Math.random() - 0.5) * 0.06,
                    oneWeek: (Math.random() - 0.5) * 0.1,
                    oneMonth: (Math.random() - 0.5) * 0.15,
                    threeMonths: (Math.random() - 0.5) * 0.25,
                    sixMonths: (Math.random() - 0.5) * 0.35,
                    oneYear: Math.random() * 0.6 - 0.1,
                    twoYears: Math.random() * 0.8,
                    threeYears: Math.random() * 1.2,
                    sinceInception: Math.random() * 2 + 0.5
                },
                periodReturns: this.createMockPeriodReturns(),
                riskReturnRating: {
                    risk: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
                    return: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
                    rating: Math.floor(Math.random() * 3) + 3 // 3-5星
                },
                benchmarkComparison: {
                    benchmarkName: '沪深300',
                    correlation: Math.random() * 0.3 + 0.7,
                    beta: Math.random() * 0.4 + 0.8,
                    alpha: (Math.random() - 0.3) * 0.1,
                    trackingError: Math.random() * 0.08 + 0.02,
                    informationRatio: Math.random() * 1.5 + 0.3,
                    upMarketCapture: Math.random() * 0.3 + 0.8,
                    downMarketCapture: Math.random() * 0.2 + 0.9
                }
            };
        };
        FundDetailService_1.prototype.createMockPeriodReturns = function () {
            var periods = ['近1月', '近3月', '近6月', '近1年', '近2年', '近3年'];
            return periods.map(function (period) { return ({
                period: period,
                fundReturn: (Math.random() - 0.2) * 0.8,
                benchmarkReturn: (Math.random() - 0.3) * 0.6,
                excessReturn: (Math.random() - 0.4) * 0.3,
                ranking: "".concat(Math.floor(Math.random() * 500) + 1, "/").concat(Math.floor(Math.random() * 200) + 500),
                totalFunds: Math.floor(Math.random() * 200) + 500
            }); });
        };
        FundDetailService_1.prototype.createMockDividends = function () {
            var dividends = [];
            var today = new Date();
            for (var i = 0; i < 5; i++) {
                var date = new Date(today);
                date.setMonth(date.getMonth() - i * 3);
                dividends.push({
                    exDividendDate: date,
                    dividendType: i % 2 === 0 ? '现金分红' : '红利再投资',
                    dividendPerUnit: Math.random() * 0.1 + 0.01,
                    totalAmount: Math.random() * 10000000 + 1000000,
                    afterTaxDividend: Math.random() * 0.08 + 0.008
                });
            }
            return dividends;
        };
        FundDetailService_1.prototype.generateMockNavHistory = function (fundId, startDate, endDate) {
            var history = [];
            var end = endDate || new Date();
            var start = startDate || new Date(end.getTime() - 365 * 24 * 60 * 60 * 1000); // 默认1年
            var nav = 1.0;
            var accumulatedNav = 1.0;
            var currentDate = new Date(start);
            while (currentDate <= end) {
                // 模拟净值变化
                var dailyReturn = (Math.random() - 0.5) * 0.04; // ±2%
                nav = nav * (1 + dailyReturn);
                accumulatedNav = accumulatedNav * (1 + dailyReturn);
                // 跳过周末
                if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
                    history.push({
                        date: new Date(currentDate),
                        nav: parseFloat(nav.toFixed(4)),
                        accumulatedNav: parseFloat(accumulatedNav.toFixed(4)),
                        dailyReturn: parseFloat(dailyReturn.toFixed(6)),
                        totalReturn: parseFloat(((nav - 1) * 100).toFixed(2))
                    });
                }
                currentDate.setDate(currentDate.getDate() + 1);
            }
            return (0, rxjs_1.of)(history).pipe((0, operators_1.delay)(500));
        };
        FundDetailService_1.prototype.generateMockFundNews = function (fundId, limit) {
            var newsTemplates = [
                { title: '基金四季报显示，消费行业配置比例提升', importance: 'high' },
                { title: '基金经理看好消费升级长期投资机会', importance: 'medium' },
                { title: '消费板块震荡调整，基金净值小幅回落', importance: 'low' },
                { title: '新消费概念股表现活跃，相关基金受益', importance: 'medium' },
                { title: '消费基金规模创新高，投资者信心增强', importance: 'high' }
            ];
            var news = newsTemplates.slice(0, limit).map(function (template, index) { return ({
                id: "news_".concat(fundId, "_").concat(index),
                title: template.title,
                summary: "\u5173\u4E8E".concat(template.title, "\u7684\u8BE6\u7EC6\u5206\u6790..."),
                publishDate: new Date(Date.now() - index * 24 * 60 * 60 * 1000),
                source: '证券时报',
                tags: ['基金', '消费', '投资'],
                importance: template.importance
            }); });
            return (0, rxjs_1.of)(news).pipe((0, operators_1.delay)(300));
        };
        FundDetailService_1.prototype.generateMockFundAnnouncements = function (fundId, limit) {
            var announcements = [
                {
                    id: "announcement_".concat(fundId, "_1"),
                    title: '关于易方达消费行业基金分红的公告',
                    type: '分红公告',
                    publishDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
                    summary: '基金决定进行年度分红，每份基金份额派发现金红利0.05元...'
                },
                {
                    id: "announcement_".concat(fundId, "_2"),
                    title: '基金季度报告',
                    type: '季度报告',
                    publishDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
                    summary: '2024年第一季度投资组合回顾及后市展望...'
                }
            ].slice(0, limit);
            return (0, rxjs_1.of)(announcements).pipe((0, operators_1.delay)(300));
        };
        FundDetailService_1.prototype.generateMockSearchResults = function (keyword) {
            // 简单的模拟搜索结果
            var mockResults = [
                {
                    id: 'search_1',
                    code: '110022',
                    name: '易方达消费行业',
                    type: 'stock',
                    currentNav: 2.3456,
                    yesterdayNav: 2.3123,
                    weekNav: 2.2890,
                    monthNav: 2.1987,
                    yearNav: 2.0123,
                    lastUpdate: new Date()
                }
            ].filter(function (fund) {
                return fund.name.includes(keyword) || fund.code.includes(keyword);
            });
            return (0, rxjs_1.of)(mockResults).pipe((0, operators_1.delay)(200));
        };
        return FundDetailService_1;
    }());
    __setFunctionName(_classThis, "FundDetailService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        FundDetailService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return FundDetailService = _classThis;
}();
exports.FundDetailService = FundDetailService;
