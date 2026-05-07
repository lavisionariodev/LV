'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { getUser, onAuthStateChange } from '@/lib/auth/session';
import { getUserRole, isBuyerRole, isSellerRole } from '@/lib/auth/roles';
import { mapProfileRow } from '@/shared/utils/profileDefaults';

const PROFILE_SELECT =
  'full_name, avatar_url, username, username_locked, phone, gender, date_of_birth, address_street, address_city, address_province, address_zip';

/**
 * Auth context: current user, profile, and role (from public.users).
 * On the main site, only isBuyer should be treated as "authenticated" for buyer features (cart, profile, checkout).
 * Seller/admin auth is for their own portals only; they are treated as guests on the main site.
 */
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(() => mapProfileRow(null));
  const [role, setRole] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const loadProfile = useCallback(async (nextUser) => {
    if (!nextUser) {
      setProfile(mapProfileRow(null));
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select(PROFILE_SELECT)
      .eq('id', nextUser.id)
      .maybeSingle();

    if (!error && data) {
      setProfile(mapProfileRow(data));
    } else {
      setProfile(mapProfileRow(null));
    }
  }, []);

  const loadRole = useCallback(async (nextUser) => {
    if (!nextUser) {
      setRole(null);
      return;
    }
    const nextRole = await getUserRole(nextUser.id);
    setRole(nextRole || null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    await loadProfile(user);
  }, [user, loadProfile]);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const currentUser = await getUser();
        if (!mounted) return;

        setUser(currentUser);
        if (currentUser) {
          await Promise.all([loadProfile(currentUser), loadRole(currentUser)]);
        } else {
          setProfile(mapProfileRow(null));
          setRole(null);
        }
      } finally {
        if (mounted) {
          setAuthLoading(false);
        }
      }
    };

    init();

    const unsubscribe = onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      if (nextUser) {
        loadProfile(nextUser);
        loadRole(nextUser);
      } else {
        setProfile(mapProfileRow(null));
        setRole(null);
      }
    });

    return () => {
      mounted = false;
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [loadProfile, loadRole]);

  const value = useMemo(
    () => ({
      user,
      profile,
      role,
      authLoading,
      refreshProfile,
      isBuyer: isBuyerRole(role),
      isSeller: isSellerRole(role),
    }),
    [user, profile, role, authLoading, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
