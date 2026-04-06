'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const router = useRouter();

  useEffect(() => {
    // Desktop only: redirect to account page.
    // Mobile stays on /profile — the menu sidebar IS the UI.
    if (window.matchMedia('(min-width: 769px)').matches) {
      router.replace('/profile/account');
    }
  }, [router]);

  return null;
}