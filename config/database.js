const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/voice-recorder';
    console.log('尝试连接MongoDB:', mongoUri.replace(/\/\/.*@/, '//***:***@')); // 隐藏密码
    
    await mongoose.connect(mongoUri);
    
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

module.exports = connectDB;