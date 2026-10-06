import { jsonResponse } from '../utils/response.js';
import { getSession } from '../auth/session.js';

// 鉴权：GitHub 登录 session 或 API Token（与 kv-admin 共用 KV_ADMIN_TOKEN）
async function isAuthorized(request, env) {
  const session = await getSession(env, request);
  if (session && session.data.user) return true;

  const url = new URL(request.url);
  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim() || (url.searchParams.get('token') || '').trim();
  if (env.KV_ADMIN_TOKEN && token && token === env.KV_ADMIN_TOKEN) return true;

  return false;
}

// 表名/列名校验：只允许合法标识符，防注入（管理工具也要守规矩）
function isSafeIdent(name) {
  return typeof name === 'string' && /^[A-Za-z_][A-Za-z0-9_]*$/.test(name);
}

function identError(name) {
  return jsonResponse({ success: false, error: `非法标识符: ${name}（只允许字母/数字/下划线，且不以数字开头）` }, 400);
}

// 绑定值规范化：对象/数组转 JSON 字符串，布尔转 1/0
function normalizeValue(v) {
  if (v === undefined) return null;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (v !== null && typeof v === 'object') return JSON.stringify(v);
  return v;
}

async function listTables(env) {
  const r = await env.DB.prepare(
    `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`
  ).all();
  return (r.results || []).map(row => row.name);
}

async function getColumns(env, table) {
  // 优先 PRAGMA table_info，失败则退化为取一行样本推导列名
  try {
    const r = await env.DB.prepare(`PRAGMA table_info(${table})`).all();
    if (Array.isArray(r.results) && r.results.length > 0) {
      return r.results.map(c => ({
        name: c.name,
        type: c.type || '',
        pk: !!c.pk,
        notnull: !!c.notnull,
        dflt_value: c.dflt_value
      }));
    }
  } catch (e) { /* PRAGMA 不可用时走退化路径 */ }
  try {
    const r = await env.DB.prepare(`SELECT * FROM ${table} LIMIT 1`).all();
    if (r.results && r.results.length > 0) {
      return Object.keys(r.results[0]).map(name => ({ name, type: '', pk: false, notnull: false, dflt_value: null }));
    }
  } catch (e) { /* 空表且无 PRAGMA：列未知 */ }
  return [];
}

export async function apiD1Admin(request, env) {
  const url = new URL(request.url);
  const method = request.method;

  if (!(await isAuthorized(request, env))) {
    return jsonResponse({ success: false, error: '未授权：请先登录，或使用 Authorization: Bearer <KV_ADMIN_TOKEN>' }, 401);
  }

  // 下发 token（与 kv-admin 的 get-token 一致）
  if (method === 'GET' && url.searchParams.get('action') === 'get-token') {
    return jsonResponse({ success: true, token: env.KV_ADMIN_TOKEN || '' });
  }

  try {
    // ===== 罗列表（含每张表行数） =====
    if (method === 'GET' && url.searchParams.get('action') === 'tables') {
      const tables = await listTables(env);
      const withCounts = [];
      for (const t of tables) {
        let count = null;
        try {
          const c = await env.DB.prepare(`SELECT COUNT(*) AS c FROM ${t}`).first();
          count = c ? c.c : null;
        } catch (e) { count = null; }
        withCounts.push({ name: t, rows: count });
      }
      return jsonResponse({ success: true, tables: withCounts, count: withCounts.length });
    }

    // ===== 表结构 =====
    if (method === 'GET' && url.searchParams.get('action') === 'schema') {
      const table = url.searchParams.get('table') || '';
      if (!isSafeIdent(table)) return identError(table || '(空)');
      const master = await env.DB.prepare(
        `SELECT name, type, sql FROM sqlite_master WHERE tbl_name = ? AND sql IS NOT NULL ORDER BY CASE type WHEN 'table' THEN 0 WHEN 'index' THEN 1 ELSE 2 END`
      ).bind(table).all();
      const columns = await getColumns(env, table);
      return jsonResponse({ success: true, table, objects: master.results || [], columns });
    }

    // ===== 浏览行 =====
    if (method === 'GET' && url.searchParams.get('action') === 'rows') {
      const table = url.searchParams.get('table') || '';
      if (!isSafeIdent(table)) return identError(table || '(空)');
      const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '20', 10) || 20, 1), 200);
      const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10) || 0, 0);
      const r = await env.DB.prepare(`SELECT * FROM ${table} LIMIT ? OFFSET ?`).bind(limit, offset).all();
      const columns = await getColumns(env, table);
      return jsonResponse({
        success: true,
        table,
        columns: columns.map(c => c.name),
        rows: r.results || [],
        count: (r.results || []).length,
        limit,
        offset
      });
    }

    // ===== 写操作（POST，action 放 body） =====
    if (method === 'POST') {
      const body = await request.json();
      const action = body.action || '';

      // 插入: {action:'insert', table, data:{col:val}}
      if (action === 'insert') {
        const table = body.table || '';
        if (!isSafeIdent(table)) return identError(table || '(空)');
        const data = body.data || {};
        const cols = Object.keys(data);
        if (cols.length === 0) return jsonResponse({ success: false, error: 'data 不能为空' }, 400);
        for (const c of cols) if (!isSafeIdent(c)) return identError(c);
        const sql = `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`;
        const params = cols.map(c => normalizeValue(data[c]));
        const r = await env.DB.prepare(sql).bind(...params).run();
        return jsonResponse({
          success: true,
          action: 'insert',
          table,
          sql,
          last_row_id: r.meta ? r.meta.last_row_id : null,
          changes: r.meta ? r.meta.changes : null
        });
      }

      // 更新: {action:'update', table, id, data:{col:val}, idColumn?}
      if (action === 'update') {
        const table = body.table || '';
        if (!isSafeIdent(table)) return identError(table || '(空)');
        const idColumn = body.idColumn || 'id';
        if (!isSafeIdent(idColumn)) return identError(idColumn);
        const data = body.data || {};
        const cols = Object.keys(data);
        if (cols.length === 0) return jsonResponse({ success: false, error: 'data 不能为空' }, 400);
        for (const c of cols) if (!isSafeIdent(c)) return identError(c);
        if (body.id === undefined || body.id === null || body.id === '') {
          return jsonResponse({ success: false, error: 'id 不能为空' }, 400);
        }
        const sql = `UPDATE ${table} SET ${cols.map(c => `${c} = ?`).join(', ')} WHERE ${idColumn} = ?`;
        const params = [...cols.map(c => normalizeValue(data[c])), normalizeValue(body.id)];
        const r = await env.DB.prepare(sql).bind(...params).run();
        return jsonResponse({
          success: true,
          action: 'update',
          table,
          sql,
          changes: r.meta ? r.meta.changes : null
        });
      }

      // 自定义 SQL: {action:'query', sql, params?}
      if (action === 'query') {
        const sql = (body.sql || '').trim();
        if (!sql) return jsonResponse({ success: false, error: 'sql 不能为空' }, 400);
        const params = Array.isArray(body.params) ? body.params.map(normalizeValue) : [];
        const isRead = /^(select|pragma|explain|with)\b/i.test(sql);
        const stmt = env.DB.prepare(sql);
        let result;
        if (isRead) {
          const r = params.length ? await stmt.bind(...params).all() : await stmt.all();
          result = { rows: r.results || [], meta: r.meta || null };
        } else {
          const r = params.length ? await stmt.bind(...params).run() : await stmt.run();
          result = { rows: [], meta: r.meta || null };
        }
        return jsonResponse({ success: true, action: 'query', isRead, ...result });
      }

      return jsonResponse({ success: false, error: '未知 action，支持: insert / update / query' }, 400);
    }

    // ===== 删除行: DELETE ?table=x&id=1&idColumn=id =====
    if (method === 'DELETE') {
      const table = url.searchParams.get('table') || '';
      if (!isSafeIdent(table)) return identError(table || '(空)');
      const idColumn = url.searchParams.get('idColumn') || 'id';
      if (!isSafeIdent(idColumn)) return identError(idColumn);
      const id = url.searchParams.get('id');
      if (id === null || id === '') return jsonResponse({ success: false, error: '需要 id 参数' }, 400);
      const sql = `DELETE FROM ${table} WHERE ${idColumn} = ?`;
      const r = await env.DB.prepare(sql).bind(normalizeValue(id)).run();
      return jsonResponse({
        success: true,
        action: 'delete',
        table,
        sql,
        changes: r.meta ? r.meta.changes : null
      });
    }

    return jsonResponse({ success: false, error: '不支持的方法' }, 400);
  } catch (e) {
    return jsonResponse({ success: false, error: 'D1 操作失败', message: e.message }, 500);
  }
}
