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
exports.ApiConfigService = void 0;
var core_1 = require("@angular/core");
var environment_1 = require("../../../environments/environment");
/**
 * API 配置服务
 * 统一管理所有 API 端点配置，支持开发/生产环境切换
 *
 * 使用方法：
 * constructor(private apiConfig: ApiConfigService) {}
 * const url = this.apiConfig.getUrl('funds', '/list');
 */
var ApiConfigService = function () {
    var _classDecorators = [(0, core_1.Injectable)({
            providedIn: 'root'
        })];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var ApiConfigService = _classThis = /** @class */ (function () {
        function ApiConfigService_1() {
            // NestJS API Gateway 地址（统一入口）
            this.gatewayUrl = environment_1.environment.production
                ? '' // 生产环境使用相对路径
                : 'http://localhost:3000';
            // 微服务直连地址（开发调试用）
            this.microservices = {
                auth: 'http://localhost:8000',
                dataCollector: 'http://localhost:8001',
                monitorEngine: 'http://localhost:8002',
                notification: 'http://localhost:8003',
                backtest: 'http://localhost:8004',
            };
            // API 版本
            this.apiVersion = 'v1';
            // 服务路由映射
            this.serviceRoutes = {
                auth: '/api/auth',
                users: '/api/users',
                funds: '/api/funds',
                nav: '/api/nav',
                monitor: '/api/monitor',
                rules: '/api/rules',
                notifications: '/api/notifications',
                configs: '/api/configs',
                backtest: '/api/backtest',
                strategies: '/api/strategies',
                // 代理服务（解决跨域问题）
                proxy: '/api/proxy',
            };
            // 外部数据源代理配置
            this.externalProxies = {
                eastmoney: '/api/proxy/eastmoney',
                sina: '/api/proxy/sina',
            };
        }
        /**
         * 获取 API URL
         * @param service 服务名称
         * @param endpoint 端点路径
         */
        ApiConfigService_1.prototype.getUrl = function (service, endpoint) {
            if (endpoint === void 0) { endpoint = ''; }
            var basePath = this.serviceRoutes[service] || '';
            return "".concat(this.gatewayUrl).concat(basePath).concat(endpoint);
        };
        /**
         * 获取外部数据源代理 URL
         * @param source 数据源名称
         * @param params 查询参数
         */
        ApiConfigService_1.prototype.getProxyUrl = function (source, params) {
            if (params === void 0) { params = {}; }
            var basePath = this.externalProxies[source];
            var queryString = new URLSearchParams(params).toString();
            return "".concat(this.gatewayUrl).concat(basePath).concat(queryString ? '?' + queryString : '');
        };
        /**
         * 获取东方财富基金净值代理 URL
         * @param fundCode 基金代码
         * @param page 页码
         * @param pageSize 每页条数
         */
        ApiConfigService_1.prototype.getEastmoneyNavUrl = function (fundCode, page, pageSize) {
            if (page === void 0) { page = 1; }
            if (pageSize === void 0) { pageSize = 20; }
            return this.getProxyUrl('eastmoney', {
                type: 'lsjz',
                code: fundCode,
                page: page.toString(),
                per: pageSize.toString(),
            });
        };
        Object.defineProperty(ApiConfigService_1.prototype, "authUrl", {
            // ============= 便捷访问器 =============
            get: function () {
                return this.getUrl('auth');
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(ApiConfigService_1.prototype, "usersUrl", {
            get: function () {
                return this.getUrl('users');
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(ApiConfigService_1.prototype, "fundsUrl", {
            get: function () {
                return this.getUrl('funds');
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(ApiConfigService_1.prototype, "navUrl", {
            get: function () {
                return this.getUrl('nav');
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(ApiConfigService_1.prototype, "monitorUrl", {
            get: function () {
                return this.getUrl('monitor');
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(ApiConfigService_1.prototype, "rulesUrl", {
            get: function () {
                return this.getUrl('rules');
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(ApiConfigService_1.prototype, "notificationsUrl", {
            get: function () {
                return this.getUrl('notifications');
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(ApiConfigService_1.prototype, "configsUrl", {
            get: function () {
                return this.getUrl('configs');
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(ApiConfigService_1.prototype, "backtestUrl", {
            get: function () {
                return this.getUrl('backtest');
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(ApiConfigService_1.prototype, "strategiesUrl", {
            get: function () {
                return this.getUrl('strategies');
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(ApiConfigService_1.prototype, "isDevelopment", {
            // ============= 环境信息 =============
            get: function () {
                return !environment_1.environment.production;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(ApiConfigService_1.prototype, "isProduction", {
            get: function () {
                return environment_1.environment.production;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(ApiConfigService_1.prototype, "gatewayBaseUrl", {
            get: function () {
                return this.gatewayUrl;
            },
            enumerable: false,
            configurable: true
        });
        /**
         * 获取微服务直连地址（仅开发环境使用）
         */
        ApiConfigService_1.prototype.getMicroserviceUrl = function (service) {
            if (this.isProduction) {
                console.warn('生产环境不应直连微服务');
            }
            return this.microservices[service];
        };
        return ApiConfigService_1;
    }());
    __setFunctionName(_classThis, "ApiConfigService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ApiConfigService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ApiConfigService = _classThis;
}();
exports.ApiConfigService = ApiConfigService;
