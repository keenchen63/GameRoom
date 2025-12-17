# GameRoom

一个实时多人计分游戏房间系统，支持创建房间、实时转分、结算统计等功能。采用 WebSocket 实现实时通信，提供流畅的多人在线体验。

<div align="center">

![GameRoom](https://img.shields.io/badge/GameRoom-v1.0.0-blue)
![React](https://img.shields.io/badge/React-19.2.3-61dafb)
![Node.js](https://img.shields.io/badge/Node.js-ESM-green)
![WebSocket](https://img.shields.io/badge/WebSocket-Real--time-yellow)

</div>

---

## 📋 目录

- [功能特性](#-功能特性)
- [技术栈](#-技术栈)
- [快速开始](#-快速开始)
- [项目结构](#-项目结构)
- [使用说明](#-使用说明)
- [部署指南](#-部署指南)
- [开发说明](#-开发说明)
- [相关文档](#-相关文档)
- [常见问题](#-常见问题)

---

## ✨ 功能特性

### 核心功能

- 🎮 **房间管理**
  - 创建/加入房间（4位数字房间号）
  - 自动分配玩家头像和昵称
  - 房间二维码分享
  - 自动重连机制

- 💰 **实时计分**
  - 玩家间实时转分
  - 转分动画效果
  - 转分操作记录

- 👥 **玩家管理**
  - 自动创建玩家（无需注册）
  - 随机分配头像（动物、水果、蔬菜）
  - 更换头像和昵称
  - 房主权限管理

- 📊 **结算统计**
  - 游戏结束后自动结算
  - 玩家排名展示
  - 转分历史记录
  - 数据持久化（localStorage）

- 🔄 **实时同步**
  - WebSocket 实时通信
  - 房间状态自动同步
  - 多设备数据一致性
  - 断线自动重连

### 高级特性

- 📱 **移动端优化**
  - 响应式设计
  - iOS Safari 兼容
  - 触摸友好交互
  - 安全区域适配

- 🎨 **用户体验**
  - 多语言支持（中文/英文）
  - Toast 消息提示
  - 确认对话框
  - 加载状态提示

- 🛡️ **数据保护**
  - 房间过期机制（48小时未活动自动清理）
  - 数据同步机制
  - 错误处理
  - 状态恢复

---

## 🛠️ 技术栈

### 前端

- **框架**: React 19.2.3
- **构建工具**: Vite 6.2.0
- **语言**: TypeScript 5.8.2
- **UI 组件**: 自定义组件 + Lucide React 图标
- **实时通信**: WebSocket Client（自定义封装）
- **二维码**: qrcode 1.5.4

### 后端

- **运行时**: Node.js (ES Modules)
- **WebSocket 服务器**: ws 8.18.0
- **进程管理**: PM2（生产环境）

### 开发工具

- **包管理**: npm
- **并发运行**: concurrently 9.1.0
- **类型定义**: @types/node, @types/ws, @types/qrcode

---

## 🚀 快速开始

### 前置要求

- Node.js >= 18.0.0
- npm >= 9.0.0

### 安装依赖

```bash
# 克隆项目
git clone https://github.com/keenchen63/GameRoom.git
cd GameRoom

# 安装依赖
npm install
```

### 开发环境运行

```bash
# 同时启动前端和后端（推荐）
npm run dev:all

# 或分别启动
npm run dev      # 启动前端（默认 http://localhost:5173）
npm run server   # 启动后端（默认 ws://localhost:3001）
```

### 环境变量配置

创建 `.env` 文件（可选）：

```env
# WebSocket 服务器端口（默认 3001）
PORT=3001

# 前端 WebSocket 连接地址（开发环境默认 ws://localhost:3001）
VITE_WS_URL=ws://localhost:3001
```

### 访问应用

- **前端**: http://localhost:5173
- **后端 WebSocket**: ws://localhost:3001

---

## 📁 项目结构

```
GameRoom/
├── public/                 # 静态资源
│   └── favicon.svg        # 网站图标
├── server/                # 后端服务器
│   └── index.js          # WebSocket 服务器主文件
├── components/            # React 组件
│   ├── Avatar.tsx        # 玩家头像组件
│   ├── AvatarModal.tsx    # 头像选择弹窗
│   ├── Button.tsx        # 按钮组件
│   ├── ConfirmModal.tsx   # 确认对话框
│   ├── QrCodeModal.tsx    # 二维码弹窗
│   ├── TransferModal.tsx  # 转分弹窗
│   ├── TransferAnimation.tsx  # 转分动画组件
│   └── TransferHistoryModal.tsx  # 转分历史记录弹窗
├── utils/                 # 工具函数
│   └── websocket.ts       # WebSocket 客户端封装
├── App.tsx                # 主应用组件
├── index.tsx              # 应用入口
├── types.ts               # TypeScript 类型定义
├── constants.ts           # 常量定义（头像、文本）
├── package.json           # 项目配置
├── vite.config.ts         # Vite 配置
├── tsconfig.json          # TypeScript 配置
├── vercel.json            # Vercel 部署配置
├── ecosystem.config.cjs   # PM2 配置文件
├── deploy-server.sh       # 服务器部署脚本
├── requirements.md        # 需求文档
├── DEPLOYMENT.md          # 部署文档
├── ROOM_PERSISTENCE_ANALYSIS.md  # 房间持久化分析
├── DATA_SYNC_MECHANISMS.md       # 数据同步机制
└── VISIBILITY_REFRESH_MECHANISMS.md  # 页面可见性刷新机制
```

---

## 📖 使用说明

### 创建房间

1. 打开应用首页
2. 点击"创建房间"按钮
3. 系统自动生成 4 位数字房间号
4. 自动分配头像和昵称
5. 进入房间页面

### 加入房间

**方法一：输入房间号**
1. 在首页输入框输入 4 位房间号
2. 系统自动加入房间

**方法二：扫描二维码**
1. 房主点击"分享房间"按钮
2. 显示房间二维码
3. 其他玩家扫描二维码加入

**方法三：URL 参数**
- 访问 `?room=1234` 自动加入房间 1234

### 转分操作

1. 点击其他玩家头像
2. 弹出转分对话框
3. 输入转分数量（支持负数）
4. 确认转分
5. 实时显示转分动画效果

### 更换头像

1. 点击自己的头像
2. 弹出头像选择弹窗
3. 选择新头像
4. 自动更新昵称

### 结束房间

1. 房主点击右上角"结束房间"按钮
2. 确认结束
3. 所有玩家进入结算页面
4. 查看最终排名和转分记录

### 离开房间

1. 非房主点击右上角"离开房间"按钮
2. 确认离开（仅当积分为 0 时）
3. 返回首页

### 查看历史记录

1. 在房间页面点击右下角"历史记录"按钮
2. 查看所有转分操作记录
3. 包括转分时间、转分双方、转分数量

---

## 🚢 部署指南

### 前端部署（Vercel）

详细步骤请参考 [DEPLOYMENT.md](./DEPLOYMENT.md#前端部署到-vercel)

**快速部署**：

1. 将代码推送到 GitHub
2. 在 Vercel 导入项目
3. 配置环境变量 `VITE_WS_URL`
4. 部署完成

### 后端部署（自定义服务器）

详细步骤请参考 [DEPLOYMENT.md](./DEPLOYMENT.md#后端部署到服务器)

**快速部署**：

```bash
# 1. 上传代码到服务器
scp -r . user@your-server:/opt/GameRoom

# 2. 安装依赖
cd /opt/GameRoom
npm install --production

# 3. 配置环境变量
echo "PORT=3001" > .env

# 4. 使用 PM2 启动
pm2 start ecosystem.config.cjs --env production
pm2 save
```

### 环境变量

**前端（Vercel）**：
- `VITE_WS_URL`: WebSocket 服务器地址（如：`wss://your-server.com`）

**后端（服务器）**：
- `PORT`: WebSocket 服务器端口（默认：3001）

---

## 💻 开发说明

### 代码规范

- 使用 TypeScript 进行类型检查
- 组件使用函数式组件 + Hooks
- 遵循 React 最佳实践
- 代码注释使用中文

### 主要文件说明

- **App.tsx**: 主应用组件，包含所有业务逻辑和状态管理
- **server/index.js**: WebSocket 服务器，处理房间和玩家管理
- **utils/websocket.ts**: WebSocket 客户端封装，提供重连机制
- **types.ts**: TypeScript 类型定义
- **constants.ts**: 常量定义（头像列表、多语言文本）

### 数据流

```
用户操作
  ↓
React 组件
  ↓
WebSocket Client
  ↓
WebSocket Server
  ↓
房间状态更新
  ↓
广播给所有玩家
  ↓
更新 UI
```

### 房间状态管理

- **服务器端**: 使用 `Map` 存储房间和玩家数据（内存）
- **客户端**: 使用 `localStorage` 持久化房间号和玩家ID
- **实时同步**: WebSocket 推送房间状态变化

### 房间过期机制

- 超过 48 小时未活动的房间自动清理
- 每 30 分钟检查一次
- 服务器启动时立即执行一次清理

#### 活动时间更新规则

以下操作会更新房间的 `lastActivityAt`：

1. **创建房间**：设置 `createdAt` 和 `lastActivityAt`
2. **加入房间**：更新 `lastActivityAt`
3. **转分操作**：通过 `broadcastRoomState` 更新
4. **更换头像**：通过 `broadcastRoomState` 更新
5. **房间状态广播**：每次广播都会更新活动时间

#### 清理逻辑

1. **跳过已结束的房间**：已结束的房间会在其他逻辑中被清理
2. **检查活动时间**：计算距离最后活动时间的间隔
3. **清理映射关系**：删除所有玩家的 `playerToRoom` 映射
4. **删除房间**：从 `rooms` Map 中删除房间数据
5. **记录日志**：输出清理的房间信息

#### 兼容性处理

- **旧房间兼容**：如果房间没有 `lastActivityAt`，使用 `createdAt`
- **时间戳初始化**：在 `handleJoinRoom` 中为旧房间初始化时间戳

#### 日志输出

清理时会输出以下日志：

```
[清理过期房间] 清理了 N 个超过 48 小时未活动的房间:
  - 房间 XXXX (最后活动: 2024-01-01T12:00:00.000Z)
```

---

## 📚 相关文档

- [需求文档](./requirements.md) - 项目需求说明
- [部署文档](./DEPLOYMENT.md) - 详细的部署指南
- [房间持久化分析](./ROOM_PERSISTENCE_ANALYSIS.md) - 房间数据存储和丢失场景分析
- [数据同步机制](./DATA_SYNC_MECHANISMS.md) - 数据同步机制说明
- [页面可见性刷新机制](./VISIBILITY_REFRESH_MECHANISMS.md) - 页面可见性刷新机制说明

---

## ❓ 常见问题

### Q1: 服务器重启后房间会丢失吗？

**A**: 是的。当前实现使用内存存储，服务器重启后所有数据会丢失。建议添加数据库持久化。

详细说明请参考 [ROOM_PERSISTENCE_ANALYSIS.md](./ROOM_PERSISTENCE_ANALYSIS.md#场景-1服务器重启最严重)

### Q2: 清除浏览器缓存后还能恢复房间吗？

**A**: 可以，但需要手动输入房间号重新加入。服务器端的房间数据还在（如果服务器未重启）。

### Q3: 网络断开后房间会丢失吗？

**A**: 不会。网络恢复后，自动重连机制会尝试重新连接并恢复房间状态。

### Q4: 长时间不操作，房间会丢失吗？

**A**: 会。如果房间超过 48 小时未活动，会被自动清理。这是为了防止内存泄漏。

### Q5: 如何修改房间过期时间？

**A**: 修改 `server/index.js` 中的 `ROOM_EXPIRY_HOURS` 常量：

```javascript
const ROOM_EXPIRY_HOURS = 48; // 修改为你想要的小时数
```

### Q6: 如何修改 WebSocket 端口？

**A**: 在 `.env` 文件中设置 `PORT` 环境变量，或修改 `server/index.js` 中的默认端口。

### Q7: 前端如何连接不同的 WebSocket 服务器？

**A**: 在 `.env` 文件中设置 `VITE_WS_URL` 环境变量，或修改 `utils/websocket.ts` 中的默认地址。

### Q8: 如何添加新的头像？

**A**: 修改 `constants.ts` 中的 `ANIMALS` 数组，添加新的头像对象：

```typescript
{ name_cn: '名称', name_en: 'Name', emoji: '🎮' }
```

### Q9: 如何修改 UI 颜色主题？

**A**: 修改 `App.tsx` 和相关组件中的颜色值，或使用 CSS 变量统一管理。

当前主题色：
- 主色：`#2F5D8C`
- 主色悬停：`#3A6EA5`
- 背景：`#EEF4FA`
- 边框：`#DCE8F5`
- 次要文本：`#5B6E80`

### Q10: 如何查看服务器日志？

**A**: 如果使用 PM2：

```bash
pm2 logs gameroom
```

如果直接运行：

```bash
npm run server
```

---

## 🤝 贡献 

欢迎提交 Issue 和 Pull Request！

---

## 📄 许可证

本项目采用 MIT 许可证。

---

## 👤 作者

- GitHub: [@keenchen63](https://github.com/keenchen63)

---

<div align="center">

**GameRoom** - 实时多人计分游戏房间系统

Made with ❤️ using React & WebSocket

</div>
