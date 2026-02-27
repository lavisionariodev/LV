'use client';

import { createContext, useContext } from 'react';

export const ProfileContext = createContext(null);

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) {
    throw new Error('useProfile must be used within a ProfileContext provider');
  }
  return ctx;
}

