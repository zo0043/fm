"""
数据验证工具
提供基金数据验证和清洗功能
"""

import re
from datetime import datetime, date
from typing import Optional, List, Dict, Any, Union
from decimal import Decimal, InvalidOperation
from pydantic import BaseModel, validator, Field
import logging

logger = logging.getLogger(__name__)


class FundCodeValidator:
    """基金代码验证器"""

    @staticmethod
    def is_valid_fund_code(code: str) -> bool:
        """
        验证基金代码格式

        Args:
            code: 基金代码

        Returns:
            bool: 是否有效
        """
        if not code or not isinstance(code, str):
            return False

        # 基金代码通常是6位数字
        if re.match(r'^\d{6}$', code):
            return True

        # 一些特殊基金代码可能有前缀
        if re.match(r'^[A-Z]{2}\d{4}$', code):
            return True

        return False

    @staticmethod
    def normalize_fund_code(code: str) -> str:
        """
        标准化基金代码

        Args:
            code: 原始基金代码

        Returns:
            str: 标准化后的基金代码
        """
        if not code:
            return ""

        # 移除空格和特殊字符
        normalized = re.sub(r'[^\dA-Z]', '', str(code).upper())

        # 如果是6位数字，直接返回
        if re.match(r'^\d{6}$', normalized):
            return normalized

        # 如果有前缀，保留前缀和数字
        if re.match(r'^[A-Z]{2}\d{4}$', normalized):
            return normalized

        # 如果只有数字但不是6位，尝试补零
        if normalized.isdigit() and len(normalized) < 6:
            return normalized.zfill(6)

        return normalized


class FundNameValidator:
    """基金名称验证器"""

    @staticmethod
    def is_valid_fund_name(name: str) -> bool:
        """
        验证基金名称

        Args:
            name: 基金名称

        Returns:
            bool: 是否有效
        """
        if not name or not isinstance(name, str):
            return False

        # 基金名称长度通常在2-200个字符之间
        if len(name.strip()) < 2 or len(name.strip()) > 200:
            return False

        # 不应包含特殊字符
        if re.search(r'[<>"\'/\\]', name):
            return False

        return True

    @staticmethod
    def normalize_fund_name(name: str) -> str:
        """
        标准化基金名称

        Args:
            name: 原始基金名称

        Returns:
            str: 标准化后的基金名称
        """
        if not name:
            return ""

        # 移除前后空格
        normalized = name.strip()

        # 移除多余的空格
        normalized = re.sub(r'\s+', ' ', normalized)

        return normalized


class NavValidator:
    """净值验证器"""

    @staticmethod
    def is_valid_nav(nav: Union[str, float, Decimal]) -> bool:
        """
        验证净值是否有效

        Args:
            nav: 净值

        Returns:
            bool: 是否有效
        """
        try:
            nav_decimal = Decimal(str(nav))
            # 净值应该大于0且通常小于1000
            return 0 < nav_decimal < 10000
        except (InvalidOperation, ValueError):
            return False

    @staticmethod
    def normalize_nav(nav: Union[str, float, Decimal]) -> Optional[Decimal]:
        """
        标准化净值

        Args:
            nav: 原始净值

        Returns:
            Optional[Decimal]: 标准化后的净值
        """
        try:
            nav_decimal = Decimal(str(nav))
            if NavValidator.is_valid_nav(nav_decimal):
                return nav_decimal.quantize(Decimal('0.0001'))
            return None
        except (InvalidOperation, ValueError):
            return None

    @staticmethod
    def is_valid_change_rate(rate: Union[str, float, Decimal]) -> bool:
        """
        验证涨跌幅是否有效

        Args:
            rate: 涨跌幅

        Returns:
            bool: 是否有效
        """
        try:
            rate_decimal = Decimal(str(rate))
            # 涨跌幅通常在-20%到20%之间
            return -0.5 <= rate_decimal <= 0.5
        except (InvalidOperation, ValueError):
            return False

    @staticmethod
    def normalize_change_rate(rate: Union[str, float, Decimal]) -> Optional[Decimal]:
        """
        标准化涨跌幅

        Args:
            rate: 原始涨跌幅

        Returns:
            Optional[Decimal]: 标准化后的涨跌幅
        """
        try:
            rate_decimal = Decimal(str(rate))
            if NavValidator.is_valid_change_rate(rate_decimal):
                return rate_decimal.quantize(Decimal('0.0001'))
            return None
        except (InvalidOperation, ValueError):
            return None


class DateValidator:
    """日期验证器"""

    @staticmethod
    def is_valid_date(date_str: str) -> bool:
        """
        验证日期字符串是否有效

        Args:
            date_str: 日期字符串

        Returns:
            bool: 是否有效
        """
        if not date_str:
            return False

        # 支持的日期格式
        date_formats = [
            '%Y-%m-%d',
            '%Y/%m/%d',
            '%Y%m%d',
            '%Y-%m-%d %H:%M:%S',
            '%Y/%m/%d %H:%M:%S',
        ]

        for fmt in date_formats:
            try:
                datetime.strptime(date_str, fmt)
                return True
            except ValueError:
                continue

        return False

    @staticmethod
    def normalize_date(date_str: str) -> Optional[date]:
        """
        标准化日期

        Args:
            date_str: 日期字符串

        Returns:
            Optional[date]: 标准化后的日期
        """
        if not date_str:
            return None

        # 支持的日期格式
        date_formats = [
            '%Y-%m-%d',
            '%Y/%m/%d',
            '%Y%m%d',
            '%Y-%m-%d %H:%M:%S',
            '%Y/%m/%d %H:%M:%S',
        ]

        for fmt in date_formats:
            try:
                dt = datetime.strptime(date_str, fmt)
                return dt.date()
            except ValueError:
                continue

        return None

    @staticmethod
    def is_valid_trading_date(trading_date: date) -> bool:
        """
        验证是否为有效交易日

        Args:
            trading_date: 日期

        Returns:
            bool: 是否为交易日
        """
        # 周末不是交易日
        if trading_date.weekday() >= 5:  # 5=Saturday, 6=Sunday
            return False

        # 这里可以添加节假日检查逻辑
        # 暂时只检查周末
        return True


class FundTypeValidator:
    """基金类型验证器"""

    VALID_FUND_TYPES = {
        '股票型', '债券型', '混合型', '指数型', 'QDII', 'FOF', '货币型',
        'ETF', 'LOF', '分级基金', '保本基金', '理财基金'
    }

    @staticmethod
    def is_valid_fund_type(fund_type: str) -> bool:
        """
        验证基金类型是否有效

        Args:
            fund_type: 基金类型

        Returns:
            bool: 是否有效
        """
        if not fund_type:
            return False

        # 检查是否在预定义类型中
        if fund_type in FundTypeValidator.VALID_FUND_TYPES:
            return True

        # 检查是否包含有效类型关键字
        for valid_type in FundTypeValidator.VALID_FUND_TYPES:
            if valid_type in fund_type:
                return True

        return False

    @staticmethod
    def normalize_fund_type(fund_type: str) -> str:
        """
        标准化基金类型

        Args:
            fund_type: 原始基金类型

        Returns:
            str: 标准化后的基金类型
        """
        if not fund_type:
            return ""

        # 移除空格和特殊字符
        normalized = re.sub(r'\s+', '', fund_type.strip())

        # 查找匹配的有效类型
        for valid_type in FundTypeValidator.VALID_FUND_TYPES:
            if valid_type in normalized or normalized in valid_type:
                return valid_type

        return normalized


# Pydantic模型用于数据验证
class FundDataModel(BaseModel):
    """基金数据模型"""
    fund_code: str = Field(..., description="基金代码")
    fund_name: str = Field(..., description="基金名称")
    fund_type: str = Field(..., description="基金类型")
    fund_company: Optional[str] = Field(None, description="基金公司")
    establish_date: Optional[date] = Field(None, description="成立日期")
    fund_manager: Optional[str] = Field(None, description="基金经理")
    fund_size: Optional[Decimal] = Field(None, description="基金规模")
    management_fee_rate: Optional[Decimal] = Field(None, description="管理费率")
    custody_fee_rate: Optional[Decimal] = Field(None, description="托管费率")

    @validator('fund_code')
    def validate_fund_code(cls, v):
        if not FundCodeValidator.is_valid_fund_code(v):
            raise ValueError(f'无效的基金代码: {v}')
        return FundCodeValidator.normalize_fund_code(v)

    @validator('fund_name')
    def validate_fund_name(cls, v):
        if not FundNameValidator.is_valid_fund_name(v):
            raise ValueError(f'无效的基金名称: {v}')
        return FundNameValidator.normalize_fund_name(v)

    @validator('fund_type')
    def validate_fund_type(cls, v):
        if not FundTypeValidator.is_valid_fund_type(v):
            logger.warning(f'未知的基金类型: {v}')
        return FundTypeValidator.normalize_fund_type(v)


class NavDataModel(BaseModel):
    """净值数据模型"""
    fund_code: str = Field(..., description="基金代码")
    nav_date: date = Field(..., description="净值日期")
    unit_nav: Decimal = Field(..., description="单位净值")
    accumulated_nav: Decimal = Field(..., description="累计净值")
    daily_change_rate: Optional[Decimal] = Field(None, description="日涨跌幅")
    daily_change_amount: Optional[Decimal] = Field(None, description="日涨跌金额")

    @validator('fund_code')
    def validate_fund_code(cls, v):
        if not FundCodeValidator.is_valid_fund_code(v):
            raise ValueError(f'无效的基金代码: {v}')
        return FundCodeValidator.normalize_fund_code(v)

    @validator('unit_nav', 'accumulated_nav')
    def validate_nav(cls, v):
        if not NavValidator.is_valid_nav(v):
            raise ValueError(f'无效的净值: {v}')
        return NavValidator.normalize_nav(v)

    @validator('daily_change_rate')
    def validate_change_rate(cls, v):
        if v is not None and not NavValidator.is_valid_change_rate(v):
            raise ValueError(f'无效的涨跌幅: {v}')
        return NavValidator.normalize_change_rate(v) if v is not None else None

    @validator('nav_date')
    def validate_trading_date(cls, v):
        if not DateValidator.is_valid_trading_date(v):
            logger.warning(f'可能不是交易日: {v}')
        return v


class DataCleaner:
    """数据清洗器"""

    @staticmethod
    def clean_fund_data(raw_data: Dict[str, Any]) -> Optional[FundDataModel]:
        """
        清洗基金数据

        Args:
            raw_data: 原始基金数据

        Returns:
            Optional[FundDataModel]: 清洗后的基金数据
        """
        try:
            # 移除空值和None
            cleaned_data = {k: v for k, v in raw_data.items() if v is not None and v != ''}

            # 验证和标准化
            return FundDataModel(**cleaned_data)
        except Exception as e:
            logger.error(f'清洗基金数据失败: {e}, 原始数据: {raw_data}')
            return None

    @staticmethod
    def clean_nav_data(raw_data: Dict[str, Any]) -> Optional[NavDataModel]:
        """
        清洗净值数据

        Args:
            raw_data: 原始净值数据

        Returns:
            Optional[NavDataModel]: 清洗后的净值数据
        """
        try:
            # 移除空值和None
            cleaned_data = {k: v for k, v in raw_data.items() if v is not None and v != ''}

            # 验证和标准化
            return NavDataModel(**cleaned_data)
        except Exception as e:
            logger.error(f'清洗净值数据失败: {e}, 原始数据: {raw_data}')
            return None

    @staticmethod
    def batch_clean_fund_data(raw_data_list: List[Dict[str, Any]]) -> List[FundDataModel]:
        """
        批量清洗基金数据

        Args:
            raw_data_list: 原始基金数据列表

        Returns:
            List[FundDataModel]: 清洗后的基金数据列表
        """
        cleaned_list = []
        for raw_data in raw_data_list:
            cleaned_data = DataCleaner.clean_fund_data(raw_data)
            if cleaned_data:
                cleaned_list.append(cleaned_data)

        logger.info(f'批量清洗基金数据完成: {len(cleaned_list)}/{len(raw_data_list)}')
        return cleaned_list

    @staticmethod
    def batch_clean_nav_data(raw_data_list: List[Dict[str, Any]]) -> List[NavDataModel]:
        """
        批量清洗净值数据

        Args:
            raw_data_list: 原始净值数据列表

        Returns:
            List[NavDataModel]: 清洗后的净值数据列表
        """
        cleaned_list = []
        for raw_data in raw_data_list:
            cleaned_data = DataCleaner.clean_nav_data(raw_data)
            if cleaned_data:
                cleaned_list.append(cleaned_data)

        logger.info(f'批量清洗净值数据完成: {len(cleaned_list)}/{len(raw_data_list)}')
        return cleaned_list