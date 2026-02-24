// Cookie 签名/验证、Session 管理

/**
 * 生成随机 state 防止 CSRF
 */
export function generateState() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * 生成 session ID
 */
export function generateSessionId() {
  return crypto.randomUUID();
}

/**
 * 简单的 cookie 签名 (HMAC-SHA256)
 */
export async function signCookie(value, secret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
  const sigHex = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `${value}.${sigHex}`;
}

/**
 * 验证 cookie 签名
 */
export async function verifyCookie(signedValue, secret) {
  const lastDot = signedValue.lastIndexOf('.');
  if (lastDot === -1) return null;

  const value = signedValue.slice(0, lastDot);
  const expected = await signCookie(value, secret);

  // 时间安全比较
  if (signedValue.length !== expected.length) return null;

  let match = true;
  for (let i = 0; i < signedValue.length; i++) {
    if (signedValue[i] !== expected[i]) match = false;
  }

  return match ? value : null;
}
