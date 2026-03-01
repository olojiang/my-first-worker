import { getSession } from '../auth/session.js';

// 版本号 - 每次部署时更新
const VERSION = 'v## 当前版本.## 当前版本.';

export async function todoPage(request, env) {
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
    <div style="display: flex; align-items: center; justify-content: center; gap: 10px; margin-top: 10px; flex-wrap: wrap;">
      <div style="display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.25); padding: 6px 12px; border-radius: 20px;">
        <img src="${user.avatar_url}" alt="avatar" style="width: 28px; height: 28px; border-radius: 50%; border: 2px solid white;">
        <span style="font-size: 14px; font-weight: 500;">${user.name || user.login}</span>
        <a href="/auth/logout" style="color: #fff; text-decoration: none; font-size: 12px; margin-left: 8px; opacity: 0.9;">退出</a>
      </div>
      <mdui-button onclick="exportTodos()" variant="text" style="color: white; --mdui-comp-text-button-container-height: 40px;">
        <mdui-icon name="download"></mdui-icon> 导出数据
      </mdui-button>
    </div>
  ` : `
    <div style="display: flex; align-items: center; justify-content: center; gap: 10px; margin-top: 10px; flex-wrap: wrap;">
      <a href="/auth/login" style="display: inline-flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.25); color: white; padding: 8px 16px; border-radius: 20px; text-decoration: none; font-weight: 500; font-size: 14px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
        GitHub 登录
      </a>
      <mdui-button onclick="exportTodos()" variant="text" style="color: white; --mdui-comp-text-button-container-height: 40px;">
        <mdui-icon name="download"></mdui-icon> 导出数据
      </mdui-button>
    </div>
  `;
  return new Response(`
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <title>📋 TodoList</title>
    <link rel="stylesheet" href="/fonts/fa-all.min.css">
    <link rel="stylesheet" href="/fonts/mdui@2.css">
    <link rel="stylesheet" href="/fonts/material-icons.css">
    <script src="/fonts/mdui.global.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            -webkit-tap-highlight-color: transparent;
            touch-action: pan-x pan-y;
        }
        
        html, body {
            touch-action: pan-x pan-y;
            overscroll-behavior: none;
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
            background: linear-gradient(135deg, #4d4d4d 0%, #4c4e50 100%);
            margin: -20px -20px 20px -20px;
            color: white;
            position: sticky;
            top: 0;
            z-index: 100;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        
        .version-badge {
            position: absolute;
            top: 10px;
            right: 10px;
            font-size: 11px;
            color: rgba(255,255,255,0.6);
            font-weight: 400;
            letter-spacing: 0.5px;
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
        
        .todo-item:hover .todo-actions {
            display: flex;
            opacity: 1;
        }
        
        @media (max-width: 480px) {
            .todo-item:hover .todo-actions {
                display: none;
                opacity: 0;
            }
            
            .todo-item.selected .todo-actions {
                display: flex;
                opacity: 1;
            }
            
            .todo-item {
                min-height: auto;
                height: auto;
            }
            
            .todo-att-item:hover {
                background: #f0f0f0 !important;
            }
            
            .todo-actions {
                float: none;
                display: none;
                justify-content: center;
                margin-left: 0;
                margin-top: 6px;
                margin-bottom: 6px;
                opacity: 0;
                max-width: 99%;
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
            <span class="version-badge">${VERSION}</span>
            <h1><i class="fas fa-clipboard-list"></i> TodoList</h1>
            <p>记录你的待办事项</p>
            ${userSection}
            <a href="/tags" style="position: absolute; right: 20px; top: 30%; transform: translateY(-50%); color: white; text-decoration: none; font-size: 14px; background: rgba(255,255,255,0.2); padding: 8px 16px; border-radius: 20px;"><i class="fas fa-tags"></i> 标签管理</a>
            <mdui-button-icon onclick="showResourceInfo()" icon="info" style="position: absolute; left: 20px; top: 30%; transform: translateY(-50%); color: white; background: rgba(255,255,255,0.2);"></mdui-button-icon>
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
            <div class="stat-item">
                <div class="stat-value" id="shared-count" style="color: #f59e0b;">0</div>
                <div class="stat-label">共享给我</div>
            </div>
        </div>
        
        <div class="filter-section" style="background: white; border-radius: 16px; padding: 15px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); transition: all 0.3s ease;">
            <!-- 顶部按钮行：筛选 | 多选 -->
            <div style="display: flex; gap: 10px; align-items: center; justify-content: space-between; flex-wrap: wrap;">
                <mdui-button id="toggle-filter-panel" variant="tonal" icon="filter_list">筛选</mdui-button>
                
                <div style="display: flex; gap: 10px; align-items: center;">
                    <mdui-button id="toggle-multi-select" variant="tonal" icon="check_box">多选</mdui-button>
                    <mdui-button id="batch-complete" variant="filled" icon="check" style="display: none; transition: all 0.3s ease;">完成</mdui-button>
                    <mdui-button id="batch-delete" variant="filled" icon="delete" style="display: none; transition: all 0.3s ease;">删除</mdui-button>
                    <span id="selected-count" style="font-size: 14px; color: #666; display: none; transition: all 0.3s ease;">已选 0 项</span>
                </div>
            </div>
            
            <!-- 筛选面板（默认隐藏） -->
            <div id="filter-panel" style="max-height: 0; overflow: hidden; opacity: 0; transition: max-height 0.3s ease, opacity 0.3s ease, margin-top 0.3s ease, padding-top 0.3s ease;">
                <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #f0f0f0;">
                    <!-- 搜索 -->
                    <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 12px;">
                        <mdui-text-field id="search-input" placeholder="搜索待办内容..." style="flex: 1;" oninput="toggleClearButton()"></mdui-text-field>
                        <mdui-button id="clear-btn" onclick="clearFilters()" variant="outlined" icon="close" style="display: none;">清除</mdui-button>
                    </div>
                    
                    <!-- 标签筛选 -->
                    <div id="filter-tags" style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 12px;">
                        <span style="font-size: 14px; color: #666;">筛选标签:</span>
                        <span style="font-size: 12px; color: #999;">加载中...</span>
                    </div>
                    
                    <!-- 状态筛选 -->
                    <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                        <span style="font-size: 14px; color: #666;">筛选:</span>
                        <mdui-button id="filter-all" class="filter-btn active" variant="filled" style="--mdui-comp-filled-button-container-height: 32px; font-size: 12px; padding: 0 12px;">全部</mdui-button>
                        <mdui-button id="filter-pending" class="filter-btn" variant="tonal" style="--mdui-comp-tonal-button-container-height: 32px; font-size: 12px; padding: 0 12px;">未完成</mdui-button>
                        <mdui-button id="filter-shared" class="filter-btn" variant="tonal" style="--mdui-comp-tonal-button-container-height: 32px; font-size: 12px; padding: 0 12px;">共享给我</mdui-button>
                        <mdui-button id="filter-completed" class="filter-btn" variant="tonal" style="--mdui-comp-tonal-button-container-height: 32px; font-size: 12px; padding: 0 12px;">已完成</mdui-button>
                    </div>
                    <p style="font-size: 12px; color: #999; margin-top: 10px; margin-bottom: 0;">默认显示：未完成任务 + 今天已完成的任务</p>
                </div>
            </div>
        </div>
        
        <div class="input-section">
            <div class="input-group" style="flex-direction: column;">
                <textarea class="todo-input" id="todo-input" placeholder="添加新的待办事项..." maxlength="500" style="min-height: 80px; resize: vertical; font-family: inherit;"></textarea>
                <div style="display: flex; gap: 10px; margin-top: 10px;">
                    <mdui-button id="add-btn" variant="filled" style="flex: 1;">添加</mdui-button>
                    <mdui-button id="ai-optimize-btn" variant="tonal" icon="auto_fix_normal" style="flex: 1;">AI 优化</mdui-button>
                </div>
            </div>
            <div class="tags-select" id="tags-select" style="margin-top: 15px; display: flex; flex-wrap: wrap; gap: 8px;">
                <span style="font-size: 14px; color: #666; margin-right: 8px;">选择标签:</span>
                <span style="font-size: 12px; color: #999;">加载中...</span>
            </div>
            <div class="attachments-section" id="attachments-section" style="margin-top: 15px; display: none;">
                <div style="font-size: 14px; color: #666; margin-bottom: 8px;"><i class="fas fa-paperclip"></i> 附件 (<span id="attachment-count">0</span>):</div>
                <div id="attachment-list" style="display: flex; flex-wrap: wrap; gap: 8px;"></div>
            </div>
            <div style="margin-top: 15px; display: flex; gap: 10px; align-items: center;">
                <input type="file" id="file-input" style="display: none;" multiple accept="image/*,.txt,.json,.md,.csv,.js,.html,.css">
                <mdui-button onclick="document.getElementById('file-input').click()" variant="outlined" icon="upload">添加附件</mdui-button>
                <span style="font-size: 12px; color: #999;">支持图片、文本文件 (最大 5MB)</span>
            </div>
            <div style="margin-top: 15px; display: flex; gap: 10px; align-items: center;">
                <mdui-text-field id="share-input" placeholder="输入GitHub用户名共享（可选）" style="flex: 1;"></mdui-text-field>
                <mdui-button id="add-share-btn" variant="tonal" icon="person_add" style="flex-shrink: 0;">添加共享</mdui-button>
            </div>
            <div id="share-list" style="margin-top: 10px; display: flex; flex-wrap: wrap; gap: 8px;"></div>
        </div>
        
        <div class="todo-list" id="todo-list">
            <div class="loading">
                <div class="loading-spinner"></div>
                <p style="margin-top: 15px;">加载中...</p>
            </div>
        </div>
    </div>
    
    <div class="toast" id="toast"></div>
    
    <!-- 刷新按钮 -->
    <button id="refresh-btn" onclick="location.reload()" style="position: fixed; bottom: 20px; right: 20px; width: 50px; height: 50px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; box-shadow: 0 4px 12px rgba(0,0,0,0.3); cursor: pointer; z-index: 999; display: flex; align-items: center; justify-content: center; font-size: 20px; transition: transform 0.3s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
        <i class="fas fa-sync-alt"></i>
    </button>
    
    <script>
        let todos = [];
        let selectedTags = [];
        let allTags = [];
        let filterTags = []; // 筛选用的标签
        let searchKeyword = ''; // 搜索关键词
        let selectedTodos = []; // 多选选中的 todo ID 列表
        let isMultiSelectMode = false; // 是否处于多选模式
        let currentAttachments = []; // 当前待添加的附件列表
        let shareWithUsers = []; // 待共享的用户列表
        
        // 从 localStorage 加载共享用户列表
        function loadShareUsersFromStorage() {
            try {
                const saved = localStorage.getItem('todo_share_users');
                if (saved) {
                    shareWithUsers = JSON.parse(saved);
                    console.log('[共享用户] 从 localStorage 加载:', shareWithUsers);
                }
            } catch (e) {
                console.error('[共享用户] 加载失败:', e);
                shareWithUsers = [];
            }
        }
        
        // 保存共享用户列表到 localStorage
        function saveShareUsersToStorage() {
            try {
                localStorage.setItem('todo_share_users', JSON.stringify(shareWithUsers));
                console.log('[共享用户] 保存到 localStorage:', shareWithUsers);
            } catch (e) {
                console.error('[共享用户] 保存失败:', e);
            }
        }
        
        // 渲染共享用户列表
        function renderShareList() {
            const shareListEl = document.getElementById('share-list');
            if (!shareListEl) return;
            
            if (shareWithUsers.length === 0) {
                shareListEl.innerHTML = '';
                return;
            }
            
            shareListEl.innerHTML = shareWithUsers.map((user, index) =>
                '<span style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; background: #e3f2fd; border-radius: 16px; font-size: 13px; color: #1976d2;">'
                    + '<i class="fas fa-user" style="font-size: 11px;"></i>'
                    + escapeHtml(user)
                    + '<i class="fas fa-times" style="cursor: pointer; margin-left: 4px;" onclick="removeShareUser(' + index + ')"></i>'
                + '</span>'
            ).join('');
        }
        
        // 添加共享用户
        function addShareUser() {
            const input = document.getElementById('share-input');
            const username = input?.value?.trim();
            
            if (!username) {
                showToast('请输入GitHub用户名', 'error');
                return;
            }
            
            if (shareWithUsers.includes(username)) {
                showToast('该用户已添加', 'error');
                return;
            }
            
            shareWithUsers.push(username);
            saveShareUsersToStorage(); // 保存到 localStorage
            input.value = '';
            renderShareList();
        }
        
        // 移除共享用户
        window.removeShareUser = function(index) {
            shareWithUsers.splice(index, 1);
            saveShareUsersToStorage(); // 保存到 localStorage
            renderShareList();
        }
        
        // 清空共享用户列表
        function clearShareUsers() {
            shareWithUsers = [];
            saveShareUsersToStorage(); // 保存到 localStorage
            renderShareList();
        }
        
        // 页面加载时获取数据
        document.addEventListener('DOMContentLoaded', () => {
            console.log('[初始化] DOMContentLoaded 事件触发');
            console.log('[初始化] 当前时间:', new Date().toISOString());
            
            // 从 localStorage 加载共享用户列表
            loadShareUsersFromStorage();
            renderShareList();
            
            // 检查关键元素是否存在
            const todoListEl = document.getElementById('todo-list');
            const tagsSelectEl = document.getElementById('tags-select');
            const filterTagsEl = document.getElementById('filter-tags');
            
            console.log('[初始化] todo-list 元素:', todoListEl ? '存在' : '不存在');
            console.log('[初始化] tags-select 元素:', tagsSelectEl ? '存在' : '不存在');
            console.log('[初始化] filter-tags 元素:', filterTagsEl ? '存在' : '不存在');
            
            console.log('[初始化] 开始加载数据...');
            
            // 设置加载超时检查
            setTimeout(() => {
                console.log('[初始化] 5秒检查 - todos 长度:', todos.length);
                console.log('[初始化] 5秒检查 - allTags 长度:', allTags.length);
                if (todos.length === 0) {
                    console.warn('[初始化] 警告: 5秒后仍未加载到 todos');
                }
            }, 5000);
            
            try {
                console.log('[初始化] 调用 loadTodos()');
                loadTodos();
            } catch (e) {
                console.error('[初始化] loadTodos() 出错:', e);
            }
            
            try {
                console.log('[初始化] 调用 loadTags()');
                loadTags();
            } catch (e) {
                console.error('[初始化] loadTags() 出错:', e);
            }
            
            // 绑定添加按钮点击事件
            try {
                const addBtn = document.getElementById('add-btn');
                if (addBtn) {
                    addBtn.addEventListener('click', addTodo);
                    console.log('[初始化] 添加按钮事件绑定成功');
                } else {
                    console.error('[初始化] 添加按钮不存在');
                }
            } catch (e) {
                console.error('[初始化] 绑定添加按钮出错:', e);
            }
            
            // 绑定 AI 优化按钮
            try {
                const aiBtn = document.getElementById('ai-optimize-btn');
                if (aiBtn) {
                    aiBtn.addEventListener('click', optimizeTodoText);
                    console.log('[初始化] AI优化按钮事件绑定成功');
                } else {
                    console.error('[初始化] AI优化按钮不存在');
                }
            } catch (e) {
                console.error('[初始化] 绑定AI优化按钮出错:', e);
            }
            
            // 绑定添加共享按钮
            try {
                const addShareBtn = document.getElementById('add-share-btn');
                if (addShareBtn) {
                    addShareBtn.addEventListener('click', addShareUser);
                    console.log('[初始化] 添加共享按钮事件绑定成功');
                }
            } catch (e) {
                console.error('[初始化] 绑定添加共享按钮出错:', e);
            }
            
            // 共享输入框回车添加
            try {
                const shareInput = document.getElementById('share-input');
                if (shareInput) {
                    shareInput.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            addShareUser();
                        }
                    });
                    console.log('[初始化] 共享输入框事件绑定成功');
                }
            } catch (e) {
                console.error('[初始化] 绑定共享输入框出错:', e);
            }
            
            // Ctrl+Enter 添加
            try {
                const todoInput = document.getElementById('todo-input');
                if (todoInput) {
                    todoInput.addEventListener('keydown', (e) => {
                        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                            addTodo();
                        }
                    });
                    console.log('[初始化] 输入框键盘事件绑定成功');
                } else {
                    console.error('[初始化] 输入框不存在');
                }
            } catch (e) {
                console.error('[初始化] 绑定输入框事件出错:', e);
            }
            
            // 绑定搜索输入
            try {
                const searchInput = document.getElementById('search-input');
                if (searchInput) {
                    searchInput.addEventListener('input', (e) => {
                        searchKeyword = e.target.value.trim();
                        renderTodos();
                    });
                    console.log('[初始化] 搜索输入事件绑定成功');
                } else {
                    console.error('[初始化] 搜索输入框不存在');
                }
            } catch (e) {
                console.error('[初始化] 绑定搜索输入出错:', e);
            }
            
            // 绑定筛选按钮
            try {
                ['filter-all', 'filter-pending', 'filter-shared', 'filter-completed'].forEach(id => {
                    const btn = document.getElementById(id);
                    if (btn) {
                        const filterType = id.replace('filter-', '');
                        btn.addEventListener('click', () => setFilter(filterType));
                        console.log('[初始化] 筛选按钮 ' + id + ' 绑定成功');
                    } else {
                        console.error('[初始化] 筛选按钮 ' + id + ' 不存在');
                    }
                });
            } catch (e) {
                console.error('[初始化] 绑定筛选按钮出错:', e);
            }
            
            // 绑定筛选面板按钮
            try {
                const toggleFilterBtn = document.getElementById('toggle-filter-panel');
                if (toggleFilterBtn) {
                    toggleFilterBtn.addEventListener('click', toggleFilterPanel);
                    console.log('[初始化] 筛选面板按钮绑定成功');
                }
            } catch (e) {
                console.error('[初始化] 绑定筛选面板按钮出错:', e);
            }
            
            // 绑定多选按钮
            try {
                const toggleMultiBtn = document.getElementById('toggle-multi-select');
                const batchCompleteBtn = document.getElementById('batch-complete');
                const batchDeleteBtn = document.getElementById('batch-delete');
                const batchCancelBtn = document.getElementById('batch-cancel');
                
                if (toggleMultiBtn) {
                    toggleMultiBtn.addEventListener('click', toggleMultiSelectMode);
                    console.log('[初始化] 多选按钮绑定成功');
                }
                if (batchCompleteBtn) {
                    batchCompleteBtn.addEventListener('click', batchComplete);
                    console.log('[初始化] 批量完成按钮绑定成功');
                }
                if (batchDeleteBtn) {
                    batchDeleteBtn.addEventListener('click', batchDelete);
                    console.log('[初始化] 批量删除按钮绑定成功');
                }
                if (batchCancelBtn) {
                    batchCancelBtn.addEventListener('click', exitMultiSelectMode);
                    console.log('[初始化] 批量取消按钮绑定成功');
                }
            } catch (e) {
                console.error('[初始化] 绑定多选按钮出错:', e);
            }
            
            // 绑定文件上传
            try {
                const fileInput = document.getElementById('file-input');
                if (fileInput) {
                    fileInput.addEventListener('change', handleFileSelect);
                    console.log('[初始化] 文件上传事件绑定成功');
                } else {
                    console.error('[初始化] 文件输入框不存在');
                }
            } catch (e) {
                console.error('[初始化] 绑定文件上传出错:', e);
            }
            
            console.log('[初始化] DOMContentLoaded 处理完成');
        });
        
        // 切换多选模式
        function toggleMultiSelectMode() {
            isMultiSelectMode = !isMultiSelectMode;
            selectedTodos = [];
            updateBatchButtons();
            renderTodos();
            console.log('[多选] 模式切换:', isMultiSelectMode ? '开启' : '关闭');
        }
        
        // 退出多选模式
        function exitMultiSelectMode() {
            isMultiSelectMode = false;
            selectedTodos = [];
            updateBatchButtons();
            renderTodos();
            console.log('[多选] 退出多选模式');
        }
        
        // 切换筛选面板显示
        function toggleFilterPanel() {
            const panel = document.getElementById('filter-panel');
            const btn = document.getElementById('toggle-filter-panel');
            if (panel) {
                if (panel.style.maxHeight === '0px' || !panel.style.maxHeight) {
                    panel.style.maxHeight = '500px';
                    panel.style.opacity = '1';
                    panel.style.marginTop = '12px';
                    btn.setAttribute('variant', 'filled');
                } else {
                    panel.style.maxHeight = '0px';
                    panel.style.opacity = '0';
                    panel.style.marginTop = '0px';
                    btn.setAttribute('variant', 'tonal');
                }
            }
        }
        
        // 更新批量操作按钮显示
        function updateBatchButtons() {
            const toggleBtn = document.getElementById('toggle-multi-select');
            const completeBtn = document.getElementById('batch-complete');
            const deleteBtn = document.getElementById('batch-delete');
            const countSpan = document.getElementById('selected-count');
            
            if (isMultiSelectMode) {
                // 多选模式：多选按钮变紫色，显示完成/删除/计数
                toggleBtn.setAttribute('variant', 'filled');
                completeBtn.style.display = 'inline-block';
                deleteBtn.style.display = 'inline-block';
                countSpan.style.display = 'inline';
                countSpan.textContent = '已选 ' + selectedTodos.length + ' 项';
            } else {
                // 普通模式：多选按钮恢复，隐藏完成/删除/计数
                toggleBtn.setAttribute('variant', 'tonal');
                completeBtn.style.display = 'none';
                deleteBtn.style.display = 'none';
                countSpan.style.display = 'none';
            }
        }
        
        // 切换 todo 选中状态
        function toggleTodoSelection(todoId) {
            if (selectedTodos.includes(todoId)) {
                selectedTodos = selectedTodos.filter(id => id !== todoId);
            } else {
                selectedTodos.push(todoId);
            }
            updateBatchButtons();
            renderTodos();
            console.log('[多选] 选中项:', selectedTodos);
        }
        
        // 批量完成
        async function batchComplete() {
            if (selectedTodos.length === 0) {
                showToast('请先选择待办事项', 'error');
                return;
            }
            
            showToast('正在批量完成...');
            let successCount = 0;
            
            for (const todoId of selectedTodos) {
                try {
                    const response = await fetch('/api/todos/' + todoId, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ done: true })
                    });
                    const data = await response.json();
                    if (data.success) {
                        successCount++;
                        const todo = todos.find(t => t.id === todoId);
                        if (todo) todo.done = true;
                    }
                } catch (e) {
                    console.error('[批量完成] 失败:', todoId, e);
                }
            }
            
            renderTodos();
            updateStats();
            showToast('已完成 ' + successCount + ' 项');
            exitMultiSelectMode();
        }
        
        // 批量删除
        async function batchDelete() {
            if (selectedTodos.length === 0) {
                showToast('请先选择待办事项', 'error');
                return;
            }
            
            if (!confirm('确定要删除选中的 ' + selectedTodos.length + ' 个待办事项吗？')) {
                return;
            }
            
            showToast('正在批量删除...');
            let successCount = 0;
            
            for (const todoId of selectedTodos) {
                try {
                    const response = await fetch('/api/todos/' + todoId, {
                        method: 'DELETE'
                    });
                    const data = await response.json();
                    if (data.success) {
                        successCount++;
                        todos = todos.filter(t => t.id !== todoId);
                    }
                } catch (e) {
                    console.error('[batchDelete] failed:', todoId, e);
                }
            }
            
            renderTodos();
            updateStats();
            showToast('已删除 ' + successCount + ' 项');
            exitMultiSelectMode();
        }
        
        // 显示资源信息
        async function showResourceInfo() {
            console.log('[ResourceInfo] fetching...');
            
            try {
                const response = await fetch('/api/resources');
                const data = await response.json();
                console.log('[ResourceInfo] data:', data);
                
                if (data.success) {
                    // 创建信息弹窗
                    const overlay = document.createElement('div');
                    overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; opacity: 0; transition: opacity 0.3s ease;';
                    
                    const dialog = document.createElement('div');
                    // 初始状态：整体缩小并偏移
                    dialog.style.cssText = 'background: white; border-radius: 16px; padding: 20px; width: 100%; max-width: 400px; text-align: center; transform: scale(0.5) translate(-20%, -20%); opacity: 0; transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);';
                    dialog.innerHTML = 
                        '<h3 style="margin: 0 0 20px 0; color: #333;">Cloudflare Resources</h3>' +
                        '<div style="display: flex; flex-direction: column; gap: 15px; margin-bottom: 20px;">' +
                            '<div style="background: #f8f9fa; padding: 15px; border-radius: 12px;">' +
                                '<div style="font-size: 24px; font-weight: bold; color: #ff6b6b;">' + data.kv.count + ' / ' + data.kv.limit + '</div>' +
                                '<div style="font-size: 14px; color: #666;">KV Items</div>' +
                                '<div style="font-size: 11px; color: #999; margin-top: 4px;">Free: ' + data.kv.limit + ' keys</div>' +
                                '<div style="font-size: 11px; color: ' + (data.kv.percent > 80 ? '#ff6b6b' : '#4ade80') + '; margin-top: 2px;">' + data.kv.percent + '% used</div>' +
                            '</div>' +
                            '<div style="background: #f8f9fa; padding: 15px; border-radius: 12px;">' +
                                '<div style="font-size: 24px; font-weight: bold; color: #4ade80;">' + data.db.count + ' / ' + data.db.limit + '</div>' +
                                '<div style="font-size: 14px; color: #666;">DB Records</div>' +
                                '<div style="font-size: 11px; color: #999; margin-top: 4px;">Free: ' + data.db.limit + ' rows, 500MB</div>' +
                                '<div style="font-size: 11px; color: ' + (data.db.percent > 80 ? '#ff6b6b' : '#4ade80') + '; margin-top: 2px;">' + data.db.percent + '% used</div>' +
                            '</div>' +
                            '<div style="background: #f8f9fa; padding: 15px; border-radius: 12px;">' +
                                '<div style="font-size: 24px; font-weight: bold; color: #54a0ff;">' + data.r2.count + '</div>' +
                                '<div style="font-size: 14px; color: #666;">R2 Objects</div>' +
                                '<div style="font-size: 11px; color: #999; margin-top: 4px;">Free: 10GB storage, 10M req/month</div>' +
                            '</div>' +
                        '</div>' +
                        '<div style="background: #fff3cd; padding: 12px; border-radius: 8px; margin-bottom: 20px; font-size: 12px; color: #856404; text-align: left;">' +
                            '<strong>Free Tier Limits:</strong><br>' +
                            '• KV: ' + data.kv.limit + ' keys, 1GB storage<br>' +
                            '• D1: ' + data.db.limit + ' rows, 500MB storage<br>' +
                            '• R2: 10GB storage, 10M requests/month<br>' +
                            '• Workers: 100k requests/day' +
                        '</div>' +
                        '<mdui-button onclick="closeResourceDialog(this)" variant="filled" style="width: 100%;">Close</mdui-button>';
                    
                    overlay.appendChild(dialog);
                    document.body.appendChild(overlay);
                    
                    // 触发动画 - 从小放大到正常
                    requestAnimationFrame(() => {
                        overlay.style.opacity = '1';
                        dialog.style.transform = 'scale(1) translate(0, 0)';
                        dialog.style.opacity = '1';
                    });
                    
                    // 关闭函数
                    window.closeResourceDialog = function(btn) {
                        // 找到按钮所在的 dialog，然后找到 overlay
                        let el = btn;
                        while (el && el.parentElement) {
                            if (el.style.position === 'fixed') {
                                break;
                            }
                            el = el.parentElement;
                        }
                        const overlay = el;
                        const dialog = overlay.querySelector('div');
                        
                        // 反向动画 - 缩小并偏移
                        overlay.style.opacity = '0';
                        dialog.style.transform = 'scale(0.5) translate(-20%, -20%)';
                        dialog.style.opacity = '0';
                        
                        setTimeout(() => {
                            if (overlay.parentNode === document.body) {
                                document.body.removeChild(overlay);
                            }
                            delete window.closeResourceDialog;
                        }, 400);
                    };
                    
                    // 点击遮罩关闭
                    overlay.addEventListener('click', (e) => {
                        if (e.target === overlay) {
                            // 反向动画
                            overlay.style.opacity = '0';
                            dialog.style.transform = 'scale(0.5) translate(-20%, -20%)';
                            dialog.style.opacity = '0';
                            setTimeout(() => {
                                document.body.removeChild(overlay);
                                delete window.closeResourceDialog;
                            }, 400);
                        }
                    });
                } else {
                    showToast('Failed to get resource info', 'error');
                }
            } catch (e) {
                console.error('[ResourceInfo] error:', e);
                showToast('Failed to get resource info: ' + e.message, 'error');
            }
        }
        
        // 处理文件选择
        async function handleFileSelect(e) {
            const files = e.target.files;
            if (!files || files.length === 0) return;
            
            const MAX_SIZE = 5 * 1024 * 1024; // 5MB
            
            for (const file of files) {
                if (file.size > MAX_SIZE) {
                    showToast('File too large: ' + file.name + ' (max 5MB)', 'error');
                    continue;
                }
                
                // 添加到当前附件列表（先显示上传中）
                const tempId = 'temp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                const attachment = {
                    id: tempId,
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    uploading: true,
                    file: file
                };
                currentAttachments.push(attachment);
                renderAttachments();
                
                // 上传到服务器
                try {
                    const formData = new FormData();
                    formData.append('file', file);
                    
                    showToast('Uploading ' + file.name + '...');
                    const response = await fetch('/api/upload', {
                        method: 'POST',
                        body: formData
                    });
                    
                    const data = await response.json();
                    if (data.success) {
                        // 更新附件信息
                        attachment.uploading = false;
                        attachment.key = data.attachment.key;
                        attachment.url = data.attachment.url;
                        showToast('Uploaded: ' + file.name);
                    } else {
                        showToast('Upload failed: ' + file.name, 'error');
                        currentAttachments = currentAttachments.filter(a => a.id !== tempId);
                    }
                } catch (err) {
                    console.error('Upload error:', err);
                    showToast('Upload error: ' + file.name, 'error');
                    currentAttachments = currentAttachments.filter(a => a.id !== tempId);
                }
                
                renderAttachments();
            }
            
            // 清空 input 以便重复选择相同文件
            e.target.value = '';
        }
        
        // 渲染附件列表
        function renderAttachments() {
            const container = document.getElementById('attachment-list');
            const section = document.getElementById('attachments-section');
            const countSpan = document.getElementById('attachment-count');
            
            if (!container) return;
            
            countSpan.textContent = currentAttachments.length;
            
            if (currentAttachments.length === 0) {
                section.style.display = 'none';
                container.innerHTML = '';
                return;
            }
            
            section.style.display = 'block';
            
            let html = '';
            currentAttachments.forEach(att => {
                const isImage = att.type && att.type.startsWith('image/');
                const icon = isImage ? 'fa-image' : 'fa-file';
                const sizeStr = formatFileSize(att.size);
                
                html += '<div style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: #f8f9fa; border-radius: 8px; font-size: 13px;" data-att-id="' + att.id + '">' +
                    '<i class="fas ' + icon + '" style="color: #666;"></i>' +
                    '<span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 150px;">' + escapeHtml(att.name) + '</span>' +
                    '<span style="color: #999; font-size: 11px;">' + sizeStr + '</span>' +
                    (att.uploading ? '<i class="fas fa-spinner fa-spin" style="color: #999;"></i>' : '') +
                    '<mdui-button-icon class="remove-att-btn" icon="close" style="color: #ff6b6b;"></mdui-button-icon>' +
                '</div>';
            });
            
            container.innerHTML = html;
            
            // 绑定删除按钮事件
            container.querySelectorAll('.remove-att-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const id = btn.closest('[data-att-id]').dataset.attId;
                    removeAttachment(id);
                });
            });
        }
        
        // 移除附件
        async function removeAttachment(id) {
            const att = currentAttachments.find(a => a.id === id);
            if (att && att.key && !att.uploading) {
                // 从服务器删除
                try {
                    await fetch('/api/attachments/' + encodeURIComponent(att.key), {
                        method: 'DELETE'
                    });
                } catch (e) {
                    console.error('Delete attachment error:', e);
                }
            }
            
            currentAttachments = currentAttachments.filter(a => a.id !== id);
            renderAttachments();
        }
        
        // 格式化文件大小
        function formatFileSize(bytes) {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
        }
        
        // 渲染 todo 附件
        function renderTodoAttachments(attachments) {
            if (!attachments || attachments.length === 0) return '';
            
            let html = '<div class="todo-attachments" style="margin-top: 10px; display: flex; flex-wrap: wrap; gap: 8px;">';
            
            attachments.forEach((att, index) => {
                const isImage = att.type && att.type.startsWith('image/');
                const isText = att.type && (att.type.startsWith('text/') || att.type === 'application/json');
                const icon = isImage ? 'fa-image' : (isText ? 'fa-file-alt' : 'fa-file');
                const color = isImage ? '#ff6b6b' : (isText ? '#4ade80' : '#54a0ff');
                
                html += '<div class="todo-att-item" data-att-index="' + index + '" style="display: flex; align-items: center; gap: 6px; padding: 6px 12px; background: white; border-radius: 20px; cursor: pointer; font-size: 12px; border: 1px solid #e0e0e0; transition: all 0.2s;">' +
                    '<i class="fas ' + icon + '" style="color: ' + color + ';"></i>' +
                    '<span style="max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">' + escapeHtml(att.name) + '</span>' +
                '</div>';
            });
            
            html += '</div>';
            return html;
        }
        
        // 查看附件
        function viewAttachment(att) {
            const isImage = att.type && att.type.startsWith('image/');
            const isText = att.type && (att.type.startsWith('text/') || att.type === 'application/json');
            
            const overlay = document.createElement('div');
            overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px;';
            
            const content = document.createElement('div');
            content.style.cssText = 'background: white; border-radius: 16px; max-width: 90%; max-height: 90%; overflow: auto; position: relative;';
            
            let innerHtml = '<div style="padding: 20px;">';
            innerHtml += '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">';
            innerHtml += '<h3 style="margin: 0; font-size: 16px;">' + escapeHtml(att.name) + '</h3>';
            innerHtml += '<mdui-button-icon icon="close" onclick="this.parentElement.parentElement.parentElement.remove()"></mdui-button-icon>';
            innerHtml += '</div>';
            
            if (isImage) {
                innerHtml += '<img src="' + att.url + '" style="max-width: 100%; max-height: 70vh; border-radius: 8px; display: block;">';
            } else if (isText) {
                innerHtml += '<div style="background: #f8f9fa; padding: 15px; border-radius: 8px; max-height: 60vh; overflow: auto; font-family: monospace; font-size: 13px; white-space: pre-wrap; word-break: break-all;">Loading...</div>';
            } else {
                innerHtml += '<div style="text-align: center; padding: 40px;"><i class="fas fa-file" style="font-size: 48px; color: #ccc;"></i><p style="margin-top: 15px; color: #666;">Preview not available</p><a href="' + att.url + '" download style="display: inline-block; margin-top: 10px; padding: 10px 20px; background: linear-gradient(135deg, #ff6b6b 0%, #feca57 100%); color: white; text-decoration: none; border-radius: 8px;">Download</a></div>';
            }
            
            innerHtml += '</div>';
            content.innerHTML = innerHtml;
            
            overlay.className = 'fixed-overlay';
            overlay.appendChild(content);
            document.body.appendChild(overlay);
            
            // 加载文本内容
            if (isText) {
                fetch(att.url)
                    .then(r => r.text())
                    .then(text => {
                        const pre = content.querySelector('div > div > div');
                        if (pre) pre.textContent = text;
                    })
                    .catch(e => {
                        const pre = content.querySelector('div > div > div');
                        if (pre) pre.textContent = 'Error loading file: ' + e.message;
                    });
            }
            
            // 点击遮罩关闭
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    document.body.removeChild(overlay);
                }
            });
        }
        
        let currentFilter = 'pending'; // 默认筛选未完成的
        
        // 设置筛选
        function setFilter(filter) {
            currentFilter = filter;
            
            // 更新按钮样式
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.setAttribute('variant', 'tonal');
            });
            
            const activeBtn = document.getElementById('filter-' + filter);
            activeBtn.setAttribute('variant', 'filled');
            
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
        
        // 渲染筛选标签
        function renderFilterTags() {
            const container = document.getElementById('filter-tags');
            
            if (allTags.length === 0) {
                container.innerHTML = '<span style="font-size: 14px; color: #666;">筛选标签:</span><span style="font-size: 12px; color: #999;">暂无标签</span>';
                return;
            }
            
            let html = '<span style="font-size: 14px; color: #666;">筛选标签:</span>';
            
            allTags.forEach(tag => {
                const tagName = typeof tag === 'object' ? tag.name : tag;
                const tagColor = typeof tag === 'object' ? tag.color : null;
                const isSelected = filterTags.includes(tagName);
                
                if (isSelected) {
                    html += '<span onclick="toggleFilterTag(' + JSON.stringify(tagName).replace(/"/g, '&quot;') + ')" style="padding: 4px 12px; border-radius: 15px; font-size: 12px; cursor: pointer; background: ' + (tagColor || 'linear-gradient(135deg, #ff6b6b 0%, #feca57 100%)') + '; color: white; border: 2px solid white; box-shadow: 0 0 0 2px ' + (tagColor || '#ff6b6b') + '; margin-right: 8px;">' + escapeHtml(tagName) + '</span>';
                } else if (tagColor) {
                    html += '<span onclick="toggleFilterTag(' + JSON.stringify(tagName).replace(/"/g, '&quot;') + ')" style="padding: 4px 12px; border-radius: 15px; font-size: 12px; cursor: pointer; background: ' + tagColor + '; color: white; border: 1px solid transparent; margin-right: 8px;">' + escapeHtml(tagName) + '</span>';
                } else {
                    html += '<span onclick="toggleFilterTag(' + JSON.stringify(tagName).replace(/"/g, '&quot;') + ')" style="padding: 4px 12px; border-radius: 15px; font-size: 12px; cursor: pointer; background: #f0f0f0; color: #666; border: 1px solid #ddd; margin-right: 8px;">' + escapeHtml(tagName) + '</span>';
                }
            });
            
            container.innerHTML = html;
        }
        
        // 切换筛选标签
        function toggleFilterTag(tagName) {
            if (filterTags.includes(tagName)) {
                filterTags = filterTags.filter(t => t !== tagName);
            } else {
                filterTags.push(tagName);
            }
            renderFilterTags();
            renderTodos();
        }
        
        // 切换清除按钮显示
        function toggleClearButton() {
            const searchInput = document.getElementById('search-input');
            const clearBtn = document.getElementById('clear-btn');
            if (searchInput && clearBtn) {
                clearBtn.style.display = searchInput.value.trim() ? 'inline-block' : 'none';
            }
        }
        
        // 清除所有筛选
        function clearFilters() {
            searchKeyword = '';
            filterTags = [];
            document.getElementById('search-input').value = '';
            toggleClearButton();
            renderFilterTags();
            renderTodos();
        }
        
        // 加载标签列表
        async function loadTags() {
            console.log('[loadTags] 开始加载标签列表...');
            console.log('[loadTags] 当前 allTags 长度:', allTags.length);
            
            try {
                console.log('[loadTags] 发起 fetch 请求: /api/tags');
                const startTime = Date.now();
                const response = await fetch('/api/tags');
                const endTime = Date.now();
                console.log('[loadTags] 请求耗时:', endTime - startTime, 'ms');
                console.log('[loadTags] 响应状态:', response.status, response.statusText);
                
                console.log('[loadTags] 开始解析 JSON...');
                const data = await response.json();
                console.log('[loadTags] 解析完成, 数据:', data);
                console.log('[loadTags] 返回的 tags 数量:', data.tags ? data.tags.length : 0);
                
                if (data.success) {
                    allTags = data.tags || [];
                    console.log('[loadTags] 更新 allTags 数组, 新长度:', allTags.length);
                    console.log('[loadTags] 调用 renderTagSelect()');
                    renderTagSelect();
                    console.log('[loadTags] 调用 renderFilterTags()');
                    renderFilterTags();
                    console.log('[loadTags] 加载完成');
                } else {
                    console.warn('[loadTags] 响应中 success 为 false:', data.error);
                }
            } catch (e) {
                console.error('[loadTags] 加载失败:', e);
                console.error('[loadTags] 错误堆栈:', e.stack);
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
        
        // 显示带撤销按钮的提示
        function showToastWithUndo(message, originalText, optimizedText) {
            const toast = document.getElementById('toast');
            toast.innerHTML = 
                '<div style="display: flex; align-items: center; gap: 12px; white-space: nowrap;">' +
                    '<span style="white-space: nowrap;">' + message + '</span>' +
                    '<mdui-button id="undo-btn" variant="text" style="color: inherit; --mdui-comp-text-button-container-height: 28px; font-size: 12px; padding: 0 8px; white-space: nowrap; flex-shrink: 0;">撤销</mdui-button>' +
                '</div>';
            toast.className = 'toast success';
            toast.classList.add('show');
            
            // 绑定撤销按钮
            const undoBtn = document.getElementById('undo-btn');
            if (undoBtn) {
                undoBtn.addEventListener('click', () => {
                    const input = document.getElementById('todo-input');
                    input.value = originalText;
                    toast.classList.remove('show');
                    showToast('已撤销', 'success');
                });
            }
            
            // 10秒后自动隐藏
            setTimeout(() => {
                toast.classList.remove('show');
            }, 10000);
        }
        
        // 加载待办列表
        async function loadTodos() {
            console.log('[loadTodos] 开始加载待办列表...');
            console.log('[loadTodos] 当前 todos 长度:', todos.length);
            
            try {
                console.log('[loadTodos] 发起 fetch 请求: /api/todos');
                const startTime = Date.now();
                const response = await fetch('/api/todos');
                const endTime = Date.now();
                console.log('[loadTodos] 请求耗时:', endTime - startTime, 'ms');
                console.log('[loadTodos] 响应状态:', response.status, response.statusText);
                
                console.log('[loadTodos] 开始解析 JSON...');
                const data = await response.json();
                console.log('[loadTodos] 解析完成, 数据:', data);
                console.log('[loadTodos] 返回的 todos 数量:', data.todos ? data.todos.length : 0);
                
                if (data.todos) {
                    todos = data.todos;
                    console.log('[loadTodos] 更新 todos 数组, 新长度:', todos.length);
                    console.log('[loadTodos] 调用 renderTodos()');
                    renderTodos();
                    console.log('[loadTodos] 调用 updateStats()');
                    updateStats();
                    console.log('[loadTodos] 加载完成');
                } else {
                    console.warn('[loadTodos] 响应中没有 todos 数据');
                }
            } catch (e) {
                console.error('[loadTodos] 加载失败:', e);
                console.error('[loadTodos] 错误堆栈:', e.stack);
                showToast('加载失败: ' + e.message, 'error');
                const todoListEl = document.getElementById('todo-list');
                if (todoListEl) {
                    todoListEl.innerHTML = '<div class="empty-state"><div class="empty-state-icon">⚠️</div><div class="empty-state-text">加载失败，请刷新重试</div></div>';
                }
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
            } else if (currentFilter === 'shared') {
                // 只显示共享给我的
                filteredTodos = todos.filter(todo => todo.isShared);
            } else if (currentFilter === 'completed') {
                // 只显示已完成的
                filteredTodos = todos.filter(todo => todo.done);
            }
            // 'all' 显示全部
            
            // 标签筛选
            if (filterTags.length > 0) {
                filteredTodos = filteredTodos.filter(todo => {
                    if (!todo.tags || todo.tags.length === 0) return false;
                    // 只要包含任一选中的标签就显示
                    return filterTags.some(filterTag => todo.tags.includes(filterTag));
                });
            }
            
            // 搜索筛选
            if (searchKeyword) {
                filteredTodos = filteredTodos.filter(todo => {
                    return todo.text.toLowerCase().includes(searchKeyword.toLowerCase());
                });
            }
            
            // 排序：先按完成状态（未完成在前），再按时间逆序
            filteredTodos.sort((a, b) => {
                // 完成状态不同，未完成的在前
                if (a.done !== b.done) {
                    return a.done ? 1 : -1;
                }
                // 完成状态相同，按时间逆序（新的在前）
                return new Date(b.created_at) - new Date(a.created_at);
            });
            
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
                
                // 渲染附件
                let attachmentsHtml = '';
                if (todo.attachments && todo.attachments.length > 0) {
                    attachmentsHtml = renderTodoAttachments(todo.attachments);
                }
                
                const itemClass = todo.done ? 'todo-item completed' : 'todo-item';
                const isSelected = selectedTodos.includes(todo.id);
                
                // 多选复选框
                let multiSelectHtml = '';
                if (isMultiSelectMode) {
                    multiSelectHtml = '<div class="multi-select-checkbox" onclick="event.stopPropagation(); toggleTodoSelection(' + todo.id + ')" style="float: left; margin-right: 10px; width: 20px; height: 20px; border: 2px solid #ff6b6b; border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center; background: ' + (isSelected ? 'linear-gradient(135deg, #ff6b6b 0%, #feca57 100%)' : 'white') + ';">' + (isSelected ? '<i class="fas fa-check" style="color: white; font-size: 12px;"></i>' : '') + '</div>';
                }
                
                // 创建者和共享信息
                let ownerHtml = '';
                
                // 获取共享用户列表（从 todo 的 shares 属性或通过 API 获取）
                const shares = todo.shares || [];
                const hasShares = shares.length > 0 || todo.isShared;
                
                // 如果是共享项（自己创建的共享给别人，或别人共享给我），显示创建者和共享信息
                if (hasShares || todo.isShared) {
                    ownerHtml += '<div style="margin-top: 8px; font-size: 12px; display: flex; flex-direction: column; gap: 6px;">';
                    
                    // 显示创建者
                    if (todo.user_login) {
                        ownerHtml += '<div style="display: flex; align-items: center; gap: 6px; color: #666;">';
                        ownerHtml += '<img src="https://github.com/' + encodeURIComponent(todo.user_login) + '.png?size=20" style="width: 16px; height: 16px; border-radius: 50%;">';
                        ownerHtml += '<span>创建者: ' + escapeHtml(todo.user_login) + '</span>';
                        ownerHtml += '</div>';
                    }
                    
                    // 显示共享标记
                    if (hasShares || todo.isShared) {
                        ownerHtml += '<div style="display: flex; align-items: center; gap: 6px; color: #f59e0b;">';
                        ownerHtml += '<i class="fas fa-share-alt"></i>';
                        ownerHtml += '<span>共享项目</span>';
                        ownerHtml += '</div>';
                    }
                    
                    // 显示所有共享人
                    if (shares.length > 0) {
                        ownerHtml += '<div style="display: flex; flex-wrap: wrap; gap: 4px; align-items: center;">';
                        ownerHtml += '<span style="color: #999;">共享给:</span>';
                        shares.forEach(share => {
                            const sharedUser = share.shared_with_login || share.shared_with_id;
                            ownerHtml += '<span style="display: inline-flex; align-items: center; gap: 2px; padding: 2px 6px; background: #f0f0f0; border-radius: 10px; font-size: 11px;">';
                            ownerHtml += '<img src="https://github.com/' + encodeURIComponent(sharedUser) + '.png?size=16" style="width: 12px; height: 12px; border-radius: 50%;">';
                            ownerHtml += escapeHtml(sharedUser);
                            ownerHtml += '</span>';
                        });
                        ownerHtml += '</div>';
                    }
                    
                    ownerHtml += '</div>';
                }
                
                html += '<div class="' + itemClass + (isSelected ? ' selected' : '') + '" data-id="' + todo.id + '" onclick="' + (isMultiSelectMode ? 'toggleTodoSelection(' + todo.id + ')' : 'selectTodo(this)') + '">' +
                    multiSelectHtml +
                    '<div class="todo-actions">' +
                        '<mdui-button-icon class="edit-btn" onclick="event.stopPropagation(); editTodo(' + todo.id + ')" title="编辑" icon="edit" style="color: #3b82f6;"></mdui-button-icon>' +
                        '<mdui-button-icon class="copy-btn" onclick="event.stopPropagation(); copyTodoText(' + todo.id + ')" title="复制内容" icon="content_copy" style="color: #4ade80;"></mdui-button-icon>' +
                        '<mdui-button-icon class="share-btn" onclick="event.stopPropagation(); openShareDialog(' + todo.id + ')" title="共享" icon="share" style="color: #f59e0b;"></mdui-button-icon>' +
                        '<mdui-button-icon class="delete-btn" onclick="event.stopPropagation(); deleteTodo(' + todo.id + ')" title="删除" icon="delete" style="color: #ff6b6b;"></mdui-button-icon>' +
                    '</div>' +
                    (!isMultiSelectMode ? '<div class="todo-checkbox checkbox ' + (todo.done ? 'checked' : '') + '" onclick="event.stopPropagation(); toggleTodo(' + todo.id + ')"></div>' : '') +
                    '<div class="todo-content">' +
                        '<div class="todo-text">' + escapeHtml(todo.text) + '</div>' +
                        tagsHtml +
                        attachmentsHtml +
                        ownerHtml +
                        '<div class="todo-time">' + timeStr + '</div>' +
                    '</div>' +
                '</div>';
            });
            
            listEl.innerHTML = html;
            
            // 绑定附件点击事件
            listEl.querySelectorAll('.todo-attachments').forEach((container, index) => {
                const todoId = filteredTodos[index].id;
                const todo = todos.find(t => t.id === todoId);
                if (todo && todo.attachments) {
                    container.querySelectorAll('.todo-att-item').forEach(item => {
                        item.addEventListener('click', (e) => {
                            e.stopPropagation();
                            const attIndex = parseInt(item.dataset.attIndex);
                            viewAttachment(todo.attachments[attIndex]);
                        });
                    });
                }
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
            
            // 当前编辑的标签
            let editTags = todo.tags ? [...todo.tags] : [];
            
            // 创建自定义编辑对话框
            const overlay = document.createElement('div');
            overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px;';
            
            const dialog = document.createElement('div');
            dialog.style.cssText = 'background: white; border-radius: 16px; padding: 20px; width: 100%; max-width: 500px; max-height: 80vh; overflow-y: auto;';
            
            // 渲染标签选择
            function renderEditTags() {
                let tagsHtml = '';
                if (allTags.length > 0) {
                    tagsHtml = '<div style="margin-top: 15px;"><div style="font-size: 14px; color: #666; margin-bottom: 10px;">选择标签:</div><div style="display: flex; flex-wrap: wrap; gap: 8px;">';
                    allTags.forEach(tag => {
                        const tagName = typeof tag === 'object' ? tag.name : tag;
                        const tagColor = typeof tag === 'object' ? tag.color : null;
                        const isSelected = editTags.includes(tagName);
                        
                        if (isSelected) {
                            tagsHtml += '<span class="edit-tag-item" data-tag="' + escapeHtml(tagName) + '" style="padding: 4px 12px; border-radius: 15px; font-size: 12px; cursor: pointer; background: ' + (tagColor || 'linear-gradient(135deg, #ff6b6b 0%, #feca57 100%)') + '; color: white; border: 2px solid white; box-shadow: 0 0 0 2px ' + (tagColor || '#ff6b6b') + ';">' + escapeHtml(tagName) + '</span>';
                        } else if (tagColor) {
                            tagsHtml += '<span class="edit-tag-item" data-tag="' + escapeHtml(tagName) + '" style="padding: 4px 12px; border-radius: 15px; font-size: 12px; cursor: pointer; background: ' + tagColor + '; color: white; border: 1px solid transparent;">' + escapeHtml(tagName) + '</span>';
                        } else {
                            tagsHtml += '<span class="edit-tag-item" data-tag="' + escapeHtml(tagName) + '" style="padding: 4px 12px; border-radius: 15px; font-size: 12px; cursor: pointer; background: #f0f0f0; color: #666; border: 1px solid #ddd;">' + escapeHtml(tagName) + '</span>';
                        }
                    });
                    tagsHtml += '</div></div>';
                }
                return tagsHtml;
            }
            
            dialog.innerHTML = '<h3 style="margin: 0 0 15px 0; color: #333;">编辑待办</h3>' +
                '<textarea id="edit-textarea" style="width: 100%; min-height: 120px; padding: 12px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 16px; font-family: inherit; resize: vertical; box-sizing: border-box;" placeholder="输入待办内容...">' + escapeHtml(todo.text) + '</textarea>' +
                '<div id="edit-tags-container">' + renderEditTags() + '</div>' +
                '<div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 15px;">' +
                    '<mdui-button id="edit-cancel" variant="outlined">取消</mdui-button>' +
                    '<mdui-button id="edit-save" variant="filled">保存</mdui-button>' +
                '</div>';
            
            overlay.appendChild(dialog);
            document.body.appendChild(overlay);
            
            // 绑定标签点击事件
            dialog.querySelectorAll('.edit-tag-item').forEach(tagEl => {
                tagEl.addEventListener('click', () => {
                    const tagName = tagEl.dataset.tag;
                    if (editTags.includes(tagName)) {
                        editTags = editTags.filter(t => t !== tagName);
                    } else {
                        editTags.push(tagName);
                    }
                    // 重新渲染标签
                    document.getElementById('edit-tags-container').innerHTML = renderEditTags();
                    // 重新绑定事件
                    dialog.querySelectorAll('.edit-tag-item').forEach(newTagEl => {
                        newTagEl.addEventListener('click', () => {
                            const newTagName = newTagEl.dataset.tag;
                            if (editTags.includes(newTagName)) {
                                editTags = editTags.filter(t => t !== newTagName);
                            } else {
                                editTags.push(newTagName);
                            }
                            document.getElementById('edit-tags-container').innerHTML = renderEditTags();
                        });
                    });
                });
            });
            
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
                
                const textChanged = newText !== todo.text;
                const tagsChanged = JSON.stringify(editTags.sort()) !== JSON.stringify((todo.tags || []).sort());
                
                if (!textChanged && !tagsChanged) {
                    document.body.removeChild(overlay);
                    return;
                }
                
                // 发送更新请求
                const updateData = {};
                if (textChanged) updateData.text = newText;
                if (tagsChanged) updateData.tags = editTags;
                
                fetch('/api/todos/' + id, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updateData)
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        if (textChanged) todo.text = newText;
                        if (tagsChanged) todo.tags = editTags;
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
            const sharedToMe = todos.filter(t => t.isShared).length;
            
            document.getElementById('total-count').textContent = total;
            document.getElementById('pending-count').textContent = pending;
            document.getElementById('completed-count').textContent = completed;
            document.getElementById('shared-count').textContent = sharedToMe;
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
                        showToastWithUndo('AI 已优化！', originalText, data.optimized);
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
                // 准备附件数据（排除上传中的和临时文件）
                const attachments = currentAttachments
                    .filter(att => !att.uploading && att.key)
                    .map(att => ({
                        key: att.key,
                        name: att.name,
                        size: att.size,
                        type: att.type,
                        url: att.url
                    }));
                
                const response = await fetch('/api/todos', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        text: text,
                        tags: selectedTags,
                        attachments: attachments
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    // 如果有共享用户，逐个共享
                    let shareSuccessCount = 0;
                    let shareFailCount = 0;
                    if (shareWithUsers.length > 0) {
                        for (const username of shareWithUsers) {
                            try {
                                const shareResponse = await fetch('/api/todos/' + data.todo.id + '/share', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ shared_with_login: username })
                                });
                                const shareData = await shareResponse.json();
                                if (shareData.success) {
                                    shareSuccessCount++;
                                    console.log('[共享成功]', username);
                                } else {
                                    shareFailCount++;
                                    console.error('[共享失败]', username, shareData.error);
                                }
                            } catch (shareErr) {
                                shareFailCount++;
                                console.error('[共享失败]', username, shareErr);
                            }
                        }
                        if (shareFailCount > 0) {
                            showToast('添加成功！共享成功 ' + shareSuccessCount + ' 位，失败 ' + shareFailCount + ' 位', 'error');
                        } else {
                            showToast('添加成功！已共享给 ' + shareSuccessCount + ' 位用户');
                        }
                    } else {
                        showToast('添加成功！');
                    }
                    
                    input.value = '';
                    selectedTags = [];
                    currentAttachments = []; // 清空附件列表
                    // 不再清空共享用户列表，保留到 localStorage
                    // shareWithUsers = []; 
                    // clearShareUsers();
                    renderAttachments();
                    renderTagSelect();
                    todos.unshift(data.todo);
                    renderTodos();
                    updateStats();
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
        
        // 验证 GitHub 用户名是否存在
        async function verifyGitHubUser(username) {
            try {
                const apiUrl = 'https://api.github.com/users/' + encodeURIComponent(username);
                const response = await fetch(apiUrl);
                if (response.status === 200) {
                    return await response.json();
                }
                return null;
            } catch (e) {
                console.error('验证 GitHub 用户失败:', e);
                return null;
            }
        }
        
        // 打开共享对话框
        async function openShareDialog(todoId) {
            const todo = todos.find(t => t.id === todoId);
            if (!todo) return;
            
            // 检查权限（只有创建者可以管理共享）
            // 从 API 返回的 user 信息中获取当前用户
            let currentUserLogin = '';
            try {
                const userResponse = await fetch('/api/me');
                const userData = await userResponse.json();
                console.log('获取当前用户响应:', userData);
                if (userData.user && userData.user.login) {
                    currentUserLogin = userData.user.login;
                }
            } catch (e) {
                console.error('获取当前用户失败:', e);
            }
            
            const isOwner = todo.user_login === currentUserLogin;
            
            console.log('共享对话框 - 创建者:', todo.user_login, '当前用户:', currentUserLogin, '是否创建者:', isOwner);
            
            // 获取当前共享列表
            let shares = [];
            try {
                const response = await fetch('/api/todos/' + todoId + '/shares');
                const data = await response.json();
                if (data.success) {
                    shares = data.shares || [];
                }
            } catch (e) {
                console.error('获取共享列表失败:', e);
            }
            
            // 创建对话框
            const overlay = document.createElement('div');
            overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px;';
            overlay.className = 'share-dialog-overlay';
            
            const dialog = document.createElement('div');
            dialog.style.cssText = 'background: white; border-radius: 16px; padding: 24px; width: 100%; max-width: 450px; max-height: 80vh; overflow-y: auto;';
            
            // 构建对话框内容 - 使用 DOM 操作避免字符串转义问题
            const title = document.createElement('h3');
            title.style.cssText = 'margin: 0 0 20px 0; color: #333; font-size: 18px;';
            title.innerHTML = '<i class="fas fa-share-alt" style="color: #f59e0b; margin-right: 8px;"></i>共享管理';
            dialog.appendChild(title);
            
            // 创建者
            const ownerSection = document.createElement('div');
            ownerSection.style.marginBottom = '20px';
            ownerSection.innerHTML = '<div style="font-size: 14px; color: #666; margin-bottom: 8px;">创建者</div>';
            
            const ownerBox = document.createElement('div');
            ownerBox.style.cssText = 'display: flex; align-items: center; gap: 10px; padding: 10px; background: #f8f9fa; border-radius: 8px;';
            
            const ownerImg = document.createElement('img');
            ownerImg.src = 'https://github.com/' + encodeURIComponent(todo.user_login || 'ghost') + '.png?size=40';
            ownerImg.style.cssText = 'width: 32px; height: 32px; border-radius: 50%;';
            ownerImg.onerror = function() { this.src = 'https://github.com/ghost.png?size=40'; };
            
            const ownerName = document.createElement('span');
            ownerName.style.fontWeight = '500';
            ownerName.textContent = todo.user_login || '未知';
            
            ownerBox.appendChild(ownerImg);
            ownerBox.appendChild(ownerName);
            ownerSection.appendChild(ownerBox);
            dialog.appendChild(ownerSection);
            
            // 已共享列表
            const sharesSection = document.createElement('div');
            sharesSection.style.marginBottom = '20px';
            sharesSection.innerHTML = '<div style="font-size: 14px; color: #666; margin-bottom: 8px;">已共享给</div>';
            
            const sharesContainer = document.createElement('div');
            sharesContainer.style.cssText = 'display: flex; flex-direction: column; gap: 8px;';
            
            if (shares.length > 0) {
                shares.forEach(s => {
                    const shareItem = document.createElement('div');
                    shareItem.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 10px; background: #f8f9fa; border-radius: 8px;';
                    
                    const userInfo = document.createElement('div');
                    userInfo.style.cssText = 'display: flex; align-items: center; gap: 10px;';
                    
                    const userImg = document.createElement('img');
                    const sharedUser = s.shared_with_login || s.shared_with_id || 'ghost';
                    userImg.src = 'https://github.com/' + encodeURIComponent(sharedUser) + '.png?size=40';
                    userImg.style.cssText = 'width: 32px; height: 32px; border-radius: 50%;';
                    userImg.onerror = function() { this.src = 'https://github.com/ghost.png?size=40'; };
                    
                    const userName = document.createElement('span');
                    userName.textContent = sharedUser;
                    
                    userInfo.appendChild(userImg);
                    userInfo.appendChild(userName);
                    shareItem.appendChild(userInfo);
                    
                    if (isOwner) {
                        const removeBtn = document.createElement('button');
                        removeBtn.innerHTML = '<i class="fas fa-trash" style="color: #ff6b6b;"></i>';
                        removeBtn.style.cssText = 'background: none; border: none; cursor: pointer; padding: 5px;';
                        removeBtn.onclick = () => removeShare(todoId, s.shared_with_id);
                        shareItem.appendChild(removeBtn);
                    }
                    
                    sharesContainer.appendChild(shareItem);
                });
            } else {
                sharesContainer.innerHTML = '<div style="color: #999; font-size: 14px; padding: 10px;">暂无共享</div>';
            }
            
            sharesSection.appendChild(sharesContainer);
            dialog.appendChild(sharesSection);
            
            // 添加共享区域（仅创建者）
            if (isOwner) {
                const addSection = document.createElement('div');
                addSection.style.cssText = 'border-top: 1px solid #eee; padding-top: 20px;';
                addSection.innerHTML = '<div style="font-size: 14px; color: #666; margin-bottom: 10px;">添加共享</div>';
                
                const inputRow = document.createElement('div');
                inputRow.style.cssText = 'display: flex; gap: 10px; margin-bottom: 10px;';
                
                const input = document.createElement('input');
                input.type = 'text';
                input.id = 'new-share-input';
                input.placeholder = '输入 GitHub 用户名';
                input.style.cssText = 'flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px;';
                
                const verifyBtn = document.createElement('button');
                verifyBtn.innerHTML = '<i class="fas fa-search"></i> 验证';
                verifyBtn.style.cssText = 'padding: 10px 15px; background: #f0f0f0; border: none; border-radius: 8px; cursor: pointer;';
                
                inputRow.appendChild(input);
                inputRow.appendChild(verifyBtn);
                addSection.appendChild(inputRow);
                
                const verifyResult = document.createElement('div');
                verifyResult.id = 'user-verify-result';
                verifyResult.style.marginBottom = '10px';
                addSection.appendChild(verifyResult);
                
                const addConfirmBtn = document.createElement('button');
                addConfirmBtn.innerHTML = '<i class="fas fa-user-plus"></i> 添加共享';
                addConfirmBtn.disabled = true;
                addConfirmBtn.style.cssText = 'width: 100%; padding: 12px; background: #ccc; color: white; border: none; border-radius: 8px; cursor: not-allowed;';
                addSection.appendChild(addConfirmBtn);
                
                dialog.appendChild(addSection);
                
                // 验证功能
                let verifiedUser = null;
                
                verifyBtn.addEventListener('click', async () => {
                    const username = input.value.trim();
                    if (!username) {
                        verifyResult.innerHTML = '<span style="color: #ff6b6b;">请输入用户名</span>';
                        return;
                    }
                    
                    verifyResult.innerHTML = '<span style="color: #666;">验证中...</span>';
                    const user = await verifyGitHubUser(username);
                    
                    if (user) {
                        verifiedUser = user;
                        verifyResult.innerHTML = 
                            '<div style="display: flex; align-items: center; gap: 10px; padding: 10px; background: #e8f5e9; border-radius: 8px;">' +
                                '<img src="' + user.avatar_url + '" style="width: 40px; height: 40px; border-radius: 50%;">' +
                                '<div>' +
                                    '<div style="font-weight: 500;">' + escapeHtml(user.login) + '</div>' +
                                    '<div style="font-size: 12px; color: #4caf50;"><i class="fas fa-check-circle"></i> 用户存在</div>' +
                                '</div>' +
                            '</div>';
                        addConfirmBtn.disabled = false;
                        addConfirmBtn.style.cssText = 'width: 100%; padding: 12px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer;';
                    } else {
                        verifiedUser = null;
                        verifyResult.innerHTML = '<span style="color: #ff6b6b;"><i class="fas fa-times-circle"></i> 用户不存在</span>';
                        addConfirmBtn.disabled = true;
                        addConfirmBtn.style.cssText = 'width: 100%; padding: 12px; background: #ccc; color: white; border: none; border-radius: 8px; cursor: not-allowed;';
                    }
                });
                
                // 添加共享
                addConfirmBtn.addEventListener('click', async () => {
                    if (!verifiedUser) return;
                    
                    addConfirmBtn.disabled = true;
                    addConfirmBtn.innerHTML = '添加中...';
                    
                    try {
                        const response = await fetch('/api/todos/' + todoId + '/share', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ shared_with_login: verifiedUser.login })
                        });
                        
                        const data = await response.json();
                        
                        if (data.success) {
                            showToast('共享成功！');
                            overlay.remove();
                            openShareDialog(todoId);
                        } else {
                            showToast(data.error || '共享失败', 'error');
                            addConfirmBtn.disabled = false;
                            addConfirmBtn.innerHTML = '<i class="fas fa-user-plus"></i> 添加共享';
                        }
                    } catch (e) {
                        showToast('共享失败: ' + e.message, 'error');
                        addConfirmBtn.disabled = false;
                        addConfirmBtn.innerHTML = '<i class="fas fa-user-plus"></i> 添加共享';
                    }
                });
            } else {
                const noPermMsg = document.createElement('div');
                noPermMsg.style.cssText = 'color: #999; font-size: 13px; text-align: center; padding-top: 10px;';
                noPermMsg.textContent = '只有创建者可以管理共享';
                dialog.appendChild(noPermMsg);
            }
            
            // 关闭按钮
            const closeBtn = document.createElement('button');
            closeBtn.textContent = '关闭';
            closeBtn.style.cssText = 'width: 100%; margin-top: 15px; padding: 12px; background: #f0f0f0; border: none; border-radius: 8px; cursor: pointer;';
            closeBtn.onclick = () => overlay.remove();
            dialog.appendChild(closeBtn);
            
            overlay.appendChild(dialog);
            document.body.appendChild(overlay);
        }
        
        // 移除共享
        window.removeShare = async function(todoId, userId) {
            if (!confirm('确定要取消对该用户的共享吗？')) {
                return;
            }
            
            try {
                const response = await fetch('/api/todos/' + todoId + '/share/' + encodeURIComponent(userId), {
                    method: 'DELETE'
                });
                
                const data = await response.json();
                
                if (data.success) {
                    showToast('已取消共享');
                    // 刷新对话框
                    const overlay = document.querySelector('.share-dialog-overlay');
                    if (overlay) overlay.remove();
                    openShareDialog(todoId);
                } else {
                    showToast(data.error || '取消共享失败', 'error');
                }
            } catch (e) {
                showToast('取消共享失败: ' + e.message, 'error');
            }
        }
        
        // 旧的共享函数（保留兼容）
        async function shareTodo(id) {
            openShareDialog(id);
        }
    </script>
</body>
</html>
  `, { headers: { 'Content-Type': 'text/html;charset=UTF-8' } });
}

// Tags 管理页面
