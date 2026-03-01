#!/bin/bash

# 部署脚本 - 自动递增版本号并显示编译时间

set -e

echo "🚀 开始部署流程..."

# 递增版本号
echo "📋 更新版本号..."
npm run bump

# 提交代码
echo "📦 提交代码..."
git add src/version.js
git commit -m "chore: bump version"
git push

# 部署到 Cloudflare
echo "🌐 部署到 Cloudflare..."
export HTTP_PROXY="http://127.0.0.1:7890"
export HTTPS_PROXY="http://127.0.0.1:7890"
wrangler deploy

echo "✅ 部署完成！"
