import { jsonResponse } from '../utils/helpers.js';

// TodoList REST API
export async function apiTodos(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  
  // 获取当前登录用户
  const session = await getSession(env, request);
  const currentUser = session?.data?.user;
  
  // 打印用户信息到控制台
  if (currentUser) {
    console.log('Current User:', JSON.stringify({
      id: currentUser.id,
      login: currentUser.login,
      name: currentUser.name,
      email: currentUser.email,
      avatar_url: currentUser.avatar_url
    }, null, 2));
  } else {
    console.log('Current User: Not logged in');
  }
  
  try {
    // 确保表存在 - 使用 prepare().run() 而不是 exec
    try {
      // 创建表（如果不存在）
      await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS todos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          text TEXT NOT NULL,
          done INTEGER DEFAULT 0,
          tags TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();
      
      // 尝试添加 user_login 列（用于存储用户登录名）
      try {
        await env.DB.prepare('ALTER TABLE todos ADD COLUMN user_login TEXT').run();
      } catch (alterErr) {
        // 列已存在，忽略错误
      }
      
      // 尝试添加 tags 列（如果表已存在但缺少该列）
      try {
        await env.DB.prepare('ALTER TABLE todos ADD COLUMN tags TEXT').run();
      } catch (alterErr) {
        // 列已存在或表刚创建，忽略错误
      }
      
      // 尝试添加 attachments 列（存储附件信息 JSON）
      try {
        await env.DB.prepare('ALTER TABLE todos ADD COLUMN attachments TEXT').run();
      } catch (alterErr) {
        // 列已存在，忽略错误
      }
    } catch (e) {
      // 忽略错误
    }
    
    // GET /api/todos - 获取所有待办（只返回当前用户的）
    if (method === 'GET' && path === '/api/todos') {
      let result;
      if (currentUser) {
        // 优先使用 user_login 匹配，同时兼容 user_id
        result = await env.DB.prepare(
          'SELECT * FROM todos WHERE user_login = ? OR (user_login IS NULL AND user_id = ?) ORDER BY created_at DESC'
        )
          .bind(currentUser.login, currentUser.id)
          .all();
      } else {
        // 未登录时返回空数组（或可以获取所有待办）
        result = { results: [] };
      }
      const todos = (result.results || []).map(todo => ({
        ...todo,
        tags: todo.tags ? JSON.parse(todo.tags) : [],
        attachments: todo.attachments ? JSON.parse(todo.attachments) : []
      }));
      return jsonResponse({
        success: true,
        todos: todos,
        user: currentUser ? { id: currentUser.id, login: currentUser.login } : null
      });
    }
    
    // POST /api/todos - 创建待办
    if (method === 'POST' && path === '/api/todos') {
      const body = await request.json();
      const text = body.text?.trim();
      const tags = body.tags || [];
      const attachments = body.attachments || [];
      
      if (!text) {
        return jsonResponse({ success: false, error: '待办事项不能为空' }, 400);
      }
      
      // 获取当前用户信息
      const userId = currentUser ? currentUser.id : null;
      const userLogin = currentUser ? currentUser.login : null;
      
      // 插入数据 - 包含 user_id 和 user_login
      await env.DB.prepare('INSERT INTO todos (text, tags, attachments, user_id, user_login) VALUES (?, ?, ?, ?, ?)')
        .bind(text, JSON.stringify(tags), JSON.stringify(attachments), userId, userLogin)
        .run();
      
      // 获取刚插入的数据
      const result = await env.DB.prepare('SELECT * FROM todos ORDER BY id DESC LIMIT 1').all();
      const todo = result.results?.[0];
      if (todo) {
        todo.tags = todo.tags ? JSON.parse(todo.tags) : [];
        todo.attachments = todo.attachments ? JSON.parse(todo.attachments) : [];
      }
      
      return jsonResponse({ success: true, todo });
    }
    
    // PUT /api/todos/:id - 更新待办（只能更新自己的）
    if (method === 'PUT' && path.match(/^\/api\/todos\/\d+$/)) {
      const id = parseInt(path.split('/').pop());
      const body = await request.json();
      
      // 先检查待办是否存在且属于当前用户
      const checkResult = await env.DB.prepare('SELECT * FROM todos WHERE id = ?').bind(id).all();
      const existingTodo = checkResult.results?.[0];
      
      if (!existingTodo) {
        return jsonResponse({ success: false, error: '待办不存在' }, 404);
      }
      
      // 验证权限：只能修改自己的待办
      if (currentUser) {
        const todoOwner = existingTodo.user_login || existingTodo.user_id?.toString();
        const currentUserId = currentUser.login || currentUser.id.toString();
        if (todoOwner && todoOwner !== currentUserId) {
          return jsonResponse({ success: false, error: '无权修改此待办' }, 403);
        }
      } else {
        // 未登录用户不能修改任何待办
        return jsonResponse({ success: false, error: '请先登录' }, 401);
      }
      
      if (typeof body.done !== 'undefined') {
        await env.DB.prepare('UPDATE todos SET done = ? WHERE id = ?').bind(body.done ? 1 : 0, id).run();
      }
      
      if (body.text) {
        await env.DB.prepare('UPDATE todos SET text = ? WHERE id = ?').bind(body.text, id).run();
      }
      
      if (body.tags) {
        await env.DB.prepare('UPDATE todos SET tags = ? WHERE id = ?').bind(JSON.stringify(body.tags), id).run();
      }
      
      const result = await env.DB.prepare('SELECT * FROM todos WHERE id = ?').bind(id).all();
      const todo = result.results?.[0];
      if (todo) {
        todo.tags = todo.tags ? JSON.parse(todo.tags) : [];
        todo.attachments = todo.attachments ? JSON.parse(todo.attachments) : [];
      }
      
      return jsonResponse({ success: true, todo });
    }
    
    // DELETE /api/todos/:id - 删除待办（只能删除自己的）
    if (method === 'DELETE' && path.match(/^\/api\/todos\/\d+$/)) {
      const id = parseInt(path.split('/').pop());
      
      // 先检查待办是否存在且属于当前用户
      const checkResult = await env.DB.prepare('SELECT * FROM todos WHERE id = ?').bind(id).all();
      const existingTodo = checkResult.results?.[0];
      
      if (!existingTodo) {
        return jsonResponse({ success: false, error: '待办不存在' }, 404);
      }
      
      // 验证权限：只能删除自己的待办
      if (currentUser) {
        const todoOwner = existingTodo.user_login || existingTodo.user_id?.toString();
        const currentUserId = currentUser.login || currentUser.id.toString();
        if (todoOwner && todoOwner !== currentUserId) {
          return jsonResponse({ success: false, error: '无权删除此待办' }, 403);
        }
      } else {
        // 未登录用户不能删除任何待办
        return jsonResponse({ success: false, error: '请先登录' }, 401);
      }
      
      await env.DB.prepare('DELETE FROM todos WHERE id = ?').bind(id).run();
      return jsonResponse({ success: true });
    }
    
    // GET /api/todos/export - 导出所有待办为 JSON 文件
    if (method === 'GET' && path === '/api/todos/export') {
      const result = await env.DB.prepare('SELECT * FROM todos ORDER BY created_at DESC').all();
      const todos = (result.results || []).map(todo => ({
        ...todo,
        tags: todo.tags ? JSON.parse(todo.tags) : []
      }));
      
      // 生成导出数据
      const exportData = {
        exportTime: new Date().toISOString(),
        totalCount: todos.length,
        completedCount: todos.filter(t => t.done).length,
        pendingCount: todos.filter(t => !t.done).length,
        todos: todos
      };
      
      const jsonContent = JSON.stringify(exportData, null, 2);
      const blob = new TextEncoder().encode(jsonContent);
      
      // 生成文件名
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `todos-export-${dateStr}.json`;
      
      return new Response(blob, {
        status: 200,
        headers: {
          'Content-Type': 'application/json;charset=UTF-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // POST /api/todos/migrate - 迁移旧数据，将 user_id 为空的设置为 olojiang (2581485)
    if ((method === 'POST' || method === 'GET') && path === '/api/todos/migrate') {
      // 更新所有 user_id 为 NULL 的记录，设置为 olojiang 的 ID
      const updateResult = await env.DB.prepare(
        "UPDATE todos SET user_id = 2581485, user_login = 'olojiang' WHERE user_id IS NULL AND user_login IS NULL"
      ).run();
      
      // 获取更新后的统计
      const statsResult = await env.DB.prepare(
        'SELECT COUNT(*) as total, SUM(CASE WHEN user_id = 2581485 THEN 1 ELSE 0 END) as olojiang_count FROM todos'
      ).all();
      
      return jsonResponse({
        success: true,
        message: 'Migration completed',
        updated: updateResult.meta?.changes || 0,
        stats: statsResult.results?.[0] || {}
      });
    }
    
    return jsonResponse({ error: 'Not Found' }, 404);
    
  } catch (e) {
    return jsonResponse({ 
      success: false,
      error: '操作失败', 
      message: e.message 
    }, 500);
  }
}

// 获取 session 数据（辅助函数，从 index.js 复制）
async function getSession(env, request) {
  const cookie = request.headers.get('Cookie');
  if (!cookie) return null;
  
  const match = cookie.match(/session=([^;]+)/);
  if (!match) return null;
  
  const sessionId = await verifyCookie(decodeURIComponent(match[1]), env.COOKIE_SECRET);
  if (!sessionId) return null;
  
  const data = await env.CACHE.get(`oauth_session:${sessionId}`, 'json');
  if (!data) return null;
  
  return { sessionId, data };
}

// 验证 cookie 签名（辅助函数，从 index.js 复制）
async function verifyCookie(signedValue, secret) {
  const lastDot = signedValue.lastIndexOf('.');
  if (lastDot === -1) return null;
  
  const value = signedValue.slice(0, lastDot);
  const expected = await signCookie(value, secret);
  
  // 时间安全比较
  if (signedValue.length !== expected.length) return null;
  
  let match = true;
  for (let i = 0; i < signedValue.length; i++) {
    if (signedValue[i] !== expected[i]) match = false;
  }
  
  return match ? value : null;
}

// 简单的 cookie 签名 (HMAC-SHA256)（辅助函数，从 index.js 复制）
async function signCookie(value, secret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
  const sigHex = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `${value}.${sigHex}`;
}
