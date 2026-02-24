// Session 管理函数

import { signCookie, verifyCookie } from '../utils/cookies.js';

/**
 * 获取 session 数据
 * @param {Object} env - 环境变量
 * @param {Request} request - HTTP 请求
 * @returns {Promise<Object|null>} session 对象或 null
 */
export async function getSession(env, request) {
  const cookie = request.headers.get('Cookie');
  if (!cookie) return null;

  const match = cookie.match(/session=([^;]+)/);
  if (!match) return null;

  const sessionId = await verifyCookie(decodeURIComponent(match[1]), env.COOKIE_SECRET);
  if (!sessionId) return null;

  const data = await env.CACHE.get(`oauth_session:${sessionId}`, 'json');
  if (!data) return null;

  return { sessionId, data };
}

/**
 * 设置 session
 * @param {Object} env - 环境变量
 * @param {string} sessionId - session ID
 * @param {Object} data - session 数据
 * @param {number} expiresInSeconds - 过期时间（秒）
 * @returns {Promise<string>} Set-Cookie 头值
 */
export async function setSession(env, sessionId, data, expiresInSeconds = 86400) {
  await env.CACHE.put(`oauth_session:${sessionId}`, JSON.stringify(data), {
    expirationTtl: expiresInSeconds,
  });

  const signed = await signCookie(sessionId, env.COOKIE_SECRET);
  return `session=${encodeURIComponent(signed)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${expiresInSeconds}`;
}

/**
 * 清除 session
 * @param {Object} env - 环境变量
 * @param {string} sessionId - session ID
 * @returns {Promise<string>} Set-Cookie 头值（用于清除 cookie）
 */
export async function clearSession(env, sessionId) {
  await env.CACHE.delete(`oauth_session:${sessionId}`);
  return `session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}
