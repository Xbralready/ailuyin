const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
// const { User, RefreshToken } = require('../config/memoryDb'); // 临时使用内存数据库
const { 
  generateAccessToken, 
  generateRefreshToken, 
  getRefreshTokenExpiry,
  REFRESH_TOKEN_EXPIRES_IN 
} = require('../utils/jwt');

// 用户注册
const register = async (req, res) => {
  try {
    // 验证输入
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, nickname } = req.body;

    // 检查用户是否已存在
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: '该邮箱已被注册' });
    }

    // 创建新用户
    const user = new User({
      email,
      password,
      nickname: nickname || email.split('@')[0],
    });

    await user.save();

    // 生成tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken();

    // 保存refresh token
    await RefreshToken.create({
      token: refreshToken,
      userId: user._id,
      expiresAt: getRefreshTokenExpiry(),
    });

    // 设置refresh token cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: REFRESH_TOKEN_EXPIRES_IN,
    });

    res.status(201).json({
      message: '注册成功',
      user: user.toJSON(),
      accessToken,
    });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({ error: '注册失败，请稍后重试' });
  }
};

// 用户登录
const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // 查找用户
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: '邮箱或密码错误' });
    }

    // 验证密码
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: '邮箱或密码错误' });
    }

    // 更新最后登录时间
    user.lastLoginAt = new Date();
    await user.save();

    // 生成tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken();

    // 保存refresh token
    await RefreshToken.create({
      token: refreshToken,
      userId: user._id,
      expiresAt: getRefreshTokenExpiry(),
    });

    // 设置refresh token cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: REFRESH_TOKEN_EXPIRES_IN,
    });

    res.json({
      message: '登录成功',
      user: user.toJSON(),
      accessToken,
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ error: '登录失败，请稍后重试' });
  }
};

// 刷新Token
const refreshAccessToken = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;

    if (!refreshToken) {
      return res.status(401).json({ error: '未提供刷新令牌' });
    }

    // 查找refresh token
    const tokenDoc = await RefreshToken.findOne({ 
      token: refreshToken,
      expiresAt: { $gt: new Date() }
    });

    if (!tokenDoc) {
      return res.status(401).json({ error: '无效或已过期的刷新令牌' });
    }

    // 生成新的access token
    const accessToken = generateAccessToken(tokenDoc.userId);

    // 可选：轮换refresh token
    const newRefreshToken = generateRefreshToken();
    tokenDoc.token = newRefreshToken;
    tokenDoc.expiresAt = getRefreshTokenExpiry();
    await tokenDoc.save();

    // 更新cookie
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: REFRESH_TOKEN_EXPIRES_IN,
    });

    res.json({ accessToken });
  } catch (error) {
    console.error('刷新令牌错误:', error);
    res.status(500).json({ error: '刷新令牌失败' });
  }
};

// 用户登出
const logout = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;

    // 删除refresh token
    if (refreshToken) {
      await RefreshToken.deleteOne({ token: refreshToken });
    }

    // 清除cookie
    res.clearCookie('refreshToken');

    res.json({ message: '登出成功' });
  } catch (error) {
    console.error('登出错误:', error);
    res.status(500).json({ error: '登出失败' });
  }
};

// 获取当前用户信息
const getCurrentUser = async (req, res) => {
  try {
    res.json({ user: req.user });
  } catch (error) {
    res.status(500).json({ error: '获取用户信息失败' });
  }
};

module.exports = {
  register,
  login,
  refreshAccessToken,
  logout,
  getCurrentUser,
};