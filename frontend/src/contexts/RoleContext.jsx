'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { getUser, onAuthStateChange } from '@/lib/auth/session';
import { getUserRoles } from '@/lib/auth/roles';

const RoleContext = createContext();

export function RoleProvider({ children }) {
  const [currentRole, setCurrentRole] = useState(null);
  const [userRoles, setUserRoles] = useState([]);

  useEffect(() => {
    const loadUserRoles = async (user) => {
      if (user) {
        const roles = await getUserRoles(user.id);
        setUserRoles(roles || []);
        // Set default current role to first in array
        setCurrentRole(roles ? roles[0] : null);
      } else {
        setUserRoles([]);
        setCurrentRole(null);
      }
    };

    const unsubscribe = onAuthStateChange((event, session) => {
      loadUserRoles(session?.user || null);
    });

    // Initial load
    getUser().then(loadUserRoles);

    return unsubscribe;
  }, []);

  const switchRole = (role) => {
    if (userRoles.includes(role)) {
      setCurrentRole(role);
    }
  };

  return (
    <RoleContext.Provider value={{ currentRole, userRoles, switchRole }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}