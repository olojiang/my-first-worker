import { jsonResponse } from '../utils/response.js';

export function kvPage() {
  return new Response(`
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <title>🗄️ KV 管理</title>
    <link rel="stylesheet" href="/fonts/fa-all.min.css">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            -webkit-tap-highlight-color: transparent;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #0ba360 0%, #3cba92 100%);
            min-height: 100vh;
            color: #333;
        }

        .header {
            text-align: center;
            padding: 30px 20px;
            background: linear-gradient(135deg, #4d4d4d 0%, #4c4e50 100%);
            color: white;
            position: sticky;
            top: 0;
            z-index: 100;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }

        .header h1 {
            font-size: 26px;
            font-weight: 700;
        }

        .back-link {
            position: absolute;
            left: 20px;
            top: 50%;
            transform: translateY(-50%);
            color: white;
            text-decoration: none;
            font-size: 15px;
            display: flex;
            align-items: center;
            gap: 5px;
        }

        .container {
            max-width: 760px;
            margin: 0 auto;
            padding: 20px 15px 60px;
        }

        .card {
            background: white;
            border-radius: 16px;
            padding: 18px;
            margin-bottom: 16px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.06);
        }

        .card h2 {
            font-size: 16px;
            margin-bottom: 12px;
            color: #14532d;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .row {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }

        .row input, .row textarea {
            flex: 1;
            min-width: 120px;
            padding: 12px 14px;
            border: 2px solid #e0e0e0;
            border-radius: 10px;
            font-size: 15px;
            outline: none;
            transition: border-color 0.2s;
            font-family: inherit;
        }

        .row input:focus, .row textarea:focus {
            border-color: #0ba360;
        }

        .row textarea.value-input {
            width: 100%;
            min-height: 72px;
            resize: vertical;
        }

        .btn {
            padding: 12px 20px;
            background: linear-gradient(135deg, #0ba360 0%, #3cba92 100%);
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            white-space: nowrap;
            transition: transform 0.15s, opacity 0.2s;
        }

        .btn:active { transform: scale(0.96); }
        .btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .btn.gray {
            background: linear-gradient(135deg, #6b7280 0%, #9ca3af 100%);
        }

        .btn.red {
            background: linear-gradient(135deg, #ef4444 0%, #f87171 100%);
        }

        .btn.small {
            padding: 6px 12px;
            font-size: 12px;
            border-radius: 8px;
        }

        .curl-box {
            margin-top: 12px;
            background: #1e293b;
            border-radius: 10px;
            overflow: hidden;
        }

        .curl-box .curl-title {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 6px 12px;
            background: #0f172a;
            color: #94a3b8;
            font-size: 11px;
        }

        .curl-box pre {
            margin: 0;
            padding: 10px 12px;
            color: #a5f3fc;
            font-size: 12px;
            line-height: 1.5;
            overflow-x: auto;
            white-space: pre;
            font-family: 'SF Mono', Menlo, Consolas, monospace;
        }

        .copy-btn {
            background: none;
            border: 1px solid #475569;
            color: #cbd5e1;
            border-radius: 6px;
            padding: 2px 8px;
            font-size: 11px;
            cursor: pointer;
        }

        .copy-btn:active { background: #334155; }

        .kv-list { min-height: 80px; }

        .kv-item {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 4px;
            border-bottom: 1px solid #f0f0f0;
        }

        .kv-item:last-child { border-bottom: none; }

        .kv-key {
            flex: 1;
            font-size: 13px;
            font-family: 'SF Mono', Menlo, Consolas, monospace;
            word-break: break-all;
        }

        .kv-meta {
            font-size: 11px;
            color: #999;
            white-space: nowrap;
        }

        .kv-actions { display: flex; gap: 6px; flex-shrink: 0; }

        .list-info {
            font-size: 12px;
            color: #888;
            margin: 8px 0;
        }

        .value-preview {
            background: #f8fafc;
            border-radius: 8px;
            padding: 10px 12px;
            font-size: 13px;
            font-family: 'SF Mono', Menlo, Consolas, monospace;
            word-break: break-all;
            white-space: pre-wrap;
            max-height: 200px;
            overflow-y: auto;
            margin-top: 10px;
            border: 1px solid #e2e8f0;
        }

        .token-row { display: flex; gap: 10px; align-items: center; }
        .token-row input { flex: 1; }
        .token-hint { font-size: 12px; color: #888; margin-top: 8px; line-height: 1.5; }

        .empty-state {
            text-align: center;
            padding: 30px 20px;
            color: #999;
            font-size: 14px;
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
            max-width: 86%;
        }

        .toast.show { transform: translateX(-50%) translateY(0); opacity: 1; }
        .toast.success { background: #16a34a; }
        .toast.error { background: #ef4444; }

        @media (max-width: 480px) {
            .header h1 { font-size: 22px; }
        }
    </style>
</head>
<body>
    <div class="header">
        <a href="/todos" class="back-link"><i class="fas fa-arrow-left"></i> 返回</a>
        <h1><i class="fas fa-database"></i> KV 管理</h1>
    </div>

    <div class="container">
        <!-- Token 配置 -->
        <div class="card">
            <h2>🔑 API Token（curl 命令行用）</h2>
            <div class="token-row">
                <input type="text" id="token-input" placeholder="KV_ADMIN_TOKEN" autocomplete="off">
                <button class="btn small" onclick="saveToken()">保存</button>
            </div>
            <div class="token-hint">
                网页操作走登录态，无需 token；下面生成的 curl 样例会带上它，方便直接在命令行执行。
            </div>
            <div class="curl-box">
                <div class="curl-title"><span>命令行环境变量</span><button class="copy-btn" onclick="copyText('export KV_BASE=\\''+location.origin+'\\'\\nexport KV_TOKEN=\\''+getToken()+'\\'')">复制</button></div>
                <pre id="export-snippet"></pre>
            </div>
        </div>

        <!-- 写入/更新 -->
        <div class="card">
            <h2>✏️ 写入 / 更新</h2>
            <div class="row">
                <input type="text" id="set-key" placeholder="Key（键名）" autocomplete="off">
            </div>
            <div class="row" style="margin-top:10px;">
                <textarea class="value-input" id="set-value" placeholder="Value（值）"></textarea>
            </div>
            <div class="row" style="margin-top:10px;">
                <button class="btn" id="set-btn" onclick="kvSet()">保存（存在则覆盖）</button>
            </div>
            <div class="curl-box">
                <div class="curl-title"><span>curl 样例</span><button class="copy-btn" onclick="copyText(setCurlCmd())">复制</button></div>
                <pre id="set-curl"></pre>
            </div>
        </div>

        <!-- 读取 -->
        <div class="card">
            <h2>🔍 读取</h2>
            <div class="row">
                <input type="text" id="get-key" placeholder="Key（键名）" autocomplete="off">
                <button class="btn" onclick="kvGet()">读取</button>
            </div>
            <div id="get-result"></div>
            <div class="curl-box">
                <div class="curl-title"><span>curl 样例</span><button class="copy-btn" onclick="copyText(getCurlCmd())">复制</button></div>
                <pre id="get-curl"></pre>
            </div>
        </div>

        <!-- 罗列/搜索 -->
        <div class="card">
            <h2>📋 罗列 / 前缀搜索</h2>
            <div class="row">
                <input type="text" id="list-prefix" placeholder="前缀过滤（留空=全部）" autocomplete="off">
                <button class="btn" id="list-btn" onclick="kvList()">罗列</button>
            </div>
            <div class="list-info" id="list-info"></div>
            <div class="kv-list" id="kv-list"><div class="empty-state">点击「罗列」查看所有 Key</div></div>
            <div class="row" style="margin-top:8px;">
                <button class="btn small gray" id="more-btn" onclick="kvList(true)" style="display:none;">加载更多</button>
            </div>
            <div class="curl-box">
                <div class="curl-title"><span>curl 样例（罗列全部 / 前缀搜索）</span><button class="copy-btn" onclick="copyText(listCurlCmd())">复制</button></div>
                <pre id="list-curl"></pre>
            </div>
        </div>

        <!-- 删除 -->
        <div class="card">
            <h2>🗑️ 删除</h2>
            <div class="row">
                <input type="text" id="del-key" placeholder="Key（键名）" autocomplete="off">
                <button class="btn red" onclick="kvDelete()">删除</button>
            </div>
            <div class="curl-box">
                <div class="curl-title"><span>curl 样例</span><button class="copy-btn" onclick="copyText(delCurlCmd())">复制</button></div>
                <pre id="del-curl"></pre>
            </div>
        </div>
    </div>

    <div class="toast" id="toast"></div>

    <script>
        const API = '/api/kv-admin';
        let listCursor = null;
        let listKeys = [];

        function getToken() {
            return localStorage.getItem('kv_admin_token') || '';
        }

        function saveToken() {
            const v = document.getElementById('token-input').value.trim();
            localStorage.setItem('kv_admin_token', v);
            renderCurls();
            showToast(v ? 'Token 已保存' : 'Token 已清空');
        }

        function showToast(msg, type = 'success') {
            const t = document.getElementById('toast');
            t.textContent = msg;
            t.className = 'toast ' + type;
            // 强制重绘以触发动画
            void t.offsetWidth;
            t.classList.add('show');
            setTimeout(() => t.classList.remove('show'), 2000);
        }

        function copyText(text) {
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(text).then(() => showToast('已复制')).catch(() => fallbackCopy(text));
            } else {
                fallbackCopy(text);
            }
        }

        function fallbackCopy(text) {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand('copy'); showToast('已复制'); } catch (e) { showToast('复制失败，请手动选择', 'error'); }
            document.body.removeChild(ta);
        }

        function shellQuote(s) {
            return "'" + String(s).replace(/'/g, "'\\\\''") + "'";
        }

        // ===== curl 命令生成 =====
        function setCurlCmd() {
            const k = document.getElementById('set-key').value || 'my-key';
            const v = document.getElementById('set-value').value || 'my-value';
            return "curl -s -X POST -H \\"Authorization: Bearer $KV_TOKEN\\" -H 'Content-Type: application/json' \\\\\\n  -d " + shellQuote(JSON.stringify({ key: k, value: v })) + " \\\\\\n  \\"$KV_BASE/api/kv-admin\\"";
        }
        function getCurlCmd() {
            const k = document.getElementById('get-key').value || 'my-key';
            return 'curl -s -H "Authorization: Bearer $KV_TOKEN" "$KV_BASE/api/kv-admin?action=get&key=' + encodeURIComponent(k) + '"';
        }
        function listCurlCmd() {
            const p = document.getElementById('list-prefix').value;
            const base = 'curl -s -H "Authorization: Bearer $KV_TOKEN" "$KV_BASE/api/kv-admin?action=list&limit=20';
            return base + (p ? '&prefix=' + encodeURIComponent(p) : '') + '"';
        }
        function delCurlCmd() {
            const k = document.getElementById('del-key').value || 'my-key';
            return 'curl -s -X DELETE -H "Authorization: Bearer $KV_TOKEN" "$KV_BASE/api/kv-admin?key=' + encodeURIComponent(k) + '"';
        }
        function itemGetCurl(k) {
            return 'curl -s -H "Authorization: Bearer $KV_TOKEN" "$KV_BASE/api/kv-admin?action=get&key=' + encodeURIComponent(k) + '"';
        }
        function itemDelCurl(k) {
            return 'curl -s -X DELETE -H "Authorization: Bearer $KV_TOKEN" "$KV_BASE/api/kv-admin?key=' + encodeURIComponent(k) + '"';
        }

        function renderCurls() {
            document.getElementById('export-snippet').textContent =
                "export KV_BASE=" + shellQuote(location.origin) + "\\nexport KV_TOKEN=" + shellQuote(getToken() || '你的KV_ADMIN_TOKEN');
            document.getElementById('set-curl').textContent = setCurlCmd();
            document.getElementById('get-curl').textContent = getCurlCmd();
            document.getElementById('list-curl').textContent = listCurlCmd();
            document.getElementById('del-curl').textContent = delCurlCmd();
        }

        // ===== API 操作（网页走登录态） =====
        function authHeaders() {
            const h = { 'Content-Type': 'application/json' };
            const t = getToken();
            if (t) h['Authorization'] = 'Bearer ' + t;
            return h;
        }

        async function kvSet() {
            const key = document.getElementById('set-key').value.trim();
            const value = document.getElementById('set-value').value;
            if (!key) return showToast('Key 不能为空', 'error');
            if (!value) return showToast('Value 不能为空', 'error');
            const btn = document.getElementById('set-btn');
            btn.disabled = true;
            try {
                const r = await fetch(API, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ key, value }) });
                const d = await r.json();
                if (d.success) {
                    showToast('已保存：' + key + '（' + d.size + ' 字符）');
                    renderCurls();
                } else {
                    showToast(d.error || '保存失败', 'error');
                }
            } catch (e) {
                showToast('请求失败: ' + e.message, 'error');
            } finally {
                btn.disabled = false;
            }
        }

        async function kvGet() {
            const key = document.getElementById('get-key').value.trim();
            if (!key) return showToast('请输入 Key', 'error');
            const box = document.getElementById('get-result');
            box.innerHTML = '<div class="empty-state">读取中...</div>';
            try {
                const r = await fetch(API + '?action=get&key=' + encodeURIComponent(key), { headers: authHeaders() });
                const d = await r.json();
                if (d.success) {
                    box.innerHTML = d.found
                        ? '<div class="value-preview">' + escapeHtml(d.value) + '</div>'
                        : '<div class="empty-state">Key 不存在</div>';
                } else {
                    box.innerHTML = '';
                    showToast(d.error || '读取失败', 'error');
                }
            } catch (e) {
                box.innerHTML = '';
                showToast('请求失败: ' + e.message, 'error');
            }
        }

        async function kvList(append) {
            const prefix = document.getElementById('list-prefix').value.trim();
            const btn = document.getElementById('list-btn');
            btn.disabled = true;
            try {
                let u = API + '?action=list&limit=20' + (prefix ? '&prefix=' + encodeURIComponent(prefix) : '');
                if (append && listCursor) u += '&cursor=' + encodeURIComponent(listCursor);
                const r = await fetch(u, { headers: authHeaders() });
                const d = await r.json();
                if (d.success) {
                    listKeys = append ? listKeys.concat(d.keys) : d.keys;
                    listCursor = d.cursor;
                    renderList(d.list_complete);
                    renderCurls();
                } else {
                    showToast(d.error || '罗列失败', 'error');
                }
            } catch (e) {
                showToast('请求失败: ' + e.message, 'error');
            } finally {
                btn.disabled = false;
            }
        }

        function renderList(listComplete) {
            const el = document.getElementById('kv-list');
            const info = document.getElementById('list-info');
            const more = document.getElementById('more-btn');
            const prefix = document.getElementById('list-prefix').value.trim();

            if (listKeys.length === 0) {
                el.innerHTML = '<div class="empty-state">没有找到 Key</div>';
                info.textContent = '';
                more.style.display = 'none';
                return;
            }

            info.textContent = '共显示 ' + listKeys.length + ' 个 Key' + (prefix ? '（前缀: ' + prefix + '）' : '') + (listComplete ? '，已全部加载' : '');
            more.style.display = listComplete ? 'none' : 'inline-block';

            el.innerHTML = listKeys.map(k => {
                let meta = '';
                if (k.expiration) meta = '过期: ' + new Date(k.expiration * 1000).toLocaleString();
                return '<div class="kv-item">' +
                    '<span class="kv-key">' + escapeHtml(k.name) + '</span>' +
                    (meta ? '<span class="kv-meta">' + meta + '</span>' : '') +
                    '<span class="kv-actions">' +
                    '<button class="btn small gray" onclick="viewKey(' + "'" + escapeAttr(k.name) + "'" + ')">查看</button>' +
                    '<button class="btn small gray" onclick="copyText(itemGetCurl(' + "'" + escapeAttr(k.name) + "'" + '))">curl</button>' +
                    '<button class="btn small red" onclick="deleteKey(' + "'" + escapeAttr(k.name) + "'" + ')">删除</button>' +
                    '</span></div>';
            }).join('');
        }

        async function viewKey(name) {
            try {
                const r = await fetch(API + '?action=get&key=' + encodeURIComponent(name), { headers: authHeaders() });
                const d = await r.json();
                if (d.success && d.found) {
                    document.getElementById('get-key').value = name;
                    document.getElementById('get-result').innerHTML = '<div class="value-preview">' + escapeHtml(d.value) + '</div>';
                    renderCurls();
                    document.getElementById('get-key').scrollIntoView({ behavior: 'smooth', block: 'center' });
                } else {
                    showToast('读取失败', 'error');
                }
            } catch (e) {
                showToast('请求失败: ' + e.message, 'error');
            }
        }

        async function deleteKey(name) {
            if (!confirm('确定删除 KV: ' + name + ' ？')) return;
            try {
                const r = await fetch(API + '?key=' + encodeURIComponent(name), { method: 'DELETE', headers: authHeaders() });
                const d = await r.json();
                if (d.success) {
                    listKeys = listKeys.filter(k => k.name !== name);
                    renderList(true);
                    showToast('已删除: ' + name);
                } else {
                    showToast(d.error || '删除失败', 'error');
                }
            } catch (e) {
                showToast('请求失败: ' + e.message, 'error');
            }
        }

        async function kvDelete() {
            const key = document.getElementById('del-key').value.trim();
            if (!key) return showToast('请输入 Key', 'error');
            if (!confirm('确定删除 KV: ' + key + ' ？')) return;
            try {
                const r = await fetch(API + '?key=' + encodeURIComponent(key), { method: 'DELETE', headers: authHeaders() });
                const d = await r.json();
                if (d.success) {
                    showToast('已删除: ' + key);
                    listKeys = listKeys.filter(k => k.name !== key);
                    renderList(true);
                    renderCurls();
                } else {
                    showToast(d.error || '删除失败', 'error');
                }
            } catch (e) {
                showToast('请求失败: ' + e.message, 'error');
            }
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text == null ? '' : String(text);
            return div.innerHTML;
        }

        function escapeAttr(text) {
            return String(text).replace(/'/g, "\\\\'").replace(/\\\\/g, '\\\\\\\\');
        }

        // ===== 登录后自动预置 token（仅网页登录态可拿到） =====
        async function autoPresetToken() {
            try {
                const r = await fetch(API + '?action=get-token');
                if (!r.ok) return; // 未登录则静默跳过，手动填入仍然可用
                const data = await r.json();
                if (data.success && data.token && data.token !== getToken()) {
                    document.getElementById('token-input').value = data.token;
                    localStorage.setItem('kv_admin_token', data.token);
                    renderCurls();
                    showToast('已自动预置 API Token', 'success');
                }
            } catch (e) { /* 静默：手动填入仍然可用 */ }
        }

        document.addEventListener('DOMContentLoaded', () => {
            document.getElementById('token-input').value = getToken();
            renderCurls();
            autoPresetToken();
            // 输入时实时更新 curl 样例
            ['set-key', 'set-value', 'get-key', 'list-prefix', 'del-key'].forEach(id => {
                document.getElementById(id).addEventListener('input', renderCurls);
            });
            document.getElementById('token-input').addEventListener('keydown', e => { if (e.key === 'Enter') saveToken(); });
            document.getElementById('set-key').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('set-value').focus(); });
            document.getElementById('get-key').addEventListener('keydown', e => { if (e.key === 'Enter') kvGet(); });
            document.getElementById('list-prefix').addEventListener('keydown', e => { if (e.key === 'Enter') kvList(); });
            document.getElementById('del-key').addEventListener('keydown', e => { if (e.key === 'Enter') kvDelete(); });
        });
    </script>
</body>
</html>
  `, { headers: { 'Content-Type': 'text/html;charset=UTF-8' } });
}
