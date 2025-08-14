const UserRecording = require('../models/UserRecording');
// const { UserRecording } = require('../config/memoryDb'); // 临时使用内存数据库
const fs = require('fs').promises;
const path = require('path');

// 获取用户的录音列表
const getUserRecordings = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const recordings = await UserRecording.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await UserRecording.countDocuments({ userId: req.user._id });

    res.json({
      recordings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('获取录音列表错误:', error);
    res.status(500).json({ error: '获取录音列表失败' });
  }
};

// 保存录音信息
const saveRecording = async (req, res) => {
  try {
    const { 
      recordingId, 
      fileName, 
      filePath, 
      fileSize, 
      duration, 
      transcription,
      analysis 
    } = req.body;

    // 创建录音记录
    const recording = new UserRecording({
      userId: req.user._id,
      recordingId,
      fileName,
      filePath,
      fileSize,
      duration,
      transcription,
      analysis,
    });

    await recording.save();

    res.status(201).json({
      message: '录音保存成功',
      recording,
    });
  } catch (error) {
    console.error('保存录音错误:', error);
    res.status(500).json({ error: '保存录音失败' });
  }
};

// 获取单个录音详情
const getRecording = async (req, res) => {
  try {
    const recording = await UserRecording.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!recording) {
      return res.status(404).json({ error: '录音不存在' });
    }

    res.json({ recording });
  } catch (error) {
    console.error('获取录音详情错误:', error);
    res.status(500).json({ error: '获取录音详情失败' });
  }
};

// 更新录音信息（如添加/更新转录或分析）
const updateRecording = async (req, res) => {
  try {
    const { transcription, analysis } = req.body;

    const recording = await UserRecording.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.user._id,
      },
      {
        $set: {
          ...(transcription && { transcription }),
          ...(analysis && { analysis }),
        },
      },
      { new: true }
    );

    if (!recording) {
      return res.status(404).json({ error: '录音不存在' });
    }

    res.json({
      message: '录音更新成功',
      recording,
    });
  } catch (error) {
    console.error('更新录音错误:', error);
    res.status(500).json({ error: '更新录音失败' });
  }
};

// 删除录音
const deleteRecording = async (req, res) => {
  try {
    const recording = await UserRecording.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!recording) {
      return res.status(404).json({ error: '录音不存在' });
    }

    // 尝试删除文件（如果文件存在）
    try {
      if (recording.filePath) {
        await fs.unlink(recording.filePath);
      }
    } catch (fileError) {
      console.error('删除文件失败:', fileError);
      // 继续执行，即使文件删除失败
    }

    res.json({ message: '录音删除成功' });
  } catch (error) {
    console.error('删除录音错误:', error);
    res.status(500).json({ error: '删除录音失败' });
  }
};

module.exports = {
  getUserRecordings,
  saveRecording,
  getRecording,
  updateRecording,
  deleteRecording,
};