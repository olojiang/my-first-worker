import { jsonResponse } from '../utils/response.js'

// 通用 AI 助手 API
export async function apiAIGeneral(request, env) {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const body = await request.json();
    const prompt = body.prompt?.trim();

    if (!prompt) {
      return jsonResponse({ success: false, error: 'Prompt 不能为空' }, 400);
    }

    const response = await env.AI.run('@cf/meta/llama-2-7b-chat-int8', {
      messages: [
        {
          role: 'system',
          content: `你是一个专业的 AI 助手，可以回答各种问题、生成代码、提供建议等。

能力范围：
1. 回答技术问题、编程相关咨询
2. 生成、优化、解释代码（支持多种编程语言）
3. 提供算法思路和数据结构建议
4. 帮助调试和排查错误
5. 提供最佳实践和代码审查建议
6. 回答一般性知识问题

回答规则：
1. 如果用户用中文提问，必须用中文回答
2. 如果用户用英文提问，用英文回答
3. 代码示例要完整、可运行，包含必要的注释
4. 技术解释要清晰、准确、易懂
5. 如果不确定，诚实说明，不要编造信息`
        },
        { role: 'user', content: prompt }
      ]
    });

    return jsonResponse({
      success: true,
      prompt: prompt,
      response: response.response,
      model: 'llama-2-7b-chat'
    });
  } catch (e) {
    return jsonResponse({
      success: false,
      error: 'AI 服务暂时不可用',
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
