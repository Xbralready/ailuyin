import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Heart,
  CheckSquare,
  Calendar,
  Target,
  DollarSign,
  Clock,
  ChevronDown,
  ChevronUp,
  Check,
  X
} from 'lucide-react';

interface CustomerMeetingViewProps {
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

const CustomerMeetingView: React.FC<CustomerMeetingViewProps> = ({
  analysisData,
  onRiskToggle,
  onTodoToggle
  // recordingInfo is not used in this view
}) => {
  const [expandedRisks, setExpandedRisks] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'summary' | 'risks' | 'followup'>('summary');

  const toggleRiskExpand = (riskId: string) => {
    const newExpanded = new Set(expandedRisks);
    if (newExpanded.has(riskId)) {
      newExpanded.delete(riskId);
    } else {
      newExpanded.add(riskId);
    }
    setExpandedRisks(newExpanded);
  };

  // 从summary中提取客户信息
  const extractCustomerInfo = () => {
    // 这里可以用AI或正则表达式提取客户信息
    // 暂时使用模拟数据
    return {
      name: '张先生',
      level: 'A级',
      intent: '85%',
      product: '理财产品',
      budget: '50-100万',
      timeline: '本月内'
    };
  };

  const customerInfo = extractCustomerInfo();

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high':
        return '#FF3B30';
      case 'medium':
        return '#FF9500';
      case 'low':
        return '#FFCC00';
      default:
        return '#999';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return '#FF3B30';
      case 'high':
        return '#FF9500';
      case 'medium':
        return '#007AFF';
      case 'low':
        return '#34C759';
      default:
        return '#999';
    }
  };

  return (
    <div className="customer-meeting-view">
      {/* 客户信息卡片 */}
      <div className="customer-card">
        <div className="customer-avatar">
          <User size={40} />
        </div>
        <div className="customer-details">
          <div className="customer-name">
            <h2>{customerInfo.name}</h2>
            <span className="customer-level">{customerInfo.level}</span>
          </div>
          <div className="customer-metrics">
            <div className="metric">
              <Target size={16} />
              <span>意向度</span>
              <div className="metric-bar">
                <div 
                  className="metric-fill"
                  style={{ width: customerInfo.intent, backgroundColor: '#34C759' }}
                />
              </div>
              <span className="metric-value">{customerInfo.intent}</span>
            </div>
            <div className="metric-info">
              <div className="info-item">
                <DollarSign size={14} />
                <span>{customerInfo.budget}</span>
              </div>
              <div className="info-item">
                <Calendar size={14} />
                <span>{customerInfo.timeline}</span>
              </div>
              <div className="info-item">
                <Heart size={14} />
                <span>{customerInfo.product}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab 导航 */}
      <div className="customer-tabs">
        <button
          className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
          onClick={() => setActiveTab('summary')}
        >
          沟通要点
        </button>
        <button
          className={`tab-btn ${activeTab === 'risks' ? 'active' : ''}`}
          onClick={() => setActiveTab('risks')}
        >
          风险提示
          {analysisData.risks.filter(r => !r.isHandled).length > 0 && (
            <span className="tab-badge">
              {analysisData.risks.filter(r => !r.isHandled).length}
            </span>
          )}
        </button>
        <button
          className={`tab-btn ${activeTab === 'followup' ? 'active' : ''}`}
          onClick={() => setActiveTab('followup')}
        >
          跟进计划
          {analysisData.todos.filter(t => !t.completed).length > 0 && (
            <span className="tab-badge">
              {analysisData.todos.filter(t => !t.completed).length}
            </span>
          )}
        </button>
      </div>

      {/* Tab 内容 */}
      <motion.div className="tab-content">
        {activeTab === 'summary' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="summary-content"
          >
            <div className="summary-text">
              {analysisData.summary}
            </div>
            
            {analysisData.keyPoints && analysisData.keyPoints.length > 0 && (
              <div className="key-insights">
                <h3>关键洞察</h3>
                <div className="insights-list">
                  {analysisData.keyPoints.map((point, index) => (
                    <div key={index} className="insight-item">
                      <div className="insight-number">{index + 1}</div>
                      <span>{point}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'risks' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="risks-content"
          >
            {analysisData.risks.length === 0 ? (
              <div className="empty-state">
                <CheckSquare size={48} />
                <p>暂无风险提示</p>
              </div>
            ) : (
              <div className="risks-list">
                {analysisData.risks.map((risk) => (
                  <div
                    key={risk.id}
                    className={`risk-card ${risk.isHandled ? 'handled' : ''}`}
                  >
                    <div className="risk-header">
                      <div className="risk-indicator">
                        <div 
                          className="risk-dot"
                          style={{ backgroundColor: getRiskColor(risk.level) }}
                        />
                        <span className="risk-level">{
                          risk.level === 'high' ? '高风险' :
                          risk.level === 'medium' ? '中风险' : '低风险'
                        }</span>
                      </div>
                      <div className="risk-actions">
                        <button
                          className="risk-toggle"
                          onClick={() => onRiskToggle(risk.id)}
                          title={risk.isHandled ? '标记未处理' : '标记已处理'}
                        >
                          {risk.isHandled ? <X size={16} /> : <Check size={16} />}
                        </button>
                        <button
                          className="risk-expand"
                          onClick={() => toggleRiskExpand(risk.id)}
                        >
                          {expandedRisks.has(risk.id) ? 
                            <ChevronUp size={16} /> : 
                            <ChevronDown size={16} />
                          }
                        </button>
                      </div>
                    </div>
                    <div className="risk-content">
                      <h4>{risk.title}</h4>
                      <p className="risk-description">{risk.description}</p>
                      {expandedRisks.has(risk.id) && risk.suggestion && (
                        <div className="risk-suggestion">
                          <strong>建议措施：</strong>
                          <p>{risk.suggestion}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'followup' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="followup-content"
          >
            {analysisData.todos.length === 0 ? (
              <div className="empty-state">
                <Calendar size={48} />
                <p>暂无跟进计划</p>
              </div>
            ) : (
              <div className="followup-list">
                {analysisData.todos.map((todo) => (
                  <div
                    key={todo.id}
                    className={`followup-card ${todo.completed ? 'completed' : ''}`}
                  >
                    <div className="followup-checkbox">
                      <button
                        className="checkbox"
                        onClick={() => onTodoToggle(todo.id)}
                      >
                        {todo.completed && <Check size={14} />}
                      </button>
                    </div>
                    <div className="followup-content">
                      <div className="followup-header">
                        <h4>{todo.title}</h4>
                        <div 
                          className="priority-badge"
                          style={{ backgroundColor: getPriorityColor(todo.priority) }}
                        >
                          {todo.priority === 'urgent' ? '紧急' :
                           todo.priority === 'high' ? '高' :
                           todo.priority === 'medium' ? '中' : '低'}
                        </div>
                      </div>
                      {todo.context && (
                        <p className="followup-context">{todo.context}</p>
                      )}
                      {todo.deadline && (
                        <div className="followup-deadline">
                          <Clock size={14} />
                          <span>{todo.deadline}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default CustomerMeetingView;