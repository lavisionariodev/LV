'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUser } from '@/lib/auth/session';
import { supabase } from '@/lib/supabase/client';

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState({ full_name: '', avatar_url: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const currentUser = await getUser();

      if (!mounted) return;

      if (!currentUser) {
        router.push('/buyer/login?redirect=/profile');
        return;
      }

      setUser(currentUser);

      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (!mounted) return;

      if (!error && data) {
        setProfile({
          full_name: data.full_name || '',
          avatar_url: data.avatar_url || '',
        });
      }

      setLoading(false);
    };

    load();

    return () => {
      mounted = false;
    };
  }, [router]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email,
        full_name: profile.full_name || null,
        avatar_url: profile.avatar_url || null,
      });

    setSaving(false);

    if (error) {
      alert(error.message || 'Failed to save profile');
      return;
    }

    alert('Profile updated');
  };

  if (loading) {
    return (
      <main style={{ maxWidth: 640, margin: '40px auto', padding: '0 16px' }}>
        <p>Loading profile...</p>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main style={{ maxWidth: 640, margin: '40px auto', padding: '0 16px' }}>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '1rem' }}>Manage Profile</h1>
      <p style={{ marginBottom: '1.5rem', color: '#555' }}>
        Signed in as <strong>{user.email}</strong>
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span style={{ fontWeight: 500 }}>Full name</span>
          <input
            type="text"
            name="full_name"
            value={profile.full_name}
            onChange={handleChange}
            style={{
              padding: '8px 10px',
              borderRadius: 4,
              border: '1px solid #ccc',
            }}
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span style={{ fontWeight: 500 }}>Avatar URL</span>
          <input
            type="url"
            name="avatar_url"
            value={profile.avatar_url}
            onChange={handleChange}
            placeholder="https://example.com/avatar.jpg"
            style={{
              padding: '8px 10px',
              borderRadius: 4,
              border: '1px solid #ccc',
            }}
          />
        </label>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={{
            marginTop: '0.5rem',
            padding: '10px 16px',
            borderRadius: 4,
            border: 'none',
            backgroundColor: '#204F38',
            color: '#fff',
            fontWeight: 600,
            cursor: saving ? 'default' : 'pointer',
            opacity: saving ? 0.75 : 1,
          }}
        >
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </div>
    </main>
  );
}

