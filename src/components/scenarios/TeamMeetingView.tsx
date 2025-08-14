import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Calendar,
  Clock,
  FileText,
  Target,
  AlertTriangle,
  User,
  Zap,
  Flag,
  CheckCircle,
  Circle,
  MessageSquare,
} from 'lucide-react';

interface TeamMeetingViewProps {
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

const TeamMeetingView: React.FC<TeamMeetingViewProps> = ({
  analysisData,
  onRiskToggle,
  onTodoToggle,
  recordingInfo
}) => {
  const [activeView, setActiveView] = useState<'summary' | 'risks' | 'tasks'>('summary');

  // 模拟会议数据
  const getMeetingInfo = () => {
    return {
      title: '销售部周会',
      attendees: ['张经理', '李主管', '王销售', '赵客服', '刘分析师'],
      decisions: 3,
      actionItems: analysisData.todos.length,
      discussionPoints: analysisData.keyPoints?.length || 0
    };
  };

  const meetingInfo = getMeetingInfo();

  const getTaskProgress = () => {
    const completed = analysisData.todos.filter(t => t.completed).length;
    const total = analysisData.todos.length;
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  const getRiskSeverity = () => {
    const high = analysisData.risks.filter(r => r.level === 'high').length;
    const medium = analysisData.risks.filter(r => r.level === 'medium').length;
    const low = analysisData.risks.filter(r => r.level === 'low').length;
    return { high, medium, low };
  };

  const taskProgress = getTaskProgress();
  const riskSeverity = getRiskSeverity();

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    
    if (hours > 0) {
      return `${hours}小时${remainingMins}分钟`;
    }
    return `${mins}分钟`;
  };

  return (
    <div className="team-meeting-view">
      {/* 会议信息头部 */}
      <div className="meeting-header">
        <div className="meeting-info">
          <div className="meeting-title">
            <FileText size={24} />
            <h2>{meetingInfo.title}</h2>
          </div>
          <div className="meeting-meta">
            <div className="meta-item">
              <Calendar size={16} />
              <span>{new Date(recordingInfo.date).toLocaleDateString('zh-CN')}</span>
            </div>
            <div className="meta-item">
              <Clock size={16} />
              <span>{formatDuration(recordingInfo.duration)}</span>
            </div>
            <div className="meta-item">
              <Users size={16} />
              <span>{meetingInfo.attendees.length} 人参与</span>
            </div>
          </div>
        </div>

        {/* 会议统计 */}
        <div className="meeting-stats">
          <div className="stat-card">
            <div className="stat-number">{meetingInfo.decisions}</div>
            <div className="stat-label">关键决策</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{analysisData.todos.length}</div>
            <div className="stat-label">行动事项</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{analysisData.risks.length}</div>
            <div className="stat-label">风险点</div>
          </div>
        </div>
      </div>

      {/* 参与人员 */}
      <div className="attendees-section">
        <h3>参与人员</h3>
        <div className="attendees-list">
          {meetingInfo.attendees.map((attendee, index) => (
            <div key={index} className="attendee-card">
              <div className="attendee-avatar">
                <User size={20} />
              </div>
              <span className="attendee-name">{attendee}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 导航标签 */}
      <div className="meeting-nav">
        <button
          className={`nav-btn ${activeView === 'summary' ? 'active' : ''}`}
          onClick={() => setActiveView('summary')}
        >
          <MessageSquare size={16} />
          <span>会议纪要</span>
        </button>
        <button
          className={`nav-btn ${activeView === 'risks' ? 'active' : ''}`}
          onClick={() => setActiveView('risks')}
        >
          <AlertTriangle size={16} />
          <span>项目风险</span>
          {analysisData.risks.filter(r => !r.isHandled).length > 0 && (
            <span className="nav-badge">
              {analysisData.risks.filter(r => !r.isHandled).length}
            </span>
          )}
        </button>
        <button
          className={`nav-btn ${activeView === 'tasks' ? 'active' : ''}`}
          onClick={() => setActiveView('tasks')}
        >
          <Target size={16} />
          <span>任务分工</span>
          <div className="progress-ring">
            <span>{taskProgress}%</span>
          </div>
        </button>
      </div>

      {/* 内容区域 */}
      <motion.div className="meeting-content">
        {activeView === 'summary' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="summary-section"
          >
            <div className="meeting-summary">
              <h3>会议总结</h3>
              <div className="summary-text">
                {analysisData.summary}
              </div>
            </div>

            {analysisData.keyPoints && analysisData.keyPoints.length > 0 && (
              <div className="key-decisions">
                <h3>关键决策 & 讨论要点</h3>
                <div className="decisions-list">
                  {analysisData.keyPoints.map((point, index) => (
                    <div key={index} className="decision-item">
                      <div className="decision-marker">
                        <Flag size={16} />
                      </div>
                      <div className="decision-content">
                        <p>{point}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {activeView === 'risks' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="risks-section"
          >
            <div className="risks-overview">
              <h3>项目风险分析</h3>
              <div className="risk-distribution">
                <div className="risk-stat high">
                  <span className="risk-count">{riskSeverity.high}</span>
                  <span className="risk-label">高风险</span>
                </div>
                <div className="risk-stat medium">
                  <span className="risk-count">{riskSeverity.medium}</span>
                  <span className="risk-label">中风险</span>
                </div>
                <div className="risk-stat low">
                  <span className="risk-count">{riskSeverity.low}</span>
                  <span className="risk-label">低风险</span>
                </div>
              </div>
            </div>

            <div className="risks-list">
              {analysisData.risks.map((risk) => (
                <div
                  key={risk.id}
                  className={`risk-card ${risk.level} ${risk.isHandled ? 'handled' : ''}`}
                >
                  <div className="risk-header">
                    <div className="risk-priority">
                      <div className={`priority-indicator ${risk.level}`}>
                        {risk.level === 'high' && <Zap size={16} />}
                        {risk.level === 'medium' && <AlertTriangle size={16} />}
                        {risk.level === 'low' && <Flag size={16} />}
                      </div>
                      <span className="risk-title">{risk.title}</span>
                    </div>
                    <button
                      className={`risk-status ${risk.isHandled ? 'handled' : 'pending'}`}
                      onClick={() => onRiskToggle(risk.id)}
                    >
                      {risk.isHandled ? (
                        <>
                          <CheckCircle size={16} />
                          <span>已处理</span>
                        </>
                      ) : (
                        <>
                          <Circle size={16} />
                          <span>待处理</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="risk-description">{risk.description}</p>
                  {risk.suggestion && (
                    <div className="risk-mitigation">
                      <strong>缓解措施：</strong>
                      <p>{risk.suggestion}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeView === 'tasks' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="tasks-section"
          >
            <div className="tasks-overview">
              <h3>任务分工管理</h3>
              <div className="tasks-progress">
                <div className="progress-info">
                  <span>完成进度</span>
                  <span className="progress-percentage">{taskProgress}%</span>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ width: `${taskProgress}%` }}
                  />
                </div>
                <div className="progress-stats">
                  <span>
                    {analysisData.todos.filter(t => t.completed).length} / {analysisData.todos.length} 已完成
                  </span>
                </div>
              </div>
            </div>

            <div className="tasks-kanban">
              <div className="kanban-column">
                <div className="column-header urgent">
                  <Zap size={16} />
                  <span>紧急任务</span>
                  <span className="task-count">
                    {analysisData.todos.filter(t => t.priority === 'urgent').length}
                  </span>
                </div>
                {analysisData.todos
                  .filter(t => t.priority === 'urgent')
                  .map(todo => (
                    <TaskCard
                      key={todo.id}
                      todo={todo}
                      onToggle={onTodoToggle}
                    />
                  ))
                }
              </div>

              <div className="kanban-column">
                <div className="column-header high">
                  <Flag size={16} />
                  <span>重要任务</span>
                  <span className="task-count">
                    {analysisData.todos.filter(t => t.priority === 'high').length}
                  </span>
                </div>
                {analysisData.todos
                  .filter(t => t.priority === 'high')
                  .map(todo => (
                    <TaskCard
                      key={todo.id}
                      todo={todo}
                      onToggle={onTodoToggle}
                    />
                  ))
                }
              </div>

              <div className="kanban-column">
                <div className="column-header normal">
                  <Target size={16} />
                  <span>常规任务</span>
                  <span className="task-count">
                    {analysisData.todos.filter(t => ['medium', 'low'].includes(t.priority)).length}
                  </span>
                </div>
                {analysisData.todos
                  .filter(t => ['medium', 'low'].includes(t.priority))
                  .map(todo => (
                    <TaskCard
                      key={todo.id}
                      todo={todo}
                      onToggle={onTodoToggle}
                    />
                  ))
                }
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

// 任务卡片组件
const TaskCard: React.FC<{
  todo: {
    id: string;
    title: string;
    context?: string;
    deadline?: string;
    completed: boolean;
  };
  onToggle: (id: string) => void;
}> = ({ todo, onToggle }) => (
  <div className={`task-card ${todo.completed ? 'completed' : ''}`}>
    <div className="task-header">
      <button
        className="task-checkbox"
        onClick={() => onToggle(todo.id)}
      >
        {todo.completed ? <CheckCircle size={16} /> : <Circle size={16} />}
      </button>
      <h4 className="task-title">{todo.title}</h4>
    </div>
    {todo.context && (
      <p className="task-context">{todo.context}</p>
    )}
    {todo.deadline && (
      <div className="task-deadline">
        <Calendar size={14} />
        <span>{todo.deadline}</span>
      </div>
    )}
  </div>
);

export default TeamMeetingView;