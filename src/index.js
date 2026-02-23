// 内存存储（演示用）
const memoryStore = {
  counter: 0,
  shortUrls: new Map(),
};

// ========== GitHub OAuth 工具函数 ==========

// 生成随机 state 防止 CSRF
function generateState() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

// 生成 session ID
function generateSessionId() {
  return crypto.randomUUID();
}

// 简单的 cookie 签名 (HMAC-SHA256)
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

// 验证 cookie 签名
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

// 获取 session 数据
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

// 设置 session
async function setSession(env, sessionId, data, expiresInSeconds = 86400) {
  await env.CACHE.put(`oauth_session:${sessionId}`, JSON.stringify(data), {
    expirationTtl: expiresInSeconds,
  });
  
  const signed = await signCookie(sessionId, env.COOKIE_SECRET);
  return `session=${encodeURIComponent(signed)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${expiresInSeconds}`;
}

// 清除 session
async function clearSession(env, sessionId) {
  await env.CACHE.delete(`oauth_session:${sessionId}`);
  return `session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

// ========== 主入口 ==========

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // 路由处理
    switch (path) {
      // GitHub OAuth 路由
      case '/auth/login':
        return authLogin(request, env);
      case '/auth/github/callback':
        return authCallback(request, env);
      case '/auth/logout':
        return authLogout(request, env);
      case '/api/me':
        return apiMe(request, env);
        
      // 原有路由
      case '/':
        return homePage(request, env);
      case '/api/time':
        return apiTime();
      case '/api/weather':
        return apiWeather(request);
      case '/api/ai':
        return apiAI(request, env);
      case '/api/ai/optimize':
        return apiAIOptimize(request, env);
      case '/counter':
        return counterPage(request, env);
      case '/api/counter':
        return apiCounter(request, env);
      case '/api/shorten':
        return apiShorten(request, env);
      case '/api/kv':
        return apiKV(request, env);
      case '/api/d1':
        return apiD1(request, env);
      case '/api/r2':
        return apiR2(request, env);
      case '/api/test-all':
        return apiTestAll(request, env);
      case '/todos':
        return todoPage(request, env);
      case '/api/todos':
        return apiTodos(request, env);
      case '/tags':
        return tagsPage();
      case '/api/tags':
        return apiTags(request, env);
      default:
        if (path.startsWith('/api/todos/') || path === '/api/todos/migrate') {
          return apiTodos(request, env);
        }
        if (path.startsWith('/api/tags/')) {
          return apiTags(request, env);
        }
        if (path.startsWith('/s/')) {
          return redirectShortUrl(path, env);
        }
        return notFound();
    }
  },
};

// ========== GitHub OAuth 处理函数 ==========

// 1. 开始 GitHub OAuth 登录
async function authLogin(request, env) {
  const url = new URL(request.url);
  const state = generateState();
  const sessionId = generateSessionId();
  
  // 存储 state 到 session
  await env.CACHE.put(`oauth_session:${sessionId}`, JSON.stringify({ state }), {
    expirationTtl: 600, // 10 分钟过期
  });
  
  const signedSession = await signCookie(sessionId, env.COOKIE_SECRET);
  
  const githubAuthUrl = new URL('https://github.com/login/oauth/authorize');
  githubAuthUrl.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
  githubAuthUrl.searchParams.set('redirect_uri', `${url.origin}/auth/github/callback`);
  githubAuthUrl.searchParams.set('scope', 'read:user user:email');
  githubAuthUrl.searchParams.set('state', state);
  
  return new Response(null, {
    status: 302,
    headers: {
      'Location': githubAuthUrl.toString(),
      'Set-Cookie': `session=${encodeURIComponent(signedSession)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`,
    },
  });
}

// 2. GitHub OAuth 回调处理
async function authCallback(request, env) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');
  
  if (error) {
    return new Response(`OAuth Error: ${error}`, { status: 400 });
  }
  
  if (!code || !state) {
    return new Response('Missing code or state', { status: 400 });
  }
  
  // 验证 session 和 state
  const session = await getSession(env, request);
  if (!session || session.data.state !== state) {
    return new Response('Invalid session or state', { status: 403 });
  }
  
  // 交换 code 获取 access token
  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: `${url.origin}/auth/github/callback`,
    }),
  });
  
  const tokenData = await tokenResponse.json();
  
  if (tokenData.error) {
    return new Response(`Token Error: ${tokenData.error_description}`, { status: 400 });
  }
  
  const accessToken = tokenData.access_token;
  
  // 获取用户信息
  const userResponse = await fetch('https://api.github.com/user', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'Cloudflare-Worker-OAuth',
    },
  });
  
  const userData = await userResponse.json();
  
  // 更新 session 存储用户信息
  const sessionCookie = await setSession(env, session.sessionId, {
    user: {
      id: userData.id,
      login: userData.login,
      name: userData.name,
      email: userData.email,
      avatar_url: userData.avatar_url,
    },
    accessToken,
    loggedInAt: Date.now(),
  }, 86400); // 24 小时
  
  // 重定向到 todo 页面
  return new Response(null, {
    status: 302,
    headers: {
      'Location': '/todos',
      'Set-Cookie': sessionCookie,
    },
  });
}

// 3. 登出
async function authLogout(request, env) {
  const session = await getSession(env, request);
  let clearCookie = 'session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0';
  
  if (session) {
    clearCookie = await clearSession(env, session.sessionId);
  }
  
  return new Response(null, {
    status: 302,
    headers: {
      'Location': '/todos',
      'Set-Cookie': clearCookie,
    },
  });
}

// 4. 获取当前用户信息 API
async function apiMe(request, env) {
  const session = await getSession(env, request);
  
  if (!session || !session.data.user) {
    return jsonResponse({ error: 'Not authenticated' }, 401);
  }
  
  return jsonResponse({
    user: session.data.user,
    loggedInAt: session.data.loggedInAt,
  });
}

// 测试所有存储服务
async function apiTestAll(request, env) {
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

// 1. 首页 - 带功能切换
async function homePage(request, env) {
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
        .header {
            text-align: center;
            padding: 40px 20px;
        }
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        .nav-tabs {
            display: flex;
            justify-content: center;
            flex-wrap: wrap;
            gap: 10px;
            padding: 20px;
            background: rgba(0,0,0,0.2);
        }
        .nav-tab {
            padding: 12px 24px;
            background: rgba(255,255,255,0.1);
            border: 2px solid transparent;
            border-radius: 25px;
            cursor: pointer;
            transition: all 0.3s;
            text-decoration: none;
            color: white;
        }
        .nav-tab:hover, .nav-tab.active {
            background: rgba(255,255,255,0.3);
            border-color: #4ade80;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 40px 20px;
        }
        .section {
            display: none;
            animation: fadeIn 0.5s;
        }
        .section.active {
            display: block;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
        }
        .card {
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(10px);
            border-radius: 16px;
            padding: 30px;
            transition: transform 0.3s;
        }
        .card:hover {
            transform: translateY(-5px);
        }
        .card h3 {
            color: #4ade80;
            margin-bottom: 15px;
        }
        .card p {
            opacity: 0.9;
            line-height: 1.6;
            margin-bottom: 20px;
        }
        .btn {
            display: inline-block;
            background: rgba(255,255,255,0.2);
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            text-decoration: none;
            transition: all 0.3s;
            border: none;
            cursor: pointer;
            font-size: 14px;
        }
        .btn:hover {
            background: rgba(255,255,255,0.3);
        }
        .btn-primary { background: #4ade80; color: #1f2937; }
        .demo-box {
            background: rgba(0,0,0,0.3);
            border-radius: 12px;
            padding: 20px;
            margin-top: 20px;
        }
        .input-group {
            display: flex;
            gap: 10px;
            margin-bottom: 15px;
        }
        .input-group input {
            flex: 1;
            padding: 12px;
            border: none;
            border-radius: 8px;
            background: rgba(255,255,255,0.1);
            color: white;
        }
        .result-box {
            background: rgba(0,0,0,0.3);
            border-radius: 8px;
            padding: 15px;
            margin-top: 15px;
            font-family: monospace;
            white-space: pre-wrap;
            max-height: 300px;
            overflow-y: auto;
        }
        .storage-info {
            background: rgba(255,255,255,0.1);
            border-left: 4px solid #4ade80;
            padding: 15px;
            margin-bottom: 20px;
            border-radius: 0 8px 8px 0;
        }
        .status-ok { color: #4ade80; }
        .status-error { color: #f87171; }
    </style>
</head>
<body>
    <div class="header">
        <h1>☁️ Cloudflare Worker 功能演示中心</h1>
        <p>体验 Workers、KV、D1、R2、AI 等强大功能</p>
        <div style="position: absolute; right: 20px; top: 50%; transform: translateY(-50%);">
            ${userSection}
        </div>
    </div>
    
    <div class="nav-tabs">
        <a href="#api" class="nav-tab active" onclick="showSection('api')">🌐 API 服务</a>
        <a href="#kv" class="nav-tab" onclick="showSection('kv')">💾 KV 存储</a>
        <a href="#d1" class="nav-tab" onclick="showSection('d1')">🗄️ D1 数据库</a>
        <a href="#r2" class="nav-tab" onclick="showSection('r2')">📁 R2 存储</a>
        <a href="#ai" class="nav-tab" onclick="showSection('ai')">🤖 AI 对话</a>
    </div>
    
    <div class="container">
        <!-- API 服务 -->
        <div id="api" class="section active">
            <div class="grid">
                <div class="card">
                    <h3>🕐 时间服务</h3>
                    <p>获取当前服务器时间</p>
                    <div class="demo-box">
                        <button class="btn btn-primary" onclick="fetchData('/api/time', 'time-result')">获取时间</button>
                        <div id="time-result" class="result-box">点击按钮获取时间...</div>
                    </div>
                </div>
                
                <div class="card">
                    <h3>🌤️ 天气查询</h3>
                    <p>查询全球城市天气信息</p>
                    <div class="demo-box">
                        <div class="input-group">
                            <input type="text" id="weather-city" placeholder="输入城市名（如: Beijing）" value="Beijing">
                            <button class="btn btn-primary" onclick="fetchWeather()">查询</button>
                        </div>
                        <div id="weather-result" class="result-box">输入城市名查询天气...</div>
                    </div>
                </div>
                
                <div class="card">
                    <h3>📊 计数器</h3>
                    <p>演示状态管理</p>
                    <div class="demo-box">
                        <button class="btn btn-primary" onclick="fetchData('/api/counter', 'counter-result')">获取</button>
                        <button class="btn" onclick="fetch('/counter?action=increment'); setTimeout(()=>fetchData('/api/counter', 'counter-result'), 100)">+1</button>
                        <button class="btn" onclick="fetch('/counter?action=reset'); setTimeout(()=>fetchData('/api/counter', 'counter-result'), 100)">重置</button>
                        <div id="counter-result" class="result-box">当前计数: 0</div>
                    </div>
                </div>
                
                <div class="card">
                    <h3>🔗 URL 短链</h3>
                    <p>创建短链接</p>
                    <div class="demo-box">
                        <div class="input-group">
                            <input type="text" id="long-url" placeholder="输入长链接" value="https://www.example.com">
                            <button class="btn btn-primary" onclick="createShortUrl()">创建</button>
                        </div>
                        <div id="shorturl-result" class="result-box"></div>
                    </div>
                </div>

                <div class="card">
                    <h3>🧪 全功能测试</h3>
                    <p>一键测试 KV、R2、D1、AI</p>
                    <div class="demo-box">
                        <button class="btn btn-primary" onclick="fetchData('/api/test-all', 'test-all-result')">运行测试</button>
                        <div id="test-all-result" class="result-box">点击运行完整测试...</div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- KV 存储 -->
        <div id="kv" class="section">
            <div class="storage-info">
                <strong>💾 Cloudflare KV</strong> - 全球分布式键值存储，适合缓存、配置、会话数据
            </div>
            <div class="grid">
                <div class="card">
                    <h3>📝 KV 操作演示</h3>
                    <div class="demo-box">
                        <div class="input-group">
                            <input type="text" id="kv-key" placeholder="键名" style="flex: 1">
                            <input type="text" id="kv-value" placeholder="值" style="flex: 2">
                        </div>
                        <button class="btn btn-primary" onclick="kvSet()">存储</button>
                        <button class="btn" onclick="kvGet()">读取</button>
                        <button class="btn" onclick="kvDelete()">删除</button>
                        <button class="btn" onclick="kvList()">列出</button>
                        <div id="kv-result" class="result-box"></div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- D1 数据库 -->
        <div id="d1" class="section">
            <div class="storage-info">
                <strong>🗄️ Cloudflare D1</strong> - 基于 SQLite 的边缘数据库，支持 SQL 查询
            </div>
            <div class="grid">
                <div class="card">
                    <h3>📝 D1 数据库演示</h3>
                    <div class="demo-box">
                        <h4>待办事项 (Todos)</h4>
                        <div class="input-group">
                            <input type="text" id="todo-text" placeholder="输入待办事项">
                            <button class="btn btn-primary" onclick="addTodo()">添加</button>
                        </div>
                        <button class="btn" onclick="listTodos()">列出所有</button>
                        <button class="btn" onclick="clearTodos()">清空</button>
                        <div id="d1-result" class="result-box"></div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- R2 存储 -->
        <div id="r2" class="section">
            <div class="storage-info">
                <strong>📁 Cloudflare R2</strong> - S3 兼容的对象存储，零出口费用
            </div>
            <div class="grid">
                <div class="card">
                    <h3>📝 R2 存储演示</h3>
                    <div class="demo-box">
                        <div class="input-group">
                            <input type="text" id="r2-key" placeholder="文件名">
                            <input type="text" id="r2-content" placeholder="文件内容">
                        </div>
                        <button class="btn btn-primary" onclick="r2Put()">上传</button>
                        <button class="btn" onclick="r2Get()">下载</button>
                        <button class="btn" onclick="r2Delete()">删除</button>
                        <button class="btn" onclick="r2List()">列出</button>
                        <div id="r2-result" class="result-box"></div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- AI 对话 -->
        <div id="ai" class="section">
            <div class="grid">
                <div class="card">
                    <h3>🤖 AI 对话</h3>
                    <p>使用 Cloudflare Workers AI 运行 Llama-2 大语言模型</p>
                    <div class="demo-box">
                        <div class="input-group">
                            <input type="text" id="ai-prompt" placeholder="输入你的问题..." style="flex: 1">
                            <button class="btn btn-primary" onclick="askAI()">发送</button>
                        </div>
                        <div id="ai-result" class="result-box"></div>
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
        
        async function createShortUrl() {
            const url = document.getElementById('long-url').value;
            const resultBox = document.getElementById('shorturl-result');
            try {
                const response = await fetch('/api/shorten?url=' + encodeURIComponent(url));
                const data = await response.json();
                resultBox.textContent = JSON.stringify(data, null, 2);
            } catch (e) {
                resultBox.textContent = '错误: ' + e.message;
            }
        }
        
        async function kvSet() {
            const key = document.getElementById('kv-key').value;
            const value = document.getElementById('kv-value').value;
            fetchData('/api/kv?action=set&key=' + encodeURIComponent(key) + '&value=' + encodeURIComponent(value), 'kv-result');
        }
        async function kvGet() {
            const key = document.getElementById('kv-key').value;
            fetchData('/api/kv?action=get&key=' + encodeURIComponent(key), 'kv-result');
        }
        async function kvDelete() {
            const key = document.getElementById('kv-key').value;
            fetchData('/api/kv?action=delete&key=' + encodeURIComponent(key), 'kv-result');
        }
        async function kvList() {
            fetchData('/api/kv?action=list', 'kv-result');
        }
        
        async function addTodo() {
            const text = document.getElementById('todo-text').value;
            fetchData('/api/d1?action=add&text=' + encodeURIComponent(text), 'd1-result');
        }
        async function listTodos() {
            fetchData('/api/d1?action=list', 'd1-result');
        }
        async function clearTodos() {
            fetchData('/api/d1?action=clear', 'd1-result');
        }
        
        async function r2Put() {
            const key = document.getElementById('r2-key').value;
            const content = document.getElementById('r2-content').value;
            fetchData('/api/r2?action=put&key=' + encodeURIComponent(key) + '&content=' + encodeURIComponent(content), 'r2-result');
        }
        async function r2Get() {
            const key = document.getElementById('r2-key').value;
            fetchData('/api/r2?action=get&key=' + encodeURIComponent(key), 'r2-result');
        }
        async function r2Delete() {
            const key = document.getElementById('r2-key').value;
            fetchData('/api/r2?action=delete&key=' + encodeURIComponent(key), 'r2-result');
        }
        async function r2List() {
            fetchData('/api/r2?action=list', 'r2-result');
        }
        
        async function askAI() {
            const prompt = document.getElementById('ai-prompt').value;
            const resultBox = document.getElementById('ai-result');
            resultBox.textContent = '思考中...';
            try {
                const response = await fetch('/api/ai?prompt=' + encodeURIComponent(prompt));
                const data = await response.json();
                resultBox.textContent = '问题: ' + data.prompt + '\\n\\n回答: ' + data.response;
            } catch (e) {
                resultBox.textContent = '错误: ' + e.message;
            }
        }
    </script>
</body>
</html>
  `, { headers: { 'Content-Type': 'text/html;charset=UTF-8' } });
}

// 其他 API 函数
function apiTime() {
  const now = new Date();
  return jsonResponse({
    timestamp: now.toISOString(),
    beijing: now.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
    unix: Math.floor(now.getTime() / 1000)
  });
}

async function apiWeather(request) {
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

async function apiAI(request, env) {
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
async function apiAIOptimize(request, env) {
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

async function counterPage(request, env) {
  const url = new URL(request.url);
  const action = url.searchParams.get('action');
  
  if (action === 'increment') {
    memoryStore.counter++;
  } else if (action === 'reset') {
    memoryStore.counter = 0;
  }
  
  return Response.redirect('/', 302);
}

function apiCounter(request, env) {
  return jsonResponse({ count: memoryStore.counter });
}

function apiShorten(request, env) {
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

function redirectShortUrl(path, env) {
  const shortCode = path.replace('/s/', '');
  const longUrl = memoryStore.shortUrls.get(shortCode);
  
  if (longUrl) {
    return Response.redirect(longUrl, 302);
  }
  return notFound();
}

// KV API - 使用真正的 Cloudflare KV
async function apiKV(request, env) {
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

// D1 API - 使用真正的 Cloudflare D1
async function apiD1(request, env) {
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
        const clearStmt = env.DB.prepare('DELETE FROM todos');
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

// R2 API - 使用真正的 Cloudflare R2
async function apiR2(request, env) {
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

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

function notFound() {
  return new Response('404 Not Found', { status: 404 });
}

// TodoList H5 页面 - 移动端优化
async function todoPage(request, env) {
  // 获取登录状态
  let user = null;
  if (request && env) {
    const session = await getSession(env, request);
    if (session?.data?.user) {
      user = session.data.user;
    }
  }
  
  // 用户登录区域
  const userSection = user ? `
    <div style="display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.25); padding: 6px 12px; border-radius: 20px; margin-top: 10px;">
      <img src="${user.avatar_url}" alt="avatar" style="width: 28px; height: 28px; border-radius: 50%; border: 2px solid white;">
      <span style="font-size: 14px; font-weight: 500;">${user.name || user.login}</span>
      <a href="/auth/logout" style="color: #fff; text-decoration: none; font-size: 12px; margin-left: 8px; opacity: 0.9;">退出</a>
    </div>
  ` : `
    <a href="/auth/login" style="display: inline-flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.25); color: white; padding: 8px 16px; border-radius: 20px; text-decoration: none; font-weight: 500; font-size: 14px; margin-top: 10px;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
      GitHub 登录
    </a>
  `;
  return new Response(`
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <title>📋 TodoList</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <script src="https://unpkg.com/vconsole@latest/dist/vconsole.min.js"></script>
    <script>new VConsole();</script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            -webkit-tap-highlight-color: transparent;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #ff6b6b 0%, #feca57 100%);
            min-height: 100vh;
            padding: 0;
            color: #333;
        }
        
        .container {
            
            margin: 0 auto;
            padding: 20px;
            min-height: 100vh;
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
        }
        
        .header {
            text-align: center;
            padding: 30px 20px;
            background: linear-gradient(135deg, #ff6b6b 0%, #feca57 100%);
            margin: -20px -20px 20px -20px;
            color: white;
            position: sticky;
            top: 0;
            z-index: 100;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        
        .header h1 {
            font-size: 28px;
            margin-bottom: 8px;
            font-weight: 700;
        }
        
        .header p {
            opacity: 0.9;
            font-size: 14px;
        }
        
        .stats {
            display: flex;
            justify-content: space-around;
            padding: 15px;
            background: white;
            border-radius: 16px;
            margin-bottom: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }
        
        .stat-item {
            text-align: center;
        }
        
        .stat-value {
            font-size: 24px;
            font-weight: 700;
            color: #ff6b6b;
        }
        
        .stat-label {
            font-size: 12px;
            color: #999;
            margin-top: 4px;
        }
        
        .input-section {
            background: white;
            border-radius: 16px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }
        
        .input-group {
            display: flex;
            gap: 10px;
        }
        
        .todo-input {
            flex: 1;
            padding: 15px 20px;
            border: 2px solid #e0e0e0;
            border-radius: 12px;
            font-size: 16px;
            outline: none;
            transition: all 0.3s;
        }
        
        .todo-input:focus {
            border-color: #ff6b6b;
            box-shadow: 0 0 0 3px rgba(255, 107, 107, 0.1);
        }
        
        .add-btn {
            padding: 15px 25px;
            background: linear-gradient(135deg, #ff6b6b 0%, #feca57 100%);
            color: white;
            border: none;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            white-space: nowrap;
        }
        
        .add-btn:active {
            transform: scale(0.95);
        }
        
        .add-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }
        
        .todo-list {
            background: white;
            border-radius: 16px;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
            min-height: 200px;
        }
        
        .todo-list h2 {
            font-size: 18px;
            margin-bottom: 15px;
            color: #333;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .todo-item {
            padding: 15px;
            background: #f8f9fa;
            border-radius: 12px;
            margin-bottom: 10px;
            transition: all 0.3s;
            animation: slideIn 0.3s ease;
            position: relative;
            width: 100%;
            box-sizing: border-box;
            overflow: hidden;
        }
        
        .todo-item::after {
            content: '';
            display: table;
            clear: both;
        }
        
        .todo-checkbox {
            float: left;
            margin-right: 15px;
            margin-top: 2px;
        }
        
        .todo-content {
            overflow: hidden;
        }
        
        .todo-actions {
            float: right;
            display: none;
            gap: 8px;
            align-items: center;
            opacity: 0;
            max-width: 99%;
            overflow: hidden;
            transition: opacity 0.3s;
            white-space: nowrap;
            margin-left: 10px;
            justify-content: center;
        }
        
        .todo-item:hover .todo-actions,
        .todo-item.selected .todo-actions {
            display: flex;
            opacity: 1;
        }
        
        @media (max-width: 480px) {
            .todo-item {
                min-height: auto;
                height: auto;
            }
            
            .todo-actions {
                float: none;
                display: none;
                justify-content: center;
                margin-left: 0;
                margin-top: 10px;
                opacity: 0;
                max-width: 99%;
            }
            
            .todo-item.selected .todo-actions {
                display: flex;
                opacity: 1;
            }
        }
        
        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateX(-20px);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }
        
        .todo-item:hover {
            background: #f0f0f0;
            transform: translateX(5px);
        }
        
        .todo-item.completed {
            opacity: 0.6;
        }
        
        .todo-item.completed .todo-text {
            text-decoration: line-through;
            color: #999;
        }
        
        .checkbox {
            width: 24px;
            height: 24px;
            border: 2px solid #ff6b6b;
            border-radius: 50%;
            margin-right: 15px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s;
            flex-shrink: 0;
            margin-top: 2px;
        }
        
        .checkbox.checked {
            background: linear-gradient(135deg, #ff6b6b 0%, #feca57 100%);
            border-color: transparent;
        }
        
        .checkbox.checked::after {
            content: '\f00c';
            color: white;
            font-size: 14px;
            font-weight: bold;
        }
        
        .todo-content {
            flex: 1;
            min-width: 0;
        }
        
        .todo-text {
            font-size: 16px;
            color: #333;
            word-break: break-word;
            line-height: 1.4;
        }
        
        .todo-time {
            font-size: 12px;
            color: #999;
            margin-top: 4px;
        }
        
        .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: #999;
        }
        
        .empty-state-icon {
            font-size: 64px;
            margin-bottom: 20px;
            opacity: 0.5;
        }
        
        .empty-state-text {
            font-size: 16px;
        }
        
        .loading {
            text-align: center;
            padding: 40px;
            color: #ff6b6b;
        }
        
        .loading-spinner {
            display: inline-block;
            width: 40px;
            height: 40px;
            border: 3px solid #f3f3f3;
            border-top: 3px solid #ff6b6b;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .toast {
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%) translateY(100px);
            background: #333;
            color: white;
            padding: 12px 24px;
            border-radius: 25px;
            font-size: 14px;
            z-index: 1000;
            opacity: 0;
            transition: all 0.3s;
        }
        
        .toast.show {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
        }
        
        .toast.success {
            background: #4ade80;
        }
        
        .toast.error {
            background: #ff6b6b;
        }
        
        @media (max-width: 480px) {
            .container {
                padding: 15px;
            }
            
            .header {
                padding: 20px 15px;
                margin: -15px -15px 15px -15px;
            }
            
            .header h1 {
                font-size: 24px;
            }
            
            .input-group {
                flex-direction: column;
            }
            
            .add-btn {
                width: 100%;
            }
            
            .todo-item {
                padding: 12px;
            }
            
            .todo-text {
                font-size: 15px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1><i class="fas fa-clipboard-list"></i> TodoList</h1>
            <p>记录你的待办事项</p>
            ${userSection}
            <a href="/tags" style="position: absolute; right: 20px; top: 30%; transform: translateY(-50%); color: white; text-decoration: none; font-size: 14px; background: rgba(255,255,255,0.2); padding: 8px 16px; border-radius: 20px;"><i class="fas fa-tags"></i> 标签管理</a>
        </div>
        
        <div class="stats">
            <div class="stat-item">
                <div class="stat-value" id="total-count">0</div>
                <div class="stat-label">总任务</div>
            </div>
            <div class="stat-item">
                <div class="stat-value" id="pending-count">0</div>
                <div class="stat-label">待完成</div>
            </div>
            <div class="stat-item">
                <div class="stat-value" id="completed-count">0</div>
                <div class="stat-label">已完成</div>
            </div>
        </div>
        
        <div class="filter-section" style="background: white; border-radius: 16px; padding: 15px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
            <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                <span style="font-size: 14px; color: #666;">筛选:</span>
                <button id="filter-all" class="filter-btn active" style="padding: 8px 16px; border: none; background: linear-gradient(135deg, #ff6b6b 0%, #feca57 100%); color: white; border-radius: 20px; cursor: pointer; font-size: 13px;">全部</button>
                <button id="filter-pending" class="filter-btn" style="padding: 8px 16px; border: none; background: #f0f0f0; color: #666; border-radius: 20px; cursor: pointer; font-size: 13px;">未完成</button>
                <button id="filter-completed" class="filter-btn" style="padding: 8px 16px; border: none; background: #f0f0f0; color: #666; border-radius: 20px; cursor: pointer; font-size: 13px;">已完成</button>
            </div>
            <p style="font-size: 12px; color: #999; margin-top: 10px; margin-bottom: 0;">默认显示：未完成任务 + 今天已完成的任务</p>
        </div>
        
        <div class="export-section" style="background: white; border-radius: 16px; padding: 15px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); text-align: center;">
            <button class="export-btn" onclick="exportTodos()" style="padding: 12px 24px; background: linear-gradient(135deg, #ff6b6b 0%, #feca57 100%); color: white; border: none; border-radius: 12px; font-size: 14px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 8px;">
                📥 导出数据 (JSON)
            </button>
            <p style="font-size: 12px; color: #999; margin-top: 8px;">导出所有待办事项，包括已完成的</p>
        </div>
        
        <div class="input-section">
            <div class="input-group" style="flex-direction: column;">
                <textarea class="todo-input" id="todo-input" placeholder="添加新的待办事项..." maxlength="500" style="min-height: 80px; resize: vertical; font-family: inherit;"></textarea>
                <div style="display: flex; gap: 10px; margin-top: 10px;">
                    <button class="add-btn" id="add-btn" style="flex: 1;">添加</button>
                    <button class="add-btn" id="ai-optimize-btn" style="flex: 1; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);"><i class="fas fa-magic"></i> AI 优化</button>
                </div>
            </div>
            <div class="tags-select" id="tags-select" style="margin-top: 15px; display: flex; flex-wrap: wrap; gap: 8px;">
                <span style="font-size: 14px; color: #666; margin-right: 8px;">选择标签:</span>
                <span style="font-size: 12px; color: #999;">加载中...</span>
            </div>
        </div>
        
        <div class="todo-list" id="todo-list">
            <div class="loading">
                <div class="loading-spinner"></div>
                <p style="margin-top: 15px;">加载中...</p>
            </div>
        </div>
    </div>
    
    <div class="toast" id="toast"></div>
    
    <script>
        let todos = [];
        let selectedTags = [];
        let allTags = [];
        
        // 页面加载时获取数据
        document.addEventListener('DOMContentLoaded', () => {
            console.log('页面加载完成，开始加载数据...');
            loadTodos();
            loadTags();
            
            // 绑定添加按钮点击事件
            document.getElementById('add-btn').addEventListener('click', addTodo);
            
            // 绑定 AI 优化按钮
            document.getElementById('ai-optimize-btn').addEventListener('click', optimizeTodoText);
            
            // Ctrl+Enter 添加
            document.getElementById('todo-input').addEventListener('keydown', (e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    addTodo();
                }
            });
            
            // 绑定筛选按钮
            document.getElementById('filter-all').addEventListener('click', () => setFilter('all'));
            document.getElementById('filter-pending').addEventListener('click', () => setFilter('pending'));
            document.getElementById('filter-completed').addEventListener('click', () => setFilter('completed'));
        });
        
        let currentFilter = 'pending'; // 默认筛选未完成的
        
        // 设置筛选
        function setFilter(filter) {
            currentFilter = filter;
            
            // 更新按钮样式
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.style.background = '#f0f0f0';
                btn.style.color = '#666';
            });
            
            const activeBtn = document.getElementById('filter-' + filter);
            activeBtn.style.background = 'linear-gradient(135deg, #ff6b6b 0%, #feca57 100%)';
            activeBtn.style.color = 'white';
            
            renderTodos();
        }
        
        // 检查是否是今天创建的
        function isToday(dateString) {
            const date = new Date(dateString);
            const today = new Date();
            return date.getDate() === today.getDate() &&
                   date.getMonth() === today.getMonth() &&
                   date.getFullYear() === today.getFullYear();
        }
        
        // 加载标签列表
        async function loadTags() {
            console.log('开始加载标签列表...');
            try {
                const response = await fetch('/api/tags');
                console.log('标签列表响应:', response.status);
                const data = await response.json();
                console.log('标签列表数据:', data);
                
                if (data.success) {
                    allTags = data.tags || [];
                    renderTagSelect();
                }
            } catch (e) {
                console.error('加载标签失败:', e);
            }
        }
        
        // 渲染标签选择器
        function renderTagSelect() {
            const container = document.getElementById('tags-select');
            
            if (allTags.length === 0) {
                container.innerHTML = '<span style="font-size: 14px; color: #666; margin-right: 8px;">选择标签:</span><a href="/tags" style="font-size: 12px; color: #ff6b6b;">还没有标签，去创建 →</a>';
                return;
            }
            
            let html = '<span style="font-size: 14px; color: #666; margin-right: 8px;">选择标签:</span>';
            
            allTags.forEach(tag => {
                // 支持新格式 {name, color} 和旧格式 string
                const tagName = typeof tag === 'object' ? tag.name : tag;
                const tagColor = typeof tag === 'object' ? tag.color : null;
                const isSelected = selectedTags.includes(tagName);
                
                if (isSelected) {
                    // 选中状态：使用标签原本的颜色，添加白色边框
                    html += '<span onclick="toggleTag(' + JSON.stringify(tagName).replace(/"/g, '&quot;') + ')" style="padding: 4px 12px; border-radius: 15px; font-size: 12px; cursor: pointer; background: ' + (tagColor || 'linear-gradient(135deg, #ff6b6b 0%, #feca57 100%)') + '; color: white; border: 2px solid white; box-shadow: 0 0 0 2px ' + (tagColor || '#ff6b6b') + '; margin-right: 8px;">' + escapeHtml(tagName) + '</span>';
                } else if (tagColor) {
                    html += '<span onclick="toggleTag(' + JSON.stringify(tagName).replace(/"/g, '&quot;') + ')" style="padding: 4px 12px; border-radius: 15px; font-size: 12px; cursor: pointer; background: ' + tagColor + '; color: white; border: 1px solid transparent; margin-right: 8px;">' + escapeHtml(tagName) + '</span>';
                } else {
                    html += '<span onclick="toggleTag(' + JSON.stringify(tagName).replace(/"/g, '&quot;') + ')" style="padding: 4px 12px; border-radius: 15px; font-size: 12px; cursor: pointer; background: #f0f0f0; color: #666; border: 1px solid #ddd; margin-right: 8px;">' + escapeHtml(tagName) + '</span>';
                }
            });
            
            container.innerHTML = html;
        }
        
        // 切换标签选择
        function toggleTag(tag) {
            if (selectedTags.includes(tag)) {
                selectedTags = selectedTags.filter(t => t !== tag);
            } else {
                selectedTags.push(tag);
            }
            renderTagSelect();
        }
        
        // 显示提示
        function showToast(message, type = 'success') {
            const toast = document.getElementById('toast');
            toast.textContent = message;
            toast.className = 'toast ' + type;
            toast.classList.add('show');
            
            setTimeout(() => {
                toast.classList.remove('show');
            }, 2000);
        }
        
        // 加载待办列表
        async function loadTodos() {
            console.log('开始加载待办列表...');
            try {
                const response = await fetch('/api/todos');
                console.log('待办列表响应:', response.status);
                const data = await response.json();
                console.log('待办列表数据:', data);
                
                if (data.todos) {
                    todos = data.todos;
                    renderTodos();
                    updateStats();
                }
            } catch (e) {
                console.error('加载待办失败:', e);
                showToast('加载失败: ' + e.message, 'error');
                document.getElementById('todo-list').innerHTML = '<div class="empty-state"><div class="empty-state-icon">⚠️</div><div class="empty-state-text">加载失败，请刷新重试</div></div>';
            }
        }
        
        // 渲染待办列表
        function renderTodos() {
            const listEl = document.getElementById('todo-list');
            
            // 筛选待办
            let filteredTodos = todos;
            
            if (currentFilter === 'pending') {
                // 显示未完成的 + 今天已完成的
                filteredTodos = todos.filter(todo => {
                    if (!todo.done) return true; // 未完成的都显示
                    if (isToday(todo.created_at)) return true; // 今天完成的也显示
                    return false;
                });
            } else if (currentFilter === 'completed') {
                // 只显示已完成的
                filteredTodos = todos.filter(todo => todo.done);
            }
            // 'all' 显示全部
            
            if (filteredTodos.length === 0) {
                listEl.innerHTML = '<h2>📝 待办事项</h2><div class="empty-state"><div class="empty-state-icon">📝</div><div class="empty-state-text">暂无待办事项，添加一个吧！</div></div>';
                return;
            }
            
            let html = '<h2>📝 待办事项</h2>';
            
            filteredTodos.forEach(todo => {
                const date = new Date(todo.created_at);
                const timeStr = date.toLocaleString('zh-CN', { 
                    month: 'short', 
                    day: 'numeric', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });
                
                // 渲染标签 - 使用标签的颜色
                let tagsHtml = '';
                if (todo.tags && todo.tags.length > 0) {
                    tagsHtml = '<div style="margin-top: 8px; display: flex; flex-wrap: wrap; gap: 5px;">';
                    todo.tags.forEach(tagName => {
                        // 从 allTags 中查找标签颜色
                        const tagObj = allTags.find(t => (typeof t === 'object' ? t.name : t) === tagName);
                        const tagColor = tagObj && typeof tagObj === 'object' ? tagObj.color : null;
                        const bgStyle = tagColor ? 'background: ' + tagColor + ';' : 'background: linear-gradient(135deg, #ff6b6b 0%, #feca57 100%);';
                        tagsHtml += '<span style="padding: 2px 8px; ' + bgStyle + ' color: white; border-radius: 10px; font-size: 11px;">' + escapeHtml(tagName) + '</span>';
                    });
                    tagsHtml += '</div>';
                }
                
                html += '<div class="todo-item ' + (todo.done ? 'completed' : '') + '" data-id="' + todo.id + '" onclick="selectTodo(this)">' +
                    '<div class="todo-actions" onclick="event.stopPropagation();">' +
                        '<button class="edit-btn" data-id="' + todo.id + '" title="编辑" style="width: 36px; height: 36px; border: none; background: #3b82f6; color: white; border-radius: 50%; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;"><i class="fas fa-pen"></i></button>' +
                        '<button class="copy-btn" data-id="' + todo.id + '" title="复制内容" style="width: 36px; height: 36px; border: none; background: #4ade80; color: white; border-radius: 50%; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;"><i class="fas fa-copy"></i></button>' +
                        '<button class="delete-btn" onclick="deleteTodo(' + todo.id + ')" style="width: 36px; height: 36px; border: none; background: #ff6b6b; color: white; border-radius: 50%; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;"><i class="fas fa-times"></i></button>' +
                    '</div>' +
                    '<div class="todo-checkbox checkbox ' + (todo.done ? 'checked' : '') + '" onclick="event.stopPropagation(); toggleTodo(' + todo.id + ')"></div>' +
                    '<div class="todo-content">' +
                        '<div class="todo-text">' + escapeHtml(todo.text) + '</div>' +
                        tagsHtml +
                        '<div class="todo-time">' + timeStr + '</div>' +
                    '</div>' +
                '</div>';
            });
            
            listEl.innerHTML = html;
            
            // 绑定复制按钮事件
            listEl.querySelectorAll('.copy-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = parseInt(e.target.dataset.id);
                    copyTodoText(id);
                });
            });
            
            // 绑定编辑按钮事件
            listEl.querySelectorAll('.edit-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = parseInt(e.target.dataset.id);
                    editTodo(id);
                });
            });
        }
        
        // 选中 todo 项（移动端用）
        function selectTodo(element) {
            // 移除其他项的选中状态
            document.querySelectorAll('.todo-item.selected').forEach(item => {
                if (item !== element) {
                    item.classList.remove('selected');
                }
            });
            // 切换当前项的选中状态
            element.classList.toggle('selected');
        }
        
        // 编辑待办
        function editTodo(id) {
            const todo = todos.find(t => t.id === id);
            if (!todo) return;
            
            // 创建自定义编辑对话框
            const overlay = document.createElement('div');
            overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px;';
            
            const dialog = document.createElement('div');
            dialog.style.cssText = 'background: white; border-radius: 16px; padding: 20px; width: 100%; max-width: 500px; max-height: 80vh; overflow-y: auto;';
            
            dialog.innerHTML = '<h3 style="margin: 0 0 15px 0; color: #333;">编辑待办</h3>' +
                '<textarea id="edit-textarea" style="width: 100%; min-height: 120px; padding: 12px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 16px; font-family: inherit; resize: vertical; box-sizing: border-box;" placeholder="输入待办内容...">' + escapeHtml(todo.text) + '</textarea>' +
                '<div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 15px;">' +
                    '<button id="edit-cancel" style="padding: 10px 20px; border: none; background: #e0e0e0; color: #333; border-radius: 8px; cursor: pointer; font-size: 14px;">取消</button>' +
                    '<button id="edit-save" style="padding: 10px 20px; border: none; background: linear-gradient(135deg, #ff6b6b 0%, #feca57 100%); color: white; border-radius: 8px; cursor: pointer; font-size: 14px;">保存</button>' +
                '</div>';
            
            overlay.appendChild(dialog);
            document.body.appendChild(overlay);
            
            const textarea = dialog.querySelector('#edit-textarea');
            textarea.focus();
            textarea.setSelectionRange(textarea.value.length, textarea.value.length);
            
            // 取消按钮
            dialog.querySelector('#edit-cancel').addEventListener('click', () => {
                document.body.removeChild(overlay);
            });
            
            // 保存按钮
            dialog.querySelector('#edit-save').addEventListener('click', () => {
                const newText = textarea.value.trim();
                
                if (!newText) {
                    showToast('待办事项不能为空', 'error');
                    return;
                }
                
                if (newText === todo.text) {
                    document.body.removeChild(overlay);
                    return;
                }
                
                // 发送更新请求
                fetch('/api/todos/' + id, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: newText })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        todo.text = newText;
                        renderTodos();
                        showToast('编辑成功！');
                        document.body.removeChild(overlay);
                    } else {
                        showToast(data.error || '编辑失败', 'error');
                    }
                })
                .catch(e => {
                    showToast('编辑失败: ' + e.message, 'error');
                });
            });
            
            // 点击遮罩关闭
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    document.body.removeChild(overlay);
                }
            });
            
            // ESC 键关闭
            const handleEsc = (e) => {
                if (e.key === 'Escape') {
                    document.body.removeChild(overlay);
                    document.removeEventListener('keydown', handleEsc);
                }
            };
            document.addEventListener('keydown', handleEsc);
        }
        
        // 复制待办内容
        async function copyTodoText(id) {
            const todo = todos.find(t => t.id === id);
            if (!todo) return;
            
            const textToCopy = todo.text;
            
            try {
                await navigator.clipboard.writeText(textToCopy);
                showToast('已复制到剪贴板！');
            } catch (e) {
                // 降级方案
                const textarea = document.createElement('textarea');
                textarea.value = textToCopy;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                showToast('已复制到剪贴板！');
            }
        }
        
        // 更新统计
        function updateStats() {
            const total = todos.length;
            const completed = todos.filter(t => t.done).length;
            const pending = total - completed;
            
            document.getElementById('total-count').textContent = total;
            document.getElementById('pending-count').textContent = pending;
            document.getElementById('completed-count').textContent = completed;
        }
        
        // 添加待办
        // AI 优化待办文本
        async function optimizeTodoText() {
            const input = document.getElementById('todo-input');
            const btn = document.getElementById('ai-optimize-btn');
            const originalText = input.value.trim();
            
            if (!originalText) {
                showToast('请先输入待办事项内容', 'error');
                return;
            }
            
            btn.disabled = true;
            btn.textContent = '优化中...';
            
            try {
                const response = await fetch('/api/ai/optimize', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: originalText })
                });
                
                const data = await response.json();
                
                if (data.success && data.optimized) {
                    // 显示优化前后的对比
                    if (data.optimized !== originalText) {
                        input.value = data.optimized;
                        showToast('AI 已优化！原意："' + originalText.substring(0, 30) + (originalText.length > 30 ? '...' : '') + '"', 'success');
                    } else {
                        showToast('文本已经很清晰了，无需优化', 'success');
                    }
                } else {
                    showToast(data.error || '优化失败', 'error');
                }
            } catch (e) {
                showToast('优化失败: ' + e.message, 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = 'AI 优化';
            }
        }
        
        async function addTodo() {
            const input = document.getElementById('todo-input');
            const btn = document.getElementById('add-btn');
            const text = input.value.trim();
            
            if (!text) {
                showToast('请输入待办事项', 'error');
                return;
            }
            
            btn.disabled = true;
            btn.textContent = '添加中...';
            
            try {
                const response = await fetch('/api/todos', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        text: text,
                        tags: selectedTags
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    input.value = '';
                    selectedTags = [];
                    renderTagSelect();
                    todos.unshift(data.todo);
                    renderTodos();
                    updateStats();
                    showToast('添加成功！');
                } else {
                    showToast(data.error || '添加失败', 'error');
                }
            } catch (e) {
                showToast('添加失败: ' + e.message, 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = '添加';
            }
        }
        
        // 切换完成状态
        async function toggleTodo(id) {
            const todo = todos.find(t => t.id === id);
            if (!todo) return;
            
            try {
                const response = await fetch('/api/todos/' + id, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ done: !todo.done })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    todo.done = !todo.done;
                    renderTodos();
                    updateStats();
                    showToast(todo.done ? '已完成！' : '已取消完成');
                }
            } catch (e) {
                showToast('操作失败: ' + e.message, 'error');
            }
        }
        
        // 删除待办
        async function deleteTodo(id) {
            if (!confirm('确定要删除这个待办事项吗？')) {
                return;
            }
            
            try {
                const response = await fetch('/api/todos/' + id, {
                    method: 'DELETE'
                });
                
                const data = await response.json();
                
                if (data.success) {
                    todos = todos.filter(t => t.id !== id);
                    renderTodos();
                    updateStats();
                    showToast('删除成功！');
                }
            } catch (e) {
                showToast('删除失败: ' + e.message, 'error');
            }
        }
        
        // HTML 转义
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
        
        // 导出待办数据
        async function exportTodos() {
            try {
                showToast('正在准备导出...');
                
                // 获取所有数据
                const response = await fetch('/api/todos/export');
                
                if (!response.ok) {
                    throw new Error('导出失败: ' + response.status);
                }
                
                // 获取文件名
                const disposition = response.headers.get('Content-Disposition');
                let filename = 'todos-export.json';
                if (disposition) {
                    const match = disposition.match(/filename="(.+)"/);
                    if (match) filename = match[1];
                }
                
                // 下载文件
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                
                showToast('导出成功！');
            } catch (e) {
                showToast('导出失败: ' + e.message, 'error');
            }
        }
    </script>
</body>
</html>
  `, { headers: { 'Content-Type': 'text/html;charset=UTF-8' } });
}

// Tags 管理页面
function tagsPage() {
  return new Response(`
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>🏷️ 标签管理</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <script src="https://unpkg.com/vconsole@latest/dist/vconsole.min.js"></script>
    <script>new VConsole();</script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            -webkit-tap-highlight-color: transparent;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #ff6b6b 0%, #feca57 100%);
            min-height: 100vh;
            padding: 0;
            color: #333;
        }
        
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            min-height: 100vh;
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
        }
        
        .header {
            text-align: center;
            padding: 30px 20px;
            background: linear-gradient(135deg, #ff6b6b 0%, #feca57 100%);
            margin: -20px -20px 20px -20px;
            color: white;
            position: sticky;
            top: 0;
            z-index: 100;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        
        .header h1 {
            font-size: 28px;
            margin-bottom: 8px;
            font-weight: 700;
        }
        
        .back-link {
            position: absolute;
            left: 20px;
            top: 50%;
            transform: translateY(-50%);
            color: white;
            text-decoration: none;
            font-size: 16px;
            display: flex;
            align-items: center;
            gap: 5px;
        }
        
        .input-section {
            background: white;
            border-radius: 16px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }
        
        .input-group {
            display: flex;
            gap: 10px;
        }
        
        .tag-input {
            flex: 1;
            padding: 15px 20px;
            border: 2px solid #e0e0e0;
            border-radius: 12px;
            font-size: 16px;
            outline: none;
            transition: all 0.3s;
        }
        
        .tag-input:focus {
            border-color: #ff6b6b;
            box-shadow: 0 0 0 3px rgba(255, 107, 107, 0.1);
        }
        
        .add-btn {
            padding: 15px 25px;
            background: linear-gradient(135deg, #ff6b6b 0%, #feca57 100%);
            color: white;
            border: none;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            white-space: nowrap;
        }
        
        .add-btn:active {
            transform: scale(0.95);
        }
        
        .add-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }
        
        .tags-list {
            background: white;
            border-radius: 16px;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
            min-height: 200px;
        }
        
        .tags-list h2 {
            font-size: 18px;
            margin-bottom: 15px;
            color: #333;
        }
        
        .tag-item {
            display: inline-flex;
            align-items: center;
            padding: 8px 16px;
            background: linear-gradient(135deg, #ff6b6b 0%, #feca57 100%);
            color: white;
            border-radius: 20px;
            margin: 5px;
            font-size: 14px;
            font-weight: 500;
        }
        
        .tag-delete {
            margin-left: 8px;
            cursor: pointer;
            font-size: 18px;
            line-height: 1;
            opacity: 0.8;
            transition: opacity 0.3s;
        }
        
        .tag-delete:hover {
            opacity: 1;
        }
        
        .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: #999;
        }
        
        .empty-state-icon {
            font-size: 64px;
            margin-bottom: 20px;
            opacity: 0.5;
        }
        
        .toast {
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%) translateY(100px);
            background: #333;
            color: white;
            padding: 12px 24px;
            border-radius: 25px;
            font-size: 14px;
            z-index: 1000;
            opacity: 0;
            transition: all 0.3s;
        }
        
        .toast.show {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
        }
        
        .toast.success {
            background: #4ade80;
        }
        
        .toast.error {
            background: #ff6b6b;
        }
        
        @media (max-width: 480px) {
            .container {
                padding: 15px;
            }
            
            .header {
                padding: 20px 15px;
                margin: -15px -15px 15px -15px;
            }
            
            .header h1 {
                font-size: 24px;
            }
            
            .input-group {
                flex-direction: column;
            }
            
            .add-btn {
                width: 100%;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <a href="/todos" class="back-link"><i class="fas fa-arrow-left"></i> 返回</a>
            <h1><i class="fas fa-tags"></i> 标签管理</h1>
        </div>
        
        <div class="input-section">
            <div class="input-group">
                <input type="text" class="tag-input" id="tag-input" placeholder="输入新标签名称..." maxlength="20">
                <button class="add-btn" id="add-btn">添加</button>
            </div>
        </div>
        
        <div class="tags-list" id="tags-list">
            <h2>所有标签</h2>
            <div class="loading" style="text-align: center; padding: 40px;">
                加载中...
            </div>
        </div>
    </div>
    
    <div class="toast" id="toast"></div>
    
    <script>
        let tags = [];
        
        // 先定义所有函数，再添加事件监听
        function showToast(message, type = 'success') {
            const toast = document.getElementById('toast');
            toast.textContent = message;
            toast.className = 'toast ' + type;
            toast.classList.add('show');
            
            setTimeout(() => {
                toast.classList.remove('show');
            }, 2000);
        }
        
        async function loadTags() {
            try {
                const response = await fetch('/api/tags');
                const data = await response.json();
                
                if (data.success) {
                    tags = data.tags || [];
                    renderTags();
                }
            } catch (e) {
                showToast('加载失败: ' + e.message, 'error');
            }
        }
        
        function renderTags() {
            const listEl = document.getElementById('tags-list');
            
            if (tags.length === 0) {
                listEl.innerHTML = '<h2>所有标签</h2><div class="empty-state"><div class="empty-state-icon"><i class="fas fa-tags" style="font-size: 64px; opacity: 0.5;"></i></div><div>暂无标签，添加一个吧！</div></div>';
                return;
            }
            
            let html = '<h2>所有标签</h2>';
            tags.forEach((tag, index) => {
                // 支持新格式 {name, color} 和旧格式 string
                const tagName = typeof tag === 'object' ? tag.name : tag;
                const tagColor = typeof tag === 'object' ? tag.color : null;
                const bgStyle = tagColor ? 'background: ' + tagColor + ';' : 'background: linear-gradient(135deg, #ff6b6b 0%, #feca57 100%);';
                
                html += '<div class="tag-item" data-tag="' + escapeHtml(tagName) + '" style="' + bgStyle + '">' + 
                    escapeHtml(tagName) + 
                    '<span class="tag-delete" data-index="' + index + '"><i class="fas fa-times"></i></span>' +
                    '</div>';
            });
            
            listEl.innerHTML = html;
            
            // 绑定删除按钮点击事件
            listEl.querySelectorAll('.tag-delete').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const tagName = e.target.closest('.tag-item').dataset.tag;
                    deleteTag(tagName);
                });
            });
        }
        
        async function addTag() {
            console.log('addTag called');
            const input = document.getElementById('tag-input');
            const btn = document.getElementById('add-btn');
            const name = input.value.trim();
            
            console.log('Input value:', name);
            
            if (!name) {
                showToast('请输入标签名称', 'error');
                return;
            }
            
            btn.disabled = true;
            btn.textContent = '添加中...';
            
            try {
                console.log('Sending request...');
                const response = await fetch('/api/tags', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: name })
                });
                
                console.log('Response received:', response.status);
                const data = await response.json();
                console.log('Data:', data);
                
                if (data.success) {
                    input.value = '';
                    tags = data.tags;
                    renderTags();
                    showToast('添加成功！');
                } else {
                    showToast(data.error || '添加失败', 'error');
                }
            } catch (e) {
                console.error('Error:', e);
                showToast('添加失败: ' + e.message, 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = '添加';
            }
        }
        
        async function deleteTag(name) {
            if (!confirm('确定要删除标签 "' + name + '" 吗？')) {
                return;
            }
            
            try {
                const response = await fetch('/api/tags/' + encodeURIComponent(name), {
                    method: 'DELETE'
                });
                
                const data = await response.json();
                
                if (data.success) {
                    tags = data.tags;
                    renderTags();
                    showToast('删除成功！');
                }
            } catch (e) {
                showToast('删除失败: ' + e.message, 'error');
            }
        }
        
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
        
        // 页面加载完成后执行
        document.addEventListener('DOMContentLoaded', () => {
            loadTags();
            
            // 绑定添加按钮点击事件
            document.getElementById('add-btn').addEventListener('click', addTag);
            
            document.getElementById('tag-input').addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    addTag();
                }
            });
        });
    </script>
</body>
</html>
  `, { headers: { 'Content-Type': 'text/html;charset=UTF-8' } });
}

// TodoList REST API
async function apiTodos(request, env) {
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
        tags: todo.tags ? JSON.parse(todo.tags) : []
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
      
      if (!text) {
        return jsonResponse({ success: false, error: '待办事项不能为空' }, 400);
      }
      
      // 获取当前用户信息
      const userId = currentUser ? currentUser.id : null;
      const userLogin = currentUser ? currentUser.login : null;
      
      // 插入数据 - 包含 user_id 和 user_login
      await env.DB.prepare('INSERT INTO todos (text, tags, user_id, user_login) VALUES (?, ?, ?, ?)')
        .bind(text, JSON.stringify(tags), userId, userLogin)
        .run();
      
      // 获取刚插入的数据
      const result = await env.DB.prepare('SELECT * FROM todos ORDER BY id DESC LIMIT 1').all();
      const todo = result.results?.[0];
      if (todo) {
        todo.tags = todo.tags ? JSON.parse(todo.tags) : [];
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
      
      const result = await env.DB.prepare('SELECT * FROM todos WHERE id = ?').bind(id).all();
      const todo = result.results?.[0];
      
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

// Tags API - 使用 KV 存储标签（带颜色）
async function apiTags(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  const KV_KEY = 'tags_list_v2'; // 使用新 key 避免兼容问题
  
  // 预定义的颜色列表
  const TAG_COLORS = [
    '#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff',
    '#5f27cd', '#00d2d3', '#1dd1a1', '#ff9f43', '#ee5a24',
    '#009432', '#0652dd', '#9980fa', '#f368e0', '#ff4757'
  ];
  
  // 为标签分配颜色的函数
  function assignColor(existingTags) {
    const usedColors = existingTags.map(t => t.color).filter(Boolean);
    const availableColors = TAG_COLORS.filter(c => !usedColors.includes(c));
    if (availableColors.length > 0) {
      return availableColors[0];
    }
    // 如果所有颜色都用过了，随机返回一个
    return TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)];
  }
  
  try {
    // GET /api/tags - 获取所有标签
    if (method === 'GET' && path === '/api/tags') {
      const tagsJson = await env.CACHE.get(KV_KEY);
      const tags = tagsJson ? JSON.parse(tagsJson) : [];
      return jsonResponse({ success: true, tags });
    }
    
    // POST /api/tags - 创建标签
    if (method === 'POST' && path === '/api/tags') {
      const body = await request.json();
      const tagName = body.name?.trim();
      const tagColor = body.color?.trim();
      
      if (!tagName) {
        return jsonResponse({ success: false, error: '标签名称不能为空' }, 400);
      }
      
      // 获取现有标签
      const tagsJson = await env.CACHE.get(KV_KEY);
      let tags = tagsJson ? JSON.parse(tagsJson) : [];
      
      // 检查是否已存在
      if (tags.some(t => t.name === tagName)) {
        return jsonResponse({ success: false, error: '标签已存在' }, 400);
      }
      
      // 添加新标签（带颜色）
      const newTag = {
        name: tagName,
        color: tagColor || assignColor(tags)
      };
      tags.push(newTag);
      await env.CACHE.put(KV_KEY, JSON.stringify(tags));
      
      return jsonResponse({ success: true, tag: newTag, tags });
    }
    
    // PUT /api/tags/:name - 更新标签颜色
    if (method === 'PUT' && path.match(/^\/api\/tags\/.+$/)) {
      const tagName = decodeURIComponent(path.split('/').pop());
      const body = await request.json();
      const newColor = body.color?.trim();
      
      if (!newColor) {
        return jsonResponse({ success: false, error: '颜色不能为空' }, 400);
      }
      
      const tagsJson = await env.CACHE.get(KV_KEY);
      let tags = tagsJson ? JSON.parse(tagsJson) : [];
      
      const tagIndex = tags.findIndex(t => t.name === tagName);
      if (tagIndex === -1) {
        return jsonResponse({ success: false, error: '标签不存在' }, 404);
      }
      
      tags[tagIndex].color = newColor;
      await env.CACHE.put(KV_KEY, JSON.stringify(tags));
      
      return jsonResponse({ success: true, tag: tags[tagIndex], tags });
    }
    
    // DELETE /api/tags/:name - 删除标签
    if (method === 'DELETE' && path.match(/^\/api\/tags\/.+$/)) {
      const tagName = decodeURIComponent(path.split('/').pop());
      
      const tagsJson = await env.CACHE.get(KV_KEY);
      let tags = tagsJson ? JSON.parse(tagsJson) : [];
      
      tags = tags.filter(t => t.name !== tagName);
      await env.CACHE.put(KV_KEY, JSON.stringify(tags));
      
      return jsonResponse({ success: true, tags });
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
