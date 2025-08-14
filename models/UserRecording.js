const mongoose = require('mongoose');

const userRecordingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  recordingId: {
    type: String,
    required: true,
    unique: true,
  },
  fileName: {
    type: String,
    required: true,
  },
  filePath: {
    type: String,
    required: true,
  },
  fileSize: {
    type: Number,
    required: true,
  },
  duration: {
    type: Number,
  },
  transcription: {
    type: String,
  },
  analysis: {
    type: Object,
  },
}, {
  timestamps: true,
});

// 复合索引，提高查询性能
userRecordingSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('UserRecording', userRecordingSchema);