import { jsonResponse } from '../utils/response.js';
import { getSession } from '../auth/session.js';

// 鉴权：GitHub 登录 session 或 API Token（命令行 curl 用）
async function isAuthorized(request, env) {
  const session = await getSession(env, request);
  if (session && session.data.user) return true;

  const url = new URL(request.url);
  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim() || (url.searchParams.get('token') || '').trim();
  if (env.KV_ADMIN_TOKEN && token && token === env.KV_ADMIN_TOKEN) return true;

  return false;
}

export async function apiKvAdmin(request, env) {
  const url = new URL(request.url);
  const method = request.method;
  const action = url.searchParams.get('action') || '';

  if (!(await isAuthorized(request, env))) {
    return jsonResponse({ success: false, error: '未授权：请先登录，或使用 Authorization: Bearer <KV_ADMIN_TOKEN>' }, 401);
  }

  // 下发 token（仅在鉴权通过后：网页登录态自动预填 curl 样例用）
  if (method === 'GET' && action === 'get-token') {
    return jsonResponse({ success: true, token: env.KV_ADMIN_TOKEN || '' });
  }

  try {
    // 罗列/搜索（前缀匹配）
    if (method === 'GET' && action === 'list') {
      const prefix = url.searchParams.get('prefix') || '';
      const cursor = url.searchParams.get('cursor') || undefined;
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10) || 20, 100);
      const listResult = await env.CACHE.list({
        prefix: prefix || undefined,
        cursor: cursor || undefined,
        limit
      });
      const keys = (listResult.keys || []).map(k => ({
        name: k.name,
        expiration: k.expiration || null,
        metadata: k.metadata || null
      }));
      return jsonResponse({
        success: true,
        keys,
        count: keys.length,
        list_complete: !!listResult.list_complete,
        cursor: listResult.list_complete ? null : (listResult.cursor || null)
      });
    }

    // 读取单个 key
    if (method === 'GET' && action === 'get') {
      const key = url.searchParams.get('key');
      if (!key) return jsonResponse({ success: false, error: '需要 key 参数' }, 400);
      const value = await env.CACHE.get(key);
      return jsonResponse({ success: true, key, value, found: value !== null });
    }

    // 写入（新建/更新）
    if (method === 'POST') {
      const body = await request.json();
      const key = (body.key || '').trim();
      const value = body.value;
      if (!key) return jsonResponse({ success: false, error: 'key 不能为空' }, 400);
      if (value === undefined || value === null || value === '') {
        return jsonResponse({ success: false, error: 'value 不能为空' }, 400);
      }
      await env.CACHE.put(key, String(value));
      return jsonResponse({ success: true, action: 'set', key, size: String(value).length });
    }

    // 删除
    if (method === 'DELETE') {
      const key = url.searchParams.get('key');
      if (!key) return jsonResponse({ success: false, error: '需要 key 参数' }, 400);
      await env.CACHE.delete(key);
      return jsonResponse({ success: true, action: 'delete', key });
    }

    return jsonResponse({ success: false, error: '未知操作' }, 400);
  } catch (e) {
    return jsonResponse({ success: false, error: 'KV 操作失败', message: e.message }, 500);
  }
}
