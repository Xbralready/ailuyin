const express = require('express');
const { body } = require('express-validator');
const {
  getUserRecordings,
  saveRecording,
  getRecording,
  updateRecording,
  deleteRecording,
} = require('../controllers/recordingController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// 所有录音路由都需要认证
router.use(authenticate);

// 验证规则
const saveRecordingValidation = [
  body('recordingId').notEmpty().withMessage('录音ID不能为空'),
  body('fileName').notEmpty().withMessage('文件名不能为空'),
  body('filePath').notEmpty().withMessage('文件路径不能为空'),
  body('fileSize').isNumeric().withMessage('文件大小必须是数字'),
];

// 路由定义
router.get('/', getUserRecordings);
router.post('/', saveRecordingValidation, saveRecording);
router.get('/:id', getRecording);
router.put('/:id', updateRecording);
router.delete('/:id', deleteRecording);

module.exports = router;