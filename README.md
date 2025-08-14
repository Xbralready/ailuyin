# AI录音系统 - 后端服务

这是 AI录音系统的后端服务，提供音频转录和AI分析功能。

## 功能

- 音频文件转录（使用 OpenAI Whisper API）
- AI 对话分析（使用 ChatGPT API）
- 支持多种音频格式（MP3, WAV, M4A, WebM, OGG）

## 部署到 Render

1. Fork 或 Clone 此仓库到您的 GitHub
2. 在 [Render](https://render.com) 创建新的 Web Service
3. 连接您的 GitHub 仓库
4. 设置环境变量：
   - `OPENAI_API_KEY`: 您的 OpenAI API 密钥
   - `PORT`: 3001

## 本地开发

1. 安装依赖：
   ```bash
   npm install
   ```

2. 创建 `.env` 文件：
   ```bash
   cp .env.example .env
   ```
   然后编辑 `.env` 文件，填入您的 OpenAI API 密钥

3. 启动服务：
   ```bash
   npm start
   ```

## API 端点

- `GET /api/health` - 健康检查
- `POST /api/transcribe` - 音频转文字
- `POST /api/analyze` - AI 分析
- `GET /api/models` - 获取可用模型列表