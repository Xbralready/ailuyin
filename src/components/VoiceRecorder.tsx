import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Square, Pause, Play, Trash2, FileText, Sparkles, Upload, Settings, LogOut, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRecorder } from '../hooks/useRecorder';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { transcribeAudio, getModels, getUserRecordings, saveRecording, deleteRecording } from '../services/api';
import type { ModelInfo } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './VoiceRecorder.css';

interface Recording {
  id: string;
  date: Date;
  duration: number;
  audioURL: string;
  audioBlob: Blob;
  transcript?: string;
  isManualTranscript?: boolean;
  serverRecordId?: string; // 服务器端记录ID
}

export const VoiceRecorder: React.FC = () => {
  const {
    isRecording,
    isPaused,
    audioURL,
    audioBlob,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
  } = useRecorder();

  const {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition();

  const [duration, setDuration] = useState(0);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);
  const [waveformData, setWaveformData] = useState<number[]>(Array(40).fill(20));
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [showSettings, setShowSettings] = useState(false);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('gpt-3.5-turbo');
  const [editingTranscript, setEditingTranscript] = useState<string | null>(null);
  const [manualTranscript, setManualTranscript] = useState<string>('');
  const animationRef = useRef<number | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // 音频可视化
  useEffect(() => {
    if (isRecording && !isPaused) {
      const generateWaveform = () => {
        const data = Array.from({ length: 40 }, () => 
          isRecording ? Math.random() * 60 + 20 : 20
        );
        setWaveformData(data);
        animationRef.current = requestAnimationFrame(generateWaveform);
      };
      generateWaveform();
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      setWaveformData(Array(40).fill(20));
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRecording, isPaused]);

  // 获取模型列表
  useEffect(() => {
    // 加载AI模型列表
    getModels().then(({ models, currentModel }) => {
      setModels(models);
      setSelectedModel(currentModel);
    });

    // 加载用户的历史录音
    loadUserRecordings();
  }, []);

  // 监听页面可见性变化，当从其他页面返回时重新加载录音列表
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // 给一个小延迟，避免频繁调用
        setTimeout(loadUserRecordings, 100);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const loadUserRecordings = async () => {
    try {
      const recordingInfos = await getUserRecordings();
      console.log('从服务器加载的录音记录:', recordingInfos);
      
      // 转换为前端Recording格式（注意：音频文件需要重新获取）
      const historicalRecordings: Recording[] = recordingInfos.map(info => ({
        id: info.recordingId,
        date: new Date(info.createdAt),
        duration: info.duration || 0,
        audioURL: info.filePath, // 这里可能需要处理为可访问的URL
        audioBlob: new Blob(), // 历史录音没有blob，需要时重新获取
        transcript: info.transcription || info.transcript,
        isManualTranscript: false,
        serverRecordId: info.id // 添加服务器记录ID以便后续操作
      }));
      
      console.log('转换后的录音记录:', historicalRecordings.map(r => ({ 
        id: r.id, 
        serverRecordId: r.serverRecordId,
        transcript: r.transcript ? '有转录内容' : '无转录内容',
        date: r.date
      })));
      
      // 智能合并现有录音和服务器录音，避免重复
      setRecordings(prev => {
        // 创建一个Map来去重，使用recordingId作为键
        const recordingMap = new Map();
        
        // 首先添加现有录音（优先保留当前会话的录音，因为可能有更新的状态）
        prev.forEach(recording => {
          recordingMap.set(recording.id, recording);
        });
        
        // 然后添加服务器录音，但只添加本地不存在的
        historicalRecordings.forEach(recording => {
          if (!recordingMap.has(recording.id)) {
            recordingMap.set(recording.id, recording);
          } else {
            // 如果本地录音没有serverRecordId，则更新它
            const localRecording = recordingMap.get(recording.id);
            if (!localRecording.serverRecordId && recording.serverRecordId) {
              recordingMap.set(recording.id, {
                ...localRecording,
                serverRecordId: recording.serverRecordId
              });
            }
          }
        });
        
        // 转换为数组并按时间排序
        return Array.from(recordingMap.values())
          .sort((a, b) => b.date.getTime() - a.date.getTime());
      });
    } catch (error) {
      console.error('加载历史录音失败:', error);
    }
  };

  const saveRecordingToServer = async (recording: Recording) => {
    try {
      // 注意：这里需要实际的文件路径，现在暂时使用audioURL
      // 在实际应用中，可能需要先上传音频文件到服务器
      const recordingData = {
        recordingId: recording.id,
        fileName: `recording_${recording.id}.webm`,
        filePath: recording.audioURL,
        fileSize: recording.audioBlob.size,
        transcription: recording.transcript,  // 修正字段名
        duration: recording.duration
      };

      console.log('保存录音数据到服务器:', { ...recordingData, transcription: recordingData.transcription ? '有转录内容' : '无转录内容' });

      const serverRecord = await saveRecording(recordingData);
      
      // 更新本地recording的serverRecordId
      setRecordings(prev => prev.map(r => 
        r.id === recording.id 
          ? { ...r, serverRecordId: serverRecord.id }
          : r
      ));

      console.log('录音保存到服务器成功:', serverRecord);
    } catch (error) {
      console.error('保存录音到服务器失败:', error);
    }
  };

  // 计时器
  useEffect(() => {
    let interval: number;
    if (isRecording && !isPaused) {
      interval = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording, isPaused]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    setDuration(0);
    resetTranscript();
    startRecording();
    if (isSupported) {
      startListening();
    }
  };

  // 保存待处理的录音数据
  const pendingRecordingRef = useRef<{transcript: string; duration: number} | null>(null);
  
  // 保存最新的transcript值
  const transcriptRef = useRef<string>('');
  const durationRef = useRef<number>(0);
  
  // 更新ref值
  useEffect(() => {
    transcriptRef.current = transcript;
    console.log('transcript 变化:', transcript);
  }, [transcript]);
  
  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  const handleStop = () => {
    // 标记已经停止，准备保存
    pendingRecordingRef.current = {
      transcript: '', // 占位符，实际值会在保存时从ref获取
      duration: 0
    };
    
    stopRecording();
    if (isListening) {
      stopListening();
    }
  };

  // 监听录音完成，保存录音
  useEffect(() => {
    if (!isRecording && audioURL && audioBlob && pendingRecordingRef.current) {
      // 延迟一下，确保语音识别的最后结果已经到达
      setTimeout(() => {
        // 使用ref中的最新值
        const finalTranscript = transcriptRef.current;
        const finalDuration = durationRef.current;
        
        console.log('保存录音时的转录内容:', finalTranscript);
        
        const newRecording: Recording = {
          id: Date.now().toString(),
          date: new Date(),
          duration: finalDuration,
          audioURL,
          audioBlob,
          transcript: finalTranscript || undefined,
        };
        
        // 同时保存到服务器和本地状态
        saveRecordingToServer(newRecording);
        setRecordings(prev => [newRecording, ...prev]);
        setSelectedRecording(newRecording);
        
        // 清理
        pendingRecordingRef.current = null;
        setDuration(0);
      }, 500); // 给语音识别一些时间完成最后的处理
    }
  }, [isRecording, audioURL, audioBlob]);

  const handleAnalyze = (recording: Recording) => {
    if (!recording.transcript) return;
    
    // 导航到分析结果页面
    navigate('/analysis-result', {
      state: {
        recordingId: recording.id,
        transcript: recording.transcript,
        date: recording.date,
        duration: recording.duration,
        audioURL: recording.audioURL
      }
    });
  };

  const handleDeleteRecording = async (id: string) => {
    try {
      // 找到要删除的录音记录
      const recordingToDelete = recordings.find(r => r.id === id);
      console.log('准备删除录音:', { 
        id, 
        hasServerRecord: !!recordingToDelete?.serverRecordId,
        serverRecordId: recordingToDelete?.serverRecordId 
      });
      
      // 如果有服务器记录ID，先从服务器删除
      if (recordingToDelete?.serverRecordId) {
        console.log('正在从服务器删除录音:', recordingToDelete.serverRecordId);
        await deleteRecording(recordingToDelete.serverRecordId);
        console.log('从服务器删除录音成功');
      } else {
        console.log('录音没有服务器ID，只从本地删除');
      }
      
      // 从本地状态删除
      setRecordings(prev => {
        const filtered = prev.filter(r => r.id !== id);
        console.log('本地删除后剩余录音数量:', filtered.length);
        return filtered;
      });
      
      if (selectedRecording?.id === id) {
        setSelectedRecording(null);
      }
      
      console.log('删除录音完成');
    } catch (error) {
      console.error('删除录音失败详细信息:', error);
      
      // 显示错误提示给用户
      alert(`删除失败: ${(error as Error).message || '未知错误'}`);
      
      // 如果服务器删除失败，询问用户是否只删除本地记录
      if (confirm('服务器删除失败，是否只删除本地记录？')) {
        setRecordings(prev => prev.filter(r => r.id !== id));
        if (selectedRecording?.id === id) {
          setSelectedRecording(null);
        }
      }
    }
  };

  // 处理文件上传
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 检查文件类型
    const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/webm', 'audio/ogg'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|m4a|webm|ogg|mpeg)$/i)) {
      alert('请上传音频文件（支持 MP3, WAV, M4A, WebM, OGG 格式）');
      return;
    }

    setIsUploading(true);
    setUploadStatus('正在处理音频文件...');
    
    try {
      // 创建音频URL
      setUploadStatus('正在加载音频文件...');
      const audioURL = URL.createObjectURL(file);
      
      // 获取音频时长
      const audio = new Audio(audioURL);
      await new Promise((resolve) => {
        audio.addEventListener('loadedmetadata', resolve);
      });
      const duration = Math.floor(audio.duration);

      // 尝试转录音频
      let transcriptText = '';
      try {
        setUploadStatus('正在转录音频内容（可能需要30-60秒）...');
        transcriptText = await transcribeAudio(file);
        setUploadStatus('转录完成！');
      } catch (error) {
        console.error('转录失败详情:', error);
        setUploadStatus('转录失败，但音频已保存');
        // 不阻止文件上传，即使转录失败也保存录音
      }

      // 创建录音记录
      const newRecording: Recording = {
        id: Date.now().toString(),
        date: new Date(),
        duration: duration || 0,
        audioURL,
        audioBlob: file,
        transcript: transcriptText || undefined,
      };

      // 同时保存到服务器和本地状态
      saveRecordingToServer(newRecording);
      setRecordings(prev => [newRecording, ...prev]);
      setSelectedRecording(newRecording);
    } catch (error) {
      console.error('上传失败:', error);
      alert('上传失败，请重试');
    } finally {
      setIsUploading(false);
      // 清空input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="voice-recorder">
      {/* 顶部标题栏 */}
      <div className="header">
        <motion.button
          className="header-settings-button"
          onClick={() => setShowSettings(!showSettings)}
          whileTap={{ scale: 0.95 }}
          title="设置"
        >
          <Settings size={20} />
        </motion.button>
        
        <h1>AI录音系统</h1>
        
        <div className="user-menu">
          <div className="user-info">
            <User size={20} />
            <span>{user?.nickname || user?.email}</span>
          </div>
          <motion.button
            className="logout-button"
            onClick={logout}
            whileTap={{ scale: 0.95 }}
            title="退出登录"
          >
            <LogOut size={20} />
          </motion.button>
        </div>
        
        <motion.button
          className="header-upload-button"
          onClick={() => fileInputRef.current?.click()}
          whileTap={{ scale: 0.95 }}
          disabled={isUploading}
          title="上传音频文件"
        >
          <Upload size={20} />
        </motion.button>
      </div>

      {/* 设置面板 */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            className="settings-panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="settings-content">
              <h3>AI 模型选择</h3>
              <div className="model-options">
                {models.map((model) => (
                  <motion.div
                    key={model.id}
                    className={`model-option ${selectedModel === model.id ? 'selected' : ''}`}
                    onClick={() => setSelectedModel(model.id)}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="model-header">
                      <span className="model-name">{model.name}</span>
                      <span className="model-cost">{model.cost}</span>
                    </div>
                    <div className="model-description">{model.description}</div>
                    {model.recommended && (
                      <div className="model-badge">推荐</div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 录音控制区 */}
      <div className="recorder-section">
        {/* 波形可视化 */}
        <div className="waveform-container">
          <div className="waveform">
            {waveformData.map((height, index) => (
              <motion.div
                key={index}
                className="waveform-bar"
                animate={{ height: `${height}%` }}
                transition={{ duration: 0.1 }}
              />
            ))}
          </div>
        </div>

        {/* 时间显示 */}
        <div className="time-display">
          {formatTime(duration)}
        </div>

        {/* 控制按钮 */}
        <div className="control-buttons">
          {!isRecording ? (
            <motion.button
              className="record-button"
              onClick={handleStart}
              whileTap={{ scale: 0.95 }}
            >
              <Mic size={32} />
            </motion.button>
          ) : (
            <>
              <motion.button
                className="stop-button"
                onClick={handleStop}
                whileTap={{ scale: 0.95 }}
              >
                <Square size={24} />
              </motion.button>
              {isPaused ? (
                <motion.button
                  className="control-button"
                  onClick={resumeRecording}
                  whileTap={{ scale: 0.95 }}
                >
                  <Play size={24} />
                </motion.button>
              ) : (
                <motion.button
                  className="control-button"
                  onClick={pauseRecording}
                  whileTap={{ scale: 0.95 }}
                >
                  <Pause size={24} />
                </motion.button>
              )}
            </>
          )}
        </div>

        {/* 实时转录 */}
        {isRecording && (
          <div className="live-transcript">
            <p style={{fontSize: '12px', color: '#999'}}>转录内容: {transcript || '(空)'}</p>
            <span>{transcript}</span>
            <span className="interim">{interimTranscript}</span>
          </div>
        )}

        {/* 上传状态 */}
        {isUploading && (
          <div className="upload-status">
            <div className="spinner"></div>
            <span>{uploadStatus}</span>
          </div>
        )}
      </div>

      {/* 录音列表 */}
      <div className="recordings-section">
        <h2>所有录音</h2>
        {recordings.length === 0 ? (
          <div className="empty-state">
            <Mic size={60} strokeWidth={1.5} />
            <h3>暂无录音</h3>
            <p>点击上方录音按钮开始录制</p>
            <p>或点击"上传音频"导入音频文件</p>
          </div>
        ) : (
        <div className="recordings-list">
          <AnimatePresence>
            {recordings.map((recording) => (
              <motion.div
                key={recording.id}
                className={`recording-item ${selectedRecording?.id === recording.id ? 'selected' : ''}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                onClick={() => setSelectedRecording(recording)}
              >
                <div className="recording-info">
                  <div className="recording-date">
                    {recording.date.toLocaleDateString('zh-CN')}
                  </div>
                  <div className="recording-time">
                    {recording.date.toLocaleTimeString('zh-CN', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                  <div className="recording-duration">
                    {formatTime(recording.duration)}
                    {recording.serverRecordId && (
                      <span style={{ fontSize: '10px', color: '#666', marginLeft: '5px' }}>
                        (服务器: {recording.serverRecordId.slice(-8)})
                      </span>
                    )}
                  </div>
                </div>
                <button
                  className="delete-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteRecording(recording.id);
                  }}
                >
                  <Trash2 size={18} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        )}
      </div>

      {/* 录音详情 */}
      {selectedRecording && (
        <div className="recording-detail">
          <div className="detail-header">
            <h3>录音详情</h3>
            <span className="detail-date">
              {selectedRecording.date.toLocaleString('zh-CN')}
            </span>
          </div>
          
          <audio controls src={selectedRecording.audioURL} className="audio-player" />
          
          {/* 转录文本部分 */}
          <div className="transcript-section">
            <div className="section-header">
              <FileText size={20} />
              <h4>转录文本</h4>
              {!selectedRecording.transcript && !editingTranscript && (
                <button
                  className="add-transcript-button"
                  onClick={() => {
                    setEditingTranscript(selectedRecording.id);
                    setManualTranscript('');
                  }}
                >
                  添加文字
                </button>
              )}
            </div>
            
            {editingTranscript === selectedRecording.id ? (
              <div className="transcript-editor">
                <textarea
                  className="transcript-textarea"
                  placeholder="请输入或粘贴对话内容..."
                  value={manualTranscript}
                  onChange={(e) => setManualTranscript(e.target.value)}
                  rows={6}
                />
                <div className="editor-buttons">
                  <button
                    className="btn-save"
                    onClick={() => {
                      selectedRecording.transcript = manualTranscript;
                      selectedRecording.isManualTranscript = true;
                      setRecordings([...recordings]);
                      setEditingTranscript(null);
                    }}
                    disabled={!manualTranscript.trim()}
                  >
                    保存
                  </button>
                  <button
                    className="btn-cancel"
                    onClick={() => {
                      setEditingTranscript(null);
                      setManualTranscript('');
                    }}
                  >
                    取消
                  </button>
                </div>
              </div>
            ) : selectedRecording.transcript ? (
              <>
                <div className="transcript-content">
                  {selectedRecording.transcript}
                  {selectedRecording.isManualTranscript && (
                    <span className="manual-badge">手动输入</span>
                  )}
                </div>
                
                <button
                  className="analyze-button"
                  onClick={() => handleAnalyze(selectedRecording)}
                  style={{ marginTop: '12px' }}
                >
                  <Sparkles size={18} />
                  AI 智能分析
                </button>
              </>
            ) : (
              <div className="no-transcript">
                <p>暂无转录文本</p>
                <p className="hint">您可以点击"添加文字"手动输入对话内容</p>
              </div>
            )}
          </div>
          
        </div>
      )}

      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.m4a,.webm,.ogg"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />
    </div>
  );
};