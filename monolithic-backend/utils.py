"""
工具函数模块
提供日志记录、密码验证、token 创建等通用功能
"""

import logging
from datetime import datetime, timedelta
from typing import Optional, Union
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status

from config import settings

# 密码验证上下文
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_logger(name: str) -> logging.Logger:
    """获取配置好的日志记录器"""
    logger = logging.getLogger(name)
    
    if not logger.handlers:
        # 设置日志格式
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        
        # 控制台处理器
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(formatter)
        logger.addHandler(console_handler)
        
        # 设置日志级别
        logger.setLevel(logging.INFO)
    
    return logger

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """验证密码"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """获取密码哈希值"""
    return pwd_context.hash(password)

def create_access_token(
    data: dict, 
    expires_delta: Optional[timedelta] = None
) -> str:
    """创建访问令牌"""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    
    encoded_jwt = jwt.encode(
        to_encode, 
        settings.SECRET_KEY, 
        algorithm=settings.ALGORITHM
    )
    
    return encoded_jwt

def verify_token(token: str) -> Optional[dict]:
    """验证访问令牌"""
    try:
        payload = jwt.decode(
            token, 
            settings.SECRET_KEY, 
            algorithms=[settings.ALGORITHM]
        )
        username: str = payload.get("sub")
        if username is None:
            return None
        return {"username": username}
    except JWTError:
        return None

def validate_fund_code(fund_code: str) -> bool:
    """验证基金代码格式"""
    if not fund_code:
        return False
    
    # 基金代码通常是 6 位数字
    return fund_code.isdigit() and len(fund_code) == 6

def format_currency(amount: float, precision: int = 2) -> str:
    """格式化货币金额"""
    return f"{amount:,.{precision}f}"

def format_percentage(value: float, precision: int = 2) -> str:
    """格式化百分比"""
    return f"{value * 100:.{precision}f}%"

def calculate_daily_change(current: float, previous: float) -> float:
    """计算日涨跌幅"""
    if previous == 0:
        return 0.0
    return (current - previous) / previous

def parse_date_string(date_string: str, format: str = "%Y-%m-%d") -> datetime:
    """解析日期字符串"""
    try:
        return datetime.strptime(date_string, format)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"日期格式错误: {date_string}，应使用格式: {format}"
        )

def validate_date_range(start_date: datetime, end_date: datetime) -> bool:
    """验证日期范围"""
    if start_date >= end_date:
        return False
    
    # 检查日期范围不能超过 5 年
    max_range = timedelta(days=365 * 5)
    return (end_date - start_date) <= max_range

def safe_divide(numerator: float, denominator: float) -> float:
    """安全除法，避免除零错误"""
    if denominator == 0:
        return 0.0
    return numerator / denominator

def chunk_list(lst: list, chunk_size: int) -> list:
    """将列表分块"""
    return [lst[i:i + chunk_size] for i in range(0, len(lst), chunk_size)]

def merge_dicts(*dicts: dict) -> dict:
    """合并多个字典"""
    result = {}
    for d in dicts:
        if d:
            result.update(d)
    return result

class DataValidator:
    """数据验证工具类"""
    
    @staticmethod
    def validate_fund_nav_data(nav_data: dict) -> bool:
        """验证基金净值数据"""
        required_fields = ["nav_date", "nav", "acc_nav"]
        return all(field in nav_data for field in required_fields)
    
    @staticmethod
    def validate_backtest_parameters(params: dict) -> bool:
        """验证回测参数"""
        required_fields = ["fund_codes"]
        if not all(field in params for field in required_fields):
            return False
        
        # 验证基金代码
        fund_codes = params["fund_codes"]
        if not isinstance(fund_codes, list) or len(fund_codes) == 0:
            return False
        
        return all(validate_fund_code(code) for code in fund_codes)
    
    @staticmethod
    def validate_monitor_rule(rule_data: dict) -> bool:
        """验证监控规则数据"""
        required_fields = ["name", "fund_codes", "alert_threshold"]
        if not all(field in rule_data for field in required_fields):
            return False
        
        # 验证基金代码
        fund_codes = rule_data["fund_codes"]
        if not isinstance(fund_codes, list) or len(fund_codes) == 0:
            return False
        
        return all(validate_fund_code(code) for code in fund_codes)

# 全局日志记录器
logger = get_logger(__name__)