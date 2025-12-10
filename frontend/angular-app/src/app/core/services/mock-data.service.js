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
exports.MockDataService = void 0;
var core_1 = require("@angular/core");
var rxjs_1 = require("rxjs");
var funds_mock_1 = require("../../mock-data/funds.mock");
var MockDataService = function () {
    var _classDecorators = [(0, core_1.Injectable)({
            providedIn: 'root'
        })];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var MockDataService = _classThis = /** @class */ (function () {
        function MockDataService_1() {
        }
        // 获取基金列表
        MockDataService_1.prototype.getFunds = function () {
            return (0, rxjs_1.of)(funds_mock_1.MOCK_FUNDS).pipe((0, rxjs_1.delay)(300));
        };
        // 获取单个基金信息
        MockDataService_1.prototype.getFundInfo = function (id) {
            var fund = funds_mock_1.MOCK_FUNDS.find(function (f) { return f.id === id; });
            return (0, rxjs_1.of)(fund || null).pipe((0, rxjs_1.delay)(200));
        };
        // 获取K线图数据
        MockDataService_1.prototype.getKLineData = function (fundId, days) {
            if (days === void 0) { days = 90; }
            var data = (0, funds_mock_1.generateMockKLineData)(days);
            return (0, rxjs_1.of)(data).pipe((0, rxjs_1.delay)(400));
        };
        // 获取涨跌信息
        MockDataService_1.prototype.getTrendInfo = function (fundId) {
            var fund = funds_mock_1.MOCK_FUNDS.find(function (f) { return f.id === fundId; });
            if (!fund)
                return (0, rxjs_1.of)(null).pipe((0, rxjs_1.delay)(200));
            var trendInfo = (0, funds_mock_1.generateMockTrendInfo)(fund);
            return (0, rxjs_1.of)(trendInfo).pipe((0, rxjs_1.delay)(200));
        };
        // 获取市场指数
        MockDataService_1.prototype.getMarketIndices = function () {
            return (0, rxjs_1.of)(funds_mock_1.MOCK_MARKET_INDICES).pipe((0, rxjs_1.delay)(100));
        };
        // 获取基金类型分布
        MockDataService_1.prototype.getFundTypeDistribution = function () {
            return (0, rxjs_1.of)(funds_mock_1.MOCK_FUND_TYPE_DISTRIBUTION).pipe((0, rxjs_1.delay)(150));
        };
        // 获取收益表现数据
        MockDataService_1.prototype.getPerformanceData = function () {
            return (0, rxjs_1.of)(funds_mock_1.MOCK_PERFORMANCE_DATA).pipe((0, rxjs_1.delay)(200));
        };
        // 模拟实时数据更新
        MockDataService_1.prototype.simulateRealtimeUpdate = function () {
            var randomFund = funds_mock_1.MOCK_FUNDS[Math.floor(Math.random() * funds_mock_1.MOCK_FUNDS.length)];
            var changePercent = (Math.random() - 0.5) * 0.002; // ±0.1%变化
            var newNav = randomFund.currentNav * (1 + changePercent);
            return (0, rxjs_1.of)({
                fundId: randomFund.id,
                newNav: parseFloat(newNav.toFixed(4))
            }).pipe((0, rxjs_1.delay)(1000));
        };
        // 生成随机基金代码
        MockDataService_1.prototype.generateRandomFundCode = function () {
            return Math.floor(Math.random() * 900000 + 100000).toString();
        };
        // 生成随机基金名称
        MockDataService_1.prototype.generateRandomFundName = function () {
            var prefixes = ['华夏', '易方达', '南方', '嘉实', '博时', '富国', '汇添富', '招商'];
            var suffixes = ['成长', '价值', '稳健', '积极', '优选', '精选', '领先', '先锋'];
            var types = ['股票', '混合', '债券', '指数', 'ETF'];
            var prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
            var suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
            var type = types[Math.floor(Math.random() * types.length)];
            return "".concat(prefix).concat(suffix).concat(type);
        };
        return MockDataService_1;
    }());
    __setFunctionName(_classThis, "MockDataService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        MockDataService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return MockDataService = _classThis;
}();
exports.MockDataService = MockDataService;
