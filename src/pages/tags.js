import { jsonResponse } from '../utils/response.js';

export function tagsPage() {
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

