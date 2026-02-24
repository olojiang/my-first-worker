import { jsonResponse } from '../utils/helpers.js';

// 文件上传 API - 上传到 R2
export async function apiUpload(request, env) {
  if (request.method !== 'POST') {
    return jsonResponse({ success: false, error: 'Method not allowed' }, 405);
  }
  
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const todoId = formData.get('todoId');
    
    if (!file) {
      return jsonResponse({ success: false, error: 'No file provided' }, 400);
    }
    
    // 检查文件大小 (5MB = 5 * 1024 * 1024 bytes)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return jsonResponse({ success: false, error: 'File too large (max 5MB)' }, 400);
    }
    
    // 生成唯一文件名
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 10);
    const fileExt = file.name.split('.').pop();
    const key = `attachments/${todoId || 'temp'}/${timestamp}-${randomStr}.${fileExt}`;
    
    // 上传到 R2
    await env.STORAGE.put(key, file.stream(), {
      httpMetadata: {
        contentType: file.type,
        contentDisposition: `inline; filename="${file.name}"`
      },
      customMetadata: {
        originalName: file.name,
        size: file.size.toString(),
        todoId: todoId || '',
        uploadedAt: new Date().toISOString()
      }
    });
    
    return jsonResponse({
      success: true,
      attachment: {
        key: key,
        name: file.name,
        size: file.size,
        type: file.type,
        url: `/api/attachments/${encodeURIComponent(key)}`
      }
    });
    
  } catch (e) {
    console.error('Upload error:', e);
    return jsonResponse({ 
      success: false, 
      error: 'Upload failed', 
      message: e.message 
    }, 500);
  }
}

// 附件访问 API - 从 R2 获取文件
export async function apiAttachments(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  
  // GET /api/attachments/:key - 获取文件
  if (request.method === 'GET' && path.startsWith('/api/attachments/')) {
    const key = decodeURIComponent(path.replace('/api/attachments/', ''));
    
    try {
      const object = await env.STORAGE.get(key);
      
      if (!object) {
        return jsonResponse({ success: false, error: 'File not found' }, 404);
      }
      
      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set('etag', object.httpEtag);
      headers.set('Access-Control-Allow-Origin', '*');
      headers.set('Access-Control-Allow-Methods', 'GET, DELETE');
      headers.set('Access-Control-Allow-Headers', '*');
      
      // 确保 Content-Type 被设置
      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/octet-stream');
      }
      
      return new Response(object.body, { headers });
      
    } catch (e) {
      console.error('Get attachment error:', e);
      return jsonResponse({ 
        success: false, 
        error: 'Failed to get file', 
        message: e.message 
      }, 500);
    }
  }
  
  // DELETE /api/attachments/:key - 删除文件
  if (request.method === 'DELETE' && path.startsWith('/api/attachments/')) {
    const key = decodeURIComponent(path.replace('/api/attachments/', ''));
    
    try {
      await env.STORAGE.delete(key);
      return jsonResponse({ success: true });
    } catch (e) {
      console.error('Delete attachment error:', e);
      return jsonResponse({ 
        success: false, 
        error: 'Failed to delete file', 
        message: e.message 
      }, 500);
    }
  }
  
  return jsonResponse({ error: 'Not Found' }, 404);
}
