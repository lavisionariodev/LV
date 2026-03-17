'use client';

import { useRole } from '@/contexts/RoleContext';
import { ROLE_BUYER, ROLE_SELLER, ROLE_ADMIN } from '@/lib/auth/roles';

export default function RoleSwitcher() {
  const { currentRole, userRoles, switchRole } = useRole();

  if (!userRoles || userRoles.length <= 1) return null;

  return (
    <div style={{ position: 'fixed', top: 10, right: 10, zIndex: 1000 }}>
      <select value={currentRole} onChange={(e) => switchRole(e.target.value)}>
        {userRoles.map(role => (
          <option key={role} value={role}>
            {role === ROLE_BUYER ? 'Buyer' : role === ROLE_SELLER ? 'Seller' : role === ROLE_ADMIN ? 'Admin' : role}
          </option>
        ))}
      </select>
    </div>
  );
}