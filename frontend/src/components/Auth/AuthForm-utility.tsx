import { useGoogleLogin } from '@react-oauth/google';

import type { CodeResponse } from '@react-oauth/google';
import type { FieldValues, UseFormSetError } from 'react-hook-form';

import { useAuth } from '@/app/AuthProvider';
import { appLogger } from '@/lib/logger';

type AppRouter = {
  push: (href: string) => void;
};

type GoogleAuthCodeResponse = Omit<CodeResponse, 'error' | 'error_description' | 'error_uri'>;

type GoogleAuthResponse = {
  Access_Token?: {
    token?: string;
    exp?: string;
  };
  message?: string;
  username?: string;
  redirect?: 'main' | 'info';
};

export function useLoginWithGoogle<TFieldValues extends FieldValues>(
  router: AppRouter,
  setError: UseFormSetError<TFieldValues>,
  onSettled?: () => void,
): () => void {
  const { setAccess, setExp, setUsername } = useAuth();
  return useGoogleLogin({
    onSuccess: async (tokenCode: GoogleAuthCodeResponse) => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/auth_with_google`, {
          method: 'POST',
          body: JSON.stringify({
            code: tokenCode.code,
          }),
          credentials: 'include',
          headers: {
            'Content-type': 'application/json',
          },
        });

        const response = (await res.json().catch(() => undefined)) as
          | GoogleAuthResponse
          | undefined;

        if (!res.ok || !response?.redirect) {
          setError('root', {
            message: response?.message || 'Error - Please Try again',
          });
          return;
        }
        const { Access_Token, username } = response;
        if (!Access_Token?.token || !Access_Token.exp || !username) {
          setError('root', {
            message: 'Error - Please Try again',
          });
          return;
        }

        setAccess(Access_Token.token);
        setExp(Access_Token.exp);
        setUsername(username);

        if (response.redirect === 'main') {
          router.push('/semester');
        } else {
          router.push('/signUp/info');
        }
      } catch {
        setError('root', {
          message: 'Error - Please Try again',
        });
      } finally {
        onSettled?.();
      }
    },
    onError: () => {
      appLogger.error('Google auth failed');
      setError('root', {
        message: 'Error - Please Try again',
      });
      onSettled?.();
    },

    onNonOAuthError: () => {
      onSettled?.();
    },

    scope: 'email openid profile',
    flow: 'auth-code',
  });
}
