import React, { useState, useEffect, useCallback } from 'react';
import { useRecorder } from '../hooks/useRecorder';
import { transcribeAudio, analyzeTranscriptLegacy, checkHealth } from '../services/api';
import './Recorder.css';

export const Recorder: React.FC = () => {
  const {
    isRecording,
    isPaused,
    audioURL,
    audioBlob,
    error,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
  } = useRecorder();

  const [duration, setDuration] = useState(0);
  const [transcript, setTranscript] = useState<string>('');
  const [analysis, setAnalysis] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [apiStatus, setApiStatus] = useState<boolean | null>(null);

  useEffect(() => {
    // 检查API状态
    checkHealth().then(setApiStatus);
  }, []);

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
    setTranscript('');
    setAnalysis('');
    startRecording();
  };

  const handleStop = async () => {
    stopRecording();
  };

  const handleTranscribe = useCallback(async () => {
    if (!audioBlob) return;

    setIsProcessing(true);
    try {
      const text = await transcribeAudio(audioBlob);
      setTranscript(text);
      
      // 自动进行分析
      if (text) {
        const analysisResult = await analyzeTranscriptLegacy(text);
        setAnalysis(analysisResult);
      }
    } catch (error) {
      console.error('处理失败:', error);
      setTranscript('转录失败，请检查API密钥是否正确配置');
    } finally {
      setIsProcessing(false);
    }
  }, [audioBlob]);

  // 当录音完成并有音频数据时，自动进行转录
  useEffect(() => {
    if (audioBlob && !isRecording) {
      handleTranscribe();
    }
  }, [audioBlob, isRecording, handleTranscribe]);

  return (
    <div className="recorder-container">
      <h1>AI 录音助手</h1>
      
      {error && (
        <div className="error-message">{error}</div>
      )}

      <div className="recorder-controls">
        {!isRecording ? (
          <button className="btn btn-primary" onClick={handleStart}>
            <span className="icon">🎤</span>
            开始录音
          </button>
        ) : (
          <>
            <button className="btn btn-danger" onClick={handleStop}>
              <span className="icon">⏹️</span>
              停止录音
            </button>
            {isPaused ? (
              <button className="btn btn-secondary" onClick={resumeRecording}>
                <span className="icon">▶️</span>
                继续
              </button>
            ) : (
              <button className="btn btn-secondary" onClick={pauseRecording}>
                <span className="icon">⏸️</span>
                暂停
              </button>
            )}
          </>
        )}
      </div>

      {isRecording && (
        <div className="recording-status">
          <div className="recording-indicator"></div>
          <span>录音中... {formatTime(duration)}</span>
        </div>
      )}

      {audioURL && (
        <div className="audio-player">
          <h3>录音回放</h3>
          <audio controls src={audioURL} />
          <button className="btn btn-secondary" onClick={resetRecording}>
            重新录音
          </button>
        </div>
      )}

      {isProcessing && (
        <div className="processing-status">
          <div className="spinner"></div>
          <span>正在处理音频...</span>
        </div>
      )}

      {transcript && (
        <div className="transcript">
          <h3>转录文本</h3>
          <div className="transcript-content">
            {transcript}
          </div>
        </div>
      )}

      {analysis && (
        <div className="analysis">
          <h3>AI 分析结果</h3>
          <div className="analysis-content">
            {analysis.split('\n').map((line, index) => (
              <p key={index}>{line}</p>
            ))}
          </div>
        </div>
      )}

      {apiStatus === false && (
        <div className="warning-message">
          ⚠️ API未配置：请在后端配置OpenAI API密钥
        </div>
      )}
    </div>
  );
};