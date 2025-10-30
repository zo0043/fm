"""
基金服务单元测试
"""

import pytest
from datetime import datetime, date
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from services.data_collector.services.fund_service import FundService
from shared.database.models import Fund, NetAssetValue


@pytest.mark.unit
class TestFundService:
    """基金服务测试类"""

    @pytest.fixture
    def fund_service(self, mock_db_session):
        """创建基金服务实例"""
        return FundService(mock_db_session)

    @pytest.fixture
    def sample_fund_data(self):
        """示例基金数据"""
        return {
            "fund_code": "000001",
            "fund_name": "华夏成长混合",
            "fund_type": "混合型",
            "fund_company": "华夏基金管理有限公司",
            "establish_date": "2001-12-18",
            "fund_manager": "张三",
            "fund_size": 100.50,
            "management_fee_rate": 0.0150,
            "custody_fee_rate": 0.0025,
            "status": "active"
        }

    @pytest.fixture
    def sample_nav_data(self):
        """示例净值数据"""
        return {
            "fund_code": "000001",
            "nav_date": "2024-01-01",
            "unit_nav": 1.2345,
            "accumulated_nav": 2.3456,
            "daily_change": 0.0123,
            "daily_change_percent": 1.01
        }

    async def test_create_fund_success(self, fund_service, sample_fund_data):
        """测试成功创建基金"""
        # Arrange
        mock_db_session.execute.return_value.scalar.return_value = None  # 基金不存在
        mock_db_session.add = MagicMock()
        mock_db_session.commit = MagicMock()
        mock_db_session.refresh = MagicMock()

        # Act
        result = await fund_service.create_fund(sample_fund_data)

        # Assert
        assert result is not None
        assert result.fund_code == sample_fund_data["fund_code"]
        assert result.fund_name == sample_fund_data["fund_name"]
        assert result.fund_type == sample_fund_data["fund_type"]
        mock_db_session.add.assert_called_once()
        mock_db_session.commit.assert_called_once()

    async def test_create_fund_already_exists(self, fund_service, sample_fund_data):
        """测试创建基金时基金已存在"""
        # Arrange
        existing_fund = MagicMock(spec=Fund)
        existing_fund.fund_code = sample_fund_data["fund_code"]
        mock_db_session.execute.return_value.scalar.return_value = 1

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await fund_service.create_fund(sample_fund_data)

        assert exc_info.value.status_code == 400
        assert "基金已存在" in str(exc_info.value.detail)

    async def test_update_fund_success(self, fund_service, sample_fund_data):
        """测试成功更新基金"""
        # Arrange
        fund_code = "000001"
        existing_fund = MagicMock(spec=Fund)
        existing_fund.fund_code = fund_code

        mock_db_session.execute.return_value.scalar.return_value = 1
        mock_db_session.commit = MagicMock()
        mock_db_session.refresh = MagicMock()

        # Act
        result = await fund_service.update_fund(fund_code, sample_fund_data)

        # Assert
        assert result is not None
        assert result.fund_name == sample_fund_data["fund_name"]
        mock_db_session.commit.assert_called_once()

    async def test_update_fund_not_found(self, fund_service, sample_fund_data):
        """测试更新基金时基金不存在"""
        # Arrange
        fund_code = "000001"
        mock_db_session.execute.return_value.scalar.return_value = 0

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await fund_service.update_fund(fund_code, sample_fund_data)

        assert exc_info.value.status_code == 404
        assert "基金不存在" in str(exc_info.value.detail)

    async def test_get_fund_by_code_success(self, fund_service):
        """测试根据代码获取基金成功"""
        # Arrange
        fund_code = "000001"
        mock_fund = MagicMock(spec=Fund)
        mock_fund.fund_code = fund_code
        mock_fund.fund_name = "华夏成长混合"

        mock_db_session.execute.return_value.scalar.return_value = 1
        mock_db_session.execute.return_value.scalars.return_value.first.return_value = mock_fund

        # Act
        result = await fund_service.get_fund_by_code(fund_code)

        # Assert
        assert result is not None
        assert result.fund_code == fund_code

    async def test_get_fund_by_code_not_found(self, fund_service):
        """测试根据代码获取基金时基金不存在"""
        # Arrange
        fund_code = "000001"
        mock_db_session.execute.return_value.scalar.return_value = 0

        # Act
        result = await fund_service.get_fund_by_code(fund_code)

        # Assert
        assert result is None

    async def test_get_funds_success(self, fund_service):
        """测试获取基金列表成功"""
        # Arrange
        mock_funds = [MagicMock(spec=Fund) for _ in range(3)]
        for i, fund in enumerate(mock_funds):
            fund.fund_code = f"00000{i+1}"
            fund.fund_name = f"基金{i+1}"

        mock_db_session.execute.return_value.scalars.return_value.all.return_value = mock_funds

        # Act
        result = await fund_service.get_funds(page=1, page_size=10)

        # Assert
        assert result is not None
        assert len(result.funds) == 3
        assert result.total == 3
        assert result.page == 1
        assert result.page_size == 10

    async def test_get_funds_with_filter(self, fund_service):
        """测试带筛选条件获取基金列表"""
        # Arrange
        filter_params = {"fund_type": "股票型", "status": "active"}
        mock_funds = [MagicMock(spec=Fund)]
        mock_funds[0].fund_type = "股票型"
        mock_funds[0].status = "active"

        mock_db_session.execute.return_value.scalars.return_value.all.return_value = mock_funds

        # Act
        result = await fund_service.get_funds(
            page=1,
            page_size=10,
            fund_type=filter_params["fund_type"],
            status=filter_params["status"]
        )

        # Assert
        assert result is not None
        assert len(result.funds) == 1

    async def test_search_funds_success(self, fund_service):
        """测试搜索基金成功"""
        # Arrange
        keyword = "华夏"
        mock_funds = [MagicMock(spec=Fund)]
        mock_funds[0].fund_name = "华夏成长混合"
        mock_funds[0].fund_code = "000001"

        mock_db_session.execute.return_value.scalars.return_value.all.return_value = mock_funds

        # Act
        result = await fund_service.search_funds(keyword)

        # Assert
        assert result is not None
        assert len(result.funds) == 1
        assert result.funds[0].fund_name == "华夏成长混合"

    async def test_search_funds_no_results(self, fund_service):
        """测试搜索基金无结果"""
        # Arrange
        keyword = "不存在的基金"
        mock_db_session.execute.return_value.scalars.return_value.all.return_value = []

        # Act
        result = await fund_service.search_funds(keyword)

        # Assert
        assert result is not None
        assert len(result.funds) == 0

    async def test_get_fund_types_success(self, fund_service):
        """测试获取基金类型成功"""
        # Arrange
        expected_types = ["股票型", "债券型", "混合型", "货币型", "QDII"]
        mock_db_session.execute.return_value.scalars.return_value.unique.return_value.all.return_value = expected_types

        # Act
        result = await fund_service.get_fund_types()

        # Assert
        assert result is not None
        assert result.fund_types == expected_types

    async def test_get_fund_companies_success(self, fund_service):
        """测试获取基金公司成功"""
        # Arrange
        expected_companies = ["华夏基金管理有限公司", "易方达基金管理有限公司", "南方基金管理有限公司"]
        mock_db_session.execute.return_value.scalars.return_value.unique.return_value.all.return_value = expected_companies

        # Act
        result = await fund_service.get_fund_companies()

        # Assert
        assert result is not None
        assert result.fund_companies == expected_companies

    async def test_add_nav_data_success(self, fund_service, sample_nav_data):
        """测试添加净值数据成功"""
        # Arrange
        mock_db_session.add = MagicMock()
        mock_db_session.commit = MagicMock()
        mock_db_session.refresh = MagicMock()

        # Act
        result = await fund_service.add_nav_data(sample_nav_data)

        # Assert
        assert result is not None
        assert result.fund_code == sample_nav_data["fund_code"]
        assert result.unit_nav == sample_nav_data["unit_nav"]
        mock_db_session.add.assert_called_once()
        mock_db_session.commit.assert_called_once()

    async def test_add_nav_data_invalid_data(self, fund_service):
        """测试添加净值数据时数据无效"""
        # Arrange
        invalid_nav_data = {
            "fund_code": "",  # 无效的基金代码
            "nav_date": "invalid_date",
            "unit_nav": -1.0  # 无效的净值
        }

        # Act & Assert
        with pytest.raises(ValueError):
            await fund_service.add_nav_data(invalid_nav_data)

    async def test_get_latest_nav_success(self, fund_service):
        """测试获取最新净值成功"""
        # Arrange
        fund_code = "000001"
        mock_nav = MagicMock(spec=NetAssetValue)
        mock_nav.fund_code = fund_code
        mock_nav.nav_date = datetime.now().date()
        mock_nav.unit_nav = 1.2345

        mock_db_session.execute.return_value.scalars.return_value.first.return_value = mock_nav

        # Act
        result = await fund_service.get_latest_nav(fund_code)

        # Assert
        assert result is not None
        assert result.fund_code == fund_code
        assert result.unit_nav == 1.2345

    async def test_get_latest_nav_not_found(self, fund_service):
        """测试获取最新净值时数据不存在"""
        # Arrange
        fund_code = "000001"
        mock_db_session.execute.return_value.scalars.return_value.first.return_value = None

        # Act
        result = await fund_service.get_latest_nav(fund_code)

        # Assert
        assert result is None

    async def test_get_nav_history_success(self, fund_service):
        """测试获取净值历史成功"""
        # Arrange
        fund_code = "000001"
        start_date = "2024-01-01"
        end_date = "2024-01-31"

        mock_navs = [MagicMock(spec=NetAssetValue) for _ in range(5)]
        for i, nav in enumerate(mock_navs):
            nav.fund_code = fund_code
            nav.nav_date = date(2024, 1, i + 1)
            nav.unit_nav = 1.0 + i * 0.01

        mock_db_session.execute.return_value.scalars.return_value.all.return_value = mock_navs

        # Act
        result = await fund_service.get_nav_history(fund_code, start_date, end_date)

        # Assert
        assert result is not None
        assert len(result.nav_data) == 5
        assert all(nav.fund_code == fund_code for nav in result.nav_data)

    async def test_get_nav_history_date_range(self, fund_service):
        """测试获取指定日期范围的净值历史"""
        # Arrange
        fund_code = "000001"
        start_date = "2024-01-15"
        end_date = "2024-01-20"

        mock_navs = [MagicMock(spec=NetAssetValue) for _ in range(6)]
        for i, nav in enumerate(mock_navs):
            nav.fund_code = fund_code
            nav.nav_date = date(2024, 1, i + 15)  # 1月15-20日

        mock_db_session.execute.return_value.scalars.return_value.all.return_value = mock_navs

        # Act
        result = await fund_service.get_nav_history(fund_code, start_date, end_date)

        # Assert
        assert result is not None
        assert len(result.nav_data) == 6
        # 验证日期范围
        dates = [nav.nav_date for nav in result.nav_data]
        assert min(dates) >= date(2024, 1, 15)
        assert max(dates) <= date(2024, 1, 20)

    async def test_delete_fund_success(self, fund_service):
        """测试删除基金成功"""
        # Arrange
        fund_code = "000001"
        mock_db_session.execute.return_value.rowcount = 1
        mock_db_session.commit = MagicMock()

        # Act
        result = await fund_service.delete_fund(fund_code)

        # Assert
        assert result is True
        mock_db_session.commit.assert_called_once()

    async def test_delete_fund_not_found(self, fund_service):
        """测试删除基金时基金不存在"""
        # Arrange
        fund_code = "000001"
        mock_db_session.execute.return_value.rowcount = 0

        # Act
        result = await fund_service.delete_fund(fund_code)

        # Assert
        assert result is False

    async def test_get_fund_statistics_success(self, fund_service):
        """测试获取基金统计信息成功"""
        # Arrange
        mock_db_session.execute.return_value.scalar.return_value = 100  # 总数
        mock_db_session.execute.return_value.scalar.return_value = 80   # 活跃数
        mock_db_session.execute.return_value.scalar.return_value = 95.5  # 总规模

        # Act
        result = await fund_service.get_fund_statistics()

        # Assert
        assert result is not None
        assert result.total_funds == 100
        assert result.active_funds == 80
        assert result.total_assets == 95.5

    def test_validate_fund_data_valid(self, fund_service, sample_fund_data):
        """测试验证基金数据有效"""
        # Act & Assert - 应该不抛出异常
        fund_service._validate_fund_data(sample_fund_data)

    def test_validate_fund_data_missing_fields(self, fund_service):
        """测试验证基金数据缺少必要字段"""
        # Arrange
        invalid_data = {
            "fund_name": "测试基金",
            # 缺少 fund_code
        }

        # Act & Assert
        with pytest.raises(ValueError) as exc_info:
            fund_service._validate_fund_data(invalid_data)

        assert "fund_code" in str(exc_info.value)

    def test_validate_fund_data_invalid_types(self, fund_service):
        """测试验证基金数据类型无效"""
        # Arrange
        invalid_data = {
            "fund_code": 123,  # 应该是字符串
            "fund_name": "测试基金",
            "fund_size": "100亿",  # 应该是数字
            "establish_date": "2024-01-01"
        }

        # Act & Assert
        with pytest.raises(ValueError) as exc_info:
            fund_service._validate_fund_data(invalid_data)

        assert "类型不正确" in str(exc_info.value)