'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import ConfirmModal from '@/components/ui/Modal/ConfirmModal';

export const ProfileContext = createContext(null);

export function ProfileProvider({ children }) {
  const { user, profile: authProfile, authLoading, refreshProfile } = useAuth();
  const toast = useToast();

  const [localProfile, setLocalProfile] = useState({
    full_name: '',
    avatar_url: '',
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      setLocalProfile({ full_name: '', avatar_url: '' });
      return;
    }

    setLocalProfile({
      full_name: authProfile?.full_name || '',
      avatar_url: authProfile?.avatar_url || '',
    });
  }, [user, authProfile?.full_name, authProfile?.avatar_url]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setLocalProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      email: user.email,
      full_name: localProfile.full_name || null,
      avatar_url: localProfile.avatar_url || null,
    });

    setSaving(false);

    if (error) {
      toast.error(error.message || 'Failed to save profile');
      return;
    }

    toast.success('Profile updated');
    refreshProfile().catch(() => {
      // ignore refresh errors here; toast already shown
    });
  };

  const handleAvatarFileChange = async (event) => {
    const file = event.target.files?.[0];

    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (JPG, PNG, etc.).');
      return;
    }

    const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      toast.error('Image is too large. Maximum size is 5MB.');
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
        full_name: localProfile.full_name || null,
        avatar_url: publicUrl,
      });

      if (profileError) {
        throw profileError;
      }

      setLocalProfile((prev) => ({
        ...prev,
        avatar_url: publicUrl || '',
      }));

      toast.success('Avatar updated');
      refreshProfile().catch(() => {});
    } catch (error) {
      console.error('Avatar upload error:', error);
      toast.error(error.message || 'Failed to upload avatar');
    } finally {
      setUploading(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const performRemoveAvatar = async () => {
    if (!user) return;

    setUploading(true);

    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      email: user.email,
      full_name: localProfile.full_name || null,
      avatar_url: null,
    });

    setUploading(false);

    if (error) {
      toast.error(error.message || 'Failed to remove avatar');
      return;
    }

    setLocalProfile((prev) => ({
      ...prev,
      avatar_url: '',
    }));
    toast.success('Avatar removed');
    refreshProfile().catch(() => {});
    setConfirmRemoveOpen(false);
  };

  const handleRemoveAvatar = () => {
    if (!user) return;
    setConfirmRemoveOpen(true);
  };

  const initials = useMemo(() => {
    const source = localProfile.full_name || user?.email || '';
    if (!source) return '';
    const parts = source.trim().split(/\s+/).slice(0, 2);
    return parts
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  }, [localProfile.full_name, user?.email]);

  const loading = authLoading;

  const contextValue = {
    user,
    profile: localProfile,
    setProfile: setLocalProfile,
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

  return (
    <ProfileContext.Provider value={contextValue}>
      {children}
      <ConfirmModal
        open={confirmRemoveOpen}
        title="Remove profile photo?"
        message="Are you sure you want to remove your profile photo?"
        confirmLabel="Remove"
        cancelLabel="Cancel"
        onConfirm={performRemoveAvatar}
        onCancel={() => setConfirmRemoveOpen(false)}
      />
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return ctx;
}
