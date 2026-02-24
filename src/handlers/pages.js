// HTML 页面渲染 (首页、计数器、待办等)
import { getSession } from '../auth/session.js';

/**
 * 首页 - 带功能切换
 */
export async function homePage(request, env) {
  // 获取登录状态
  let user = null;
  if (request && env) {
    const session = await getSession(env, request);
    if (session?.data?.user) {
      user = session.data.user;
    }
  }

  const userSection = user ? `
    <div style="display: flex; align-items: center; gap: 10px; background: rgba(255,255,255,0.2); padding: 8px 16px; border-radius: 25px;">
      <img src="${user.avatar_url}" alt="avatar" style="width: 32px; height: 32px; border-radius: 50%;">
      <span>${user.name || user.login}</span>
      <a href="/auth/logout" style="color: #ff6b6b; text-decoration: none; font-size: 12px; margin-left: 10px;">退出</a>
    </div>
  ` : `
    <a href="/auth/login" style="background: rgba(255,255,255,0.2); color: white; padding: 10px 20px; border-radius: 25px; text-decoration: none; font-weight: 500;">
      <i class="fab fa-github"></i> GitHub 登录
    </a>
  `;

  return new Response(`
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cloudflare Worker 功能演示中心</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <script src="https://unpkg.com/vconsole@latest/dist/vconsole.min.js"></script>
    <script>new VConsole();</script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: white;
        }
        .header { text-align: center; padding: 40px 20px; }
        .header h1 { font-size: 2.5em; margin-bottom: 10px; }
        .nav-tabs {
            display: flex; justify-content: center; flex-wrap: wrap; gap: 10px;
            padding: 20px; background: rgba(0,0,0,0.2);
        }
        .nav-tab {
            padding: 12px 24px; background: rgba(255,255,255,0.1);
            border: 2px solid transparent; border-radius: 25px;
            cursor: pointer; transition: all 0.3s;
            text-decoration: none; color: white;
        }
        .nav-tab:hover, .nav-tab.active {
            background: rgba(255,255,255,0.3); border-color: #4ade80;
        }
        .container { max-width: 1200px; margin: 0 auto; padding: 40px 20px; }
        .section { display: none; animation: fadeIn 0.5s; }
        .section.active { display: block; }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .card {
            background: rgba(255,255,255,0.1); backdrop-filter: blur(10px);
            border-radius: 16px; padding: 30px; transition: transform 0.3s;
        }
        .card:hover { transform: translateY(-5px); }
        .card h3 { color: #4ade80; margin-bottom: 15px; }
        .card p { opacity: 0.9; line-height: 1.6; margin-bottom: 20px; }
        .btn {
            display: inline-block; background: rgba(255,255,255,0.2);
            color: white; padding: 12px 24px; border-radius: 8px;
            text-decoration: none; transition: all 0.3s;
            border: none; cursor: pointer; font-size: 14px;
        }
        .btn:hover { background: rgba(255,255,255,0.3); }
        .btn-primary { background: #4ade80; color: #1f2937; }
        .demo-box { background: rgba(0,0,0,0.3); border-radius: 12px; padding: 20px; margin-top: 20px; }
        .input-group { display: flex; gap: 10px; margin-bottom: 15px; }
        .input-group input {
            flex: 1; padding: 12px; border: none; border-radius: 8px;
            background: rgba(255,255,255,0.1); color: white;
        }
        .result-box {
            background: rgba(0,0,0,0.3); border-radius: 8px; padding: 15px;
            margin-top: 15px; font-family: monospace; white-space: pre-wrap;
            max-height: 300px; overflow-y: auto;
        }
        .storage-info {
            background: rgba(255,255,255,0.1); border-left: 4px solid #4ade80;
            padding: 15px; margin-bottom: 20px; border-radius: 0 8px 8px 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Cloudflare Worker 功能演示中心</h1>
        <p>体验 Workers、KV、D1、R2、AI 等强大功能</p>
        <div style="position: absolute; right: 20px; top: 30%; transform: translateY(-50%);">
            ${userSection}
        </div>
    </div>
    <div class="nav-tabs">
        <a href="#api" class="nav-tab active" onclick="showSection('api')">API 服务</a>
        <a href="#kv" class="nav-tab" onclick="showSection('kv')">KV 存储</a>
        <a href="#d1" class="nav-tab" onclick="showSection('d1')">D1 数据库</a>
        <a href="#r2" class="nav-tab" onclick="showSection('r2')">R2 存储</a>
        <a href="#ai" class="nav-tab" onclick="showSection('ai')">AI 对话</a>
    </div>
    <div class="container">
        <div id="api" class="section active">
            <div class="grid">
                <div class="card">
                    <h3>时间服务</h3>
                    <p>获取当前服务器时间</p>
                    <div class="demo-box">
                        <button class="btn btn-primary" onclick="fetchData('/api/time', 'time-result')">获取时间</button>
                        <div id="time-result" class="result-box">点击按钮获取时间...</div>
                    </div>
                </div>
                <div class="card">
                    <h3>天气查询</h3>
                    <p>查询全球城市天气信息</p>
                    <div class="demo-box">
                        <div class="input-group">
                            <input type="text" id="weather-city" placeholder="输入城市名" value="Beijing">
                            <button class="btn btn-primary" onclick="fetchWeather()">查询</button>
                        </div>
                        <div id="weather-result" class="result-box">输入城市名查询天气...</div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <script>
        function showSection(sectionId) {
            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
            document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
            document.getElementById(sectionId).classList.add('active');
            event.target.classList.add('active');
        }
        async function fetchData(url, resultId) {
            const resultBox = document.getElementById(resultId);
            resultBox.textContent = '加载中...';
            try {
                const response = await fetch(url);
                const data = await response.json();
                resultBox.textContent = JSON.stringify(data, null, 2);
            } catch (e) {
                resultBox.textContent = '错误: ' + e.message;
            }
        }
        async function fetchWeather() {
            const city = document.getElementById('weather-city').value;
            fetchData('/api/weather?city=' + encodeURIComponent(city), 'weather-result');
        }
    </script>
</body>
</html>
  `, { headers: { 'Content-Type': 'text/html;charset=UTF-8' } });
}

/**
 * TodoList H5 页面 - 移动端优化
 */
export async function todoPage(request, env) {
  let user = null;
  if (request && env) {
    const session = await getSession(env, request);
    if (session?.data?.user) {
      user = session.data.user;
    }
  }

  const userSection = user ? `
    <div style="display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.25); padding: 6px 12px; border-radius: 20px; margin-top: 10px;">
      <img src="${user.avatar_url}" alt="avatar" style="width: 28px; height: 28px; border-radius: 50%; border: 2px solid white;">
      <span style="font-size: 14px; font-weight: 500;">${user.name || user.login}</span>
      <a href="/auth/logout" style="color: #fff; text-decoration: none; font-size: 12px; margin-left: 8px; opacity: 0.9;">退出</a>
    </div>
  ` : `
    <a href="/auth/login" style="display: inline-flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.25); color: white; padding: 8px 16px; border-radius: 20px; text-decoration: none; font-weight: 500; font-size: 14px; margin-top: 10px;">
      GitHub 登录
    </a>
  `;

  return new Response(`
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TodoList</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #ff6b6b 0%, #feca57 100%);
            min-height: 100vh; padding: 0; color: #333;
        }
        .container { margin: 0 auto; padding: 20px; min-height: 100vh; background: rgba(255, 255, 255, 0.95); }
        .header { text-align: center; padding: 30px 20px; background: linear-gradient(135deg, #ff6b6b 0%, #feca57 100%); margin: -20px -20px 20px -20px; color: white; position: sticky; top: 0; z-index: 100; }
        .header h1 { font-size: 28px; margin-bottom: 8px; }
        .stats { display: flex; justify-content: space-around; padding: 15px; background: white; border-radius: 16px; margin-bottom: 20px; }
        .stat-value { font-size: 24px; font-weight: 700; color: #ff6b6b; }
        .stat-label { font-size: 12px; color: #999; }
        .input-section { background: white; border-radius: 16px; padding: 20px; margin-bottom: 20px; }
        .todo-input { flex: 1; padding: 15px 20px; border: 2px solid #e0e0e0; border-radius: 12px; font-size: 16px; }
        .add-btn { padding: 15px 25px; background: linear-gradient(135deg, #ff6b6b 0%, #feca57 100%); color: white; border: none; border-radius: 12px; font-size: 16px; cursor: pointer; }
        .todo-list { background: white; border-radius: 16px; padding: 20px; min-height: 200px; }
        .todo-item { padding: 15px; background: #f8f9fa; border-radius: 12px; margin-bottom: 10px; }
        .todo-item.completed { opacity: 0.6; }
        .todo-item.completed .todo-text { text-decoration: line-through; color: #999; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1><i class="fas fa-clipboard-list"></i> TodoList</h1>
            <p>记录你的待办事项</p>
            ${userSection}
        </div>
        <div class="stats">
            <div class="stat-item"><div class="stat-value" id="total-count">0</div><div class="stat-label">总任务</div></div>
            <div class="stat-item"><div class="stat-value" id="pending-count">0</div><div class="stat-label">待完成</div></div>
            <div class="stat-item"><div class="stat-value" id="completed-count">0</div><div class="stat-label">已完成</div></div>
        </div>
        <div class="input-section">
            <div class="input-group" style="display: flex; gap: 10px;">
                <input type="text" class="todo-input" id="todo-input" placeholder="添加新的待办事项...">
                <button class="add-btn" id="add-btn">添加</button>
            </div>
        </div>
        <div class="todo-list" id="todo-list">
            <div style="text-align: center; padding: 40px;">加载中...</div>
        </div>
    </div>
    <script>
        async function loadTodos() {
            try {
                const response = await fetch('/api/todos');
                const data = await response.json();
                if (data.todos) {
                    renderTodos(data.todos);
                    updateStats(data.todos);
                }
            } catch (e) {
                console.error('加载失败:', e);
            }
        }
        function renderTodos(todos) {
            const listEl = document.getElementById('todo-list');
            if (todos.length === 0) {
                listEl.innerHTML = '<div style="text-align: center; padding: 40px; color: #999;">暂无待办事项</div>';
                return;
            }
            let html = '';
            todos.forEach(todo => {
                html += '<div class="todo-item ' + (todo.done ? 'completed' : '') + '">' +
                    '<div class="todo-text">' + todo.text + '</div>' +
                    '</div>';
            });
            listEl.innerHTML = html;
        }
        function updateStats(todos) {
            document.getElementById('total-count').textContent = todos.length;
            document.getElementById('pending-count').textContent = todos.filter(t => !t.done).length;
            document.getElementById('completed-count').textContent = todos.filter(t => t.done).length;
        }
        document.getElementById('add-btn').addEventListener('click', async () => {
            const input = document.getElementById('todo-input');
            const text = input.value.trim();
            if (!text) return;
            await fetch('/api/todos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            });
            input.value = '';
            loadTodos();
        });
        loadTodos();
    </script>
</body>
</html>
  `, { headers: { 'Content-Type': 'text/html;charset=UTF-8' } });
}

/**
 * Tags 管理页面
 */
export function tagsPage() {
  return new Response(`
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>标签管理</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #ff6b6b 0%, #feca57 100%);
            min-height: 100vh; padding: 0; color: #333;
        }
        .container { margin: 0 auto; padding: 20px; min-height: 100vh; background: rgba(255, 255, 255, 0.95); }
        .header { text-align: center; padding: 30px 20px; background: linear-gradient(135deg, #ff6b6b 0%, #feca57 100%); margin: -20px -20px 20px -20px; color: white; position: sticky; top: 0; z-index: 100; }
        .header h1 { font-size: 28px; margin-bottom: 8px; }
        .back-link { position: absolute; left: 20px; top: 50%; transform: translateY(-50%); color: white; text-decoration: none; }
        .input-section { background: white; border-radius: 16px; padding: 20px; margin-bottom: 20px; }
        .tag-input { flex: 1; padding: 15px 20px; border: 2px solid #e0e0e0; border-radius: 12px; font-size: 16px; }
        .add-btn { padding: 15px 25px; background: linear-gradient(135deg, #ff6b6b 0%, #feca57 100%); color: white; border: none; border-radius: 12px; font-size: 16px; cursor: pointer; }
        .tags-list { background: white; border-radius: 16px; padding: 20px; }
        .tag-item { display: inline-flex; align-items: center; padding: 8px 16px; background: linear-gradient(135deg, #ff6b6b 0%, #feca57 100%); color: white; border-radius: 20px; margin: 5px; }
        .tag-delete { margin-left: 8px; cursor: pointer; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <a href="/todos" class="back-link"><i class="fas fa-arrow-left"></i> 返回</a>
            <h1><i class="fas fa-tags"></i> 标签管理</h1>
        </div>
        <div class="input-section">
            <div class="input-group" style="display: flex; gap: 10px;">
                <input type="text" class="tag-input" id="tag-input" placeholder="输入新标签名称...">
                <button class="add-btn" id="add-btn">添加</button>
            </div>
        </div>
        <div class="tags-list" id="tags-list">
            <h2>所有标签</h2>
            <div style="text-align: center; padding: 40px;">加载中...</div>
        </div>
    </div>
    <script>
        async function loadTags() {
            try {
                const response = await fetch('/api/tags');
                const data = await response.json();
                if (data.success) renderTags(data.tags || []);
            } catch (e) { console.error('加载失败:', e); }
        }
        function renderTags(tags) {
            const listEl = document.getElementById('tags-list');
            if (tags.length === 0) {
                listEl.innerHTML = '<h2>所有标签</h2><div style="text-align: center; padding: 40px;">暂无标签</div>';
                return;
            }
            let html = '<h2>所有标签</h2>';
            tags.forEach(tag => {
                const tagName = typeof tag === 'object' ? tag.name : tag;
                html += '<div class="tag-item">' + tagName + '<span class="tag-delete" data-tag="' + tagName + '"><i class="fas fa-times"></i></span></div>';
            });
            listEl.innerHTML = html;
            listEl.querySelectorAll('.tag-delete').forEach(btn => {
                btn.addEventListener('click', () => deleteTag(btn.dataset.tag));
            });
        }
        async function addTag() {
            const input = document.getElementById('tag-input');
            const name = input.value.trim();
            if (!name) return;
            const response = await fetch('/api/tags', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });
            const data = await response.json();
            if (data.success) {
                input.value = '';
                renderTags(data.tags);
            }
        }
        async function deleteTag(name) {
            if (!confirm('确定要删除标签 "' + name + '" 吗？')) return;
            const response = await fetch('/api/tags/' + encodeURIComponent(name), { method: 'DELETE' });
            const data = await response.json();
            if (data.success) renderTags(data.tags);
        }
        document.getElementById('add-btn').addEventListener('click', addTag);
        document.getElementById('tag-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addTag();
        });
        loadTags();
    </script>
</body>
</html>
  `, { headers: { 'Content-Type': 'text/html;charset=UTF-8' } });
}
