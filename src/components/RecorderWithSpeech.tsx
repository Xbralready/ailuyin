import React, { useState, useEffect } from 'react';
import { useRecorder } from '../hooks/useRecorder';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { analyzeTranscriptLegacy } from '../services/api';
import './Recorder.css';

export const RecorderWithSpeech: React.FC = () => {
  const {
    isRecording,
    isPaused,
    audioURL,
    error,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
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
  const [analysis, setAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [useFreeSpeech, setUseFreeSpeech] = useState(true);

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
    setAnalysis('');
    startRecording();
    
    // 如果选择使用免费语音识别且浏览器支持
    if (useFreeSpeech && isSupported) {
      startListening();
    }
  };

  const handleStop = () => {
    stopRecording();
    if (isListening) {
      stopListening();
    }
  };

  const handleAnalyze = async () => {
    if (!transcript) return;
    
    setIsAnalyzing(true);
    try {
      const result = await analyzeTranscriptLegacy(transcript);
      setAnalysis(result);
    } catch (error) {
      console.error('分析失败:', error);
      setAnalysis('分析失败，请检查API配置');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="recorder-container">
      <h1>AI 录音助手</h1>
      
      {error && (
        <div className="error-message">{error}</div>
      )}

      {/* 语音识别选项 */}
      <div className="speech-options">
        <label>
          <input
            type="checkbox"
            checked={useFreeSpeech}
            onChange={(e) => setUseFreeSpeech(e.target.checked)}
            disabled={isRecording}
          />
          使用免费实时语音识别（仅支持Chrome/Edge）
        </label>
        {!isSupported && useFreeSpeech && (
          <p className="warning-text">您的浏览器不支持语音识别，请使用Chrome或Edge</p>
        )}
      </div>

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

      {/* 实时转录显示 */}
      {(transcript || interimTranscript) && (
        <div className="transcript">
          <h3>实时转录文本</h3>
          <div className="transcript-content">
            <span>{transcript}</span>
            <span className="interim-text">{interimTranscript}</span>
          </div>
          {transcript && !isRecording && (
            <button 
              className="btn btn-primary" 
              onClick={handleAnalyze}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? '分析中...' : 'AI 分析对话'}
            </button>
          )}
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
    </div>
  );
};