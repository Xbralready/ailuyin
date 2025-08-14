import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  Calendar,
  Clock,
  FileText,
  AlertTriangle,
  CheckSquare,
  Download,
  Share2,
  RefreshCw,
  Settings,
  Copy,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Info
} from 'lucide-react';
import { analyzeTranscript, getModels } from '../services/api';
import type { ModelInfo, RiskItem, TodoItem, ScenarioType } from '../services/api';
import './AnalysisResultV2.css';

// 类型定义
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

type TabType = 'summary' | 'risks' | 'todos';

const AnalysisResultV2: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;

  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gpt-4o-mini');
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [expandedRisks, setExpandedRisks] = useState<Set<string>>(new Set());
  const [copySuccess, setCopySuccess] = useState(false);
  const [scenario, setScenario] = useState<ScenarioType>('general');

  const loadModels = async () => {
    try {
      const data = await getModels();
      setModels(data.models);
      setSelectedModel(data.currentModel);
    } catch (error) {
      console.error('加载模型失败:', error);
    }
  };

  const performAnalysis = useCallback(async () => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeTranscript(state.transcript, scenario, selectedModel);
      
      // 转换API返回的数据格式为组件需要的格式
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
      // 设置一个错误状态的分析数据
      setAnalysisData({
        summary: '分析失败，请重试',
        risks: [],
        todos: [],
        keyPoints: []
      });
    } finally {
      setIsAnalyzing(false);
    }
  }, [state.transcript, scenario, selectedModel]);

  useEffect(() => {
    if (!state?.transcript) {
      navigate('/');
      return;
    }
    loadModels();
    performAnalysis();
  }, [navigate, performAnalysis, state?.transcript]);

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

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleTodoToggle = (todoId: string) => {
    if (!analysisData) return;
    
    setAnalysisData({
      ...analysisData,
      todos: analysisData.todos.map(todo =>
        todo.id === todoId ? { ...todo, completed: !todo.completed } : todo
      )
    });
  };

  const handleRiskToggle = (riskId: string) => {
    if (!analysisData) return;
    
    setAnalysisData({
      ...analysisData,
      risks: analysisData.risks.map(risk =>
        risk.id === riskId ? { ...risk, isHandled: !risk.isHandled } : risk
      )
    });
  };

  const toggleRiskExpand = (riskId: string) => {
    const newExpanded = new Set(expandedRisks);
    if (newExpanded.has(riskId)) {
      newExpanded.delete(riskId);
    } else {
      newExpanded.add(riskId);
    }
    setExpandedRisks(newExpanded);
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'high':
        return <AlertCircle className="risk-icon high" size={20} />;
      case 'medium':
        return <AlertTriangle className="risk-icon medium" size={20} />;
      case 'low':
        return <Info className="risk-icon low" size={20} />;
      default:
        return null;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'priority-urgent';
      case 'high':
        return 'priority-high';
      case 'medium':
        return 'priority-medium';
      case 'low':
        return 'priority-low';
      default:
        return '';
    }
  };

  const exportAnalysis = () => {
    if (!analysisData) return;

    const content = `分析报告
==================

录音信息
--------
时间：${new Date(state.date).toLocaleString('zh-CN')}
时长：${formatDuration(state.duration)}

总结
----
${analysisData.summary}

${analysisData.keyPoints && analysisData.keyPoints.length > 0 ? `
关键要点
--------
${analysisData.keyPoints.map((point, i) => `${i + 1}. ${point}`).join('\n')}
` : ''}

${analysisData.risks.length > 0 ? `
风险提示
--------
${analysisData.risks.map(risk => 
  `[${risk.level.toUpperCase()}] ${risk.title}\n${risk.description}\n建议：${risk.suggestion || '无'}\n`
).join('\n')}` : ''}

${analysisData.todos.length > 0 ? `
待办事项
--------
${analysisData.todos.map(todo => 
  `[${todo.priority.toUpperCase()}] ${todo.title}${todo.deadline ? ` - 截止：${todo.deadline}` : ''}\n${todo.context || ''}\n`
).join('\n')}` : ''}

生成时间：${new Date().toLocaleString('zh-CN')}
`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `分析报告_${new Date().toLocaleDateString()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getActiveTabContent = () => {
    if (!analysisData || isAnalyzing) {
      return (
        <div className="loading-state">
          <div className="loading-spinner" />
          <p>AI 正在分析中...</p>
        </div>
      );
    }

    switch (activeTab) {
      case 'summary':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="summary-content"
          >
            <div className="summary-section">
              <div className="section-header">
                <h3>内容总结</h3>
                <button 
                  className="icon-btn"
                  onClick={() => handleCopy(analysisData.summary)}
                >
                  {copySuccess ? <Check size={18} /> : <Copy size={18} />}
                </button>
              </div>
              <div className="summary-text">
                {analysisData.summary}
              </div>
            </div>

            {analysisData.keyPoints && analysisData.keyPoints.length > 0 && (
              <div className="key-points-section">
                <h3>关键要点</h3>
                <ul className="key-points-list">
                  {analysisData.keyPoints.map((point, index) => (
                    <li key={index} className="key-point-item">
                      <span className="point-number">{index + 1}</span>
                      <span className="point-text">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        );

      case 'risks':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="risks-content"
          >
            {analysisData.risks.length === 0 ? (
              <div className="empty-state">
                <AlertTriangle size={48} />
                <p>未发现风险提示</p>
              </div>
            ) : (
              <div className="risks-list">
                {analysisData.risks.map((risk) => (
                  <div
                    key={risk.id}
                    className={`risk-item ${risk.level} ${risk.isHandled ? 'handled' : ''}`}
                  >
                    <div className="risk-header">
                      <div className="risk-title-row">
                        {getRiskIcon(risk.level)}
                        <h4>{risk.title}</h4>
                      </div>
                      <div className="risk-actions">
                        <button
                          className="icon-btn"
                          onClick={() => handleRiskToggle(risk.id)}
                          title={risk.isHandled ? '标记为未处理' : '标记为已处理'}
                        >
                          {risk.isHandled ? <X size={16} /> : <Check size={16} />}
                        </button>
                        <button
                          className="icon-btn"
                          onClick={() => toggleRiskExpand(risk.id)}
                        >
                          {expandedRisks.has(risk.id) ? 
                            <ChevronUp size={16} /> : 
                            <ChevronDown size={16} />
                          }
                        </button>
                      </div>
                    </div>
                    
                    <AnimatePresence>
                      {expandedRisks.has(risk.id) && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="risk-details"
                        >
                          <p className="risk-description">{risk.description}</p>
                          {risk.suggestion && (
                            <div className="risk-suggestion">
                              <strong>建议：</strong> {risk.suggestion}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        );

      case 'todos':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="todos-content"
          >
            {analysisData.todos.length === 0 ? (
              <div className="empty-state">
                <CheckSquare size={48} />
                <p>暂无待办事项</p>
              </div>
            ) : (
              <div className="todos-list">
                {analysisData.todos.map((todo) => (
                  <div
                    key={todo.id}
                    className={`todo-item ${todo.completed ? 'completed' : ''} ${getPriorityColor(todo.priority)}`}
                  >
                    <button
                      className="todo-checkbox"
                      onClick={() => handleTodoToggle(todo.id)}
                    >
                      {todo.completed && <Check size={16} />}
                    </button>
                    <div className="todo-content">
                      <h4 className="todo-title">{todo.title}</h4>
                      {todo.context && (
                        <p className="todo-context">{todo.context}</p>
                      )}
                      {todo.deadline && (
                        <div className="todo-deadline">
                          <Clock size={14} />
                          <span>{todo.deadline}</span>
                        </div>
                      )}
                    </div>
                    <span className={`priority-badge ${todo.priority}`}>
                      {todo.priority === 'urgent' ? '紧急' :
                       todo.priority === 'high' ? '高' :
                       todo.priority === 'medium' ? '中' : '低'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        );

      default:
        return null;
    }
  };

  const getTabCount = (tab: TabType) => {
    if (!analysisData) return 0;
    switch (tab) {
      case 'risks':
        return analysisData.risks.filter(r => !r.isHandled).length;
      case 'todos':
        return analysisData.todos.filter(t => !t.completed).length;
      default:
        return 0;
    }
  };

  return (
    <div className="analysis-v2-page">
      {/* 顶部导航 */}
      <header className="page-header">
        <button onClick={() => navigate(-1)} className="back-btn">
          <ChevronLeft size={24} />
          返回
        </button>
        <h1>分析结果</h1>
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
            className="settings-panel"
          >
            <h3>分析场景</h3>
            <div className="scenario-options">
              <label className="scenario-option">
                <input
                  type="radio"
                  name="scenario"
                  value="customer_meeting"
                  checked={scenario === 'customer_meeting'}
                  onChange={() => setScenario('customer_meeting')}
                />
                <span>客户沟通</span>
              </label>
              <label className="scenario-option">
                <input
                  type="radio"
                  name="scenario"
                  value="phone_sales"
                  checked={scenario === 'phone_sales'}
                  onChange={() => setScenario('phone_sales')}
                />
                <span>电话销售</span>
              </label>
              <label className="scenario-option">
                <input
                  type="radio"
                  name="scenario"
                  value="team_meeting"
                  checked={scenario === 'team_meeting'}
                  onChange={() => setScenario('team_meeting')}
                />
                <span>团队会议</span>
              </label>
            </div>

            <h3>AI 模型选择</h3>
            <div className="model-options">
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

      {/* 录音信息 - 紧凑版 */}
      <div className="recording-info-compact">
        <div className="info-item">
          <Calendar size={16} />
          <span>{new Date(state.date).toLocaleDateString('zh-CN')}</span>
        </div>
        <div className="info-separator">•</div>
        <div className="info-item">
          <Clock size={16} />
          <span>{formatDuration(state.duration)}</span>
        </div>
        <div className="info-separator">•</div>
        <div className="info-item">
          <FileText size={16} />
          <span>{state.transcript.length} 字</span>
        </div>
        <div className="info-separator">•</div>
        <div className="info-item scenario-indicator">
          <span>{getScenarioName(scenario)}</span>
        </div>
      </div>

      {/* Tab 导航 */}
      <div className="tab-navigation">
        <button
          className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
          onClick={() => setActiveTab('summary')}
        >
          总结
        </button>
        <button
          className={`tab-btn ${activeTab === 'risks' ? 'active' : ''}`}
          onClick={() => setActiveTab('risks')}
        >
          风险
          {getTabCount('risks') > 0 && (
            <span className="tab-badge">{getTabCount('risks')}</span>
          )}
        </button>
        <button
          className={`tab-btn ${activeTab === 'todos' ? 'active' : ''}`}
          onClick={() => setActiveTab('todos')}
        >
          待办
          {getTabCount('todos') > 0 && (
            <span className="tab-badge">{getTabCount('todos')}</span>
          )}
        </button>
      </div>

      {/* 内容区域 */}
      <div className="content-area">
        {getActiveTabContent()}
      </div>

      {/* 底部操作栏 */}
      <div className="bottom-actions">
        <button className="action-btn" onClick={exportAnalysis}>
          <Download size={20} />
          导出
        </button>
        <button className="action-btn">
          <Share2 size={20} />
          分享
        </button>
      </div>
    </div>
  );
};

export default AnalysisResultV2;