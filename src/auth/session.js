import { signCookie, verifyCookie } from '../utils/cookies.js';

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

export async function setSession(env, sessionId, data, expiresInSeconds = 86400) {
  await env.CACHE.put(`oauth_session:${sessionId}`, JSON.stringify(data), {
    expirationTtl: expiresInSeconds,
  });
  
  const signed = await signCookie(sessionId, env.COOKIE_SECRET);
  return `session=${encodeURIComponent(signed)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${expiresInSeconds}`;
}

export async function clearSession(env, sessionId) {
  await env.CACHE.delete(`oauth_session:${sessionId}`);
  return `session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}
