// 资源信息 API
import { jsonResponse } from '../utils/helpers.js';

/**
 * 获取资源使用情况
 */
export async function apiResources(request, env) {
  try {
    // 获取 KV 数量
    let kvCount = 0;
    try {
      const kvList = await env.CACHE.list();
      kvCount = kvList.keys ? kvList.keys.length : 0;
    } catch (e) {
      console.error('获取 KV 数量失败:', e);
    }

    // 获取 D1 记录数
    let dbCount = 0;
    try {
      const dbResult = await env.DB.prepare('SELECT COUNT(*) as count FROM todos').all();
      dbCount = dbResult.results?.[0]?.count || 0;
    } catch (e) {
      console.error('获取 D1 数量失败:', e);
    }

    // 获取 R2 对象数
    let r2Count = 0;
    try {
      const r2List = await env.STORAGE.list();
      r2Count = r2List.objects ? r2List.objects.length : 0;
    } catch (e) {
      console.error('获取 R2 数量失败:', e);
    }

    return jsonResponse({
      success: true,
      kv: {
        count: kvCount,
        limit: 1000000, // 1 million keys
        percent: Math.round((kvCount / 1000000) * 100)
      },
      db: {
        count: dbCount,
        limit: 500000, // 500k rows
        percent: Math.round((dbCount / 500000) * 100)
      },
      r2: {
        count: r2Count
      }
    });
  } catch (e) {
    return jsonResponse({
      success: false,
      error: '获取资源信息失败',
      message: e.message
    }, 500);
  }
}
