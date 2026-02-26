#!/bin/bash

# 部署脚本 - 自动递增版本号

set -e

echo "🚀 开始部署流程..."

# 读取当前版本
MEMORY_FILE="memory.md"
CURRENT_VERSION=$(grep "当前版本" $MEMORY_FILE | head -1 | sed 's/.*v/v/')
echo "📋 当前版本: $CURRENT_VERSION"

# 解析版本号
MAJOR=$(echo $CURRENT_VERSION | cut -d. -f1 | sed 's/v//')
MINOR=$(echo $CURRENT_VERSION | cut -d. -f2)
PATCH=$(echo $CURRENT_VERSION | cut -d. -f3)

# 递增修订号
NEW_PATCH=$((PATCH + 1))
NEW_VERSION="v$MAJOR.$MINOR.$NEW_PATCH"
echo "📋 新版本: $NEW_VERSION"

# 更新 memory.md
sed -i "s/当前版本.*/当前版本/" $MEMORY_FILE
sed -i "/当前版本/a $NEW_VERSION" $MEMORY_FILE
sed -i "/版本历史/a - $NEW_VERSION - $(date +%Y-%m-%d) - 更新内容" $MEMORY_FILE

# 更新代码中的版本号
sed -i "s/const VERSION = 'v[0-9]\+\.[0-9]\+\.[0-9]\+'/const VERSION = '$NEW_VERSION'/" src/pages/todos.js

echo "✅ 版本号已更新"

# 提交代码
echo "📦 提交代码..."
git add memory.md src/pages/todos.js
git commit -m "chore: bump version to $NEW_VERSION"
git push

# 部署到 Cloudflare
echo "🌐 部署到 Cloudflare..."
export HTTP_PROXY="http://127.0.0.1:7890"
export HTTPS_PROXY="http://127.0.0.1:7890"
export CLOUDFLARE_API_TOKEN="QK-HSDPCiEoIyhLtITFAwtLLhn6OQuwbvW7CbQLv"
wrangler deploy

echo "✅ 部署完成！版本: $NEW_VERSION"
