'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * /profile root page.
 *
 * Desktop  → redirect to /profile/account (full page view).
 * Mobile   → stay here; the layout sidebar is the "home" screen,
 *             and each section opens as a bottom sheet.
 */
export default function ProfilePage() {
  const router = useRouter();

  useEffect(() => {
    // Only redirect on desktop (>768px). On mobile the layout's
    // sidebar already acts as the menu — no redirect needed.
    if (window.matchMedia('(min-width: 769px)').matches) {
      router.replace('/profile/account');
    }
  }, [router]);

  // On mobile this renders nothing — the layout's sidebar is the UI.
  return null;
}