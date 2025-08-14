const { verifyAccessToken } = require('../utils/jwt');
const User = require('../models/User');
// const { User } = require('../config/memoryDb'); // 临时使用内存数据库

// 认证中间件
const authenticate = async (req, res, next) => {
  try {
    // 从请求头获取token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '未提供认证令牌' });
    }

    const token = authHeader.substring(7);
    
    // 验证token
    const decoded = verifyAccessToken(token);
    
    // 查找用户
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(401).json({ error: '用户不存在' });
    }

    // 将用户信息附加到请求对象
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: '令牌已过期', code: 'TOKEN_EXPIRED' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: '无效的令牌' });
    }
    return res.status(500).json({ error: '认证失败' });
  }
};

// 可选认证中间件（用于某些接口既可以登录也可以不登录访问）
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (user) {
      req.user = user;
    }
    next();
  } catch (error) {
    // 忽略错误，继续处理请求
    next();
  }
};

module.exports = {
  authenticate,
  optionalAuth,
};