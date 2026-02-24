import { jsonResponse } from '../utils/response.js'

export async function apiTestAll(request, env) {
  const results = {
    kv: { status: 'unknown', error: null },
    r2: { status: 'unknown', error: null },
    d1: { status: 'unknown', error: null },
    ai: { status: 'unknown', error: null }
  };

  // 测试 KV
  try {
    const testKey = 'test_' + Date.now();
    await env.CACHE.put(testKey, 'Hello KV!');
    const value = await env.CACHE.get(testKey);
    await env.CACHE.delete(testKey);
    results.kv.status = value === 'Hello KV!' ? '✅ 正常' : '❌ 数据不匹配';
  } catch (e) {
    results.kv.status = '❌ 错误';
    results.kv.error = e.message;
  }

  // 测试 R2
  try {
    const testKey = 'test_' + Date.now() + '.txt';
    await env.STORAGE.put(testKey, 'Hello R2!');
    const object = await env.STORAGE.get(testKey);
    const value = object ? await object.text() : null;
    await env.STORAGE.delete(testKey);
    results.r2.status = value === 'Hello R2!' ? '✅ 正常' : '❌ 数据不匹配';
  } catch (e) {
    results.r2.status = '❌ 错误';
    results.r2.error = e.message;
  }

  // 测试 D1
  try {
    // 创建测试表（如果不存在）
    await env.DB.exec(`
      CREATE TABLE IF NOT EXISTS test_table (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 插入测试数据
    await env.DB.exec("INSERT INTO test_table (message) VALUES ('Hello D1!')");
    
    // 查询数据 - 使用 all() 获取结果
    const queryResult = await env.DB.prepare('SELECT * FROM test_table ORDER BY id DESC LIMIT 1').all();
    const rows = queryResult.results || [];
    
    // 清理测试数据
    await env.DB.exec("DELETE FROM test_table WHERE message = 'Hello D1!'");
    
    results.d1.status = rows.length > 0 ? '✅ 正常' : '❌ 无数据';
    results.d1.lastRow = rows[0];
  } catch (e) {
    results.d1.status = '❌ 错误';
    results.d1.error = e.message;
  }

  // 测试 AI
  try {
    const response = await env.AI.run('@cf/meta/llama-2-7b-chat-int8', {
      messages: [
        { role: 'user', content: 'Say "Hello AI!"' }
      ]
    });
    results.ai.status = response.response ? '✅ 正常' : '❌ 无响应';
    results.ai.sample = response.response?.substring(0, 100);
  } catch (e) {
    results.ai.status = '❌ 错误';
    results.ai.error = e.message;
  }

  return jsonResponse({
    message: '存储服务测试报告',
    timestamp: new Date().toISOString(),
    results
  });
}

export async function apiKV(request, env) {
  const url = new URL(request.url);
  const action = url.searchParams.get('action');
  const key = url.searchParams.get('key');
  const value = url.searchParams.get('value');
  
  try {
    switch (action) {
      case 'set':
        if (!key) return jsonResponse({ error: '需要 key 参数' }, 400);
        await env.CACHE.put(key, value);
        return jsonResponse({ action: 'set', key, value, status: '✅ 已存储到 KV' });
      
      case 'get':
        if (!key) return jsonResponse({ error: '需要 key 参数' }, 400);
        const got = await env.CACHE.get(key);
        return jsonResponse({ action: 'get', key, value: got, found: got !== null });
      
      case 'delete':
        if (!key) return jsonResponse({ error: '需要 key 参数' }, 400);
        await env.CACHE.delete(key);
        return jsonResponse({ action: 'delete', key, status: '✅ 已删除' });
      
      case 'list':
        const list = await env.CACHE.list();
        const keys = list.keys.map(k => k.name);
        return jsonResponse({ action: 'list', keys, count: keys.length });
      
      default:
        return jsonResponse({ error: '未知操作' }, 400);
    }
  } catch (e) {
    return jsonResponse({ error: 'KV 操作失败', message: e.message }, 500);
  }
}

export async function apiD1(request, env) {
  const url = new URL(request.url);
  const action = url.searchParams.get('action');
  const text = url.searchParams.get('text');
  
  try {
    switch (action) {
      case 'add':
        if (!text) return jsonResponse({ error: '需要 text 参数' }, 400);
        // 使用 prepare().run() 插入数据
        const stmt = env.DB.prepare('INSERT INTO todos (text) VALUES (?)').bind(text);
        const result = await stmt.run();
        return jsonResponse({ 
          action: 'add', 
          result: {
            success: result.success,
            meta: result.meta
          },
          status: '✅ 已添加' 
        });
      
      case 'list':
        const listStmt = env.DB.prepare('SELECT * FROM todos ORDER BY created_at DESC');
        const listResult = await listStmt.all();
        return jsonResponse({ 
          action: 'list', 
          todos: listResult.results || [], 
          count: (listResult.results || []).length,
          meta: listResult.meta
        });
      
      case 'clear':
        const clearStmt = env.DB.prepare('DELETE FROM test_table');
        const clearResult = await clearStmt.run();
        return jsonResponse({ 
          action: 'clear', 
          result: {
            success: clearResult.success,
            meta: clearResult.meta
          },
          status: '✅ 已清空' 
        });
      
      default:
        return jsonResponse({ error: '未知操作' }, 400);
    }
  } catch (e) {
    return jsonResponse({ 
      error: 'D1 操作失败', 
      message: e.message, 
      stack: e.stack,
      type: e.constructor.name 
    }, 500);
  }
}

export async function apiR2(request, env) {
  const url = new URL(request.url);
  const action = url.searchParams.get('action');
  const key = url.searchParams.get('key');
  const content = url.searchParams.get('content');
  
  try {
    switch (action) {
      case 'put':
        if (!key) return jsonResponse({ error: '需要 key 参数' }, 400);
        await env.STORAGE.put(key, content);
        return jsonResponse({ action: 'put', key, size: content?.length || 0, status: '✅ 已上传' });
      
      case 'get':
        if (!key) return jsonResponse({ error: '需要 key 参数' }, 400);
        const object = await env.STORAGE.get(key);
        if (!object) {
          return jsonResponse({ action: 'get', key, found: false });
        }
        const text = await object.text();
        return jsonResponse({ action: 'get', key, found: true, content: text, size: text.length });
      
      case 'delete':
        if (!key) return jsonResponse({ error: '需要 key 参数' }, 400);
        await env.STORAGE.delete(key);
        return jsonResponse({ action: 'delete', key, status: '✅ 已删除' });
      
      case 'list':
        const listed = await env.STORAGE.list();
        const files = listed.objects.map(obj => ({
          key: obj.key,
          size: obj.size,
          uploaded: obj.uploaded
        }));
        return jsonResponse({ action: 'list', files, count: files.length });
      
      default:
        return jsonResponse({ error: '未知操作' }, 400);
    }
  } catch (e) {
    return jsonResponse({ error: 'R2 操作失败', message: e.message }, 500);
  }
}

export async function apiResources(request, env) {
  try {
    // 获取 KV 数量
    let kvCount = 0;
    try {
      const kvList = await env.CACHE.list();
      kvCount = kvList.keys ? kvList.keys.length : 0;
    } catch (e) {
      console.error('获取 KV 数量失败:', e);
    }
    
    // 获取 D1 记录数
    let dbCount = 0;
    try {
      const dbResult = await env.DB.prepare('SELECT COUNT(*) as count FROM todos').all();
      dbCount = dbResult.results?.[0]?.count || 0;
    } catch (e) {
      console.error('获取 D1 数量失败:', e);
    }
    
    // 获取 R2 对象数
    let r2Count = 0;
    try {
      const r2List = await env.STORAGE.list();
      r2Count = r2List.objects ? r2List.objects.length : 0;
    } catch (e) {
      console.error('获取 R2 数量失败:', e);
    }
    
    return jsonResponse({
      success: true,
      kv: { 
        count: kvCount, 
        limit: 1000000, // 1 million keys
        percent: Math.round((kvCount / 1000000) * 100)
      },
      db: { 
        count: dbCount, 
        limit: 500000, // 500k rows
        percent: Math.round((dbCount / 500000) * 100)
      },
      r2: { 
        count: r2Count 
      }
    });
  } catch (e) {
    return jsonResponse({ 
      success: false,
      error: '获取资源信息失败', 
      message: e.message 
    }, 500);
  }
}
