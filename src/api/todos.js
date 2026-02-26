import { jsonResponse } from '../utils/response.js'
import { getSession } from '../auth/session.js'

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

      // 创建共享关系表（如果不存在）
      try {
        await env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS todo_shares (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            todo_id INTEGER NOT NULL,
            owner_id TEXT NOT NULL,
            shared_with_id TEXT NOT NULL,
            shared_with_login TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(todo_id, shared_with_id)
          )
        `).run();
      } catch (shareErr) {
        console.log('Share table creation error:', shareErr);
      }
    } catch (e) {
      // 忽略错误
    }

    // GET /api/todos - 获取所有待办（包括自己创建的 + 共享给我的）
    if (method === 'GET' && path === '/api/todos') {
      let todos = [];

      if (currentUser) {
        // 1. 获取自己创建的 todo
        const myResult = await env.DB.prepare(
          'SELECT * FROM todos WHERE user_login = ? OR (user_login IS NULL AND user_id = ?) ORDER BY created_at DESC'
        )
          .bind(currentUser.login, currentUser.id)
          .all();

        // 获取自己创建的所有 todo 的共享信息
        const myTodoIds = (myResult.results || []).map(t => t.id);
        let myTodoShares = [];
        if (myTodoIds.length > 0) {
          // 分批查询，每批最多 100 个，避免 SQL 变量过多
          const BATCH_SIZE = 100;
          for (let i = 0; i < myTodoIds.length; i += BATCH_SIZE) {
            const batch = myTodoIds.slice(i, i + BATCH_SIZE);
            const placeholders = batch.map(() => '?').join(',');
            const sharesResult = await env.DB.prepare(
              `SELECT todo_id, shared_with_id, shared_with_login FROM todo_shares WHERE todo_id IN (${placeholders})`
            ).bind(...batch).all();
            myTodoShares = myTodoShares.concat(sharesResult.results || []);
          }
        }

        const myTodos = (myResult.results || []).map(todo => {
          const shares = myTodoShares.filter(s => s.todo_id === todo.id);
          return {
            ...todo,
            tags: todo.tags ? JSON.parse(todo.tags) : [],
            attachments: todo.attachments ? JSON.parse(todo.attachments) : [],
            isShared: false,
            sharedBy: null,
            shares: shares
          };
        });

        // 2. 获取共享给我的 todo
        const sharedResult = await env.DB.prepare(`
          SELECT t.id, t.text, t.done, t.tags, t.attachments, t.created_at, t.user_id, t.user_login, ts.owner_id as shared_by_id, ts.shared_with_login
          FROM todos t
          INNER JOIN todo_shares ts ON t.id = ts.todo_id
          WHERE ts.shared_with_id = ? OR ts.shared_with_login = ?
          ORDER BY t.created_at DESC
        `).bind(currentUser.id.toString(), currentUser.login).all();

        // 获取共享 todo 的共享信息
        const sharedTodoIds = (sharedResult.results || []).map(t => t.id);
        let sharedTodoShares = [];
        if (sharedTodoIds.length > 0) {
          const placeholders = sharedTodoIds.map(() => '?').join(',');
          const sharesResult = await env.DB.prepare(
            `SELECT todo_id, shared_with_id, shared_with_login FROM todo_shares WHERE todo_id IN (${placeholders})`
          ).bind(...sharedTodoIds).all();
          sharedTodoShares = sharesResult.results || [];
        }

        const sharedTodos = (sharedResult.results || []).map(todo => {
          const shares = sharedTodoShares.filter(s => s.todo_id === todo.id);
          return {
            ...todo,
            tags: todo.tags ? JSON.parse(todo.tags) : [],
            attachments: todo.attachments ? JSON.parse(todo.attachments) : [],
            isShared: true,
            sharedBy: todo.shared_by_id,
            shares: shares
          };
        });

        todos = [...myTodos, ...sharedTodos];
      }

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

    // PUT /api/todos/:id - 更新待办（创建者或共享接收者可修改）
    if (method === 'PUT' && path.match(/^\/api\/todos\/\d+$/)) {
      const id = parseInt(path.split('/').pop());
      const body = await request.json();

      // 先检查待办是否存在
      const checkResult = await env.DB.prepare('SELECT * FROM todos WHERE id = ?').bind(id).all();
      const existingTodo = checkResult.results?.[0];

      if (!existingTodo) {
        return jsonResponse({ success: false, error: '待办不存在' }, 404);
      }

      // 验证权限：创建者或共享接收者可修改
      let hasPermission = false;
      if (currentUser) {
        // 检查是否是创建者
        const todoOwner = existingTodo.user_login || existingTodo.user_id?.toString();
        const currentUserId = currentUser.login || currentUser.id.toString();
        if (todoOwner === currentUserId) {
          hasPermission = true;
        } else {
          // 检查是否是共享接收者
          const shareCheck = await env.DB.prepare(
            'SELECT * FROM todo_shares WHERE todo_id = ? AND shared_with_id = ?'
          ).bind(id, currentUser.id).all();
          if (shareCheck.results?.length > 0) {
            hasPermission = true;
          }
        }
      }

      if (!hasPermission) {
        return jsonResponse({ success: false, error: '无权修改此待办' }, 403);
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

    // DELETE /api/todos/:id - 删除待办（只有创建者可删除）
    if (method === 'DELETE' && path.match(/^\/api\/todos\/\d+$/)) {
      const id = parseInt(path.split('/').pop());

      // 先检查待办是否存在
      const checkResult = await env.DB.prepare('SELECT * FROM todos WHERE id = ?').bind(id).all();
      const existingTodo = checkResult.results?.[0];

      if (!existingTodo) {
        return jsonResponse({ success: false, error: '待办不存在' }, 404);
      }

      // 验证权限：只有创建者可删除
      if (currentUser) {
        const todoOwner = existingTodo.user_login || existingTodo.user_id?.toString();
        const currentUserId = currentUser.login || currentUser.id.toString();
        if (todoOwner !== currentUserId) {
          return jsonResponse({ success: false, error: '只有创建者可以删除此待办' }, 403);
        }
      } else {
        // 未登录用户不能删除任何待办
        return jsonResponse({ success: false, error: '请先登录' }, 401);
      }

      // 删除相关的共享记录
      await env.DB.prepare('DELETE FROM todo_shares WHERE todo_id = ?').bind(id).run();

      await env.DB.prepare('DELETE FROM todos WHERE id = ?').bind(id).run();
      return jsonResponse({ success: true });
    }
    
    // POST /api/todos/:id/share - 共享待办给指定用户
    if (method === 'POST' && path.match(/^\/api\/todos\/\d+\/share$/)) {
      const id = parseInt(path.split('/')[3]);
      const body = await request.json();
      const shareWithLogin = body.shared_with_login?.trim();
      
      if (!shareWithLogin) {
        return jsonResponse({ success: false, error: '请指定要共享的用户' }, 400);
      }
      
      // 检查待办是否存在且属于当前用户
      const checkResult = await env.DB.prepare('SELECT * FROM todos WHERE id = ?').bind(id).all();
      const existingTodo = checkResult.results?.[0];
      
      if (!existingTodo) {
        return jsonResponse({ success: false, error: '待办不存在' }, 404);
      }
      
      // 验证权限：只有创建者可共享
      const todoOwner = existingTodo.user_login || existingTodo.user_id?.toString();
      const currentUserId = currentUser?.login || currentUser?.id?.toString();
      if (todoOwner !== currentUserId) {
        return jsonResponse({ success: false, error: '只有创建者可以共享此待办' }, 403);
      }
      
      // 不能共享给自己
      if (shareWithLogin === currentUser?.login) {
        return jsonResponse({ success: false, error: '不能共享给自己' }, 400);
      }
      
      // 查找目标用户的 ID（通过 user_login 查找）
      // 注意：这里假设共享目标用户可能已经存在于系统中
      // 实际实现中可能需要通过其他方式获取用户 ID
      // 简化处理：使用 login 作为 shared_with_id
      
      try {
        await env.DB.prepare(
          'INSERT INTO todo_shares (todo_id, owner_id, shared_with_id, shared_with_login) VALUES (?, ?, ?, ?)'
        ).bind(id, currentUser.id.toString(), shareWithLogin, shareWithLogin).run();
        
        return jsonResponse({ success: true, message: '共享成功' });
      } catch (e) {
        if (e.message?.includes('UNIQUE constraint failed')) {
          return jsonResponse({ success: false, error: '已经共享给该用户' }, 400);
        }
        throw e;
      }
    }
    
    // DELETE /api/todos/:id/share/:userId - 取消共享
    if (method === 'DELETE' && path.match(/^\/api\/todos\/\d+\/share\/.+$/)) {
      const parts = path.split('/');
      const id = parseInt(parts[3]);
      const sharedWithId = decodeURIComponent(parts[5]);
      
      // 检查待办是否存在
      const checkResult = await env.DB.prepare('SELECT * FROM todos WHERE id = ?').bind(id).all();
      const existingTodo = checkResult.results?.[0];
      
      if (!existingTodo) {
        return jsonResponse({ success: false, error: '待办不存在' }, 404);
      }
      
      // 验证权限：只有创建者可取消共享
      const todoOwner = existingTodo.user_login || existingTodo.user_id?.toString();
      const currentUserId = currentUser?.login || currentUser?.id?.toString();
      if (todoOwner !== currentUserId) {
        return jsonResponse({ success: false, error: '只有创建者可以取消共享' }, 403);
      }
      
      await env.DB.prepare(
        'DELETE FROM todo_shares WHERE todo_id = ? AND shared_with_id = ?'
      ).bind(id, sharedWithId).run();
      
      return jsonResponse({ success: true, message: '已取消共享' });
    }
    
    // GET /api/todos/:id/shares - 获取待办的共享列表
    if (method === 'GET' && path.match(/^\/api\/todos\/\d+\/shares$/)) {
      const id = parseInt(path.split('/')[3]);
      
      // 检查待办是否存在
      const checkResult = await env.DB.prepare('SELECT * FROM todos WHERE id = ?').bind(id).all();
      const existingTodo = checkResult.results?.[0];
      
      if (!existingTodo) {
        return jsonResponse({ success: false, error: '待办不存在' }, 404);
      }
      
      // 验证权限：只有创建者可查看共享列表
      const todoOwner = existingTodo.user_login || existingTodo.user_id?.toString();
      const currentUserId = currentUser?.login || currentUser?.id?.toString();
      if (todoOwner !== currentUserId) {
        return jsonResponse({ success: false, error: '无权查看' }, 403);
      }
      
      const sharesResult = await env.DB.prepare(
        'SELECT shared_with_id, shared_with_login, created_at FROM todo_shares WHERE todo_id = ?'
      ).bind(id).all();
      
      return jsonResponse({ 
        success: true, 
        shares: sharesResult.results || [] 
      });
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
