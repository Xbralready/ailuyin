// 临时内存数据库 - MongoDB安装完成后可删除此文件
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// 内存中的用户数据
const users = new Map();
const refreshTokens = new Map();
const recordings = new Map();

// 模拟用户模型
class UserModel {
  constructor(data) {
    this._id = uuidv4();
    this.email = data.email;
    this.password = data.password;
    this.nickname = data.nickname || data.email.split('@')[0];
    this.avatar = data.avatar || null;
    this.isEmailVerified = false;
    this.createdAt = new Date();
    this.updatedAt = new Date();
    this.lastLoginAt = null;
  }

  async comparePassword(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
  }

  toJSON() {
    const user = { ...this };
    delete user.password;
    return user;
  }

  async save() {
    this.updatedAt = new Date();
    users.set(this._id, this);
    return this;
  }

  static async findOne(query) {
    if (query.email) {
      for (const user of users.values()) {
        if (user.email === query.email) {
          return user;
        }
      }
    }
    return null;
  }

  static async findById(id) {
    return users.get(id) || null;
  }
}

// 模拟RefreshToken模型
class RefreshTokenModel {
  constructor(data) {
    this._id = uuidv4();
    this.token = data.token;
    this.userId = data.userId;
    this.expiresAt = data.expiresAt;
    this.createdAt = new Date();
  }

  async save() {
    refreshTokens.set(this.token, this);
    return this;
  }

  static async create(data) {
    const token = new RefreshTokenModel(data);
    return token.save();
  }

  static async findOne(query) {
    if (query.token) {
      const token = refreshTokens.get(query.token);
      if (token && (!query.expiresAt || token.expiresAt > query.expiresAt.$gt)) {
        return token;
      }
    }
    return null;
  }

  static async deleteOne(query) {
    if (query.token) {
      refreshTokens.delete(query.token);
    }
  }
}

// 模拟UserRecording模型
class UserRecordingModel {
  constructor(data) {
    this._id = uuidv4();
    this.userId = data.userId;
    this.recordingId = data.recordingId;
    this.fileName = data.fileName;
    this.filePath = data.filePath;
    this.fileSize = data.fileSize;
    this.duration = data.duration;
    this.transcription = data.transcription;
    this.analysis = data.analysis;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  async save() {
    recordings.set(this._id, this);
    return this;
  }

  static async find(query) {
    const results = [];
    for (const recording of recordings.values()) {
      if (recording.userId === query.userId) {
        results.push(recording);
      }
    }
    return {
      sort: () => ({
        limit: (n) => ({
          skip: (s) => results.slice(s, s + n)
        })
      })
    };
  }

  static async countDocuments(query) {
    let count = 0;
    for (const recording of recordings.values()) {
      if (recording.userId === query.userId) {
        count++;
      }
    }
    return count;
  }

  static async findOne(query) {
    for (const recording of recordings.values()) {
      if (recording._id === query._id && recording.userId === query.userId) {
        return recording;
      }
    }
    return null;
  }

  static async findOneAndUpdate(query, update, options) {
    const recording = await this.findOne(query);
    if (recording) {
      if (update.$set) {
        Object.assign(recording, update.$set);
      }
      recording.updatedAt = new Date();
      return recording;
    }
    return null;
  }

  static async findOneAndDelete(query) {
    const recording = await this.findOne(query);
    if (recording) {
      recordings.delete(recording._id);
      return recording;
    }
    return null;
  }
}

// 模拟数据库连接
const connectDB = async () => {
  console.log('使用内存数据库（临时方案）');
  console.log('MongoDB安装完成后，请修改配置使用真实数据库');
};

module.exports = {
  connectDB,
  User: UserModel,
  RefreshToken: RefreshTokenModel,
  UserRecording: UserRecordingModel
};