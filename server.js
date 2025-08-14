// Node.js 18 兼容性修复 - 为 OpenAI SDK 添加 File polyfill
if (!globalThis.File) {
  globalThis.File = require('node:buffer').File;
}

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const cookieParser = require('cookie-parser');
require('dotenv').config();

// 导入数据库连接
const connectDB = require('./config/database'); // MongoDB版本
// const { connectDB } = require('./config/memoryDb'); // 临时内存数据库版本

// 导入路由
const authRoutes = require('./routes/auth');
const recordingRoutes = require('./routes/recordings');

// 导入认证中间件
const { authenticate } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3001;

// 连接数据库
connectDB();

// 配置OpenAI
let openai = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  console.log('OpenAI API已配置');
} else {
  console.warn('警告: 未配置OPENAI_API_KEY，Whisper转录功能将不可用');
}

// 中间件
app.use(cors({
  origin: function(origin, callback) {
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000', 
      'http://127.0.0.1:5173'
    ];
    
    // 允许所有 Netlify 域名
    if (!origin || 
        allowedOrigins.indexOf(origin) !== -1 || 
        origin.endsWith('.netlify.app') ||
        origin.endsWith('.netlify.live')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
}));
app.use(express.json());
app.use(cookieParser());

// 配置文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    // 保留原始文件扩展名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    const ext = path.extname(file.originalname)
    cb(null, file.fieldname + '-' + uniqueSuffix + ext)
  }
})

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB限制
  }
});

// 确保uploads目录存在
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// 认证路由
app.use('/api/auth', authRoutes);

// 录音管理路由
app.use('/api/recordings', recordingRoutes);

// 音频转文字接口（需要认证）
app.post('/api/transcribe', authenticate, upload.single('audio'), async (req, res) => {
  try {
    if (!openai) {
      return res.status(503).json({ 
        error: 'Whisper API未配置',
        message: '请配置OPENAI_API_KEY环境变量' 
      });
    }

    if (!req.file) {
      return res.status(400).json({ error: '没有上传音频文件' });
    }

    console.log('收到音频文件:', req.file);

    // 使用Whisper API转录音频
    console.log('开始转录音频，文件路径:', req.file.path);
    console.log('文件大小:', req.file.size, 'bytes');
    
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(req.file.path),
      model: 'whisper-1',
      language: 'zh', // 指定中文
      response_format: 'text',
    });
    
    console.log('转录成功，文本长度:', transcription.length);

    // 删除临时文件
    fs.unlinkSync(req.file.path);

    res.json({ 
      success: true,
      text: transcription,
    });
  } catch (error) {
    console.error('转录错误详情:', {
      error: error.message,
      response: error.response?.data,
      status: error.response?.status,
      stack: error.stack
    });
    
    // 清理临时文件
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({ 
      error: '转录失败',
      message: error.message,
      details: error.response?.data?.error?.message || error.message
    });
  }
});

// ChatGPT分析接口（需要认证）
app.post('/api/analyze', authenticate, async (req, res) => {
  try {
    console.log('收到分析请求:', { 
      hasTranscript: !!req.body.transcript,
      transcriptLength: req.body.transcript?.length,
      model: req.body.model,
      scenario: req.body.scenario 
    });

    if (!openai) {
      return res.status(503).json({ 
        error: 'ChatGPT API未配置',
        message: '请配置OPENAI_API_KEY环境变量' 
      });
    }

    const { transcript, prompt, model, scenario, analysisType } = req.body;
    // 兼容旧版本的analysisType参数
    const selectedScenario = scenario || analysisType || 'general';

    if (!transcript) {
      return res.status(400).json({ error: '没有提供转录文本' });
    }

    // 根据场景生成不同的分析prompt
    const getScenarioPrompt = (scenario) => {
      const baseInstruction = `请严格按照以下JSON格式返回分析结果：
{
  "summary": "详细总结内容",
  "keyPoints": ["要点1", "要点2", "要点3"],
  "risks": [
    {
      "level": "high/medium/low",
      "title": "风险标题",
      "description": "风险描述",
      "suggestion": "建议措施"
    }
  ],
  "todos": [
    {
      "priority": "urgent/high/medium/low", 
      "title": "任务标题",
      "deadline": "截止时间(可选)",
      "context": "任务背景"
    }
  ]
}

转录内容：
${transcript}

`;

      switch (scenario) {
        case 'customer_meeting':
          return baseInstruction + `
请从银行客户经理与客户沟通的角度进行分析：

总结重点：
- 客户基本信息和需求分析
- 客户对产品的兴趣点和疑虑
- 沟通过程中的关键要点

风险提示重点：
- 合规风险（是否有过度承诺）
- 客户情绪风险（客户是否有不满情绪）
- 业务风险（是否有潜在投诉风险）

待办事项重点：
- 客户回访安排
- 需要准备的材料或文件
- 产品方案定制和优化`;

        case 'phone_sales':
          return baseInstruction + `
请从银行电话销售的角度进行分析：

总结重点：
- 通话效果和客户响应
- 客户意向度和异议处理情况
- 话术使用效果评估

风险提示重点：
- 合规检查（话术是否规范）
- 录音告知是否到位
- 是否存在误导性表述

待办事项重点：
- 客户分级和标记
- 后续回访时机安排
- 话术优化建议`;

        case 'team_meeting':
          return baseInstruction + `
请从银行团队会议的角度进行分析：

总结重点：
- 会议关键决策和讨论要点
- 重要问题的梳理和解决方案
- 团队共识和分歧点

风险提示重点：
- 项目执行风险
- 资源配置冲突
- 时间节点风险

待办事项重点：
- 具体任务分工和责任人
- 关键时间节点和截止日期
- 下次会议需要讨论的议题`;

        default:
          return baseInstruction + `
请进行通用分析，重点关注：
- 内容核心要点总结
- 潜在风险识别
- 后续行动建议`;
      }
    };

    const analysisPrompt = prompt || getScenarioPrompt(selectedScenario);
    const selectedModel = model || process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
    
    const completion = await openai.chat.completions.create({
      model: selectedModel,
      messages: [
        {
          role: 'system',
          content: '你是一个专业的银行业务分析助手，专门帮助客户经理分析录音内容。请严格按照JSON格式返回结构化数据。'
        },
        {
          role: 'user',
          content: analysisPrompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const analysisResult = completion.choices[0].message.content;
    
    // 尝试解析JSON格式的返回结果
    try {
      const parsedResult = JSON.parse(analysisResult);
      res.json({
        success: true,
        data: parsedResult,
        scenario: selectedScenario
      });
    } catch (parseError) {
      // 如果不是JSON格式，返回原始文本
      console.warn('AI返回结果不是JSON格式，使用fallback处理');
      res.json({
        success: true,
        data: {
          summary: analysisResult,
          keyPoints: [],
          risks: [],
          todos: []
        },
        scenario: selectedScenario
      });
    }
  } catch (error) {
    console.error('分析错误详情:', {
      error: error.message,
      stack: error.stack,
      response: error.response?.data
    });
    res.status(500).json({ 
      error: '分析失败',
      message: error.message,
      details: error.response?.data?.error?.message || error.message
    });
  }
});

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    hasApiKey: !!process.env.OPENAI_API_KEY
  });
});

// 获取可用模型列表
app.get('/api/models', (req, res) => {
  const models = [
    { 
      id: 'gpt-3.5-turbo', 
      name: 'GPT-3.5 Turbo', 
      description: '快速且经济，适合基础分析',
      cost: '💰'
    },
    { 
      id: 'gpt-4o-mini', 
      name: 'GPT-4o Mini', 
      description: '性价比最高，推荐使用',
      cost: '💰💰',
      recommended: true
    },
    { 
      id: 'gpt-4o', 
      name: 'GPT-4o', 
      description: '最强大的分析能力',
      cost: '💰💰💰'
    }
  ];
  
  res.json({
    models,
    currentModel: process.env.OPENAI_MODEL || 'gpt-4o-mini'
  });
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});