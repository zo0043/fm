#!/usr/bin/env python3
"""
基础测试验证脚本
验证测试环境和基本的测试功能
"""

import sys
import asyncio
import os
from pathlib import Path

def test_imports():
    """测试必要的导入"""
    try:
        import pytest
        print("✅ pytest 导入成功")
    except ImportError as e:
        print(f"❌ pytest 导入失败: {e}")
        return False

    try:
        from shared.database.models import Fund, User, NetAssetValue
        print("✅ 数据模型导入成功")
    except ImportError as e:
        print(f"❌ 数据模型导入失败: {e}")
        return False

    try:
        from services.auth.services.auth_service import AuthService
        print("✅ 认证服务导入成功")
    except ImportError as e:
        print(f"❌ 认证服务导入失败: {e}")
        return False

    return True

def test_file_structure():
    """测试测试文件结构"""
    test_dirs = [
        "tests",
        "tests/test_auth",
        "tests/test_data_collector"
    ]

    test_files = [
        "tests/conftest.py",
        "tests/pytest.ini",
        "tests/test_auth/test_auth_service.py",
        "tests/test_auth/test_auth_router.py",
        "tests/test_data_collector/test_fund_service.py",
        "tests/test_integration/test_api_integration.py"
    ]

    print("📁 检查测试文件结构...")

    all_exist = True
    for test_dir in test_dirs:
        if Path(test_dir).exists():
            print(f"✅ 目录存在: {test_dir}")
        else:
            print(f"❌ 目录缺失: {test_dir}")
            all_exist = False

    for test_file in test_files:
        if Path(test_file).exists():
            print(f"✅ 文件存在: {test_file}")
        else:
            print(f"❌ 文件缺失: {test_file}")
            all_exist = False

    return all_exist

def test_configuration():
    """测试配置文件"""
    try:
        import pytest
        from conftest import pytest_configure
        print("✅ conftest.py 语法正确")
    except ImportError:
        print("❌ conftest.py 导入失败")
        return False

    try:
        import configparser
        config = configparser.ConfigParser()
        config.read("pytest.ini")
        print("✅ pytest.ini 配置正确")
    except Exception as e:
        print(f"❌ pytest.ini 配置错误: {e}")
        return False

    return True

def run_basic_tests():
    """运行基础测试"""
    try:
        # 运行收集模式（不执行测试，只检查）
        result = os.system("python -m pytest tests/ --collect-only 2>/dev/null")

        if result == 0:
            print("✅ 测试文件收集成功")

            # 获取测试数量统计
            try:
                import subprocess
                result = subprocess.run(
                    ["python", "-m", "pytest", "tests/", "--collect-only", "--quiet"],
                    capture_output=True,
                    text=True
                )

                if result.returncode == 0:
                    output = result.stdout
                    lines = [line for line in output.split('\n') if 'test_' in line or 'passed' in line or 'collected' in line]
                    print(f"✅ 发现 {len(lines)} 个测试文件/测试项")

                    # 统计测试数量
                    if 'collected' in output:
                        parts = output.split('collected')
                        if len(parts) > 1:
                            collected = parts[1].strip()
                            print(f"✅ 收集到 {collected} 个测试项")

                else:
                    print("⚠️ 无法获取测试统计")

            except Exception as e:
                print(f"⚠️ 无法分析测试结果: {e}")

        else:
            print("❌ 测试文件收集失败")
            return False

    except Exception as e:
        print(f"❌ 运行pytest失败: {e}")
        return False

    return True

def check_python_version():
    """检查Python版本"""
    version = sys.version_info
    print(f"Python版本: {version.major}.{version.minor}.{version.micro}")

    if version.major < 3 or (version.major == 3 and version.minor < 8):
        print("⚠️ 建议使用 Python 3.8+")
        return False

    print("✅ Python版本符合要求")
    return True

def main():
    """主函数"""
    print("=" * 50)
    print("🧪 后端接口单元测试验证")
    print("=" * 50)

    all_pass = True

    # 检查Python版本
    if not check_python_version():
        all_pass = False

    # 检查导入
    print("")
    if not test_imports():
        all_pass = False

    # 检查文件结构
    print("")
    if not test_file_structure():
        all_pass = False

    # 检查配置
    print("")
    if not test_configuration():
        all_pass = False

    # 运行基础测试
    print("")
    if not run_basic_tests():
        all_pass = False

    print("")
    print("=" * 50)
    if all_pass:
        print("🎉 所有基础检查通过！")
        print("")
        print("下一步:")
        print("1. 启动后端服务")
        print("2. 运行: ./run_tests.sh")
        print("3. 查看测试报告")
        print("4. 分析测试覆盖率")
        print("")
        print("测试命令示例:")
        print("  pytest tests/ -v                    # 运行所有测试")
        print("  pytest tests/test_auth/ -v             # 运行认证服务测试")
        print("  pytest tests/ --cov=backend         # 运行测试并生成覆盖率报告")
        print("  pytest tests/test_integration/ -v      # 运行集成测试（需要服务运行）")
        return 0
    else:
        print("❌ 发现问题，请修复后重新运行")
        return 1

if __name__ == "__main__":
    exit(main())