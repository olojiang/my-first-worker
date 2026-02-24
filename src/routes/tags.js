import { jsonResponse } from '../utils/helpers.js';

// Tags API - 使用 KV 存储标签（带颜色）
export async function apiTags(request, env) {
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
      error: 'Tags operation failed', 
      message: e.message 
    }, 500);
  }
}
