"use strict";
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
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
exports.FundHistoryComponent = void 0;
var core_1 = require("@angular/core");
var common_1 = require("@angular/common");
var forms_1 = require("@angular/forms");
var card_1 = require("@angular/material/card");
var button_1 = require("@angular/material/button");
var icon_1 = require("@angular/material/icon");
var form_field_1 = require("@angular/material/form-field");
var input_1 = require("@angular/material/input");
var datepicker_1 = require("@angular/material/datepicker");
var core_2 = require("@angular/material/core");
var table_1 = require("@angular/material/table");
var paginator_1 = require("@angular/material/paginator");
var sort_1 = require("@angular/material/sort");
var progress_spinner_1 = require("@angular/material/progress-spinner");
var snack_bar_1 = require("@angular/material/snack-bar");
var select_1 = require("@angular/material/select");
var core_3 = require("@angular/material/core");
var divider_1 = require("@angular/material/divider");
var ng2_charts_1 = require("ng2-charts");
var FundHistoryComponent = function () {
    var _classDecorators = [(0, core_1.Component)({
            selector: 'app-fund-history',
            standalone: true,
            imports: [
                common_1.CommonModule,
                forms_1.FormsModule,
                forms_1.ReactiveFormsModule,
                card_1.MatCardModule,
                button_1.MatButtonModule,
                icon_1.MatIconModule,
                form_field_1.MatFormFieldModule,
                input_1.MatInputModule,
                datepicker_1.MatDatepickerModule,
                core_2.MatNativeDateModule,
                table_1.MatTableModule,
                paginator_1.MatPaginatorModule,
                sort_1.MatSortModule,
                progress_spinner_1.MatProgressSpinnerModule,
                snack_bar_1.MatSnackBarModule,
                select_1.MatSelectModule,
                core_3.MatOptionModule,
                divider_1.MatDividerModule
            ],
            templateUrl: './fund-history.component.html',
            styleUrls: ['./fund-history.component.scss']
        })];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _chart_decorators;
    var _chart_initializers = [];
    var FundHistoryComponent = _classThis = /** @class */ (function () {
        function FundHistoryComponent_1(fb, fundService, snackBar) {
            var _this = this;
            var _a;
            this.fb = (__runInitializers(this, _instanceExtraInitializers), fb);
            this.fundService = fundService;
            this.snackBar = snackBar;
            // 数据
            this.displayedColumns = ['date', 'nav', 'totalNav', 'dailyChange'];
            this.dataSource = [];
            this.filteredData = [];
            // 状态
            this.isLoading = false;
            this.isChartLoading = false;
            this.error = null;
            // 分页
            this.pageSize = 20;
            this.pageIndex = 0;
            this.totalItems = 0;
            // 排序
            this.sortOrder = 'desc';
            this.sortActive = 'date';
            // 图表相关
            this.chart = __runInitializers(this, _chart_initializers, void 0);
            this.chartType = 'line';
            this.chartDatasets = [];
            this.chartLabels = [];
            this.chartOptions = {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                    },
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: '日期'
                        }
                    },
                    y: {
                        display: true,
                        title: {
                            display: true,
                            text: '净值'
                        }
                    }
                }
            };
            // 图表类型选项
            this.chartTypes = [
                { value: 'line', label: '折线图' },
                { value: 'bar', label: '柱状图' }
            ];
            // 时间周期选项
            this.timePeriods = [
                { value: '7d', label: '最近7天' },
                { value: '1m', label: '最近1个月' },
                { value: '3m', label: '最近3个月' },
                { value: '6m', label: '最近6个月' },
                { value: '1y', label: '最近1年' },
                { value: '3y', label: '最近3年' },
                { value: '5y', label: '最近5年' },
                { value: 'custom', label: '自定义' }
            ];
            // 初始化日期范围（默认最近1年）
            this.defaultEndDate = new Date();
            this.defaultStartDate = new Date();
            this.defaultStartDate.setFullYear(this.defaultEndDate.getFullYear() - 1);
            // 初始化表单
            this.historyForm = this.fb.group({
                fundCode: ['110022', forms_1.Validators.required],
                timePeriod: ['1y'],
                startDate: [this.defaultStartDate],
                endDate: [this.defaultEndDate]
            });
            // 监听时间周期变化，自动更新日期范围
            (_a = this.historyForm.get('timePeriod')) === null || _a === void 0 ? void 0 : _a.valueChanges.subscribe(function (period) {
                _this.updateDateRangeByPeriod(period);
            });
        }
        FundHistoryComponent_1.prototype.ngOnInit = function () {
            // 初始加载数据
            this.loadFundHistory();
        };
        /**
         * 根据时间周期更新日期范围
         */
        FundHistoryComponent_1.prototype.updateDateRangeByPeriod = function (period) {
            var endDate = new Date();
            var startDate = new Date();
            switch (period) {
                case '7d':
                    startDate.setDate(endDate.getDate() - 7);
                    break;
                case '1m':
                    startDate.setMonth(endDate.getMonth() - 1);
                    break;
                case '3m':
                    startDate.setMonth(endDate.getMonth() - 3);
                    break;
                case '6m':
                    startDate.setMonth(endDate.getMonth() - 6);
                    break;
                case '1y':
                    startDate.setFullYear(endDate.getFullYear() - 1);
                    break;
                case '3y':
                    startDate.setFullYear(endDate.getFullYear() - 3);
                    break;
                case '5y':
                    startDate.setFullYear(endDate.getFullYear() - 5);
                    break;
                case 'custom':
                    return; // 自定义范围，不自动更新
                default:
                    startDate.setFullYear(endDate.getFullYear() - 1);
            }
            this.historyForm.patchValue({
                startDate: startDate,
                endDate: endDate
            });
        };
        /**
         * 加载基金历史数据
         */
        FundHistoryComponent_1.prototype.loadFundHistory = function () {
            var _this = this;
            var _a, _b, _c;
            if (!this.historyForm.valid) {
                return;
            }
            this.isLoading = true;
            this.isChartLoading = true;
            this.error = null;
            var fundCode = (_a = this.historyForm.get('fundCode')) === null || _a === void 0 ? void 0 : _a.value;
            var startDate = (_b = this.historyForm.get('startDate')) === null || _b === void 0 ? void 0 : _b.value;
            var endDate = (_c = this.historyForm.get('endDate')) === null || _c === void 0 ? void 0 : _c.value;
            // 格式化日期
            var formattedStartDate = startDate === null || startDate === void 0 ? void 0 : startDate.toISOString().split('T')[0];
            var formattedEndDate = endDate === null || endDate === void 0 ? void 0 : endDate.toISOString().split('T')[0];
            this.fundService.getFundNavFromEastmoney(fundCode, 1, 1000, formattedStartDate, formattedEndDate)
                .subscribe({
                next: function (data) {
                    _this.dataSource = data;
                    _this.filteredData = __spreadArray([], data, true);
                    _this.totalItems = data.length;
                    _this.pageIndex = 0;
                    _this.sortData();
                    _this.updateChartData();
                    _this.isLoading = false;
                    _this.isChartLoading = false;
                    _this.snackBar.open("\u6210\u529F\u52A0\u8F7D\u57FA\u91D1".concat(fundCode, "\u7684\u5386\u53F2\u51C0\u503C\u6570\u636E"), '关闭', { duration: 3000 });
                },
                error: function (error) {
                    _this.error = "\u83B7\u53D6\u57FA\u91D1\u5386\u53F2\u6570\u636E\u5931\u8D25: ".concat(error.message);
                    _this.isLoading = false;
                    _this.isChartLoading = false;
                    _this.snackBar.open('获取基金历史数据失败', '关闭', { duration: 3000 });
                }
            });
        };
        /**
         * 更新图表数据
         */
        FundHistoryComponent_1.prototype.updateChartData = function () {
            var _a;
            if (this.dataSource.length === 0) {
                return;
            }
            // 排序数据（按日期升序）
            var sortedData = __spreadArray([], this.dataSource, true).sort(function (a, b) {
                return new Date(a.date).getTime() - new Date(b.date).getTime();
            });
            // 准备图表数据
            this.chartLabels = sortedData.map(function (item) { return item.date; });
            this.chartDatasets = [
                {
                    data: sortedData.map(function (item) { return item.nav; }),
                    label: '单位净值',
                    borderColor: '#3f51b5',
                    backgroundColor: 'rgba(63, 81, 181, 0.1)',
                    fill: true,
                    tension: 0.3,
                    pointRadius: 2,
                    pointHoverRadius: 5,
                },
                {
                    data: sortedData.map(function (item) { return item.totalNav; }),
                    label: '累计净值',
                    borderColor: '#4caf50',
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    fill: true,
                    tension: 0.3,
                    pointRadius: 2,
                    pointHoverRadius: 5,
                }
            ];
            // 更新图表
            (_a = this.chart) === null || _a === void 0 ? void 0 : _a.update();
        };
        /**
         * 处理分页变化
         */
        FundHistoryComponent_1.prototype.handlePageEvent = function (event) {
            this.pageSize = event.pageSize;
            this.pageIndex = event.pageIndex;
        };
        /**
         * 处理排序变化
         */
        FundHistoryComponent_1.prototype.handleSortChange = function (sort) {
            if (sort.active && sort.direction) {
                this.sortActive = sort.active;
                this.sortOrder = sort.direction;
                this.sortData();
            }
        };
        /**
         * 排序数据
         */
        FundHistoryComponent_1.prototype.sortData = function () {
            var _this = this;
            var data = __spreadArray([], this.dataSource, true);
            var isAsc = this.sortOrder === 'asc';
            this.filteredData = data.sort(function (a, b) {
                switch (_this.sortActive) {
                    case 'date':
                        return _this.compare(new Date(a.date), new Date(b.date), isAsc);
                    case 'nav':
                        return _this.compare(a.nav, b.nav, isAsc);
                    case 'totalNav':
                        return _this.compare(a.totalNav, b.totalNav, isAsc);
                    case 'dailyChange':
                        return _this.compare(a.dailyChange, b.dailyChange, isAsc);
                    default:
                        return 0;
                }
            });
        };
        /**
         * 比较函数
         */
        FundHistoryComponent_1.prototype.compare = function (a, b, isAsc) {
            return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
        };
        /**
         * 格式化涨跌幅
         */
        FundHistoryComponent_1.prototype.formatDailyChange = function (value) {
            var sign = value > 0 ? '+' : '';
            return "".concat(sign).concat((value * 100).toFixed(2), "%");
        };
        /**
         * 获取涨跌幅样式类
         */
        FundHistoryComponent_1.prototype.getDailyChangeClass = function (value) {
            if (value > 0)
                return 'positive';
            if (value < 0)
                return 'negative';
            return 'neutral';
        };
        /**
         * 刷新数据
         */
        FundHistoryComponent_1.prototype.refreshData = function () {
            var _a;
            // 清除缓存
            var fundCode = (_a = this.historyForm.get('fundCode')) === null || _a === void 0 ? void 0 : _a.value;
            this.fundService.clearNavDataCache(fundCode);
            // 重新加载数据
            this.loadFundHistory();
        };
        /**
         * 切换图表类型
         */
        FundHistoryComponent_1.prototype.changeChartType = function (type) {
            var _a;
            this.chartType = type;
            (_a = this.chart) === null || _a === void 0 ? void 0 : _a.update();
        };
        /**
         * 导出数据
         */
        FundHistoryComponent_1.prototype.exportData = function () {
            var _a;
            if (this.dataSource.length === 0) {
                this.snackBar.open('没有数据可以导出', '关闭', { duration: 3000 });
                return;
            }
            // 生成CSV内容
            var headers = ['日期', '单位净值', '累计净值', '日涨跌幅(%)'];
            var rows = this.dataSource.map(function (item) { return [
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
            link.setAttribute('download', "fund_history_".concat((_a = this.historyForm.get('fundCode')) === null || _a === void 0 ? void 0 : _a.value, "_").concat(new Date().toISOString().split('T')[0], ".csv"));
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            this.snackBar.open('数据导出成功', '关闭', { duration: 3000 });
        };
        return FundHistoryComponent_1;
    }());
    __setFunctionName(_classThis, "FundHistoryComponent");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _chart_decorators = [(0, core_1.ViewChild)(ng2_charts_1.BaseChartDirective)];
        __esDecorate(null, null, _chart_decorators, { kind: "field", name: "chart", static: false, private: false, access: { has: function (obj) { return "chart" in obj; }, get: function (obj) { return obj.chart; }, set: function (obj, value) { obj.chart = value; } }, metadata: _metadata }, _chart_initializers, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        FundHistoryComponent = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return FundHistoryComponent = _classThis;
}();
exports.FundHistoryComponent = FundHistoryComponent;
