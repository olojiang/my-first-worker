import { jsonResponse } from '../utils/response.js';

export function d1Page() {
  return new Response(`
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <title>📐 D1 管理</title>
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
            background: linear-gradient(135deg, #312e81 0%, #4f46e5 100%);
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

        .switch-link {
            position: absolute;
            right: 20px;
            top: 50%;
            transform: translateY(-50%);
            color: white;
            text-decoration: none;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 6px;
            background: rgba(255,255,255,0.15);
            padding: 6px 14px;
            border-radius: 20px;
            transition: background 0.2s ease;
        }

        .switch-link:hover { background: rgba(255,255,255,0.28); }

        .container {
            max-width: 820px;
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
            color: #312e81;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .row {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }

        .row input, .row select, .row textarea {
            flex: 1;
            min-width: 120px;
            padding: 12px 14px;
            border: 2px solid #e0e0e0;
            border-radius: 10px;
            font-size: 15px;
            outline: none;
            transition: border-color 0.2s;
            font-family: inherit;
            background: white;
        }

        .row select {
            font-family: 'SF Mono', Menlo, Consolas, monospace;
            font-size: 14px;
        }

        .row input:focus, .row select:focus, .row textarea:focus {
            border-color: #4f46e5;
        }

        .row textarea.json-input {
            width: 100%;
            min-height: 88px;
            resize: vertical;
            font-family: 'SF Mono', Menlo, Consolas, monospace;
            font-size: 13px;
        }

        .row textarea.sql-input {
            width: 100%;
            min-height: 96px;
            resize: vertical;
            font-family: 'SF Mono', Menlo, Consolas, monospace;
            font-size: 13px;
        }

        .input-sm { max-width: 110px; }

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

        .btn.indigo {
            background: linear-gradient(135deg, #4f46e5 0%, #818cf8 100%);
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

        .list-info {
            font-size: 12px;
            color: #888;
            margin: 8px 0;
        }

        .table-wrap {
            overflow-x: auto;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            margin-top: 10px;
        }

        .table-wrap table {
            border-collapse: collapse;
            width: 100%;
            min-width: 480px;
        }

        .table-wrap th, .table-wrap td {
            padding: 8px 10px;
            font-size: 12px;
            text-align: left;
            border-bottom: 1px solid #f0f0f0;
            font-family: 'SF Mono', Menlo, Consolas, monospace;
            overflow-wrap: anywhere;
            max-width: 240px;
        }

        .table-wrap th {
            background: #eef2ff;
            color: #312e81;
            position: sticky;
            top: 0;
            white-space: nowrap;
        }

        .table-wrap tr:last-child td { border-bottom: none; }

        .null-cell { color: #c0c0c0; font-style: italic; }

        .row-actions { white-space: nowrap; }
        .row-actions .btn { margin-right: 4px; }

        .sql-result {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 10px 12px;
            font-size: 12px;
            font-family: 'SF Mono', Menlo, Consolas, monospace;
            overflow-x: auto;
            white-space: pre-wrap;
            word-break: break-all;
            max-height: 260px;
            overflow-y: auto;
            margin-top: 10px;
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
            .back-link { left: 12px; font-size: 13px; }
            .switch-link { right: 12px; font-size: 12px; padding: 5px 10px; }
        }
    </style>
</head>
<body>
    <div class="header">
        <a href="/todos" class="back-link"><i class="fas fa-arrow-left"></i> 返回</a>
        <h1><i class="fas fa-table"></i> D1 管理</h1>
        <a href="/kv" class="switch-link"><i class="fas fa-database"></i> KV 管理</a>
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
                网页操作走登录态，无需 token；下面生成的 curl 样例会带上它（与 KV 管理页共用同一个 token）。
            </div>
            <div class="curl-box">
                <div class="curl-title"><span>命令行环境变量</span><button class="copy-btn" onclick="copyText('export D1_BASE='+shellQuote(location.origin)+'\\\\nexport D1_TOKEN='+shellQuote(getToken()||'你的KV_ADMIN_TOKEN'))">复制</button></div>
                <pre id="export-snippet"></pre>
            </div>
        </div>

        <!-- 表浏览 -->
        <div class="card">
            <h2>📋 浏览数据</h2>
            <div class="row">
                <select id="browse-table" class="d1-table"></select>
                <input type="number" id="browse-limit" class="input-sm" value="20" min="1" max="200" title="每页行数">
                <button class="btn" onclick="fetchRows()">刷新</button>
            </div>
            <div class="row" style="margin-top:10px;">
                <button class="btn small gray" onclick="fetchRows(Math.max(0, curOffset - (parseInt(document.getElementById('browse-limit').value)||20)))">← 上一页</button>
                <button class="btn small gray" onclick="fetchRows(curOffset + (parseInt(document.getElementById('browse-limit').value)||20))">下一页 →</button>
            </div>
            <div class="list-info" id="rows-info"></div>
            <div id="rows-box"><div class="empty-state">选择表后自动加载</div></div>
            <div class="curl-box">
                <div class="curl-title"><span>curl 样例（浏览行）</span><button class="copy-btn" onclick="copyText(rowsCurlCmd())">复制</button></div>
                <pre id="rows-curl"></pre>
            </div>
            <div class="curl-box">
                <div class="curl-title"><span>curl 样例（罗列表）</span><button class="copy-btn" onclick="copyText(tablesCurlCmd())">复制</button></div>
                <pre id="tables-curl"></pre>
            </div>
        </div>

        <!-- 表结构 -->
        <div class="card">
            <h2>🏗️ 表结构</h2>
            <div class="row">
                <select id="schema-table" class="d1-table"></select>
                <button class="btn indigo" onclick="loadSchema()">查看结构</button>
            </div>
            <div id="schema-box"><div class="empty-state">点击「查看结构」显示列信息和建表 SQL</div></div>
            <div class="curl-box">
                <div class="curl-title"><span>curl 样例</span><button class="copy-btn" onclick="copyText(schemaCurlCmd())">复制</button></div>
                <pre id="schema-curl"></pre>
            </div>
        </div>

        <!-- 插入 -->
        <div class="card">
            <h2>➕ 插入行</h2>
            <div class="row">
                <select id="insert-table" class="d1-table"></select>
            </div>
            <div class="row" style="margin-top:10px;">
                <textarea class="json-input" id="insert-data" placeholder='JSON 数据，例如: {"title": "买牛奶", "done": 0}'></textarea>
            </div>
            <div class="row" style="margin-top:10px;">
                <button class="btn" onclick="insertRow()">插入</button>
            </div>
            <div class="curl-box">
                <div class="curl-title"><span>curl 样例</span><button class="copy-btn" onclick="copyText(insertCurlCmd())">复制</button></div>
                <pre id="insert-curl"></pre>
            </div>
        </div>

        <!-- 更新 -->
        <div class="card" id="update-card">
            <h2>✏️ 更新行</h2>
            <div class="row">
                <select id="update-table" class="d1-table"></select>
                <input type="text" id="update-idcol" placeholder="id 列名" value="id" style="max-width:130px;">
                <input type="text" id="update-id" placeholder="id 值" style="max-width:130px;">
            </div>
            <div class="row" style="margin-top:10px;">
                <textarea class="json-input" id="update-data" placeholder='要更新的字段 JSON，例如: {"done": 1}'></textarea>
            </div>
            <div class="row" style="margin-top:10px;">
                <button class="btn" onclick="updateRow()">更新</button>
            </div>
            <div class="curl-box">
                <div class="curl-title"><span>curl 样例</span><button class="copy-btn" onclick="copyText(updateCurlCmd())">复制</button></div>
                <pre id="update-curl"></pre>
            </div>
        </div>

        <!-- 删除 -->
        <div class="card">
            <h2>🗑️ 删除行</h2>
            <div class="row">
                <select id="del-table" class="d1-table"></select>
                <input type="text" id="del-idcol" placeholder="id 列名" value="id" style="max-width:130px;">
                <input type="text" id="del-id" placeholder="id 值" style="max-width:130px;">
                <button class="btn red" onclick="deleteRowForm()">删除</button>
            </div>
            <div class="token-hint">⚠️ 删除不可恢复，建议先在「浏览数据」里确认目标行。</div>
            <div class="curl-box">
                <div class="curl-title"><span>curl 样例</span><button class="copy-btn" onclick="copyText(delCurlCmd())">复制</button></div>
                <pre id="del-curl"></pre>
            </div>
        </div>

        <!-- SQL -->
        <div class="card">
            <h2>🧪 自定义 SQL</h2>
            <div class="row">
                <textarea class="sql-input" id="sql-input" placeholder="SELECT * FROM todos LIMIT 5&#10;（select/pragma/explain/with 返回行，其他语句返回 changes）"></textarea>
            </div>
            <div class="row" style="margin-top:10px;">
                <textarea class="json-input" id="sql-params" style="min-height:52px;" placeholder='可选绑定参数（JSON 数组），例如: [1, "abc"]'></textarea>
            </div>
            <div class="row" style="margin-top:10px;">
                <button class="btn indigo" onclick="runSql()">执行</button>
            </div>
            <div id="sql-result"></div>
            <div class="curl-box">
                <div class="curl-title"><span>curl 样例</span><button class="copy-btn" onclick="copyText(sqlCurlCmd())">复制</button></div>
                <pre id="sql-curl"></pre>
            </div>
        </div>
    </div>

    <div class="toast" id="toast"></div>

    <script>
        const API = '/api/d1-admin';
        let tables = [];
        let lastRows = [];
        let curOffset = 0;

        function getToken() {
            return localStorage.getItem('kv_admin_token') || '';
        }

        function saveToken() {
            const v = document.getElementById('token-input').value.trim();
            localStorage.setItem('kv_admin_token', v);
            renderCurls();
            showToast(v ? 'Token 已保存' : 'Token 已清空');
        }

        function val(id) {
            return document.getElementById(id).value.trim();
        }

        function showToast(msg, type) {
            const t = document.getElementById('toast');
            t.textContent = msg;
            t.className = 'toast ' + (type || 'success');
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

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text == null ? '' : String(text);
            return div.innerHTML;
        }

        function escapeAttr(text) {
            return String(text).replace(/'/g, "\\\\'").replace(/\\\\/g, '\\\\\\\\');
        }

        function authHeaders() {
            const h = { 'Content-Type': 'application/json' };
            const t = getToken();
            if (t) h['Authorization'] = 'Bearer ' + t;
            return h;
        }

        // ===== curl 命令生成 =====
        function tablesCurlCmd() {
            return 'curl -s -H "Authorization: Bearer $D1_TOKEN" "$D1_BASE/api/d1-admin?action=tables"';
        }
        function schemaCurlCmd() {
            const t = val('schema-table') || val('browse-table') || 'todos';
            return 'curl -s -H "Authorization: Bearer $D1_TOKEN" "$D1_BASE/api/d1-admin?action=schema&table=' + encodeURIComponent(t) + '"';
        }
        function rowsCurlCmd() {
            const t = val('browse-table') || 'todos';
            const limit = parseInt(val('browse-limit'), 10) || 20;
            return 'curl -s -H "Authorization: Bearer $D1_TOKEN" "$D1_BASE/api/d1-admin?action=rows&table=' + encodeURIComponent(t) + '&limit=' + limit + '&offset=' + curOffset + '"';
        }
        function insertCurlCmd() {
            const t = val('insert-table') || 'todos';
            let data;
            try { data = JSON.parse(val('insert-data') || '{}'); } catch (e) { data = { col: 'value' }; }
            return "curl -s -X POST -H \\"Authorization: Bearer $D1_TOKEN\\" -H 'Content-Type: application/json' \\\\\\n  -d " + shellQuote(JSON.stringify({ action: 'insert', table: t, data: data })) + " \\\\\\n  \\"$D1_BASE/api/d1-admin\\"";
        }
        function updateCurlCmd() {
            const t = val('update-table') || 'todos';
            const id = val('update-id') || '1';
            const idCol = val('update-idcol') || 'id';
            let data;
            try { data = JSON.parse(val('update-data') || '{}'); } catch (e) { data = { col: 'value' }; }
            return "curl -s -X POST -H \\"Authorization: Bearer $D1_TOKEN\\" -H 'Content-Type: application/json' \\\\\\n  -d " + shellQuote(JSON.stringify({ action: 'update', table: t, id: id, idColumn: idCol, data: data })) + " \\\\\\n  \\"$D1_BASE/api/d1-admin\\"";
        }
        function delCurlCmd() {
            const t = val('del-table') || 'todos';
            const id = val('del-id') || '1';
            const idCol = val('del-idcol') || 'id';
            return 'curl -s -X DELETE -H "Authorization: Bearer $D1_TOKEN" "$D1_BASE/api/d1-admin?table=' + encodeURIComponent(t) + '&id=' + encodeURIComponent(id) + '&idColumn=' + encodeURIComponent(idCol) + '"';
        }
        function sqlCurlCmd() {
            const sql = document.getElementById('sql-input').value.trim() || 'SELECT * FROM todos LIMIT 5';
            let params = [];
            try { params = JSON.parse(val('sql-params') || '[]'); } catch (e) { params = []; }
            if (!Array.isArray(params)) params = [];
            return "curl -s -X POST -H \\"Authorization: Bearer $D1_TOKEN\\" -H 'Content-Type: application/json' \\\\\\n  -d " + shellQuote(JSON.stringify({ action: 'query', sql: sql, params: params })) + " \\\\\\n  \\"$D1_BASE/api/d1-admin\\"";
        }

        function renderCurls() {
            document.getElementById('export-snippet').textContent =
                "export D1_BASE=" + shellQuote(location.origin) + "\\nexport D1_TOKEN=" + shellQuote(getToken() || '你的KV_ADMIN_TOKEN');
            document.getElementById('tables-curl').textContent = tablesCurlCmd();
            document.getElementById('schema-curl').textContent = schemaCurlCmd();
            document.getElementById('rows-curl').textContent = rowsCurlCmd();
            document.getElementById('insert-curl').textContent = insertCurlCmd();
            document.getElementById('update-curl').textContent = updateCurlCmd();
            document.getElementById('del-curl').textContent = delCurlCmd();
            document.getElementById('sql-curl').textContent = sqlCurlCmd();
        }

        // ===== 表罗列 =====
        async function loadTables(keepSelection) {
            try {
                const r = await fetch(API + '?action=tables', { headers: authHeaders() });
                const d = await r.json();
                if (!d.success) { showToast(d.error || '加载表失败', 'error'); return; }
                tables = d.tables || [];
                document.querySelectorAll('select.d1-table').forEach(sel => {
                    const prev = keepSelection ? sel.value : '';
                    sel.innerHTML = tables.length
                        ? tables.map(t => '<option value="' + escapeAttr(t.name) + '">' + escapeHtml(t.name) + (t.rows == null ? '' : ' (' + t.rows + '行)') + '</option>').join('')
                        : '<option value="">（数据库无表）</option>';
                    if (prev && tables.some(t => t.name === prev)) sel.value = prev;
                });
                renderCurls();
            } catch (e) {
                showToast('请求失败: ' + e.message, 'error');
            }
        }

        // ===== 浏览行 =====
        async function fetchRows(newOffset) {
            const t = val('browse-table');
            if (!t) { showToast('请先选择表', 'error'); return; }
            if (newOffset !== undefined && newOffset !== null && !isNaN(newOffset)) curOffset = Math.max(0, newOffset);
            const limit = Math.min(Math.max(parseInt(val('browse-limit'), 10) || 20, 1), 200);
            const btns = document.querySelectorAll('#rows-box ~ * button, .card button');
            try {
                const u = API + '?action=rows&table=' + encodeURIComponent(t) + '&limit=' + limit + '&offset=' + curOffset;
                const r = await fetch(u, { headers: authHeaders() });
                const d = await r.json();
                if (d.success) {
                    renderRows(d);
                } else {
                    showToast(d.error || '读取失败', 'error');
                }
            } catch (e) {
                showToast('请求失败: ' + e.message, 'error');
            }
            renderCurls();
        }

        function fmtCell(v) {
            if (v === null || v === undefined) return '<span class="null-cell">NULL</span>';
            return escapeHtml(String(v));
        }

        function renderRows(d) {
            lastRows = d.rows || [];
            const cols = d.columns || (lastRows[0] ? Object.keys(lastRows[0]) : []);
            document.getElementById('rows-info').textContent =
                '表 ' + d.table + '：从 offset ' + d.offset + ' 起返回 ' + lastRows.length + ' 行' + (lastRows.length >= d.limit ? '（可能还有更多）' : '');

            const box = document.getElementById('rows-box');
            if (!lastRows.length) {
                box.innerHTML = '<div class="empty-state">没有数据（该区间为空）</div>';
                return;
            }

            let html = '<div class="table-wrap"><table><thead><tr>' +
                cols.map(c => '<th>' + escapeHtml(c) + '</th>').join('') +
                '<th>操作</th></tr></thead><tbody>';
            lastRows.forEach((row, i) => {
                html += '<tr>' + cols.map(c => '<td>' + fmtCell(row[c]) + '</td>').join('');
                const idCol = ('id' in row) ? 'id' : cols[0];
                html += '<td class="row-actions">' +
                    '<button class="btn small gray" onclick="editRow(' + i + ')">编辑</button>' +
                    '<button class="btn small red" onclick="deleteRowByIdx(' + i + ')">删除</button>' +
                    '</td></tr>';
            });
            html += '</tbody></table></div>';
            box.innerHTML = html;
        }

        // ===== 表结构 =====
        async function loadSchema() {
            const t = val('schema-table');
            if (!t) { showToast('请先选择表', 'error'); return; }
            const box = document.getElementById('schema-box');
            box.innerHTML = '<div class="empty-state">加载中...</div>';
            try {
                const r = await fetch(API + '?action=schema&table=' + encodeURIComponent(t), { headers: authHeaders() });
                const d = await r.json();
                if (!d.success) { box.innerHTML = ''; showToast(d.error || '读取失败', 'error'); return; }
                let html = '';
                if (d.columns && d.columns.length) {
                    html += '<div class="table-wrap"><table><thead><tr><th>列名</th><th>类型</th><th>主键</th><th>非空</th><th>默认值</th></tr></thead><tbody>' +
                        d.columns.map(c => '<tr><td>' + escapeHtml(c.name) + '</td><td>' + escapeHtml(c.type || '-') + '</td><td>' + (c.pk ? '✓' : '') + '</td><td>' + (c.notnull ? '✓' : '') + '</td><td>' + (c.dflt_value == null ? '-' : escapeHtml(String(c.dflt_value))) + '</td></tr>').join('') +
                        '</tbody></table></div>';
                }
                if (d.objects && d.objects.length) {
                    html += '<div class="sql-result">' + escapeHtml(d.objects.map(o => '-- ' + o.type + ': ' + o.name + '\\n' + o.sql).join('\\n\\n')) + '</div>';
                }
                box.innerHTML = html || '<div class="empty-state">未获取到结构信息</div>';
            } catch (e) {
                box.innerHTML = '';
                showToast('请求失败: ' + e.message, 'error');
            }
            renderCurls();
        }

        // ===== 插入 =====
        async function insertRow() {
            const t = val('insert-table');
            if (!t) return showToast('请选择表', 'error');
            let data;
            try { data = JSON.parse(val('insert-data') || '{}'); } catch (e) { return showToast('JSON 格式错误: ' + e.message, 'error'); }
            if (!data || typeof data !== 'object' || Array.isArray(data) || Object.keys(data).length === 0) {
                return showToast('data 需要非空 JSON 对象', 'error');
            }
            try {
                const r = await fetch(API, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ action: 'insert', table: t, data: data }) });
                const d = await r.json();
                if (d.success) {
                    showToast('已插入，last_row_id=' + d.last_row_id);
                    fetchRows(0);
                    loadTables(true);
                } else {
                    showToast(d.error || '插入失败', 'error');
                }
            } catch (e) {
                showToast('请求失败: ' + e.message, 'error');
            }
        }

        // ===== 更新 =====
        async function updateRow() {
            const t = val('update-table');
            if (!t) return showToast('请选择表', 'error');
            const idCol = val('update-idcol') || 'id';
            const id = val('update-id');
            if (id === '') return showToast('id 不能为空', 'error');
            let data;
            try { data = JSON.parse(val('update-data') || '{}'); } catch (e) { return showToast('JSON 格式错误: ' + e.message, 'error'); }
            if (!data || typeof data !== 'object' || Array.isArray(data) || Object.keys(data).length === 0) {
                return showToast('data 需要非空 JSON 对象', 'error');
            }
            try {
                const r = await fetch(API, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ action: 'update', table: t, id: id, idColumn: idCol, data: data }) });
                const d = await r.json();
                if (d.success) {
                    showToast('已更新 ' + d.changes + ' 行');
                    fetchRows();
                } else {
                    showToast(d.error || '更新失败', 'error');
                }
            } catch (e) {
                showToast('请求失败: ' + e.message, 'error');
            }
        }

        // ===== 删除（表单按钮） =====
        async function deleteRowForm() {
            const t = val('del-table');
            if (!t) return showToast('请选择表', 'error');
            const idCol = val('del-idcol') || 'id';
            const id = val('del-id');
            if (id === '') return showToast('id 不能为空', 'error');
            if (!confirm('确定删除 ' + t + ' 中 ' + idCol + '=' + id + ' 的行？')) return;
            try {
                const u = API + '?table=' + encodeURIComponent(t) + '&id=' + encodeURIComponent(id) + '&idColumn=' + encodeURIComponent(idCol);
                const r = await fetch(u, { method: 'DELETE', headers: authHeaders() });
                const d = await r.json();
                if (d.success) {
                    showToast('已删除 ' + d.changes + ' 行');
                    fetchRows();
                    loadTables(true);
                } else {
                    showToast(d.error || '删除失败', 'error');
                }
            } catch (e) {
                showToast('请求失败: ' + e.message, 'error');
            }
        }

        // ===== 删除（行内按钮） =====
        async function deleteRowByIdx(i) {
            const row = lastRows[i];
            if (!row) return;
            const t = val('browse-table');
            const idCol = ('id' in row) ? 'id' : Object.keys(row)[0];
            const id = row[idCol];
            if (!confirm('确定删除 ' + t + ' 中 ' + idCol + '=' + id + ' 的行？')) return;
            try {
                const u = API + '?table=' + encodeURIComponent(t) + '&id=' + encodeURIComponent(id) + '&idColumn=' + encodeURIComponent(idCol);
                const r = await fetch(u, { method: 'DELETE', headers: authHeaders() });
                const d = await r.json();
                if (d.success) {
                    showToast('已删除 ' + d.changes + ' 行');
                    fetchRows();
                    loadTables(true);
                } else {
                    showToast(d.error || '删除失败', 'error');
                }
            } catch (e) {
                showToast('请求失败: ' + e.message, 'error');
            }
        }

        // ===== 编辑（行内按钮，填充更新表单） =====
        function editRow(i) {
            const row = lastRows[i];
            if (!row) return;
            const t = val('browse-table');
            const idCol = ('id' in row) ? 'id' : Object.keys(row)[0];
            const sel = document.getElementById('update-table');
            if (Array.from(sel.options).some(o => o.value === t)) sel.value = t;
            document.getElementById('update-idcol').value = idCol;
            document.getElementById('update-id').value = row[idCol] == null ? '' : row[idCol];
            const data = Object.assign({}, row);
            delete data[idCol];
            document.getElementById('update-data').value = JSON.stringify(data);
            renderCurls();
            document.getElementById('update-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
            showToast('已填充更新表单，改完点「更新」');
        }

        // ===== 自定义 SQL =====
        async function runSql() {
            const sql = document.getElementById('sql-input').value.trim();
            if (!sql) return showToast('SQL 不能为空', 'error');
            let params = [];
            const pTxt = val('sql-params');
            if (pTxt) {
                try { params = JSON.parse(pTxt); } catch (e) { return showToast('params JSON 格式错误: ' + e.message, 'error'); }
                if (!Array.isArray(params)) return showToast('params 需要是 JSON 数组，例如 [1, "abc"]', 'error');
            }
            const box = document.getElementById('sql-result');
            box.innerHTML = '<div class="empty-state">执行中...</div>';
            try {
                const r = await fetch(API, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ action: 'query', sql: sql, params: params }) });
                const d = await r.json();
                if (!d.success) { box.innerHTML = ''; showToast(d.error || '执行失败', 'error'); return; }
                let html = '';
                if (d.isRead) {
                    const rows = d.rows || [];
                    if (rows.length) {
                        const cols = Object.keys(rows[0]);
                        const shown = rows.slice(0, 200);
                        html += '<div class="table-wrap"><table><thead><tr>' + cols.map(c => '<th>' + escapeHtml(c) + '</th>').join('') + '</tr></thead><tbody>' +
                            shown.map(row => '<tr>' + cols.map(c => '<td>' + fmtCell(row[c]) + '</td>').join('') + '</tr>').join('') +
                            '</tbody></table></div>';
                        if (rows.length > 200) html += '<div class="list-info">仅显示前 200 行（共 ' + rows.length + ' 行）</div>';
                    } else {
                        html += '<div class="empty-state">查询成功，0 行</div>';
                    }
                } else {
                    html += '<div class="sql-result">执行成功（写操作）</div>';
                }
                if (d.meta) html += '<div class="sql-result">meta: ' + escapeHtml(JSON.stringify(d.meta)) + '</div>';
                box.innerHTML = html;
            } catch (e) {
                box.innerHTML = '';
                showToast('请求失败: ' + e.message, 'error');
            }
            renderCurls();
        }

        // ===== 登录后自动预置 token（与 KV 管理页共用） =====
        async function autoPresetToken() {
            try {
                const r = await fetch(API + '?action=get-token');
                if (!r.ok) return;
                const data = await r.json();
                if (data.success && data.token && data.token !== getToken()) {
                    document.getElementById('token-input').value = data.token;
                    localStorage.setItem('kv_admin_token', data.token);
                    renderCurls();
                    showToast('已自动预置 API Token');
                }
            } catch (e) { /* 静默 */ }
        }

        document.addEventListener('DOMContentLoaded', () => {
            document.getElementById('token-input').value = getToken();
            renderCurls();
            autoPresetToken();
            loadTables(false).then(() => { if (val('browse-table')) fetchRows(0); });
            ['browse-limit', 'insert-data', 'update-data', 'update-id', 'update-idcol', 'del-id', 'del-idcol', 'sql-input', 'sql-params'].forEach(id => {
                document.getElementById(id).addEventListener('input', renderCurls);
            });
            document.querySelectorAll('select.d1-table').forEach(sel => {
                sel.addEventListener('change', renderCurls);
            });
            document.getElementById('browse-table').addEventListener('change', () => fetchRows(0));
            document.getElementById('token-input').addEventListener('keydown', e => { if (e.key === 'Enter') saveToken(); });
            document.getElementById('sql-input').addEventListener('keydown', e => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) runSql();
            });
        });
    </script>
</body>
</html>
  `, { headers: { 'Content-Type': 'text/html;charset=UTF-8' } });
}
