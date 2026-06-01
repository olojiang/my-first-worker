#!/bin/bash

# 自动更新版本号并部署脚本
# 用法: ./deploy.sh

set -e

echo "🚀 开始部署流程..."

# 获取当前时间
BUILD_TIME=$(date +"%m%d_%H%M")

# 读取当前版本号
VERSION_FILE="src/version.js"
CURRENT_VERSION=$(grep "APP_VERSION = " "$VERSION_FILE" | grep -oE "'[0-9]+\.[0-9]+\.[0-9]+'" | tr -d "'")

echo "📖 当前版本: ${CURRENT_VERSION}"

# 解析版本号各部分
MAJOR=$(echo "$CURRENT_VERSION" | cut -d. -f1)
MINOR=$(echo "$CURRENT_VERSION" | cut -d. -f2)
PATCH=$(echo "$CURRENT_VERSION" | cut -d. -f3)

# 自动增加 patch 版本号
NEW_PATCH=$((PATCH + 1))
NEW_VERSION="${MAJOR}.${MINOR}.${NEW_PATCH}"

echo "📦 更新版本号: ${CURRENT_VERSION} → ${NEW_VERSION}"
echo "🕐 构建时间: ${BUILD_TIME}"

# 更新版本文件
cat > "$VERSION_FILE" << EOF
// 自动生成的版本号文件
// 格式: MMDD_HHmm
export const BUILD_TIME = '${BUILD_TIME}'
export const APP_VERSION = '${NEW_VERSION}'
export const VERSION_DISPLAY = \`\${APP_VERSION}_\${BUILD_TIME}\`
EOF

echo "✅ 版本文件已更新"

# 设置代理
export HTTP_PROXY="http://127.0.0.1:7890"
export HTTPS_PROXY="http://127.0.0.1:7890"

echo "🌐 代理已设置"

# 执行部署
echo "📤 开始部署到 Cloudflare..."
wrangler deploy

echo "✨ 部署完成！"
echo "📋 版本: ${NEW_VERSION}_${BUILD_TIME}"
