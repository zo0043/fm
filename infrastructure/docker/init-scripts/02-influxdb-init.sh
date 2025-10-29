#!/bin/bash

# InfluxDB 初始化脚本
set -e

# 等待InfluxDB启动
echo "等待 InfluxDB 启动中..."
sleep 10s

# 创建组织和存储桶
echo "创建组织: fund_monitor"
curl -X POST http://localhost:8086/query \
  -H "Authorization: Token ${INFLUXDB_TOKEN}" \
  -H "Organization: fund_monitor" \
  -H "Organization-Id: ${INFLUXDB_ORG}" \
  -H 'CREATE ORGANIZATION {"org_name": "fund_monitor", "permissions": ["read", "write"]}' \
      -H 'CREATE BUCKET "${INFLUXDB_BUCKET}" \
      -H 'RETENTION POLICY "15d" \
      -H 'RETENTION AUTOFLUSH' \
      -H 'DURATION "365d' \
      -H 'ORGANIZATION "${INFLUXDB_ORG}" \
      -H 'BUCKET "${INFLUXDB_BUCKET}" \
      echo "组织创建成功"
    elif [ $? -ne 0 ]; then
      echo "组织创建失败，请检查配置文件"
      exit 1
    fi

# 创建用户权限
echo "创建用户权限..."
curl -X POST http://localhost:8086/api/permissions \
  -H "Authorization: Token ${INFLUXDB_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"bucket": "${INFLUXDB_BUCKET}", "permissions": ["read", "write"]}' \
  echo "用户权限创建成功"

# 设置数据保留策略
echo "设置数据保留策略..."
curl -X PUT http://token=${INFLUXDB_TOKEN} \
  -H "Content-Type: application/json" \
  -d '{"retention_policy": "15d", "default": "autodelete", "force": false, "flush": false}' \
      "bucket": "${INFLUXDB_BUCKET}" \
      "default": "autodelete", "force": false, "flush": false}' \
      echo "数据保留策略设置成功"
    elif [ $? -ne 0 ]; then
      echo "数据保留策略设置失败，请检查配置文件"
      exit 1
    fi
  else
      echo "数据保留策略已存在"
    fi

echo "InfluxDB 初始化完成！"