const express = require('express');
const { body } = require('express-validator');
const {
  register,
  login,
  refreshAccessToken,
  logout,
  getCurrentUser,
} = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// 验证规则
const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('请提供有效的邮箱地址'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('密码至少需要8个字符')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('密码必须包含大小写字母和数字'),
  body('nickname')
    .optional()
    .trim()
    .isLength({ min: 2, max: 20 })
    .withMessage('昵称长度应在2-20个字符之间'),
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('请提供有效的邮箱地址'),
  body('password')
    .notEmpty()
    .withMessage('请输入密码'),
];

// 路由定义
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.post('/refresh', refreshAccessToken);
router.post('/logout', logout);
router.get('/me', authenticate, getCurrentUser);

module.exports = router;