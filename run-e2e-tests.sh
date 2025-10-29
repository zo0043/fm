#!/bin/bash

# 基金监控应用端到端测试脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 测试配置
BASE_URL="http://localhost:4200"
API_BASE_URL="http://localhost:8000"
TEST_RESULTS_DIR="test-results"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 创建测试结果目录
setup_test_environment() {
    log_info "设置测试环境..."

    mkdir -p "$TEST_RESULTS_DIR/$TIMESTAMP"
    cd "$TEST_RESULTS_DIR/$TIMESTAMP"

    # 初始化测试报告
    echo "# 基金监控应用端到端测试报告" > test-report.md
    echo "" >> test-report.md
    echo "**测试时间:** $(date)" >> test-report.md
    echo "**测试环境:** 开发环境" >> test-report.md
    echo "" >> test-report.md
}

# 测试函数
run_test() {
    local test_name=$1
    local test_command=$2
    local expected_status=$3

    log_info "运行测试: $test_name"

    echo "## $test_name" >> test-report.md

    if eval "$test_command" > "${test_name// /_}.log" 2>&1; then
        log_success "$test_name - 通过"
        echo "✅ 通过" >> test-report.md
        return 0
    else
        log_error "$test_name - 失败"
        echo "❌ 失败" >> test-report.md
        echo '```' >> test-report.md
        cat "${test_name// /_}.log" >> test-report.md
        echo '```' >> test-report.md
        return 1
    fi
}

# 健康检查测试
test_health_checks() {
    log_info "执行健康检查测试..."

    local failed=0

    # 测试认证服务健康状态
    run_test "认证服务健康检查" \
        "curl -f -s -o /dev/null -w '%{http_code}' http://localhost:8000/health | grep -q '200'" \
        0 || failed=1

    # 测试数据收集服务
    run_test "数据收集服务检查" \
        "curl -f -s -o /dev/null -w '%{http_code}' http://localhost:8001/ | grep -q '200'" \
        0 || failed=1

    # 测试监控引擎服务
    run_test "监控引擎服务检查" \
        "curl -f -s -o /dev/null -w '%{http_code}' http://localhost:8002/monitor/status | grep -q '200'" \
        0 || failed=1

    # 测试通知服务
    run_test "通知服务检查" \
        "curl -f -s -o /dev/null -w '%{http_code}' http://localhost:8003/api/v1/status | grep -q '200'" \
        0 || failed=1

    # 测试回测服务
    run_test "回测服务检查" \
        "curl -f -s -o /dev/null -w '%{http_code}' http://localhost:8004/ | grep -q '200'" \
        0 || failed=1

    # 测试前端应用
    run_test "前端应用检查" \
        "curl -f -s -o /dev/null -w '%{http_code}' http://localhost:4200 | grep -q '200'" \
        0 || failed=1

    return $failed
}

# 认证功能测试
test_authentication() {
    log_info "执行认证功能测试..."

    local failed=0

    # 测试用户登录
    run_test "用户登录" \
        "curl -s -X POST ${API_BASE_URL}/api/v1/auth/login \
         -H 'Content-Type: application/json' \
         -d '{\"username\": \"admin\", \"password\": \"admin123456\"}' \
         -o login_response.json && \
         jq -e '.access_token' login_response.json > /dev/null" \
        0 || failed=1

    # 提取访问令牌
    if [ -f "login_response.json" ]; then
        ACCESS_TOKEN=$(jq -r '.access_token' login_response.json)
        echo "ACCESS_TOKEN=$ACCESS_TOKEN" > test_env.sh

        # 测试获取当前用户信息
        run_test "获取用户信息" \
            "curl -s -X GET ${API_BASE_URL}/api/v1/auth/me \
             -H 'Authorization: Bearer $ACCESS_TOKEN' \
             -o user_info.json && \
             jq -e '.username' user_info.json > /dev/null" \
            0 || failed=1

        # 测试令牌刷新
        REFRESH_TOKEN=$(jq -r '.refresh_token' login_response.json)
        run_test "刷新访问令牌" \
            "curl -s -X POST ${API_BASE_URL}/api/v1/auth/refresh \
             -H 'Content-Type: application/json' \
             -d '{\"refresh_token\": \"$REFRESH_TOKEN\"}' \
             -o refresh_response.json && \
             jq -e '.access_token' refresh_response.json > /dev/null" \
            0 || failed=1
    fi

    return $failed
}

# 基金管理功能测试
test_fund_management() {
    log_info "执行基金管理功能测试..."

    local failed=0

    source test_env.sh 2>/dev/null || export ACCESS_TOKEN=""

    # 测试获取基金列表
    run_test "获取基金列表" \
        "curl -s -X GET 'http://localhost:8001/funds?page=1&size=10' \
         -H 'Authorization: Bearer $ACCESS_TOKEN' \
         -o funds_list.json && \
         jq -e '.data' funds_list.json > /dev/null" \
        0 || failed=1

    # 测试获取基金类型
    run_test "获取基金类型" \
        "curl -s -X GET http://localhost:8001/funds/types \
         -H 'Authorization: Bearer $ACCESS_TOKEN' \
         -o fund_types.json && \
         jq -e '.data' fund_types.json > /dev/null" \
        0 || failed=1

    # 测试获取基金公司
    run_test "获取基金公司" \
        "curl -s -X GET http://localhost:8001/funds/companies \
         -H 'Authorization: Bearer $ACCESS_TOKEN' \
         -o fund_companies.json && \
         jq -e '.data' fund_companies.json > /dev/null" \
        0 || failed=1

    # 测试获取净值数据
    run_test "获取净值数据" \
        "curl -s -X GET 'http://localhost:8001/nav/?page=1&size=5' \
         -H 'Authorization: Bearer $ACCESS_TOKEN' \
         -o nav_data.json && \
         jq -e '.data' nav_data.json > /dev/null" \
        0 || failed=1

    return $failed
}

# 监控功能测试
test_monitoring() {
    log_info "执行监控功能测试..."

    local failed=0

    source test_env.sh 2>/dev/null || export ACCESS_TOKEN=""

    # 测试获取监控规则
    run_test "获取监控规则" \
        "curl -s -X GET 'http://localhost:8002/rules?page=1&size=10' \
         -H 'Authorization: Bearer $ACCESS_TOKEN' \
         -o monitor_rules.json && \
         jq -e '.data' monitor_rules.json > /dev/null" \
        0 || failed=1

    # 测试获取规则类型
    run_test "获取规则类型" \
        "curl -s -X GET http://localhost:8002/rules/types \
         -H 'Authorization: Bearer $ACCESS_TOKEN' \
         -o rule_types.json && \
         jq -e '.data' rule_types.json > /dev/null" \
        0 || failed=1

    # 测试创建监控规则
    run_test "创建监控规则" \
        "curl -s -X POST http://localhost:8002/rules \
         -H 'Authorization: Bearer $ACCESS_TOKEN' \
         -H 'Content-Type: application/json' \
         -d '{
           \"rule_name\": \"测试规则\",
           \"rule_type\": \"price_threshold\",
           \"condition_operator\": \">\",
           \"threshold_value\": 1.0,
           \"notification_channels\": [\"email\"]
         }' \
         -o create_rule.json && \
         jq -e '.id' create_rule.json > /dev/null" \
        0 || failed=1

    # 测试获取监控结果
    run_test "获取监控结果" \
        "curl -s -X GET 'http://localhost:8002/monitor/results?page=1&size=10' \
         -H 'Authorization: Bearer $ACCESS_TOKEN' \
         -o monitor_results.json && \
         jq -e '.data' monitor_results.json > /dev/null" \
        0 || failed=1

    return $failed
}

# 通知功能测试
test_notifications() {
    log_info "执行通知功能测试..."

    local failed=0

    source test_env.sh 2>/dev/null || export ACCESS_TOKEN=""

    # 测试获取通知配置
    run_test "获取通知配置" \
        "curl -s -X GET 'http://localhost:8003/configs?page=1&size=10' \
         -H 'Authorization: Bearer $ACCESS_TOKEN' \
         -o notification_configs.json && \
         jq -e '.data' notification_configs.json > /dev/null" \
        0 || failed=1

    # 测试创建通知配置
    run_test "创建通知配置" \
        "curl -s -X POST http://localhost:8003/configs \
         -H 'Authorization: Bearer $ACCESS_TOKEN' \
         -H 'Content-Type: application/json' \
         -d '{
           \"config_name\": \"测试邮件配置\",
           \"channel_type\": \"email\",
           \"config_data\": {
             \"smtp_host\": \"smtp.example.com\",
             \"smtp_port\": 587,
             \"smtp_username\": \"test@example.com\",
             \"smtp_password\": \"password\"
           }
         }' \
         -o create_config.json && \
         jq -e '.id' create_config.json > /dev/null" \
        0 || failed=1

    # 测试获取通知记录
    run_test "获取通知记录" \
        "curl -s -X GET 'http://localhost:8003/notifications/logs?page=1&size=10' \
         -H 'Authorization: Bearer $ACCESS_TOKEN' \
         -o notification_logs.json && \
         jq -e '.data' notification_logs.json > /dev/null" \
        0 || failed=1

    return $failed
}

# 回测功能测试
test_backtest() {
    log_info "执行回测功能测试..."

    local failed=0

    source test_env.sh 2>/dev/null || export ACCESS_TOKEN=""

    # 测试获取回测策略
    run_test "获取回测策略" \
        "curl -s -X GET 'http://localhost:8004/strategies?page=1&size=10' \
         -H 'Authorization: Bearer $ACCESS_TOKEN' \
         -o backtest_strategies.json && \
         jq -e '.data' backtest_strategies.json > /dev/null" \
        0 || failed=1

    # 测试创建回测策略
    run_test "创建回测策略" \
        "curl -s -X POST http://localhost:8004/strategies \
         -H 'Authorization: Bearer $ACCESS_TOKEN' \
         -H 'Content-Type: application/json' \
         -d '{
           \"strategy_name\": \"测试定投策略\",
           \"strategy_type\": \"regular_investment\",
           \"fund_codes\": \"000001,000002\",
           \"investment_amount\": 1000.0,
           \"investment_frequency\": \"monthly\",
           \"start_date\": \"2023-01-01\",
           \"end_date\": \"2023-12-31\"
         }' \
         -o create_strategy.json && \
         jq -e '.id' create_strategy.json > /dev/null" \
        0 || failed=1

    # 测试获取回测报告
    run_test "获取回测报告" \
        "curl -s -X GET 'http://localhost:8004/reports?page=1&size=10' \
         -H 'Authorization: Bearer $ACCESS_TOKEN' \
         -o backtest_reports.json && \
         jq -e '.data' backtest_reports.json > /dev/null" \
        0 || failed=1

    return $failed
}

# 前端功能测试
test_frontend() {
    log_info "执行前端功能测试..."

    local failed=0

    # 测试前端首页加载
    run_test "前端首页加载" \
        "curl -s -X GET $BASE_URL \
         -o frontend_home.html && \
         grep -q '<title>' frontend_home.html" \
        0 || failed=1

    # 测试前端静态资源
    run_test "前端静态资源" \
        "curl -s -I -X GET $BASE_URL/main.js | grep -q '200 OK'" \
        0 || failed=1

    return $failed
}

# 生成测试报告
generate_test_report() {
    log_info "生成测试报告..."

    cd ../..

    local total_tests=$(grep -c "## " "$TEST_RESULTS_DIR/$TIMESTAMP/test-report.md")
    local passed_tests=$(grep -c "✅" "$TEST_RESULTS_DIR/$TIMESTAMP/test-report.md")
    local failed_tests=$(grep -c "❌" "$TEST_RESULTS_DIR/$TIMESTAMP/test-report.md")

    echo "" >> "$TEST_RESULTS_DIR/$TIMESTAMP/test-report.md"
    echo "## 测试总结" >> "$TEST_RESULTS_DIR/$TIMESTAMP/test-report.md"
    echo "" >> "$TEST_RESULTS_DIR/$TIMESTAMP/test-report.md"
    echo "- **总测试数:** $total_tests" >> "$TEST_RESULTS_DIR/$TIMESTAMP/test-report.md"
    echo "- **通过测试:** $passed_tests" >> "$TEST_RESULTS_DIR/$TIMESTAMP/test-report.md"
    echo "- **失败测试:** $failed_tests" >> "$TEST_RESULTS_DIR/$TIMESTAMP/test-report.md"
    echo "- **成功率:** $(( passed_tests * 100 / total_tests ))%" >> "$TEST_RESULTS_DIR/$TIMESTAMP/test-report.md"

    echo ""
    log_success "测试报告已生成: $TEST_RESULTS_DIR/$TIMESTAMP/test-report.md"
    log_info "测试结果: $passed_tests/$total_tests 通过"

    if [ $failed_tests -eq 0 ]; then
        log_success "🎉 所有测试通过！"
        return 0
    else
        log_error "❌ 有 $failed_tests 个测试失败"
        return 1
    fi
}

# 主测试函数
main() {
    log_info "开始执行端到端测试..."

    # 检查服务是否运行
    if ! curl -s http://localhost:8000/health > /dev/null; then
        log_error "服务未启动，请先运行 ./start-dev-environment.sh"
        exit 1
    fi

    setup_test_environment

    local failed=0

    # 执行各类测试
    test_health_checks || failed=1
    test_authentication || failed=1
    test_fund_management || failed=1
    test_monitoring || failed=1
    test_notifications || failed=1
    test_backtest || failed=1
    test_frontend || failed=1

    # 生成测试报告
    generate_test_report || failed=1

    exit $failed
}

# 运行测试
main "$@"