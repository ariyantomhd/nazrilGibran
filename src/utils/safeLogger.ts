// src/utils/safeLogger.ts
const SENSITIVE_KEYS = ['password', 'token', 'access_token', 'refresh_token', 'authorization', 'cookie', 'secret', 'api_key'];

export function maskSensitiveData(data: Record<string, any>): Record<string, any> {
  const masked: Record<string, any> = {};
  for (const [key, value] of Object.entries(data || {})) {
    if (SENSITIVE_KEYS.some((s) => key.toLowerCase().includes(s))) {
      masked[key] = '[REDACTED]';
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      masked[key] = maskSensitiveData(value);
    } else {
      masked[key] = value;
    }
  }
  return masked;
}