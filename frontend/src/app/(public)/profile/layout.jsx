'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSelectedLayoutSegment } from 'next/navigation';
import { getUser } from '@/lib/auth/session';
import { supabase } from '@/lib/supabase/client';
import styles from './profile.module.css';
import { ProfileContext } from '@/contexts/ProfileContext';

const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export default function ProfileLayout({ children }) {
  const router = useRouter();
  const segment = useSelectedLayoutSegment();
  const activeTab = segment || 'account';

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState({ full_name: '', avatar_url: '' });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const currentUser = await getUser();

      if (!mounted) return;

      if (!currentUser) {
        router.push('/buyer/login?redirect=/profile/account');
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

    const { error } = await supabase.from('profiles').upsert({
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

  const handleAvatarFileChange = async (event) => {
    const file = event.target.files?.[0];

    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (JPG, PNG, etc.).');
      return;
    }

    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      alert('Image is too large. Maximum size is 5MB.');
      return;
    }

    try {
      setUploading(true);

      const fileExt = file.name.split('.').pop();
      const filePath = `avatars/${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const publicUrl = publicData?.publicUrl;

      const { error: profileError } = await supabase.from('profiles').upsert({
        id: user.id,
        email: user.email,
        full_name: profile.full_name || null,
        avatar_url: publicUrl,
      });

      if (profileError) {
        throw profileError;
      }

      setProfile((prev) => ({
        ...prev,
        avatar_url: publicUrl || '',
      }));

      alert('Avatar updated');
    } catch (error) {
      console.error('Avatar upload error:', error);
      alert(error.message || 'Failed to upload avatar');
    } finally {
      setUploading(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user) return;

    const confirmed = window.confirm('Remove your profile photo?');
    if (!confirmed) return;

    setUploading(true);

    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      email: user.email,
      full_name: profile.full_name || null,
      avatar_url: null,
    });

    setUploading(false);

    if (error) {
      alert(error.message || 'Failed to remove avatar');
      return;
    }

    setProfile((prev) => ({
      ...prev,
      avatar_url: '',
    }));
  };

  const initials = useMemo(() => {
    const source = profile.full_name || user?.email || '';
    if (!source) return '';
    const parts = source.trim().split(/\s+/).slice(0, 2);
    return parts
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  }, [profile.full_name, user?.email]);

  const contextValue = {
    user,
    profile,
    setProfile,
    loading,
    saving,
    uploading,
    handleChange,
    handleSave,
    handleAvatarFileChange,
    handleRemoveAvatar,
    fileInputRef,
    initials,
  };

  if (loading) {
    return (
      <main className={styles.profilePage}>
        <div className={styles.profileLayout}>
          <aside className={styles.profileSidebar}>
            <div className={styles.sidebarHeading}>Account</div>
            <nav className={styles.sidebarNav}>
              <button type="button" className={styles.sidebarItem}>
                My account
              </button>
              <button type="button" className={styles.sidebarItem}>
                Purchases
              </button>
              <button type="button" className={styles.sidebarItem}>
                Notifications
              </button>
            </nav>
          </aside>
          <div className={styles.profileMain}>
            <div className={styles.profileCard}>
              <p>Loading profile...</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <ProfileContext.Provider value={contextValue}>
      <main className={styles.profilePage}>
        <div className={styles.profileLayout}>
          <aside className={styles.profileSidebar}>
            <div className={styles.sidebarHeading}>Account</div>
            <nav className={styles.sidebarNav}>
              <Link
                href="/profile/account"
                className={`${styles.sidebarItem} ${
                  activeTab === 'account' ? styles.sidebarItemActive : ''
                }`}
                aria-current={activeTab === 'account' ? 'page' : undefined}
              >
                My account
              </Link>
              <Link
                href="/profile/purchases"
                className={`${styles.sidebarItem} ${
                  activeTab === 'purchases' ? styles.sidebarItemActive : ''
                }`}
                aria-current={activeTab === 'purchases' ? 'page' : undefined}
              >
                Purchases
              </Link>
              <Link
                href="/profile/notifications"
                className={`${styles.sidebarItem} ${
                  activeTab === 'notifications' ? styles.sidebarItemActive : ''
                }`}
                aria-current={
                  activeTab === 'notifications' ? 'page' : undefined
                }
              >
                Notifications
              </Link>
            </nav>
          </aside>

          <div className={styles.profileMain}>{children}</div>
        </div>
      </main>
    </ProfileContext.Provider>
  );
}

