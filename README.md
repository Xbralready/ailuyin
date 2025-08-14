# AI录音产品 - 前端应用

这是一个基于React的AI录音助手，支持语音转文字和智能分析功能。

## 功能特点

- 🎤 **录音功能** - 支持实时录音
- 🔤 **语音转文字** - 使用OpenAI Whisper API
- 🤖 **智能分析** - 使用ChatGPT分析对话内容
- 👤 **用户认证** - 完整的登录/注册系统
- 📊 **场景化分析** - 支持多种业务场景

## 技术栈

- React 19.1 + TypeScript
- Vite 7.0 构建工具
- React Router 路由管理
- Axios 网络请求
- Framer Motion 动画效果

## 快速开始

### 安装依赖
```bash
npm install
```

### 启动开发服务器
```bash
npm run dev
```

### 构建生产版本
```bash
npm run build
```

## 部署

### 环境变量
创建 `.env.production` 文件：
```bash
VITE_API_URL=https://your-backend-url.com/api
```

### 部署到Netlify
1. 构建项目：`npm run build`
2. 上传 `dist` 文件夹到Netlify

## 主要改进

### 🛡️ 增强认证系统
- API版本管理，后端更新自动处理
- 7天登录有效期，平衡安全与便利
- 自动token刷新，无感知续期
- 智能错误恢复机制

### 🎯 优化用户体验
- 分类错误提示（网络/认证/权限）
- 一键重试功能
- 自动清理过期数据
- 完善的错误处理

## 项目结构

```
src/
├── components/         # React组件
├── contexts/          # React Context
├── hooks/             # 自定义Hook
├── services/          # API服务
└── assets/           # 静态资源
```

## 浏览器支持

- Chrome/Edge (推荐)
- Firefox
- Safari

## 贡献

欢迎提交Issue和Pull Request！