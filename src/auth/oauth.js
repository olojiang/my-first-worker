// GitHub OAuth 处理函数

import { generateState, generateSessionId, signCookie } from '../utils/cookies.js';
import { getSession, setSession, clearSession } from './session.js';

/**
 * 开始 GitHub OAuth 登录
 * @param {Request} request - HTTP 请求
 * @param {Object} env - 环境变量
 * @returns {Response} 重定向响应
 */
export async function authLogin(request, env) {
  const url = new URL(request.url);
  const state = generateState();
  const sessionId = generateSessionId();

  // 存储 state 到 session
  await env.CACHE.put(`oauth_session:${sessionId}`, JSON.stringify({ state }), {
    expirationTtl: 600, // 10 分钟过期
  });

  const signedSession = await signCookie(sessionId, env.COOKIE_SECRET);

  const githubAuthUrl = new URL('https://github.com/login/oauth/authorize');
  githubAuthUrl.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
  githubAuthUrl.searchParams.set('redirect_uri', `${url.origin}/auth/github/callback`);
  githubAuthUrl.searchParams.set('scope', 'read:user user:email');
  githubAuthUrl.searchParams.set('state', state);

  return new Response(null, {
    status: 302,
    headers: {
      'Location': githubAuthUrl.toString(),
      'Set-Cookie': `session=${encodeURIComponent(signedSession)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`,
    },
  });
}

/**
 * GitHub OAuth 回调处理
 * @param {Request} request - HTTP 请求
 * @param {Object} env - 环境变量
 * @returns {Response} 重定向响应
 */
export async function authCallback(request, env) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) {
    return new Response(`OAuth Error: ${error}`, { status: 400 });
  }

  if (!code || !state) {
    return new Response('Missing code or state', { status: 400 });
  }

  // 验证 session 和 state
  const session = await getSession(env, request);
  if (!session || session.data.state !== state) {
    return new Response('Invalid session or state', { status: 403 });
  }

  // 交换 code 获取 access token
  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: `${url.origin}/auth/github/callback`,
    }),
  });

  const tokenData = await tokenResponse.json();

  if (tokenData.error) {
    return new Response(`Token Error: ${tokenData.error_description}`, { status: 400 });
  }

  const accessToken = tokenData.access_token;

  // 获取用户信息
  const userResponse = await fetch('https://api.github.com/user', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'Cloudflare-Worker-OAuth',
    },
  });

  const userData = await userResponse.json();

  // 更新 session 存储用户信息
  const sessionCookie = await setSession(env, session.sessionId, {
    user: {
      id: userData.id,
      login: userData.login,
      name: userData.name,
      email: userData.email,
      avatar_url: userData.avatar_url,
    },
    accessToken,
    loggedInAt: Date.now(),
  }, 86400); // 24 小时

  // 重定向到 todo 页面
  return new Response(null, {
    status: 302,
    headers: {
      'Location': '/todos',
      'Set-Cookie': sessionCookie,
    },
  });
}

/**
 * 登出
 * @param {Request} request - HTTP 请求
 * @param {Object} env - 环境变量
 * @returns {Response} 重定向响应
 */
export async function authLogout(request, env) {
  const session = await getSession(env, request);
  let clearCookie = 'session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0';

  if (session) {
    clearCookie = await clearSession(env, session.sessionId);
  }

  return new Response(null, {
    status: 302,
    headers: {
      'Location': '/todos',
      'Set-Cookie': clearCookie,
    },
  });
}

/**
 * 获取当前用户信息 API
 * @param {Request} request - HTTP 请求
 * @param {Object} env - 环境变量
 * @returns {Response} JSON 响应
 */
export async function apiMe(request, env) {
  const session = await getSession(env, request);

  if (!session || !session.data.user) {
    return jsonResponse({ error: 'Not authenticated' }, 401);
  }

  return jsonResponse({
    user: session.data.user,
    loggedInAt: session.data.loggedInAt,
  });
}

// 本地导入 jsonResponse 避免循环依赖
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
