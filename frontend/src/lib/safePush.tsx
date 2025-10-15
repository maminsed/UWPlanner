'use client';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useRef } from 'react';

export default function useSafeRouter() {
  const router = useRouter();
  const pathName = usePathname();
  const searchParams = useSearchParams();
  const lastPushed = useRef<string | null>(null);

  const current = pathName + (searchParams?.toString() ? `?${searchParams}` : '');
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
