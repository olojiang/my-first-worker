import { getSession } from '../auth/session.js'

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
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <link rel="icon" type="image/svg+xml" href="/favicon.svg">
    <title>纪 Todo - 首页</title>
    <link rel="stylesheet" href="/fonts/fa-all.min.css">
    <!-- Eruda v3.4.3 -->
    <script src="/eruda-polyfill.js"></script>
    <script src="/eruda.js"></script>
    <script>
      eruda.init({ plugins: ['monitor', 'timing', 'code', 'vue'] })
      console.log('Eruda v3.4.3 已初始化！')
    </script>
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
        <h1>☁️ 纪 Todo</h1>
        <p>体验 Workers、KV、D1、R2、AI 等强大功能</p>
        <div style="position: absolute; right: 20px; top: 30%; transform: translateY(-50%);">
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
                resultBox.textContent = '问题: ' + data.prompt + '\n\n回答: ' + data.response;
            } catch (e) {
                resultBox.textContent = '错误: ' + e.message;
            }
        }
    </script>
</body>
</html>
  `, { headers: { 'Content-Type': 'text/html;charset=UTF-8' } });
}
