# 部署文档

本文档说明如何将前端部署到 Vercel，后端部署到自己的服务器。

## 目录

- [前端部署到 Vercel](#前端部署到-vercel)
- [后端部署到服务器](#后端部署到服务器)
- [环境变量配置](#环境变量配置)
- [WebSocket 连接配置](#websocket-连接配置)
- [验证部署](#验证部署)
- [常见问题](#常见问题)

---

## 前端部署到 Vercel

### 前置要求

- 拥有 Vercel 账号（可免费注册：https://vercel.com）
- 已安装 Vercel CLI（可选，用于命令行部署）

### 方法一：通过 Vercel 网站部署（推荐）

1. **准备代码**
   ```bash
   # 确保代码已提交到 Git 仓库（GitHub、GitLab 或 Bitbucket）
   git add .
   git commit -m "准备部署"
   git push origin main
   ```

2. **连接 Vercel**
   - 访问 https://vercel.com
   - 点击 "Add New Project"
   - 导入你的 Git 仓库

3. **配置项目**
   - **Framework Preset**: Vite
   - **Root Directory**: `./`（根目录）
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

4. **配置环境变量**
   - 在 Vercel 项目设置中添加环境变量：
     - `VITE_WS_URL`: 你的 WebSocket 服务器地址（例如：`wss://your-server.com`）
   - 注意：如果使用 `ws://`，需要确保后端支持；生产环境建议使用 `wss://`（WebSocket Secure）

5. **部署**
   - 点击 "Deploy"
   - 等待构建完成

### 方法二：通过 Vercel CLI 部署

1. **安装 Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **登录 Vercel**
   ```bash
   vercel login
   ```

3. **部署**
   ```bash
   vercel
   ```

4. **配置环境变量**
   ```bash
   vercel env add VITE_WS_URL
   # 输入你的 WebSocket 服务器地址
   ```

5. **生产环境部署**
   ```bash
   vercel --prod
   ```

### Vercel 配置文件（可选）

创建 `vercel.json` 文件以自定义部署配置：

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

---

## 后端部署到服务器

### 前置要求

- 拥有 Linux 服务器（Ubuntu/Debian/CentOS 等）
- 服务器已安装 Node.js（推荐 v18+）
- 服务器已安装 npm 或 yarn
- 服务器开放了 WebSocket 端口（默认 3001，或自定义端口）

### 部署步骤

1. **上传代码到服务器**
   ```bash
   # 方法一：使用 Git
   git clone <your-repo-url> /path/to/gameroom
   cd /path/to/gameroom
   
   # 方法二：使用 scp
   scp -r . user@your-server:/path/to/gameroom
   ```

2. **安装依赖**
   ```bash
   cd /path/to/gameroom
   npm install --production
   ```

3. **配置环境变量**
   ```bash
   # 创建 .env 文件
   nano .env
   ```
   
   添加以下内容：
   ```env
   PORT=3001
   NODE_ENV=production
   ```

4. **使用 PM2 管理进程（推荐）**
   
   **方法一：使用配置文件（推荐）**
   ```bash
   # 安装 PM2
   npm install -g pm2
   
   # 使用配置文件启动（已包含在项目中）
   pm2 start ecosystem.config.js --env production
   
   # 设置开机自启
   pm2 startup
   pm2 save
   
   # 查看状态
   pm2 status
   pm2 logs gameroom-server
   ```
   
   **方法二：使用部署脚本（最简单）**
   ```bash
   # 运行部署脚本
   ./deploy-server.sh
   ```
   
   **方法三：手动启动**
   ```bash
   # 安装 PM2
   npm install -g pm2
   
   # 启动服务
   pm2 start server/index.js --name gameroom-server --env production
   
   # 设置开机自启
   pm2 startup
   pm2 save
   ```

5. **使用 systemd 管理进程（可选）**
   
   创建服务文件 `/etc/systemd/system/gameroom.service`：
   ```ini
   [Unit]
   Description=GameRoom WebSocket Server
   After=network.target
   
   [Service]
   Type=simple
   User=your-user
   WorkingDirectory=/path/to/gameroom
   Environment="NODE_ENV=production"
   Environment="PORT=3001"
   ExecStart=/usr/bin/node server/index.js
   Restart=always
   RestartSec=10
   
   [Install]
   WantedBy=multi-user.target
   ```
   
   启动服务：
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable gameroom
   sudo systemctl start gameroom
   sudo systemctl status gameroom
   ```

6. **配置防火墙**
   ```bash
   # Ubuntu/Debian (ufw)
   sudo ufw allow 3001/tcp
   
   # CentOS/RHEL (firewalld)
   sudo firewall-cmd --permanent --add-port=3001/tcp
   sudo firewall-cmd --reload
   ```

7. **配置 Nginx 反向代理（可选，推荐用于生产环境）**
   
   安装 Nginx：
   ```bash
   sudo apt update
   sudo apt install nginx
   ```
   
   创建配置文件 `/etc/nginx/sites-available/gameroom`：
   ```nginx
   map $http_upgrade $connection_upgrade {
       default upgrade;
       '' close;
   }
   
   server {
       listen 80;
       server_name your-domain.com;
   
       location / {
           proxy_pass http://localhost:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection $connection_upgrade;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```
   
   启用配置：
   ```bash
   sudo ln -s /etc/nginx/sites-available/gameroom /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```
   
   如果使用 HTTPS，需要配置 SSL 证书（Let's Encrypt）：
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

---

## 环境变量配置

### 前端环境变量（Vercel）

在 Vercel 项目设置中添加：

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| `VITE_WS_URL` | WebSocket 服务器地址 | `wss://your-server.com` 或 `wss://your-domain.com` |

### 后端环境变量（服务器）

在服务器上创建 `.env` 文件：

| 变量名 | 说明 | 默认值 | 示例值 |
|--------|------|--------|--------|
| `PORT` | WebSocket 服务器端口 | `3001` | `3001` |
| `NODE_ENV` | 运行环境 | - | `production` |

---

## WebSocket 连接配置

### 开发环境

前端默认连接到：`ws://localhost:3001`

### 生产环境

1. **如果后端直接暴露端口**
   - 前端 `VITE_WS_URL` 设置为：`ws://your-server-ip:3001`
   - 注意：`ws://` 不是加密连接，建议使用 `wss://`

2. **如果使用 Nginx 反向代理（推荐）**
   - 前端 `VITE_WS_URL` 设置为：`wss://your-domain.com`
   - 确保 Nginx 配置了 WebSocket 支持（见上方配置）

3. **如果使用 Cloudflare 或其他 CDN**
   - 确保 CDN 支持 WebSocket 代理
   - 前端 `VITE_WS_URL` 设置为：`wss://your-domain.com`

### 更新前端 WebSocket URL

部署后，如果后端地址变更，需要：

1. 在 Vercel 中更新 `VITE_WS_URL` 环境变量
2. 重新部署前端（Vercel 会自动触发重新构建）

---

## 验证部署

### 验证前端

1. 访问 Vercel 提供的域名
2. 打开浏览器开发者工具（F12）
3. 检查 Console 是否有 WebSocket 连接错误
4. 检查 Network 标签，确认 WebSocket 连接成功

### 验证后端

1. **检查服务是否运行**
   ```bash
   # PM2
   pm2 status
   
   # systemd
   sudo systemctl status gameroom
   ```

2. **测试 WebSocket 连接**
   ```bash
   # 使用 wscat 测试（需要先安装：npm install -g wscat）
   wscat -c ws://your-server:3001
   
   # 或使用 curl
   curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
        -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: test" \
        http://your-server:3001
   ```

3. **检查日志**
   ```bash
   # PM2
   pm2 logs gameroom-server
   
   # systemd
   sudo journalctl -u gameroom -f
   ```

---

## 常见问题

### 1. WebSocket 连接失败

**可能原因：**
- 防火墙未开放端口
- 后端服务未启动
- WebSocket URL 配置错误
- CORS 问题（如果使用 Nginx）

**解决方法：**
- 检查防火墙规则
- 检查后端服务状态
- 确认 `VITE_WS_URL` 配置正确
- 检查 Nginx 配置中的 WebSocket 支持

### 2. 前端构建失败

**可能原因：**
- 依赖安装失败
- TypeScript 类型错误
- 环境变量未配置

**解决方法：**
- 检查 `package.json` 依赖
- 运行 `npm run build` 本地测试
- 确认 Vercel 环境变量已配置

### 3. 后端服务自动重启

**可能原因：**
- 代码错误导致崩溃
- 内存不足
- 端口被占用

**解决方法：**
- 查看日志：`pm2 logs` 或 `journalctl -u gameroom`
- 检查服务器资源：`htop` 或 `free -h`
- 检查端口占用：`lsof -i :3001`

### 4. HTTPS/SSL 证书问题

**解决方法：**
- 使用 Let's Encrypt 免费证书
- 确保域名 DNS 解析正确
- 在 Nginx 配置中正确设置 SSL

### 5. 跨域问题

如果遇到跨域问题，需要在后端添加 CORS 支持（当前代码未实现，如需要可添加）。

---

## 部署检查清单

### 前端（Vercel）
- [ ] 代码已推送到 Git 仓库
- [ ] Vercel 项目已创建并连接仓库
- [ ] 环境变量 `VITE_WS_URL` 已配置
- [ ] 构建成功
- [ ] 可以访问部署的网站
- [ ] WebSocket 连接正常

### 后端（服务器）
- [ ] Node.js 已安装（v18+）
- [ ] 代码已上传到服务器
- [ ] 依赖已安装（`npm install --production`）
- [ ] 环境变量已配置（`.env` 文件）
- [ ] 服务已启动（PM2 或 systemd）
- [ ] 防火墙端口已开放
- [ ] Nginx 已配置（如使用）
- [ ] SSL 证书已配置（如使用 HTTPS）
- [ ] 服务可以正常访问

---

## 更新部署

### 更新前端

1. 修改代码并提交到 Git
2. Vercel 会自动检测并重新部署
3. 或手动触发：在 Vercel 控制台点击 "Redeploy"

### 更新后端

1. **使用 Git（推荐）**
   ```bash
   cd /path/to/gameroom
   git pull
   npm install --production
   pm2 restart gameroom-server
   ```

2. **手动更新**
   ```bash
   # 停止服务
   pm2 stop gameroom-server
   
   # 更新代码
   # ... 上传新代码 ...
   
   # 安装依赖
   npm install --production
   
   # 重启服务
   pm2 restart gameroom-server
   ```

---

## 监控和维护

### 监控后端服务

```bash
# PM2 监控
pm2 monit

# 查看日志
pm2 logs gameroom-server --lines 100

# 查看资源使用
pm2 list
```

### 备份

建议定期备份：
- 服务器上的代码
- 环境变量配置
- PM2 配置（`pm2 save`）

---

## 技术支持

如遇到问题，请检查：
1. 服务器日志
2. Vercel 构建日志
3. 浏览器控制台错误
4. 网络连接状态

