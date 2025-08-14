// API配置管理 - 自动处理后端地址切换和故障转移

interface ApiEndpoint {
  url: string;
  name: string;
  priority: number;
  healthCheckPath: string;
}

// 后端服务列表（按优先级排序）
const API_ENDPOINTS: ApiEndpoint[] = [
  {
    url: 'https://ailuyin-production.up.railway.app/api',
    name: 'Railway Production',
    priority: 1,
    healthCheckPath: '/health'
  },
  {
    url: 'https://ailuyin-1.onrender.com/api',
    name: 'Render Backup',
    priority: 2,
    healthCheckPath: '/health'
  },
  {
    url: 'http://localhost:3001/api',
    name: 'Local Development',
    priority: 3,
    healthCheckPath: '/health'
  }
];

class ApiConfigManager {
  private currentEndpoint: ApiEndpoint | null = null;
  private availableEndpoints: ApiEndpoint[] = [];
  private lastHealthCheck: number = 0;
  private healthCheckInterval: number = 60000; // 1分钟检查一次
  private failoverInProgress: boolean = false;

  constructor() {
    this.initializeEndpoint();
  }

  // 初始化：选择最佳可用端点
  private async initializeEndpoint() {
    // 首先尝试从环境变量获取
    const envApiUrl = import.meta.env.VITE_API_URL;
    if (envApiUrl) {
      this.currentEndpoint = {
        url: envApiUrl,
        name: 'Environment Config',
        priority: 0,
        healthCheckPath: '/health'
      };
      return;
    }

    // 检查所有端点的可用性
    await this.checkAllEndpoints();
    
    // 选择最高优先级的可用端点
    if (this.availableEndpoints.length > 0) {
      this.currentEndpoint = this.availableEndpoints[0];
      console.log(`使用API端点: ${this.currentEndpoint.name} (${this.currentEndpoint.url})`);
    } else {
      // 如果都不可用，默认使用第一个
      this.currentEndpoint = API_ENDPOINTS[0];
      console.warn('所有API端点都不可用，使用默认端点');
    }
  }

  // 检查所有端点的健康状态
  private async checkAllEndpoints() {
    const checkPromises = API_ENDPOINTS.map(async (endpoint) => {
      const isHealthy = await this.checkEndpointHealth(endpoint);
      return { endpoint, isHealthy };
    });

    const results = await Promise.allSettled(checkPromises);
    
    this.availableEndpoints = results
      .filter(result => result.status === 'fulfilled' && result.value.isHealthy)
      .map(result => (result as PromiseFulfilledResult<{endpoint: ApiEndpoint, isHealthy: boolean}>).value.endpoint)
      .sort((a, b) => a.priority - b.priority);
  }

  // 检查单个端点的健康状态
  private async checkEndpointHealth(endpoint: ApiEndpoint): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时

      const response = await fetch(endpoint.url + endpoint.healthCheckPath, {
        method: 'GET',
        signal: controller.signal,
        mode: 'cors'
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        return data.status === 'ok';
      }
      return false;
    } catch (error) {
      console.debug(`端点 ${endpoint.name} 健康检查失败:`, error);
      return false;
    }
  }

  // 获取当前API基础URL
  public getCurrentApiUrl(): string {
    if (!this.currentEndpoint) {
      return API_ENDPOINTS[0].url;
    }
    return this.currentEndpoint.url;
  }

  // 处理请求失败，尝试故障转移
  public async handleRequestFailure(error: any): Promise<boolean> {
    // 避免重复触发故障转移
    if (this.failoverInProgress) {
      return false;
    }

    // 只对网络错误或5xx错误进行故障转移
    if (!this.shouldTriggerFailover(error)) {
      return false;
    }

    this.failoverInProgress = true;
    console.log('API请求失败，尝试切换到备用端点...');

    try {
      // 重新检查所有端点
      await this.checkAllEndpoints();

      // 找到下一个可用端点
      const nextEndpoint = this.availableEndpoints.find(
        ep => ep.url !== this.currentEndpoint?.url
      );

      if (nextEndpoint) {
        console.log(`切换到备用端点: ${nextEndpoint.name}`);
        this.currentEndpoint = nextEndpoint;
        
        // 保存到localStorage，下次直接使用
        localStorage.setItem('preferredApiEndpoint', nextEndpoint.url);
        
        return true; // 成功切换
      }
    } catch (error) {
      console.error('故障转移失败:', error);
    } finally {
      this.failoverInProgress = false;
    }

    return false; // 切换失败
  }

  // 判断是否应该触发故障转移
  private shouldTriggerFailover(error: any): boolean {
    // 网络错误
    if (!error.response) {
      return true;
    }

    // 服务器错误 (5xx)
    if (error.response?.status >= 500) {
      return true;
    }

    // 超时错误
    if (error.code === 'ECONNABORTED') {
      return true;
    }

    return false;
  }

  // 定期健康检查
  public async performHealthCheck() {
    const now = Date.now();
    if (now - this.lastHealthCheck < this.healthCheckInterval) {
      return;
    }

    this.lastHealthCheck = now;

    if (this.currentEndpoint) {
      const isHealthy = await this.checkEndpointHealth(this.currentEndpoint);
      if (!isHealthy) {
        console.warn('当前端点不健康，尝试切换...');
        await this.handleRequestFailure({ response: { status: 503 } });
      }
    }
  }

  // 手动切换端点（用于调试）
  public async switchEndpoint(url: string): Promise<boolean> {
    const endpoint = API_ENDPOINTS.find(ep => ep.url === url);
    if (endpoint) {
      const isHealthy = await this.checkEndpointHealth(endpoint);
      if (isHealthy) {
        this.currentEndpoint = endpoint;
        localStorage.setItem('preferredApiEndpoint', endpoint.url);
        console.log(`手动切换到端点: ${endpoint.name}`);
        return true;
      }
    }
    return false;
  }

  // 获取所有端点状态（用于调试界面）
  public async getAllEndpointsStatus() {
    const statuses = await Promise.all(
      API_ENDPOINTS.map(async (endpoint) => ({
        ...endpoint,
        isHealthy: await this.checkEndpointHealth(endpoint),
        isCurrent: endpoint.url === this.currentEndpoint?.url
      }))
    );
    return statuses;
  }
}

// 创建单例实例
export const apiConfig = new ApiConfigManager();

// 导出便捷方法
export const getApiUrl = () => apiConfig.getCurrentApiUrl();
export const handleApiFailure = (error: any) => apiConfig.handleRequestFailure(error);