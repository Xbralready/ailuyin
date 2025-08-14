import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Star,
  Shield,
  Target,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Award,
  BarChart3,
  ThumbsUp,
  ThumbsDown,
  Volume2,
  Calendar
} from 'lucide-react';

interface PhoneSalesViewProps {
  analysisData: {
    summary: string;
    keyPoints?: string[];
    risks: Array<{
      id: string;
      level: 'high' | 'medium' | 'low';
      title: string;
      description: string;
      suggestion?: string;
      isHandled?: boolean;
    }>;
    todos: Array<{
      id: string;
      priority: 'urgent' | 'high' | 'medium' | 'low';
      title: string;
      deadline?: string;
      context?: string;
      completed: boolean;
    }>;
  };
  onRiskToggle: (riskId: string) => void;
  onTodoToggle: (todoId: string) => void;
  recordingInfo: {
    date: string;
    duration: number;
    transcript: string;
  };
}

const PhoneSalesView: React.FC<PhoneSalesViewProps> = ({
  analysisData,
  onRiskToggle,
  onTodoToggle
  // recordingInfo is not used in this view
}) => {
  const [activeSection, setActiveSection] = useState<'overview' | 'compliance' | 'actions'>('overview');

  // 模拟通话评分数据
  const getCallMetrics = () => {
    return {
      overallScore: 4.2,
      scriptCompliance: 85,
      customerResponse: 78,
      conversionPotential: 62,
      callQuality: 90,
      customerLevel: 'B',
      objections: 2,
      positiveSignals: 5
    };
  };

  const callMetrics = getCallMetrics();

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          size={16}
          className={i <= rating ? 'star-filled' : 'star-empty'}
          fill={i <= rating ? '#FFD700' : 'none'}
        />
      );
    }
    return stars;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#34C759';
    if (score >= 60) return '#FF9500';
    return '#FF3B30';
  };

  const getCustomerLevelColor = (level: string) => {
    switch (level) {
      case 'A': return '#34C759';
      case 'B': return '#007AFF';
      case 'C': return '#FF9500';
      default: return '#999';
    }
  };

  return (
    <div className="phone-sales-view">
      {/* 通话评分卡 */}
      <div className="call-score-card">
        <div className="score-header">
          <div className="overall-score">
            <div className="score-circle">
              <span className="score-number">{callMetrics.overallScore}</span>
              <div className="score-stars">
                {renderStars(Math.round(callMetrics.overallScore))}
              </div>
            </div>
          </div>
          <div className="score-details">
            <h2>通话质量评分</h2>
            <div className="metrics-grid">
              <div className="metric-item">
                <Shield size={16} />
                <span>话术合规</span>
                <div className="metric-bar">
                  <div 
                    className="metric-fill"
                    style={{ 
                      width: `${callMetrics.scriptCompliance}%`,
                      backgroundColor: getScoreColor(callMetrics.scriptCompliance)
                    }}
                  />
                </div>
                <span className="metric-value">{callMetrics.scriptCompliance}%</span>
              </div>
              <div className="metric-item">
                <Volume2 size={16} />
                <span>客户响应</span>
                <div className="metric-bar">
                  <div 
                    className="metric-fill"
                    style={{ 
                      width: `${callMetrics.customerResponse}%`,
                      backgroundColor: getScoreColor(callMetrics.customerResponse)
                    }}
                  />
                </div>
                <span className="metric-value">{callMetrics.customerResponse}%</span>
              </div>
              <div className="metric-item">
                <Target size={16} />
                <span>转化潜力</span>
                <div className="metric-bar">
                  <div 
                    className="metric-fill"
                    style={{ 
                      width: `${callMetrics.conversionPotential}%`,
                      backgroundColor: getScoreColor(callMetrics.conversionPotential)
                    }}
                  />
                </div>
                <span className="metric-value">{callMetrics.conversionPotential}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 客户分级和信号 */}
      <div className="customer-analysis">
        <div className="customer-level-card">
          <div className="level-indicator">
            <div 
              className="level-badge"
              style={{ backgroundColor: getCustomerLevelColor(callMetrics.customerLevel) }}
            >
              {callMetrics.customerLevel}级客户
            </div>
          </div>
          <div className="signals">
            <div className="signal-item positive">
              <ThumbsUp size={16} />
              <span>积极信号</span>
              <span className="signal-count">{callMetrics.positiveSignals}</span>
            </div>
            <div className="signal-item negative">
              <ThumbsDown size={16} />
              <span>异议次数</span>
              <span className="signal-count">{callMetrics.objections}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Section 导航 */}
      <div className="sales-nav">
        <button
          className={`nav-btn ${activeSection === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveSection('overview')}
        >
          <BarChart3 size={16} />
          <span>通话分析</span>
        </button>
        <button
          className={`nav-btn ${activeSection === 'compliance' ? 'active' : ''}`}
          onClick={() => setActiveSection('compliance')}
        >
          <Shield size={16} />
          <span>合规检查</span>
          {analysisData.risks.filter(r => !r.isHandled).length > 0 && (
            <span className="nav-badge">
              {analysisData.risks.filter(r => !r.isHandled).length}
            </span>
          )}
        </button>
        <button
          className={`nav-btn ${activeSection === 'actions' ? 'active' : ''}`}
          onClick={() => setActiveSection('actions')}
        >
          <Target size={16} />
          <span>销售行动</span>
          {analysisData.todos.filter(t => !t.completed).length > 0 && (
            <span className="nav-badge">
              {analysisData.todos.filter(t => !t.completed).length}
            </span>
          )}
        </button>
      </div>

      {/* Section 内容 */}
      <motion.div className="sales-content">
        {activeSection === 'overview' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="overview-content"
          >
            <div className="analysis-summary">
              <h3>通话分析总结</h3>
              <div className="summary-text">
                {analysisData.summary}
              </div>
            </div>

            {analysisData.keyPoints && analysisData.keyPoints.length > 0 && (
              <div className="performance-insights">
                <h3>关键表现指标</h3>
                <div className="insights-grid">
                  {analysisData.keyPoints.map((point, index) => (
                    <div key={index} className="insight-card">
                      <div className="insight-icon">
                        <Award size={20} />
                      </div>
                      <div className="insight-content">
                        <p>{point}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {activeSection === 'compliance' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="compliance-content"
          >
            <div className="compliance-header">
              <h3>合规性检查结果</h3>
              <div className="compliance-status">
                {analysisData.risks.length === 0 ? (
                  <div className="status-good">
                    <CheckCircle size={20} />
                    <span>通话合规</span>
                  </div>
                ) : (
                  <div className="status-warning">
                    <XCircle size={20} />
                    <span>{analysisData.risks.length} 个合规问题</span>
                  </div>
                )}
              </div>
            </div>

            <div className="compliance-list">
              {analysisData.risks.map((risk) => (
                <div
                  key={risk.id}
                  className={`compliance-item ${risk.level} ${risk.isHandled ? 'resolved' : ''}`}
                >
                  <div className="compliance-indicator">
                    <AlertTriangle size={20} />
                  </div>
                  <div className="compliance-content">
                    <div className="compliance-header">
                      <h4>{risk.title}</h4>
                      <div className="compliance-actions">
                        <span className={`risk-level ${risk.level}`}>
                          {risk.level === 'high' ? '严重' :
                           risk.level === 'medium' ? '中等' : '轻微'}
                        </span>
                        <button
                          className="resolve-btn"
                          onClick={() => onRiskToggle(risk.id)}
                        >
                          {risk.isHandled ? '已处理' : '标记处理'}
                        </button>
                      </div>
                    </div>
                    <p className="compliance-description">{risk.description}</p>
                    {risk.suggestion && (
                      <div className="compliance-suggestion">
                        <strong>改进建议：</strong>
                        <p>{risk.suggestion}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeSection === 'actions' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="actions-content"
          >
            <div className="actions-header">
              <h3>销售行动计划</h3>
              <div className="progress-indicator">
                <span>
                  {analysisData.todos.filter(t => t.completed).length} / {analysisData.todos.length} 已完成
                </span>
              </div>
            </div>

            <div className="actions-list">
              {analysisData.todos.map((todo) => (
                <div
                  key={todo.id}
                  className={`action-item ${todo.completed ? 'completed' : ''}`}
                >
                  <div className="action-checkbox">
                    <button
                      className="checkbox"
                      onClick={() => onTodoToggle(todo.id)}
                    >
                      {todo.completed && <CheckCircle size={16} />}
                    </button>
                  </div>
                  <div className="action-content">
                    <div className="action-header">
                      <h4>{todo.title}</h4>
                      <div className="action-meta">
                        <span className={`priority-tag ${todo.priority}`}>
                          {todo.priority === 'urgent' ? '紧急' :
                           todo.priority === 'high' ? '高优先级' :
                           todo.priority === 'medium' ? '中优先级' : '低优先级'}
                        </span>
                      </div>
                    </div>
                    {todo.context && (
                      <p className="action-context">{todo.context}</p>
                    )}
                    {todo.deadline && (
                      <div className="action-deadline">
                        <Calendar size={14} />
                        <span>截止: {todo.deadline}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default PhoneSalesView;