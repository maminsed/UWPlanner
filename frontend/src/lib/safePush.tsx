'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useRef } from 'react';

export default function useSafeRouter() {
  const router = useRouter();
  const pathName = usePathname();
  const lastPushed = useRef<string | null>(null);

  const current = pathName || '';
  return useCallback(
    (url: string) => {
      if (lastPushed.current === current) return;
      if (lastPushed.current === url) return;
      lastPushed.current = url;
      router.push(url);
    },
    [router, current],
  );
}
