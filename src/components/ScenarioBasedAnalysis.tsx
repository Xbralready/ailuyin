import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  Calendar,
  Clock,
  FileText,
  Settings,
  Download,
  Share2,
  User,
  Phone,
  Users,
  RefreshCw
} from 'lucide-react';
import { analyzeTranscript, getModels } from '../services/api';
import type { ModelInfo, RiskItem, TodoItem, ScenarioType } from '../services/api';
import './ScenarioBasedAnalysis.css';

// 组件导入
import CustomerMeetingView from './scenarios/CustomerMeetingView';
import PhoneSalesView from './scenarios/PhoneSalesView';
import TeamMeetingView from './scenarios/TeamMeetingView';

interface LocationState {
  recordingId: string;
  transcript: string;
  date: string;
  duration: number;
  audioURL?: string;
}

interface ExtendedRiskItem extends RiskItem {
  id: string;
  isHandled?: boolean;
}

interface ExtendedTodoItem extends TodoItem {
  id: string;
  completed: boolean;
}

interface AnalysisData {
  summary: string;
  keyPoints?: string[];
  risks: ExtendedRiskItem[];
  todos: ExtendedTodoItem[];
  metadata?: {
    sentiment?: string;
    category?: string;
  };
}

const ScenarioBasedAnalysis: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;

  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gpt-4o-mini');
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [scenario, setScenario] = useState<ScenarioType>('customer_meeting');

  useEffect(() => {
    if (!state?.transcript) {
      navigate('/');
      return;
    }
    loadModels();
    performAnalysis();
  }, []);

  const loadModels = async () => {
    try {
      const data = await getModels();
      setModels(data.models);
      setSelectedModel(data.currentModel);
    } catch (error) {
      console.error('加载模型失败:', error);
    }
  };

  const performAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeTranscript(state.transcript, scenario, selectedModel);
      
      const processedData: AnalysisData = {
        summary: result.summary,
        keyPoints: result.keyPoints || [],
        risks: result.risks.map((risk, index) => ({
          id: `risk-${index}`,
          ...risk,
          isHandled: false
        })),
        todos: result.todos.map((todo, index) => ({
          id: `todo-${index}`,
          ...todo,
          completed: false
        })),
        metadata: result.metadata
      };
      
      setAnalysisData(processedData);
    } catch (error) {
      console.error('分析失败:', error);
      setAnalysisData({
        summary: '分析失败，请重试',
        risks: [],
        todos: [],
        keyPoints: []
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getScenarioName = (scenario: ScenarioType) => {
    switch (scenario) {
      case 'customer_meeting':
        return '客户沟通';
      case 'phone_sales':
        return '电话销售';
      case 'team_meeting':
        return '团队会议';
      default:
        return '通用分析';
    }
  };

  const getScenarioIcon = (scenario: ScenarioType) => {
    switch (scenario) {
      case 'customer_meeting':
        return <User size={20} />;
      case 'phone_sales':
        return <Phone size={20} />;
      case 'team_meeting':
        return <Users size={20} />;
      default:
        return <FileText size={20} />;
    }
  };

  const handleScenarioChange = (newScenario: ScenarioType) => {
    setScenario(newScenario);
    setAnalysisData(null);
    setIsAnalyzing(true);
    // 重新分析
    setTimeout(performAnalysis, 100);
  };

  const renderScenarioView = () => {
    if (isAnalyzing || !analysisData) {
      return (
        <div className="analysis-loading">
          <div className="loading-spinner" />
          <p>AI 正在分析中...</p>
        </div>
      );
    }

    const commonProps = {
      analysisData,
      onRiskToggle: (riskId: string) => {
        setAnalysisData(prev => prev ? {
          ...prev,
          risks: prev.risks.map(risk =>
            risk.id === riskId ? { ...risk, isHandled: !risk.isHandled } : risk
          )
        } : null);
      },
      onTodoToggle: (todoId: string) => {
        setAnalysisData(prev => prev ? {
          ...prev,
          todos: prev.todos.map(todo =>
            todo.id === todoId ? { ...todo, completed: !todo.completed } : todo
          )
        } : null);
      },
      recordingInfo: {
        date: state.date,
        duration: state.duration,
        transcript: state.transcript
      }
    };

    switch (scenario) {
      case 'customer_meeting':
        return <CustomerMeetingView {...commonProps} />;
      case 'phone_sales':
        return <PhoneSalesView {...commonProps} />;
      case 'team_meeting':
        return <TeamMeetingView {...commonProps} />;
      default:
        return <CustomerMeetingView {...commonProps} />;
    }
  };

  return (
    <div className="scenario-analysis-page">
      {/* 顶部导航 */}
      <header className="scenario-header">
        <button onClick={() => navigate(-1)} className="back-btn">
          <ChevronLeft size={24} />
          返回
        </button>
        <div className="scenario-title">
          {getScenarioIcon(scenario)}
          <h1>{getScenarioName(scenario)}分析</h1>
        </div>
        <button onClick={() => setShowSettings(!showSettings)} className="settings-btn">
          <Settings size={20} />
        </button>
      </header>

      {/* 设置面板 */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="scenario-settings"
          >
            <h3>选择分析场景</h3>
            <div className="scenario-selector">
              <button
                className={`scenario-btn ${scenario === 'customer_meeting' ? 'active' : ''}`}
                onClick={() => handleScenarioChange('customer_meeting')}
              >
                <User size={16} />
                <span>客户沟通</span>
              </button>
              <button
                className={`scenario-btn ${scenario === 'phone_sales' ? 'active' : ''}`}
                onClick={() => handleScenarioChange('phone_sales')}
              >
                <Phone size={16} />
                <span>电话销售</span>
              </button>
              <button
                className={`scenario-btn ${scenario === 'team_meeting' ? 'active' : ''}`}
                onClick={() => handleScenarioChange('team_meeting')}
              >
                <Users size={16} />
                <span>团队会议</span>
              </button>
            </div>

            <h3>AI 模型</h3>
            <div className="model-selector">
              {models.map((model) => (
                <label key={model.id} className="model-option">
                  <input
                    type="radio"
                    name="model"
                    value={model.id}
                    checked={selectedModel === model.id}
                    onChange={() => setSelectedModel(model.id)}
                  />
                  <div className="model-info">
                    <span className="model-name">{model.name}</span>
                    <span className="model-cost">{model.cost}</span>
                  </div>
                </label>
              ))}
            </div>

            <button 
              className="reanalyze-btn"
              onClick={performAnalysis}
              disabled={isAnalyzing}
            >
              <RefreshCw size={16} className={isAnalyzing ? 'spinning' : ''} />
              重新分析
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 录音基本信息 */}
      <div className="recording-summary">
        <div className="summary-item">
          <Calendar size={16} />
          <span>{new Date(state.date).toLocaleDateString('zh-CN')}</span>
        </div>
        <div className="summary-item">
          <Clock size={16} />
          <span>{formatDuration(state.duration)}</span>
        </div>
        <div className="summary-item">
          <FileText size={16} />
          <span>{state.transcript.length} 字</span>
        </div>
      </div>

      {/* 场景专用视图 */}
      <main className="scenario-content">
        {renderScenarioView()}
      </main>

      {/* 底部操作 */}
      <footer className="scenario-actions">
        <button className="action-btn">
          <Download size={20} />
          导出报告
        </button>
        <button className="action-btn">
          <Share2 size={20} />
          分享结果
        </button>
      </footer>
    </div>
  );
};

export default ScenarioBasedAnalysis;