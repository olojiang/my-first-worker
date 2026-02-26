import { authLogin, authCallback, authLogout, apiMe } from './auth/oauth.js';
import { getSession } from './auth/session.js';
import { apiTodos } from './api/todos.js';
import { apiTags } from './api/tags.js';
import { apiUpload, apiAttachments } from './api/upload.js';
import { apiAI, apiAIOptimize } from './api/ai.js';
import { apiTime, apiWeather, apiCounter, counterPage, apiShorten, redirectShortUrl } from './api/demo.js';
import { apiTestAll, apiKV, apiD1, apiR2, apiResources } from './api/storage.js';
import { homePage } from './pages/home.js';
import { todoPage } from './pages/todos.js';
import { tagsPage } from './pages/tags.js';
import { notFound } from './utils/response.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    
    // GitHub OAuth 路由
    if (path === '/auth/login') return authLogin(request, env);
    if (path === '/auth/github/callback') return authCallback(request, env);
    if (path === '/auth/logout') return authLogout(request, env);
    if (path === '/api/me') return apiMe(request, env);
    
    // 页面路由
    if (path === '/') return homePage(request, env);
    if (path === '/todos') return todoPage(request, env);
    if (path === '/tags') return tagsPage();
    
    // Demo API 路由
    if (path === '/api/time') return apiTime();
    if (path === '/api/weather') return apiWeather(request);
    if (path === '/api/counter') return apiCounter(request, env);
    if (path === '/counter') return counterPage(request, env);
    if (path === '/api/shorten') return apiShorten(request, env);
    if (path === '/api/test-all') return apiTestAll(request, env);
    
    // Storage API 路由
    if (path === '/api/kv') return apiKV(request, env);
    if (path === '/api/d1') return apiD1(request, env);
    if (path === '/api/r2') return apiR2(request, env);
    if (path === '/api/resources') return apiResources(request, env);
    
    // AI API 路由
    if (path === '/api/ai') return apiAI(request, env);
    if (path === '/api/ai/optimize') return apiAIOptimize(request, env);
    
    // Upload API 路由
    if (path === '/api/upload') return apiUpload(request, env);
    if (path.startsWith('/api/attachments/')) return apiAttachments(request, env);
    
    // Todo API 路由 - 支持 /api/todos 和 /api/todos/:id 和 /api/todos/export 和 /api/todos/migrate
    if (path === '/api/todos' || path.startsWith('/api/todos/')) {
      return apiTodos(request, env);
    }
    
    // Tags API 路由 - 支持 /api/tags 和 /api/tags/:name
    if (path === '/api/tags' || path.startsWith('/api/tags/')) {
      return apiTags(request, env);
    }
    
    // 短链接重定向
    if (path.startsWith('/s/')) {
      return redirectShortUrl(path, env);
    }
    
    // 字体文件路由 - 从 R2 提供
    if (path.startsWith('/fonts/')) {
      const fontPath = path.replace('/fonts/', '');
      const object = await env.STORAGE.get(`fonts/${fontPath}`);
      if (object) {
        const headers = new Headers();
        const ext = fontPath.split('.').pop();
        const contentTypeMap = {
          'woff2': 'font/woff2',
          'css': 'text/css'
        };
        headers.set('Content-Type', contentTypeMap[ext] || object.httpMetadata.contentType || 'application/octet-stream');
        headers.set('Cache-Control', 'public, max-age=31536000');
        return new Response(object.body, { headers });
      }
      return notFound();
    }
    
    return notFound();
  },
};
