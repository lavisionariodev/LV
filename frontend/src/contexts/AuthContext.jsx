'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { getUser, onAuthStateChange } from '@/lib/auth/session';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState({ full_name: '', avatar_url: '' });
  const [authLoading, setAuthLoading] = useState(true);

  const loadProfile = useCallback(async (nextUser) => {
    if (!nextUser) {
      setProfile({ full_name: '', avatar_url: '' });
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', nextUser.id)
      .maybeSingle();

    if (!error && data) {
      setProfile({
        full_name: data.full_name || '',
        avatar_url: data.avatar_url || '',
      });
    } else {
      setProfile({ full_name: '', avatar_url: '' });
    }
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
          await loadProfile(currentUser);
        } else {
          setProfile({ full_name: '', avatar_url: '' });
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
      loadProfile(nextUser);
    });

    return () => {
      mounted = false;
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [loadProfile]);

  const value = useMemo(
    () => ({
      user,
      profile,
      authLoading,
      refreshProfile,
    }),
    [user, profile, authLoading, refreshProfile]
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

