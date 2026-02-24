import { jsonResponse } from '../utils/response.js'

export async function apiAI(request, env) {
  const url = new URL(request.url);
  const prompt = url.searchParams.get('prompt') || '你好';
  
  try {
    const response = await env.AI.run('@cf/meta/llama-2-7b-chat-int8', {
      messages: [
        { role: 'system', content: '你是一个 helpful 的助手，用中文回答。' },
        { role: 'user', content: prompt }
      ]
    });
    
    return jsonResponse({
      prompt: prompt,
      response: response.response,
      model: 'llama-2-7b-chat'
    });
  } catch (e) {
    return jsonResponse({ 
      prompt: prompt,
      response: 'AI 服务暂时不可用',
      error: e.message
    });
  }
}

// AI 优化待办文本
export async function apiAIOptimize(request, env) {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }
  
  try {
    const body = await request.json();
    const text = body.text?.trim();
    
    if (!text) {
      return jsonResponse({ success: false, error: '文本不能为空' }, 400);
    }
    
    const response = await env.AI.run('@cf/meta/llama-2-7b-chat-int8', {
      messages: [
        { 
          role: 'system', 
          content: 'You are a todo item optimization assistant. Your task is to optimize the user\'s todo text.' +
                   '\n\nCRITICAL RULES:\n' +
                   '1. ALWAYS respond in Chinese if the user input contains any Chinese characters\n' +
                   '2. Only respond in English if the user input is entirely in English\n' +
                   '3. Keep the original meaning unchanged\n' +
                   '4. Use concise and clear language\n' +
                   '5. Return ONLY the optimized text, no explanations\n' +
                   '6. If already clear, return as is'
        },
        { role: 'user', content: `Optimize this todo (MUST reply in Chinese if input has Chinese): "${text}"` }
      ]
    });
    
    // 清理 AI 返回的结果
    let optimized = response.response?.trim() || text;
    
    // 移除可能的引号
    optimized = optimized.replace(/^["']|["']$/g, '');
    
    // 如果 AI 返回了前缀（如"优化后的文本："），尝试移除
    const prefixes = ['优化后的文本：', '优化后：', '优化结果：', '优化：'];
    for (const prefix of prefixes) {
      if (optimized.startsWith(prefix)) {
        optimized = optimized.substring(prefix.length).trim();
        break;
      }
    }
    
    return jsonResponse({
      success: true,
      original: text,
      optimized: optimized,
      changed: optimized !== text
    });
  } catch (e) {
    return jsonResponse({ 
      success: false,
      error: 'AI 优化失败',
      message: e.message
    }, 500);
  }
}
