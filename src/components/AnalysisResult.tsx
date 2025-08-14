import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ChevronLeft,
  Sparkles,
  Copy,
  Download,
  RefreshCw,
  Calendar,
  Clock,
  FileText,
  Loader,
  Settings
} from 'lucide-react';
import { analyzeTranscriptLegacy, getModels } from '../services/api';
import type { ModelInfo } from '../services/api';
import './AnalysisResult.css';

interface LocationState {
  recordingId: string;
  transcript: string;
  date: string;
  duration: number;
  audioURL?: string;
}

const AnalysisResult: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;
  
  const [analysis, setAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('gpt-4o-mini');
  const [showSettings, setShowSettings] = useState(false);
  const [analysisType, setAnalysisType] = useState<'summary' | 'detailed' | 'action'>('summary');

  const loadModels = async () => {
    try {
      const data = await getModels();
      setModels(data.models);
      setSelectedModel(data.currentModel);
    } catch (error) {
      console.error('加载模型失败:', error);
    }
  };

  const getAnalysisPrompt = useCallback(() => {
    switch (analysisType) {
      case 'detailed':
        return '请对以下内容进行详细分析，包括：\n1. 主题和核心观点\n2. 关键信息提取\n3. 逻辑结构分析\n4. 重要细节\n5. 总结和建议\n\n内容：';
      case 'action':
        return '请从以下内容中提取所有的行动项和待办事项，并按以下格式整理：\n1. 立即需要完成的任务\n2. 短期计划（1周内）\n3. 长期计划\n4. 注意事项\n\n内容：';
      default:
        return '请对以下内容进行智能分析和总结：';
    }
  }, [analysisType]);

  const performAnalysis = useCallback(async () => {
    setIsAnalyzing(true);
    try {
      const prompt = getAnalysisPrompt();
      const result = await analyzeTranscriptLegacy(state.transcript, prompt, selectedModel);
      setAnalysis(result);
    } catch (error) {
      console.error('分析失败:', error);
      setAnalysis('分析失败，请重试');
    } finally {
      setIsAnalyzing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.transcript, selectedModel, analysisType]);

  useEffect(() => {
    if (!state?.transcript) {
      navigate('/');
      return;
    }
    loadModels();
    performAnalysis();
  }, [navigate, performAnalysis, state?.transcript]);

  const handleReanalyze = () => {
    setAnalysis('');
    performAnalysis();
  };

  const copyToClipboard = () => {
    const content = `录音时间：${new Date(state.date).toLocaleString('zh-CN')}
时长：${formatDuration(state.duration)}

转录内容：
${state.transcript}

AI分析结果：
${analysis}`;
    
    navigator.clipboard.writeText(content);
    // 可以添加提示
  };

  const downloadAnalysis = () => {
    const content = `录音分析报告
==================

录音信息
--------
录音时间：${new Date(state.date).toLocaleString('zh-CN')}
录音时长：${formatDuration(state.duration)}

转录内容
--------
${state.transcript}

AI分析结果
----------
${analysis}

生成时间：${new Date().toLocaleString('zh-CN')}
分析模型：${selectedModel}
`;
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `录音分析报告_${new Date(state.date).toLocaleDateString()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="analysis-result-page">
      <div className="result-header">
        <button onClick={() => navigate(-1)} className="back-button">
          <ChevronLeft size={24} />
          返回
        </button>
        <h1>AI 分析结果</h1>
        <button 
          onClick={() => setShowSettings(!showSettings)} 
          className="settings-button"
        >
          <Settings size={20} />
        </button>
      </div>

      {showSettings && (
        <div className="settings-panel">
          <div className="analysis-type-selector">
            <h3>分析类型</h3>
            <div className="type-options">
              <button
                className={`type-option ${analysisType === 'summary' ? 'active' : ''}`}
                onClick={() => {
                  setAnalysisType('summary');
                  handleReanalyze();
                }}
              >
                摘要分析
              </button>
              <button
                className={`type-option ${analysisType === 'detailed' ? 'active' : ''}`}
                onClick={() => {
                  setAnalysisType('detailed');
                  handleReanalyze();
                }}
              >
                详细分析
              </button>
              <button
                className={`type-option ${analysisType === 'action' ? 'active' : ''}`}
                onClick={() => {
                  setAnalysisType('action');
                  handleReanalyze();
                }}
              >
                行动计划
              </button>
            </div>
          </div>
          
          <div className="model-selector">
            <h3>AI模型</h3>
            <div className="model-options">
              {models.map((model) => (
                <div
                  key={model.id}
                  className={`model-option ${selectedModel === model.id ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedModel(model.id);
                    handleReanalyze();
                  }}
                >
                  <span className="model-name">{model.name}</span>
                  <span className="model-cost">{model.cost}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="result-container">
        <div className="recording-info-card">
          <h2>录音信息</h2>
          <div className="info-grid">
            <div className="info-item">
              <Calendar size={18} />
              <span>录音时间</span>
              <strong>{new Date(state.date).toLocaleString('zh-CN')}</strong>
            </div>
            <div className="info-item">
              <Clock size={18} />
              <span>录音时长</span>
              <strong>{formatDuration(state.duration)}</strong>
            </div>
            <div className="info-item">
              <FileText size={18} />
              <span>文本长度</span>
              <strong>{state.transcript.length} 字符</strong>
            </div>
          </div>
        </div>

        <div className="transcript-card">
          <div className="card-header">
            <h2>
              <FileText size={20} />
              转录内容
            </h2>
          </div>
          <div className="transcript-text">
            {state.transcript}
          </div>
        </div>

        <div className="analysis-card">
          <div className="card-header">
            <h2>
              <Sparkles size={20} />
              AI 分析结果
            </h2>
            <div className="action-buttons">
              <button 
                onClick={handleReanalyze} 
                className="action-btn"
                disabled={isAnalyzing}
                title="重新分析"
              >
                <RefreshCw size={18} className={isAnalyzing ? 'spinning' : ''} />
              </button>
              <button 
                onClick={copyToClipboard} 
                className="action-btn"
                title="复制全部内容"
              >
                <Copy size={18} />
              </button>
              <button 
                onClick={downloadAnalysis} 
                className="action-btn"
                title="下载分析报告"
              >
                <Download size={18} />
              </button>
            </div>
          </div>
          
          {isAnalyzing ? (
            <div className="loading-container">
              <Loader className="spinning" size={40} />
              <p>AI 正在分析中...</p>
            </div>
          ) : (
            <div className="analysis-content">
              {analysis.split('\n').map((paragraph, index) => (
                <p key={index}>{paragraph || '\u00A0'}</p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalysisResult;