import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// 创建axios实例
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// 导出api实例供AuthContext使用
export const api = apiClient;

export const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
  const formData = new FormData();
  
  // 判断文件类型并设置正确的文件名
  let fileName = 'recording';
  if (audioBlob instanceof File) {
    fileName = audioBlob.name;
  } else {
    // 根据MIME类型设置扩展名
    const ext = audioBlob.type.split('/')[1] || 'webm';
    fileName = `recording.${ext}`;
  }
  
  formData.append('audio', audioBlob, fileName);

  try {
    const response = await apiClient.post('/transcribe', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (response.data.success) {
      return response.data.text;
    } else {
      throw new Error(response.data.error || '转录失败');
    }
  } catch (error) {
    console.error('转录错误:', error);
    throw error;
  }
};

export interface AnalysisResult {
  summary: string;
  keyPoints?: string[];
  risks: RiskItem[];
  todos: TodoItem[];
  metadata?: {
    sentiment?: string;
    category?: string;
  };
}

export interface RiskItem {
  level: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  suggestion?: string;
}

export interface TodoItem {
  priority: 'urgent' | 'high' | 'medium' | 'low';
  title: string;
  deadline?: string;
  context?: string;
}

export type ScenarioType = 'customer_meeting' | 'phone_sales' | 'team_meeting' | 'general';

export const analyzeTranscript = async (
  transcript: string, 
  scenario?: ScenarioType,
  model?: string
): Promise<AnalysisResult> => {
  try {
    const response = await apiClient.post('/analyze', {
      transcript,
      scenario: scenario || 'general',
      model,
    });

    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.error || '分析失败');
    }
  } catch (error) {
    console.error('分析错误:', error);
    throw error;
  }
};

// 兼容旧版本的API调用
export const analyzeTranscriptLegacy = async (transcript: string, prompt?: string, model?: string): Promise<string> => {
  try {
    const response = await apiClient.post('/analyze', {
      transcript,
      prompt,
      model,
    });

    if (response.data.success) {
      return response.data.analysis || response.data.data?.summary || '分析失败';
    } else {
      throw new Error(response.data.error || '分析失败');
    }
  } catch (error) {
    console.error('分析错误:', error);
    throw error;
  }
};

export interface ModelInfo {
  id: string;
  name: string;
  description: string;
  cost: string;
  recommended?: boolean;
}

export const getModels = async (): Promise<{ models: ModelInfo[], currentModel: string }> => {
  try {
    const response = await apiClient.get('/models');
    return response.data;
  } catch (error) {
    console.error('获取模型列表失败:', error);
    return {
      models: [],
      currentModel: 'gpt-4o-mini'
    };
  }
};

export const checkHealth = async (): Promise<boolean> => {
  try {
    const response = await apiClient.get('/health');
    return response.data.status === 'ok' && response.data.hasApiKey;
  } catch (error) {
    console.error('健康检查失败:', error);
    return false;
  }
};

// 录音管理相关接口
export interface RecordingInfo {
  id: string;
  recordingId: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  transcript?: string;
  transcription?: string;  // 添加兼容性字段
  duration?: number;
  createdAt: string;
  updatedAt: string;
}

// 获取用户的所有录音记录
export const getUserRecordings = async (): Promise<RecordingInfo[]> => {
  try {
    const response = await apiClient.get('/recordings');
    return response.data.recordings || [];
  } catch (error) {
    console.error('获取录音列表失败:', error);
    return [];
  }
};

// 保存录音记录
export const saveRecording = async (recordingData: {
  recordingId: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  transcript?: string;
  duration?: number;
}): Promise<RecordingInfo> => {
  try {
    const response = await apiClient.post('/recordings', recordingData);
    return response.data.recording;
  } catch (error) {
    console.error('保存录音记录失败:', error);
    throw error;
  }
};

// 更新录音记录（如添加转录等）
export const updateRecording = async (id: string, updates: {
  transcript?: string;
  duration?: number;
}): Promise<RecordingInfo> => {
  try {
    const response = await apiClient.put(`/recordings/${id}`, updates);
    return response.data.recording;
  } catch (error) {
    console.error('更新录音记录失败:', error);
    throw error;
  }
};

// 删除录音记录
export const deleteRecording = async (id: string): Promise<void> => {
  try {
    await apiClient.delete(`/recordings/${id}`);
  } catch (error) {
    console.error('删除录音记录失败:', error);
    throw error;
  }
};