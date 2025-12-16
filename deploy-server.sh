#!/bin/bash

# 后端服务器部署脚本
# 使用方法: ./deploy-server.sh

set -e

echo "🚀 开始部署 GameRoom 后端服务器..."

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未找到 Node.js，请先安装 Node.js"
    exit 1
fi

# 检查 PM2
if ! command -v pm2 &> /dev/null; then
    echo "📦 安装 PM2..."
    npm install -g pm2
fi

# 安装依赖
echo "📦 安装依赖..."
npm install --production

# 创建日志目录
mkdir -p logs

# 停止旧服务（如果存在）
if pm2 list | grep -q "gameroom-server"; then
    echo "🛑 停止旧服务..."
    pm2 stop gameroom-server
    pm2 delete gameroom-server
fi

# 启动服务
echo "✅ 启动服务..."
pm2 start ecosystem.config.cjs --env production

# 保存 PM2 配置
pm2 save

echo "✅ 部署完成！"
echo ""
echo "📊 查看服务状态: pm2 status"
echo "📝 查看日志: pm2 logs gameroom-server"
echo "🔄 重启服务: pm2 restart gameroom-server"

