import { jsonResponse } from '../utils/helpers.js';

// 内存存储（演示用）
const memoryStore = {
  counter: 0,
  shortUrls: new Map(),
};

// 1. apiTime() - 时间 API
export function apiTime() {
  const now = new Date();
  return jsonResponse({
    timestamp: now.toISOString(),
    beijing: now.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
    unix: Math.floor(now.getTime() / 1000)
  });
}

// 2. apiWeather(request) - 天气 API
export async function apiWeather(request) {
  const url = new URL(request.url);
  const city = url.searchParams.get('city') || 'Beijing';
  
  try {
    const response = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=j1`, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    
    if (!response.ok) {
      return jsonResponse({ 
        city: city,
        error: '获取天气失败',
        note: '请尝试使用英文城市名，如: Beijing, Shanghai, Tokyo, London'
      });
    }
    
    const data = await response.json();
    const current = data.current_condition?.[0];
    
    if (!current) {
      return jsonResponse({ 
        city: city,
        error: '未找到该城市的天气数据'
      });
    }
    
    return jsonResponse({
      city: city,
      temperature: current.temp_C + '°C',
      condition: current.lang_zh?.[0]?.value || current.weatherDesc?.[0]?.value || '未知',
      humidity: current.humidity + '%',
      wind: current.windspeedKmph + ' km/h'
    });
  } catch (e) {
    return jsonResponse({ 
      city: city,
      error: '获取天气失败',
      message: e.message
    }, 500);
  }
}

// 3. apiAI(request, env) - AI API
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

// 4. apiAIOptimize(request, env) - AI 优化 API
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

// 5. apiShorten(request, env) - 短链接 API
export function apiShorten(request, env) {
  const url = new URL(request.url);
  const longUrl = url.searchParams.get('url');
  
  if (!longUrl) {
    return jsonResponse({ error: '请提供 url 参数' }, 400);
  }
  
  const shortCode = Math.random().toString(36).substring(2, 8);
  memoryStore.shortUrls.set(shortCode, longUrl);
  
  return jsonResponse({
    original: longUrl,
    short: `${url.origin}/s/${shortCode}`,
    code: shortCode
  });
}

// 6. redirectShortUrl(path, env) - 短链接跳转
export function redirectShortUrl(path, env) {
  const shortCode = path.replace('/s/', '');
  const longUrl = memoryStore.shortUrls.get(shortCode);
  
  if (longUrl) {
    return Response.redirect(longUrl, 302);
  }
  return new Response('404 Not Found', { status: 404 });
}

// 7. apiCounter(request, env) - 计数器 API
export function apiCounter(request, env) {
  return jsonResponse({ count: memoryStore.counter });
}
