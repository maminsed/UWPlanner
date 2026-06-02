import useSafeRouter from './safePush';

import { useAuth } from '@/app/AuthProvider';

export function isExpired(exp?: string) {
  if (!exp) {
    return true;
  }
  const expiresAt = new Date(exp).getTime();
  if (Number.isNaN(expiresAt)) {
    return true;
  }
  return Date.now() >= expiresAt - 60 * 1000;
}

export function useApi() {
  const { access, setAccess, exp, setExp, setUsername, clearAuth } = useAuth();
  const router = useSafeRouter();

  return async (
    url: RequestInfo,
    init: RequestInit = {},
    check_protection: boolean = true,
  ): Promise<Response> => {
    let token = access;
    if (check_protection) {
      if (isExpired(exp)) {
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`, {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          const response = await res.json().catch(() => {});
          if (res.ok) {
            setAccess(response.Access_Token.token);
            setExp(response.Access_Token.exp);
            setUsername(response.username);
            token = response.Access_Token.token;
          } else {
            if (response.action) {
              if (response.action == 'verify_code') {
                router('/verify');
              } else if (response.action == 'logout') {
                router('/');
              }
            }
            clearAuth();
            return res;
          }
        } catch {
          clearAuth();
          return new Response(JSON.stringify({ ok: false }), {
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }
    }

    const res = await fetch(url, {
      ...init,
      credentials: 'include',
      headers: {
        ...init.headers,
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const cloned = res.clone();
      const response = await cloned.json().catch(() => {});
      if (response?.action) {
        if (response.action == 'verify_code') {
          router('/verify');
        } else if (response.action == 'logout') {
          router('/');
        } else if (response.action == 'main_page') {
          router('/semester');
        }
      }
    }

    return res;
  };
}
