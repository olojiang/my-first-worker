// 主入口 - 重构后的 Cloudflare Worker

// ========== 导入所有模块 ==========
import { authLogin, authCallback, authLogout, apiMe } from './auth/oauth.js';
import { homePage, todoPage, tagsPage, counterPage } from './handlers/pages.js';
import { apiTodos } from './routes/todos.js';
import { apiTags } from './routes/tags.js';
import { apiUpload, apiAttachments } from './routes/attachments.js';
import { apiResources } from './routes/resources.js';
import {
  apiTime, apiWeather, apiAI, apiAIOptimize,
  apiCounter, apiShorten, redirectShortUrl,
  apiKV, apiD1, apiR2, apiTestAll
} from './routes/other.js';
import { jsonResponse, notFound } from './utils/helpers.js';

// ========== 主入口 ==========
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // 路由处理
    switch (path) {
      // GitHub OAuth 路由
      case '/auth/login':
        return authLogin(request, env);
      case '/auth/github/callback':
        return authCallback(request, env);
      case '/auth/logout':
        return authLogout(request, env);
      case '/api/me':
        return apiMe(request, env);

      // 页面路由
      case '/':
        return homePage(request, env);
      case '/todos':
        return todoPage(request, env);
      case '/tags':
        return tagsPage();
      case '/counter':
        return counterPage(request, env);

      // API 路由
      case '/api/time':
        return apiTime();
      case '/api/weather':
        return apiWeather(request);
      case '/api/ai':
        return apiAI(request, env);
      case '/api/ai/optimize':
        return apiAIOptimize(request, env);
      case '/api/counter':
        return apiCounter(request, env);
      case '/api/shorten':
        return apiShorten(request, env);
      case '/api/kv':
        return apiKV(request, env);
      case '/api/d1':
        return apiD1(request, env);
      case '/api/r2':
        return apiR2(request, env);
      case '/api/test-all':
        return apiTestAll(request, env);
      case '/api/todos':
        return apiTodos(request, env);
      case '/api/tags':
        return apiTags(request, env);
      case '/api/resources':
        return apiResources(request, env);
      case '/api/upload':
        return apiUpload(request, env);

      default:
        // 动态路由匹配
        if (path.startsWith('/api/todos/') || path === '/api/todos/migrate') {
          return apiTodos(request, env);
        }
        if (path.startsWith('/api/tags/')) {
          return apiTags(request, env);
        }
        if (path.startsWith('/api/attachments/')) {
          return apiAttachments(request, env);
        }
        if (path.startsWith('/s/')) {
          return redirectShortUrl(path, env);
        }
        return notFound();
    }
  },
};
