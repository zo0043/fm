"""
消息模板引擎
"""

from typing import Dict, Any, Optional
from pathlib import Path
import os
from jinja2 import Environment, FileSystemLoader, Template, TemplateNotFound
import logging

from shared.utils import get_logger


class TemplateEngine:
    """消息模板引擎"""

    def __init__(self, template_dir: Optional[str] = None):
        self.logger = get_logger(self.__class__.__name__)
        self.template_dir = template_dir or self._get_default_template_dir()
        self.env = self._create_jinja_environment()
        self._load_default_templates()

    def _get_default_template_dir(self) -> str:
        """获取默认模板目录"""
        current_dir = Path(__file__).parent
        template_dir = current_dir / "templates"
        return str(template_dir)

    def _create_jinja_environment(self) -> Environment:
        """创建Jinja2环境"""
        try:
            # 确保模板目录存在
            os.makedirs(self.template_dir, exist_ok=True)

            env = Environment(
                loader=FileSystemLoader(self.template_dir),
                autoescape=True,
                trim_blocks=True,
                lstrip_blocks=True
            )

            # 添加自定义过滤器
            env.filters['percentage'] = self._format_percentage
            env.filters['currency'] = self._format_currency
            env.filters['datetime'] = self._format_datetime
            env.filters['truncate'] = self._truncate_text

            return env

        except Exception as e:
            self.logger.error(f"创建模板环境失败: {e}")
            # 返回基本环境
            return Environment(autoescape=True)

    def _load_default_templates(self):
        """加载默认模板"""
        try:
            default_templates = {
                'alert.html': self._get_default_alert_template_html(),
                'alert.txt': self._get_default_alert_template_text(),
                'daily_report.html': self._get_default_daily_report_template_html(),
                'daily_report.txt': self._get_default_daily_report_template_text(),
                'weekly_report.html': self._get_default_weekly_report_template_html(),
                'weekly_report.txt': self._get_default_weekly_report_template_text(),
            }

            for template_name, template_content in default_templates.items():
                template_path = Path(self.template_dir) / template_name
                if not template_path.exists():
                    with open(template_path, 'w', encoding='utf-8') as f:
                        f.write(template_content)
                    self.logger.info(f"创建默认模板: {template_name}")

        except Exception as e:
            self.logger.error(f"加载默认模板失败: {e}")

    def render_template(self, template_name: str, data: Dict[str, Any],
                       format_type: str = "both") -> Dict[str, str]:
        """
        渲染模板

        Args:
            template_name: 模板名称
            data: 模板数据
            format_type: 格式类型 (html, text, both)

        Returns:
            Dict[str, str]: 渲染结果
        """
        result = {}

        try:
            if format_type in ["html", "both"]:
                html_template_name = f"{template_name}.html"
                html_content = self._render_single_template(html_template_name, data)
                if html_content:
                    result["html"] = html_content

            if format_type in ["text", "both"]:
                text_template_name = f"{template_name}.txt"
                plain_content = self._render_single_template(text_template_name, data)
                if plain_content:
                    result["plain"] = plain_content

            # 如果没有找到任何模板，使用默认模板
            if not result:
                self.logger.warning(f"模板 {template_name} 不存在，使用默认模板")
                if template_name == "alert":
                    result = self._render_default_alert_template(data)

        except Exception as e:
            self.logger.error(f"渲染模板失败 {template_name}: {e}")
            # 返回错误信息
            result = {
                "plain": f"模板渲染失败: {str(e)}",
                "html": f"<p>模板渲染失败: {str(e)}</p>"
            }

        return result

    def _render_single_template(self, template_name: str, data: Dict[str, Any]) -> Optional[str]:
        """渲染单个模板"""
        try:
            template = self.env.get_template(template_name)
            return template.render(**data)
        except TemplateNotFound:
            self.logger.warning(f"模板文件不存在: {template_name}")
            return None
        except Exception as e:
            self.logger.error(f"渲染模板文件失败 {template_name}: {e}")
            return None

    def _render_default_alert_template(self, data: Dict[str, Any]) -> Dict[str, str]:
        """渲染默认告警模板"""
        fund_code = data.get('fund_code', 'Unknown')
        fund_name = data.get('fund_name', 'Unknown')
        rule_name = data.get('rule_name', 'Unknown')
        trigger_value = data.get('trigger_value', 0)
        threshold_value = data.get('threshold_value', 0)
        trigger_time = data.get('trigger_time', '')

        # 纯文本内容
        plain_content = f"""🚨 基金监控告警

基金代码: {fund_code}
基金名称: {fund_name}
触发规则: {rule_name}
触发值: {trigger_value}
阈值: {threshold_value}
触发时间: {trigger_time}

请及时关注！"""

        # HTML内容
        html_content = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>基金监控告警</title>
</head>
<body>
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8d7da; color: #721c24; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            <h2 style="margin: 0; color: #721c24;">🚨 基金监控告警</h2>
        </div>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; border: 1px solid #dee2e6;">
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="font-weight: bold; padding: 8px; border-bottom: 1px solid #dee2e6;">基金代码:</td>
                    <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">{fund_code}</td>
                </tr>
                <tr>
                    <td style="font-weight: bold; padding: 8px; border-bottom: 1px solid #dee2e6;">基金名称:</td>
                    <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">{fund_name}</td>
                </tr>
                <tr>
                    <td style="font-weight: bold; padding: 8px; border-bottom: 1px solid #dee2e6;">触发规则:</td>
                    <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">{rule_name}</td>
                </tr>
                <tr>
                    <td style="font-weight: bold; padding: 8px; border-bottom: 1px solid #dee2e6;">触发值:</td>
                    <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">{trigger_value}</td>
                </tr>
                <tr>
                    <td style="font-weight: bold; padding: 8px; border-bottom: 1px solid #dee2e6;">阈值:</td>
                    <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">{threshold_value}</td>
                </tr>
                <tr>
                    <td style="font-weight: bold; padding: 8px;">触发时间:</td>
                    <td style="padding: 8px;">{trigger_time}</td>
                </tr>
            </table>
        </div>

        <div style="margin-top: 20px; text-align: center; color: #6c757d; font-size: 14px;">
            <p>请及时关注！</p>
        </div>
    </div>
</body>
</html>"""

        return {
            "plain": plain_content,
            "html": html_content
        }

    # 自定义过滤器
    def _format_percentage(self, value: float, decimal_places: int = 2) -> str:
        """格式化为百分比"""
        try:
            if isinstance(value, (int, float)):
                return f"{value:.{decimal_places}f}%"
            return str(value)
        except:
            return str(value)

    def _format_currency(self, value: float, currency: str = "¥") -> str:
        """格式化为货币"""
        try:
            if isinstance(value, (int, float)):
                return f"{currency}{value:,.2f}"
            return str(value)
        except:
            return str(value)

    def _format_datetime(self, value: str, format_str: str = "%Y-%m-%d %H:%M:%S") -> str:
        """格式化日期时间"""
        try:
            from datetime import datetime
            if isinstance(value, str):
                dt = datetime.fromisoformat(value.replace('Z', '+00:00'))
                return dt.strftime(format_str)
            return str(value)
        except:
            return str(value)

    def _truncate_text(self, text: str, length: int = 100) -> str:
        """截断文本"""
        try:
            if len(text) > length:
                return text[:length] + "..."
            return text
        except:
            return str(text)

    # 默认模板内容
    def _get_default_alert_template_html(self) -> str:
        """获取默认告警HTML模板"""
        return """<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>基金监控告警</title>
</head>
<body>
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8d7da; color: #721c24; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            <h2 style="margin: 0; color: #721c24;">🚨 基金监控告警</h2>
        </div>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; border: 1px solid #dee2e6;">
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="font-weight: bold; padding: 8px; border-bottom: 1px solid #dee2e6;">基金代码:</td>
                    <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">{{ fund_code }}</td>
                </tr>
                <tr>
                    <td style="font-weight: bold; padding: 8px; border-bottom: 1px solid #dee2e6;">基金名称:</td>
                    <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">{{ fund_name }}</td>
                </tr>
                <tr>
                    <td style="font-weight: bold; padding: 8px; border-bottom: 1px solid #dee2e6;">触发规则:</td>
                    <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">{{ rule_name }}</td>
                </tr>
                <tr>
                    <td style="font-weight: bold; padding: 8px; border-bottom: 1px solid #dee2e6;">触发值:</td>
                    <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">{{ trigger_value }}</td>
                </tr>
                <tr>
                    <td style="font-weight: bold; padding: 8px; border-bottom: 1px solid #dee2e6;">阈值:</td>
                    <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">{{ threshold_value }}</td>
                </tr>
                <tr>
                    <td style="font-weight: bold; padding: 8px;">触发时间:</td>
                    <td style="padding: 8px;">{{ trigger_time | datetime }}</td>
                </tr>
            </table>
        </div>

        <div style="margin-top: 20px; text-align: center; color: #6c757d; font-size: 14px;">
            <p>请及时关注！</p>
        </div>
    </div>
</body>
</html>"""

    def _get_default_alert_template_text(self) -> str:
        """获取默认告警文本模板"""
        return """🚨 基金监控告警

基金代码: {{ fund_code }}
基金名称: {{ fund_name }}
触发规则: {{ rule_name }}
触发值: {{ trigger_value }}
阈值: {{ threshold_value }}
触发时间: {{ trigger_time | datetime }}

请及时关注！"""

    def _get_default_daily_report_template_html(self) -> str:
        """获取默认日报HTML模板"""
        return """<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>每日监控报告</title>
</head>
<body>
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
        <div style="background-color: #d1ecf1; color: #0c5460; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            <h2 style="margin: 0; color: #0c5460;">📊 每日监控报告</h2>
        </div>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; border: 1px solid #dee2e6;">
            <h3>统计摘要</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr>
                    <td style="font-weight: bold; padding: 8px; border-bottom: 1px solid #dee2e6;">监控基金数:</td>
                    <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">{{ total_funds }}</td>
                </tr>
                <tr>
                    <td style="font-weight: bold; padding: 8px; border-bottom: 1px solid #dee2e6;">触发规则数:</td>
                    <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">{{ rules_triggered }}</td>
                </tr>
                <tr>
                    <td style="font-weight: bold; padding: 8px;">发送通知数:</td>
                    <td style="padding: 8px;">{{ notifications_sent }}</td>
                </tr>
            </table>

            {% if top_rules %}
            <h3>热门触发规则</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <tr style="background-color: #e9ecef;">
                    <th style="padding: 8px; border: 1px solid #dee2e6; text-align: left;">规则名称</th>
                    <th style="padding: 8px; border: 1px solid #dee2e6; text-align: left;">触发次数</th>
                </tr>
                {% for rule in top_rules %}
                <tr>
                    <td style="padding: 8px; border: 1px solid #dee2e6;">{{ rule.rule_name }}</td>
                    <td style="padding: 8px; border: 1px solid #dee2e6;">{{ rule.count }}</td>
                </tr>
                {% endfor %}
            </table>
            {% endif %}
        </div>

        <div style="margin-top: 20px; text-align: center; color: #6c757d; font-size: 14px;">
            <p>报告生成时间: {{ current_time | datetime }}</p>
        </div>
    </div>
</body>
</html>"""

    def _get_default_daily_report_template_text(self) -> str:
        """获取默认日报文本模板"""
        return """📊 每日监控报告

统计摘要:
- 监控基金数: {{ total_funds }}
- 触发规则数: {{ rules_triggered }}
- 发送通知数: {{ notifications_sent }}

{% if top_rules %}
热门触发规则:
{% for rule in top_rules %}
- {{ rule.rule_name }}: {{ rule.count }}次
{% endfor %}
{% endif %}

报告生成时间: {{ current_time | datetime }}"""

    def _get_default_weekly_report_template_html(self) -> str:
        """获取默认周报HTML模板"""
        return """<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>每周监控总结</title>
</head>
<body>
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
        <div style="background-color: #d4edda; color: #155724; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            <h2 style="margin: 0; color: #155724;">📈 每周监控总结</h2>
        </div>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; border: 1px solid #dee2e6;">
            <h3>本周统计</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr>
                    <td style="font-weight: bold; padding: 8px; border-bottom: 1px solid #dee2e6;">总触发规则:</td>
                    <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">{{ total_triggered }}</td>
                </tr>
                <tr>
                    <td style="font-weight: bold; padding: 8px; border-bottom: 1px solid #dee2e6;">发送通知数:</td>
                    <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">{{ total_notifications }}</td>
                </tr>
                <tr>
                    <td style="font-weight: bold; padding: 8px;">活跃规则数:</td>
                    <td style="padding: 8px;">{{ active_rules }}</td>
                </tr>
            </table>
        </div>

        <div style="margin-top: 20px; text-align: center; color: #6c757d; font-size: 14px;">
            <p>报告生成时间: {{ current_time | datetime }}</p>
        </div>
    </div>
</body>
</html>"""

    def _get_default_weekly_report_template_text(self) -> str:
        """获取默认周报文本模板"""
        return """📈 每周监控总结

本周统计:
- 总触发规则: {{ total_triggered }}
- 发送通知数: {{ total_notifications }}
- 活跃规则数: {{ active_rules }}

报告生成时间: {{ current_time | datetime }}"""