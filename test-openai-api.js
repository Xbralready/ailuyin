const OpenAI = require('openai');
require('dotenv').config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function test() {
  try {
    console.log('Testing OpenAI API connection...');
    
    // Test 1: List models
    console.log('\n1. Testing models.list()...');
    const models = await openai.models.list();
    console.log('✅ API连接成功！');
    console.log('可用的Whisper模型:', models.data.filter(m => m.id.includes('whisper')).map(m => m.id));
    
    // Test 2: Simple chat completion
    console.log('\n2. Testing chat completion...');
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Say hello' }],
      max_tokens: 10
    });
    console.log('✅ Chat API工作正常！');
    
    console.log('\n总结: OpenAI API配置正确，可以正常使用。');
    
  } catch (error) {
    console.error('\n❌ OpenAI API错误:');
    console.error('错误类型:', error.constructor.name);
    console.error('错误信息:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
    
    if (error.message.includes('401')) {
      console.error('\n诊断: API密钥无效或已过期，请检查.env文件中的OPENAI_API_KEY');
    } else if (error.message.includes('429')) {
      console.error('\n诊断: 达到速率限制或配额不足，请检查OpenAI账户余额');
    } else if (error.message.includes('ENOTFOUND')) {
      console.error('\n诊断: 网络连接问题，无法访问OpenAI API');
    }
  }
}

test();