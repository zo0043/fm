-- 基金监控应用数据库初始化脚本
-- 创建数据库和基础表结构

-- 基金基础信息表
CREATE TABLE IF NOT EXISTS funds (
    id SERIAL PRIMARY KEY,
    fund_code VARCHAR(10) UNIQUE NOT NULL,           -- 基金代码
    fund_name VARCHAR(200) NOT NULL,                 -- 基金名称
    fund_type VARCHAR(50) NOT NULL,                  -- 基金类型 (股票型、债券型、混合型等)
    fund_company VARCHAR(100),                       -- 基金公司
    establish_date DATE,                             -- 成立日期
    fund_manager VARCHAR(100),                       -- 基金经理
    fund_size DECIMAL(18, 2),                        -- 基金规模 (亿元)
    management_fee_rate DECIMAL(5, 4),               -- 管理费率
    custody_fee_rate DECIMAL(5, 4),                  -- 托管费率
    status VARCHAR(20) DEFAULT 'active',             -- 状态 (active, inactive, liquidated)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建基金代码索引
CREATE INDEX IF NOT EXISTS idx_funds_fund_code ON funds(fund_code);
CREATE INDEX IF NOT EXISTS idx_funds_fund_type ON funds(fund_type);
CREATE INDEX IF NOT EXISTS idx_funds_status ON funds(status);

-- 净值数据表 (时序数据，考虑分区)
CREATE TABLE IF NOT EXISTS net_asset_values (
    id BIGSERIAL PRIMARY KEY,
    fund_code VARCHAR(10) NOT NULL,                  -- 基金代码
    nav_date DATE NOT NULL,                          -- 净值日期
    unit_nav DECIMAL(10, 4) NOT NULL,                -- 单位净值
    accumulated_nav DECIMAL(10, 4) NOT NULL,         -- 累计净值
    daily_change_rate DECIMAL(8, 4),                 -- 日涨跌幅 (%)
    daily_change_amount DECIMAL(10, 4),              -- 日涨跌金额
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(fund_code, nav_date)
);

-- 创建净值数据索引
CREATE INDEX IF NOT EXISTS idx_nav_fund_code ON net_asset_values(fund_code);
CREATE INDEX IF NOT EXISTS idx_nav_date ON net_asset_values(nav_date);
CREATE INDEX IF NOT EXISTS idx_nav_change_rate ON net_asset_values(daily_change_rate);

-- 监控规则表
CREATE TABLE IF NOT EXISTS monitor_rules (
    id SERIAL PRIMARY KEY,
    rule_name VARCHAR(100) NOT NULL,                 -- 规则名称
    fund_code VARCHAR(10),                           -- 基金代码 (为空表示监控所有基金)
    rule_type VARCHAR(50) NOT NULL,                  -- 规则类型 (price_change, threshold, trend)
    condition_operator VARCHAR(10) NOT NULL,         -- 条件操作符 (>, <, >=, <=, ==)
    threshold_value DECIMAL(10, 4),                  -- 阈值
    notification_channels TEXT[],                    -- 通知渠道
    is_active BOOLEAN DEFAULT true,                  -- 是否启用
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建监控规则索引
CREATE INDEX IF NOT EXISTS idx_monitor_rules_fund_code ON monitor_rules(fund_code);
CREATE INDEX IF NOT EXISTS idx_monitor_rules_active ON monitor_rules(is_active);

-- 监控结果表
CREATE TABLE IF NOT EXISTS monitor_results (
    id BIGSERIAL PRIMARY KEY,
    rule_id INTEGER NOT NULL REFERENCES monitor_rules(id),
    fund_code VARCHAR(10) NOT NULL,
    trigger_time TIMESTAMP NOT NULL,                 -- 触发时间
    trigger_value DECIMAL(10, 4),                    -- 触发时的值
    threshold_value DECIMAL(10, 4),                  -- 阈值
    notification_sent BOOLEAN DEFAULT false,         -- 是否已发送通知
    notification_sent_at TIMESTAMP,                  -- 通知发送时间
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建监控结果索引
CREATE INDEX IF NOT EXISTS idx_monitor_results_rule_id ON monitor_results(rule_id);
CREATE INDEX IF NOT EXISTS idx_monitor_results_fund_code ON monitor_results(fund_code);
CREATE INDEX IF NOT EXISTS idx_monitor_results_trigger_time ON monitor_results(trigger_time);

-- 通知配置表
CREATE TABLE IF NOT EXISTS notification_configs (
    id SERIAL PRIMARY KEY,
    config_name VARCHAR(100) NOT NULL,               -- 配置名称
    channel_type VARCHAR(50) NOT NULL,               -- 渠道类型 (wechat, email, sms)
    config_data JSONB NOT NULL,                      -- 配置数据 (JSON格式)
    is_active BOOLEAN DEFAULT true,                  -- 是否启用
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 通知记录表
CREATE TABLE IF NOT EXISTS notification_logs (
    id BIGSERIAL PRIMARY KEY,
    monitor_result_id BIGINT REFERENCES monitor_results(id),
    channel_type VARCHAR(50) NOT NULL,
    recipient VARCHAR(200) NOT NULL,                 -- 接收者
    message_content TEXT,                            -- 消息内容
    send_status VARCHAR(20) DEFAULT 'pending',       -- 发送状态 (pending, sent, failed)
    error_message TEXT,                              -- 错误信息
    sent_at TIMESTAMP,                               -- 发送时间
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建通知记录索引
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notification_logs(send_status);
CREATE INDEX IF NOT EXISTS idx_notification_logs_sent_at ON notification_logs(sent_at);

-- 回测策略表
CREATE TABLE IF NOT EXISTS backtest_strategies (
    id SERIAL PRIMARY KEY,
    strategy_name VARCHAR(100) NOT NULL,             -- 策略名称
    strategy_type VARCHAR(50) NOT NULL,              -- 策略类型 (regular_investment, value_averaging)
    fund_codes VARCHAR(500) NOT NULL,                -- 基金代码列表 (逗号分隔)
    investment_amount DECIMAL(12, 2) NOT NULL,       -- 投资金额
    investment_frequency VARCHAR(20) NOT NULL,       -- 投资频率 (daily, weekly, monthly)
    start_date DATE NOT NULL,                        -- 回测开始日期
    end_date DATE NOT NULL,                          -- 回测结束日期
    strategy_params JSONB,                           -- 策略参数 (JSON格式)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 回测结果表
CREATE TABLE IF NOT EXISTS backtest_results (
    id BIGSERIAL PRIMARY KEY,
    strategy_id INTEGER NOT NULL REFERENCES backtest_strategies(id),
    total_invested DECIMAL(12, 2) NOT NULL,          -- 总投入金额
    total_value DECIMAL(12, 2) NOT NULL,             -- 总价值
    total_return DECIMAL(10, 4) NOT NULL,            -- 总收益率
    annualized_return DECIMAL(8, 4),                 -- 年化收益率
    max_drawdown DECIMAL(8, 4),                      -- 最大回撤
    sharpe_ratio DECIMAL(8, 4),                      -- 夏普比率
    volatility DECIMAL(8, 4),                        -- 波动率
    win_rate DECIMAL(5, 4),                          -- 胜率
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建回测结果索引
CREATE INDEX IF NOT EXISTS idx_backtest_results_strategy_id ON backtest_results(strategy_id);

-- 用户表 (简单版本)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 系统配置表
CREATE TABLE IF NOT EXISTS system_configs (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 插入默认系统配置
INSERT INTO system_configs (config_key, config_value, description) VALUES
('data_collection_time', '18:00', '数据采集时间 (24小时格式)'),
('notification_batch_size', '100', '通知批处理大小'),
('max_retry_attempts', '3', '最大重试次数'),
('default_timezone', 'Asia/Shanghai', '默认时区')
ON CONFLICT (config_key) DO NOTHING;

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为需要的表创建更新时间触发器
CREATE TRIGGER update_funds_updated_at BEFORE UPDATE ON funds
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_monitor_rules_updated_at BEFORE UPDATE ON monitor_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_configs_updated_at BEFORE UPDATE ON notification_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_configs_updated_at BEFORE UPDATE ON system_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 创建分区表函数 (按月分区净值数据)
-- 注意：这部分需要在实际数据量较大时启用
/*
CREATE OR REPLACE FUNCTION create_monthly_partition(table_name text, start_date date)
RETURNS void AS $$
DECLARE
    partition_name text;
    end_date date;
BEGIN
    partition_name := table_name || '_' || to_char(start_date, 'YYYY_MM');
    end_date := start_date + interval '1 month';

    EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF %I
                    FOR VALUES FROM (%L) TO (%L)',
                   partition_name, table_name, start_date, end_date);
END;
$$ LANGUAGE plpgsql;
*/