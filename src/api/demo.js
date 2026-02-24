import { jsonResponse, notFound } from '../utils/response.js'
import { memoryStore } from '../store/memory.js'

export function apiTime() {
  const now = new Date();
  return jsonResponse({
    timestamp: now.toISOString(),
    beijing: now.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
    unix: Math.floor(now.getTime() / 1000)
  });
}

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
          content: `你是一个待办事项文本优化助手。你的任务是优化用户的待办文本，使其表达更清晰、语句更通顺。

重要规则：
1. 如果用户输入包含任何中文字符，必须始终用中文回复
2. 只有在用户输入完全是英文时才用英文回复
3. **必须严格保持原文的核心意思和信息不变**，不要改变用户的原始意图
4. **严禁编造原文中没有的细节**（如具体数量、时间、地点等），只能基于原文已有的信息进行优化
5. 修正语法错误、错别字、不通顺的表达
6. 使用简洁清晰的语言，避免冗余
7. **只返回优化后的文本，不要有任何解释、说明或前缀**
8. 如果原文已经很清晰通顺，可以原样返回`
        },
        { role: 'user', content: `请优化以下待办事项文本（如果输入包含中文必须用中文回复，严格保持原意不变，不要编造原文没有的细节）："${text}"` }
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

export async function counterPage(request, env) {
  const url = new URL(request.url);
  const action = url.searchParams.get('action');
  
  if (action === 'increment') {
    memoryStore.counter++;
  } else if (action === 'reset') {
    memoryStore.counter = 0;
  }
  
  return Response.redirect('/', 302);
}

export function apiCounter(request, env) {
  return jsonResponse({ count: memoryStore.counter });
}

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

export function redirectShortUrl(path, env) {
  const shortCode = path.replace('/s/', '');
  const longUrl = memoryStore.shortUrls.get(shortCode);
  
  if (longUrl) {
    return Response.redirect(longUrl, 302);
  }
  return notFound();
}
