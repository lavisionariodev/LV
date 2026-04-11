'use client';

import {
  createContext,
  useCallback,
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
import { buildProfileUpsert, mapProfileRow } from '@/utils/profileDefaults';

const ProfileContext = createContext(null);

export function ProfileProvider({ children }) {
  const { user, profile: authProfile, authLoading, refreshProfile } = useAuth();
  const toast = useToast();

  const [localProfile, setLocalProfile] = useState(() => mapProfileRow(null));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      setLocalProfile(mapProfileRow(null));
      return;
    }
    setLocalProfile(mapProfileRow(authProfile));
  }, [user, authProfile]);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setLocalProfile((prev) => ({ ...prev, [name]: value }));
  }, []);

  /** @param {Record<string, string | boolean>} [overrides] e.g. `date_of_birth` from DOB pickers */
  const handleSave = useCallback(
    async (overrides = {}) => {
      if (!user) return false;
      setSaving(true);

      const merged = { ...localProfile, ...overrides };
      const payload = buildProfileUpsert(merged, user, authProfile);

      const { error } = await supabase.from('profiles').upsert(payload);

      setSaving(false);

      if (error) {
        toast.error(error.message || 'Failed to save profile');
        return false;
      }

      setLocalProfile(merged);
      toast.success('Profile updated');
      await refreshProfile().catch(() => {});
      return true;
    },
    [user, authProfile, localProfile, refreshProfile, toast],
  );

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

      const merged = { ...localProfile, avatar_url: publicUrl || '' };
      const payload = buildProfileUpsert(merged, user, authProfile);

      const { error: profileError } = await supabase.from('profiles').upsert(payload);

      if (profileError) {
        throw profileError;
      }

      setLocalProfile(merged);

      toast.success('Avatar updated');
      await refreshProfile().catch(() => {});
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

    const merged = { ...localProfile, avatar_url: '' };
    const payload = buildProfileUpsert(merged, user, authProfile);

    const { error } = await supabase.from('profiles').upsert({
      ...payload,
      avatar_url: null,
    });

    setUploading(false);

    if (error) {
      toast.error(error.message || 'Failed to remove avatar');
      return;
    }

    setLocalProfile(merged);
    toast.success('Avatar removed');
    await refreshProfile().catch(() => {});
    setConfirmRemoveOpen(false);
  };

  const handleRemoveAvatar = () => {
    if (!user) return;
    setConfirmRemoveOpen(true);
  };

  const initials = useMemo(() => {
    const source =
      localProfile.full_name ||
      localProfile.username ||
      user?.email ||
      '';
    if (!source) return '';
    const parts = source.trim().split(/\s+/).slice(0, 2);
    return parts
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  }, [localProfile.full_name, localProfile.username, user?.email]);

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
