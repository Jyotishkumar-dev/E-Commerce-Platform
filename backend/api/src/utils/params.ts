import type { Request } from 'express';

export function getParam(req: Request, key: string, defaultValue = ''): string {
  const value = req.params[key];
  if (Array.isArray(value)) {
    return value[0] ?? defaultValue;
  }
  return value ?? defaultValue;
}
