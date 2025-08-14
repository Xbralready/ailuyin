import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ChevronLeft,
  Sparkles,
  Clock,
  Copy,
  Download,
  Send,
  Loader,
  Settings
} from 'lucide-react';
import { analyzeTranscriptLegacy, getModels } from '../services/api';
import type { ModelInfo } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './AIAnalysis.css';

interface AnalysisTemplate {
  id: string;
  name: string;
  description: string;
  prompt: string;
  icon: string;
}

const analysisTemplates: AnalysisTemplate[] = [
  {
    id: 'summary',
    name: '内容摘要',
    description: '生成简洁的内容摘要',
    prompt: '请为以下内容生成一个简洁的摘要，包含主要观点和关键信息：',
    icon: '📝'
  },
  {
    id: 'meeting',
    name: '会议纪要',
    description: '整理成专业的会议纪要格式',
    prompt: '请将以下内容整理成专业的会议纪要，包括：\n1. 会议主题\n2. 参会人员\n3. 主要议题\n4. 决议事项\n5. 后续行动计划\n\n内容：',
    icon: '👥'
  },
  {
    id: 'study',
    name: '学习笔记',
    description: '提取知识点和学习要点',
    prompt: '请将以下内容整理成学习笔记，包括：\n1. 核心概念\n2. 重要知识点\n3. 关键细节\n4. 总结\n\n内容：',
    icon: '📚'
  },
  {
    id: 'action',
    name: '行动计划',
    description: '提取待办事项和行动要点',
    prompt: '请从以下内容中提取所有的行动项、任务和待办事项，并按优先级排序：',
    icon: '✅'
  },
  {
    id: 'interview',
    name: '采访整理',
    description: '整理采访内容的问答要点',
    prompt: '请将以下采访内容整理成问答形式，提取关键信息和重要观点：',
    icon: '🎤'
  },
  {
    id: 'custom',
    name: '自定义分析',
    description: '输入自定义的分析指令',
    prompt: '',
    icon: '⚡'
  }
];

interface AnalysisHistory {
  id: string;
  text: string;
  template: string;
  result: string;
  model: string;
  timestamp: Date;
}

const AIAnalysis: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  const [inputText, setInputText] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<AnalysisTemplate>(analysisTemplates[0]);
  const [customPrompt, setCustomPrompt] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState('');
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState('gpt-4o-mini');
  const [showSettings, setShowSettings] = useState(false);
  const [history, setHistory] = useState<AnalysisHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const loadModels = async () => {
    try {
      const data = await getModels();
      setModels(data.models);
      setSelectedModel(data.currentModel);
    } catch (error) {
      console.error('加载模型失败:', error);
    }
  };

  const loadHistory = useCallback(() => {
    const saved = localStorage.getItem(`analysis_history_${user?._id}`);
    if (saved) {
      setHistory(JSON.parse(saved));
    }
  }, [user?._id]);

  // 从录音页面传递过来的文本
  useEffect(() => {
    if (location.state?.transcript) {
      setInputText(location.state.transcript);
    }
  }, [location.state]);

  // 加载模型列表
  useEffect(() => {
    loadModels();
    loadHistory();
  }, [loadHistory]);

  const saveToHistory = (analysis: AnalysisHistory) => {
    const newHistory = [analysis, ...history].slice(0, 50); // 最多保存50条
    setHistory(newHistory);
    localStorage.setItem(`analysis_history_${user?._id}`, JSON.stringify(newHistory));
  };

  const handleAnalyze = async () => {
    if (!inputText.trim()) return;

    setIsAnalyzing(true);
    setAnalysisResult('');

    try {
      const prompt = selectedTemplate.id === 'custom' 
        ? customPrompt 
        : selectedTemplate.prompt;
      
      const result = await analyzeTranscriptLegacy(inputText, prompt, selectedModel);
      setAnalysisResult(result);

      // 保存到历史记录
      const historyItem: AnalysisHistory = {
        id: Date.now().toString(),
        text: inputText.substring(0, 100) + '...',
        template: selectedTemplate.name,
        result: result,
        model: selectedModel,
        timestamp: new Date()
      };
      saveToHistory(historyItem);
    } catch (error) {
      console.error('分析失败:', error);
      setAnalysisResult('分析失败，请重试');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // 可以添加一个提示
  };

  const downloadResult = () => {
    const blob = new Blob([analysisResult], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `分析结果_${selectedTemplate.name}_${new Date().toLocaleDateString()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadFromHistory = (item: AnalysisHistory) => {
    setInputText(item.text);
    setAnalysisResult(item.result);
    setSelectedModel(item.model);
    const template = analysisTemplates.find(t => t.name === item.template);
    if (template) setSelectedTemplate(template);
    setShowHistory(false);
  };

  return (
    <div className="ai-analysis-page">
      <div className="analysis-header">
        <button onClick={() => navigate(-1)} className="back-button">
          <ChevronLeft size={24} />
        </button>
        <h1>AI 智能分析</h1>
        <button 
          onClick={() => setShowSettings(!showSettings)} 
          className="settings-toggle"
        >
          <Settings size={20} />
        </button>
      </div>

      {showSettings && (
        <div className="model-settings">
          <h3>选择AI模型</h3>
          <div className="model-options">
            {models.map((model) => (
              <div
                key={model.id}
                className={`model-option ${selectedModel === model.id ? 'selected' : ''}`}
                onClick={() => setSelectedModel(model.id)}
              >
                <div className="model-header">
                  <span className="model-name">{model.name}</span>
                  <span className="model-cost">{model.cost}</span>
                </div>
                <div className="model-description">{model.description}</div>
                {model.recommended && <span className="model-badge">推荐</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="analysis-container">
        <div className="input-section">
          <div className="template-selector">
            <h3>选择分析模板</h3>
            <div className="template-grid">
              {analysisTemplates.map((template) => (
                <div
                  key={template.id}
                  className={`template-card ${selectedTemplate.id === template.id ? 'selected' : ''}`}
                  onClick={() => setSelectedTemplate(template)}
                >
                  <span className="template-icon">{template.icon}</span>
                  <span className="template-name">{template.name}</span>
                  <p className="template-desc">{template.description}</p>
                </div>
              ))}
            </div>
          </div>

          {selectedTemplate.id === 'custom' && (
            <div className="custom-prompt-section">
              <h3>自定义分析指令</h3>
              <textarea
                className="custom-prompt-input"
                placeholder="输入您的分析要求，例如：请提取所有的数字和日期..."
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                rows={3}
              />
            </div>
          )}

          <div className="text-input-section">
            <div className="input-header">
              <h3>输入文本</h3>
              <button 
                onClick={() => setShowHistory(!showHistory)}
                className="history-button"
              >
                <Clock size={18} />
                历史记录
              </button>
            </div>
            <textarea
              className="text-input"
              placeholder="在这里输入或粘贴需要分析的文本..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              rows={8}
            />
            <div className="input-actions">
              <span className="char-count">{inputText.length} 字符</span>
              <button
                onClick={handleAnalyze}
                disabled={!inputText.trim() || isAnalyzing}
                className="analyze-button"
              >
                {isAnalyzing ? (
                  <>
                    <Loader className="spinning" size={18} />
                    分析中...
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    开始分析
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {analysisResult && (
          <div className="result-section">
            <div className="result-header">
              <h3>
                <Sparkles size={20} />
                分析结果
              </h3>
              <div className="result-actions">
                <button onClick={() => copyToClipboard(analysisResult)} className="action-button">
                  <Copy size={18} />
                  复制
                </button>
                <button onClick={downloadResult} className="action-button">
                  <Download size={18} />
                  下载
                </button>
              </div>
            </div>
            <div className="result-content">
              {analysisResult.split('\n').map((line, index) => (
                <p key={index}>{line || '\u00A0'}</p>
              ))}
            </div>
          </div>
        )}

        {showHistory && history.length > 0 && (
          <div className="history-panel">
            <div className="history-header">
              <h3>历史记录</h3>
              <button 
                onClick={() => setShowHistory(false)}
                className="close-button"
              >
                ✕
              </button>
            </div>
            <div className="history-list">
              {history.map((item) => (
                <div 
                  key={item.id} 
                  className="history-item"
                  onClick={() => loadFromHistory(item)}
                >
                  <div className="history-info">
                    <span className="history-template">{item.template}</span>
                    <span className="history-text">{item.text}</span>
                  </div>
                  <span className="history-time">
                    {new Date(item.timestamp).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIAnalysis;