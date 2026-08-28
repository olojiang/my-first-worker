import { jsonResponse } from '../utils/response.js';

export function tagsPage() {
  return new Response(`
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <title>🏷️ 标签管理</title>
    <link rel="stylesheet" href="/fonts/fa-all.min.css">
    <!-- Eruda v3.4.3 -->
    <script src="/eruda-polyfill.js"></script>
    <script src="/eruda.js"></script>
    <script>
      eruda.init({ plugins: ['monitor', 'timing', 'code', 'vue'] })
      console.log('Eruda v3.4.3 已初始化！')
    </script>
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

        /* 颜色选择区 */
        .color-section {
            margin-top: 15px;
        }

        .color-label {
            font-size: 13px;
            color: #666;
            margin-bottom: 10px;
        }

        .color-palette {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
        }

        .color-swatch {
            width: 34px;
            height: 34px;
            border-radius: 50%;
            cursor: pointer;
            border: 3px solid transparent;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: inset 0 0 0 1px rgba(0,0,0,0.12);
        }

        .color-swatch.selected {
            border-color: #333;
            transform: scale(1.15);
            box-shadow: inset 0 0 0 1px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.25);
        }

        .color-swatch.auto {
            background: linear-gradient(135deg, #e0e0e0, #f5f5f5);
            color: #666;
            font-size: 11px;
            font-weight: 600;
        }

        .custom-color-wrap {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-top: 12px;
            font-size: 13px;
            color: #666;
        }

        .custom-color-input {
            width: 44px;
            height: 34px;
            padding: 0;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            cursor: pointer;
            background: none;
        }

        /* 标签颜色编辑面板 */
        .color-editor-mask {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.4);
            z-index: 998;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.25s;
        }

        .color-editor-mask.show {
            opacity: 1;
            pointer-events: auto;
        }

        .color-editor {
            position: fixed;
            left: 0;
            right: 0;
            bottom: 0;
            background: white;
            border-radius: 20px 20px 0 0;
            padding: 24px 20px 32px;
            z-index: 999;
            transform: translateY(100%);
            transition: transform 0.25s;
            box-shadow: 0 -4px 20px rgba(0,0,0,0.15);
        }

        .color-editor.show {
            transform: translateY(0);
        }

        .color-editor h3 {
            font-size: 16px;
            margin-bottom: 16px;
            color: #333;
        }

        .color-editor .custom-color-wrap {
            margin-top: 16px;
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
                <mdui-button class="add-btn" id="add-btn" variant="filled" icon="add">添加</mdui-button>
            </div>
            <div class="color-section">
                <div class="color-label">🎨 标签颜色（不选则自动分配）</div>
                <div class="color-palette" id="color-palette"></div>
                <div class="custom-color-wrap">
                    <input type="color" class="custom-color-input" id="custom-color" value="#ff6b6b">
                    <span>自定义颜色</span>
                </div>
            </div>
        </div>
        
        <div class="tags-list" id="tags-list">
            <h2>所有标签</h2>
            <div class="loading" style="text-align: center; padding: 40px;">
                加载中...
            </div>
        </div>
    </div>
    
    <div class="color-editor-mask" id="editor-mask"></div>
    <div class="color-editor" id="color-editor">
        <h3 id="editor-title">修改标签颜色</h3>
        <div class="color-palette" id="editor-palette"></div>
        <div class="custom-color-wrap">
            <input type="color" class="custom-color-input" id="editor-custom-color" value="#ff6b6b">
            <span>自定义颜色（选择后自动保存）</span>
        </div>
    </div>

    <div class="toast" id="toast"></div>
    
    <script>
        let tags = [];
        const TAG_COLORS = [
            // 红粉橙
            '#ff6b6b', '#ff4757', '#ee5a24', '#ff9f43', '#ff9ff3', '#f368e0',
            // 黄色色阶
            '#d4ac0d', '#f1c40f', '#feca57', '#f9e79f',
            // 绿色色阶
            '#145a32', '#009432', '#27ae60', '#1dd1a1', '#58d68d', '#a9dfbf',
            // 蓝色色阶
            '#154360', '#0652dd', '#2e86c1', '#54a0ff', '#48dbfb', '#aed6f1',
            // 紫青
            '#5f27cd', '#9980fa', '#00d2d3',
            // 灰阶
            '#4b4b4b', '#8395a7', '#c8d0d8', '#ecf0f1'
        ];

        // 浅色背景配深色文字，深色背景配白色文字
        function tagTextColor(hex) {
            if (!hex || typeof hex !== 'string' || hex.charAt(0) !== '#') return 'white';
            let h = hex.slice(1);
            if (h.length === 3) h = h.split('').map(c => c + c).join('');
            if (h.length !== 6) return 'white';
            const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
            if (isNaN(r) || isNaN(g) || isNaN(b)) return 'white';
            return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? '#333' : 'white';
        }
        let selectedColor = null;   // 新建标签时选中的颜色（null = 自动分配）
        let editingTag = null;      // 正在编辑颜色的标签名
        
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
                } else if (response.status === 401) {
                    showToast('请先登录', 'error');
                    setTimeout(() => {
                        window.location.href = '/';
                    }, 1500);
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
            
            let html = '<h2>所有标签</h2><p style="font-size:12px;color:#999;margin-bottom:10px;">点击标签可修改颜色</p>';
            tags.forEach((tag, index) => {
                // 支持新格式 {name, color} 和旧格式 string
                const tagName = typeof tag === 'object' ? tag.name : tag;
                const tagColor = typeof tag === 'object' ? tag.color : null;
                const bgStyle = tagColor ? 'background: ' + tagColor + ';' : 'background: linear-gradient(135deg, #ff6b6b 0%, #feca57 100%);';
                const textColor = tagTextColor(tagColor);
                
                html += '<div class="tag-item" data-tag="' + escapeHtml(tagName) + '" data-color="' + (tagColor || '') + '" style="' + bgStyle + ' color: ' + textColor + '; cursor: pointer;">' + 
                    escapeHtml(tagName) + 
                    '<span class="tag-delete" data-index="' + index + '"><i class="fas fa-times"></i></span>' +
                    '</div>';
            });
            
            listEl.innerHTML = html;
            
            // 绑定删除按钮点击事件
            listEl.querySelectorAll('.tag-delete').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const tagName = e.target.closest('.tag-item').dataset.tag;
                    deleteTag(tagName);
                });
            });
            
            // 绑定标签点击事件 → 打开颜色编辑面板
            listEl.querySelectorAll('.tag-item').forEach(item => {
                item.addEventListener('click', () => {
                    openColorEditor(item.dataset.tag, item.dataset.color || null);
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

            const payload = { name: name };
            if (selectedColor) payload.color = selectedColor;

            try {
                console.log('Sending request...');
                const response = await fetch('/api/tags', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
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

        // ========== 颜色选择相关 ==========
        function renderPalette(containerId, mode) {
            const el = document.getElementById(containerId);
            let html = '';
            if (mode === 'create') {
                html += '<div class="color-swatch auto' + (selectedColor === null ? ' selected' : '') + '" data-color="">自动</div>';
            }
            TAG_COLORS.forEach(c => {
                const active = mode === 'create' ? selectedColor === c : editingTagColor === c;
                html += '<div class="color-swatch' + (active ? ' selected' : '') + '" data-color="' + c + '" style="background: ' + c + ';"></div>';
            });
            el.innerHTML = html;
            el.querySelectorAll('.color-swatch').forEach(sw => {
                sw.addEventListener('click', () => {
                    const color = sw.dataset.color || null;
                    if (mode === 'create') {
                        selectedColor = color;
                        renderPalette('color-palette', 'create');
                    } else {
                        // 编辑模式：点击预设色立即保存
                        saveTagColor(color);
                    }
                });
            });
        }

        let editingTagColor = null;

        function openColorEditor(tagName, currentColor) {
            editingTag = tagName;
            editingTagColor = currentColor || null;
            document.getElementById('editor-title').textContent = '修改标签颜色：' + tagName;
            const custom = document.getElementById('editor-custom-color');
            custom.value = currentColor || '#ff6b6b';
            renderPalette('editor-palette', 'edit');
            document.getElementById('color-editor').classList.add('show');
            document.getElementById('editor-mask').classList.add('show');
        }

        function closeColorEditor() {
            editingTag = null;
            editingTagColor = null;
            document.getElementById('color-editor').classList.remove('show');
            document.getElementById('editor-mask').classList.remove('show');
        }

        async function saveTagColor(color) {
            if (!editingTag) return;
            try {
                const response = await fetch('/api/tags/' + encodeURIComponent(editingTag), {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ color: color })
                });
                const data = await response.json();
                if (data.success) {
                    tags = data.tags;
                    renderTags();
                    showToast('颜色已保存！');
                    closeColorEditor();
                } else {
                    showToast(data.error || '保存失败', 'error');
                }
            } catch (e) {
                showToast('保存失败: ' + e.message, 'error');
            }
        }
        
        // 页面加载完成后执行
        document.addEventListener('DOMContentLoaded', () => {
            loadTags();
            renderPalette('color-palette', 'create');
            
            // 绑定添加按钮点击事件
            document.getElementById('add-btn').addEventListener('click', addTag);
            
            document.getElementById('tag-input').addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    addTag();
                }
            });
            
            // 颜色编辑面板：遮罩点击关闭、自定义颜色选择即保存
            document.getElementById('editor-mask').addEventListener('click', closeColorEditor);
            document.getElementById('editor-custom-color').addEventListener('input', (e) => {
                editingTagColor = e.target.value;
                renderPalette('editor-palette', 'edit');
            });
            document.getElementById('editor-custom-color').addEventListener('change', (e) => {
                if (editingTag) saveTagColor(e.target.value);
            });
        });
    </script>
</body>
</html>
  `, { headers: { 'Content-Type': 'text/html;charset=UTF-8' } });
}

