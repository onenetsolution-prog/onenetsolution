// hooks/useAppSettings.js

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { getServerDate } from './useServerTime';

// ─────────────────────────────────────────────────────────────────────────────
// useAppSettings
// Reads the single 'main' row from app_settings.
// Polls every 60s so maintenance mode / announcements appear promptly.
// ─────────────────────────────────────────────────────────────────────────────
export function useAppSettings() {
  const { data, isLoading } = useQuery({
    queryKey: ['app-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .eq('settings_key', 'main')
        .maybeSingle();
      if (error) {
        console.warn('app_settings fetch error:', error.message);
        return null;
      }
      return data;
    },
    staleTime:       60 * 1000,
    refetchInterval: 60 * 1000,
  });

  // Announcement is active only if today falls inside start/end window (using SERVER time)
  const announcementActive = useMemo(() => {
    if (!data?.announcement) return false;
    const today = getServerDate();
    return (!data.announcement_start || data.announcement_start <= today) &&
           (!data.announcement_end   || data.announcement_end   >= today);
  }, [data?.announcement, data?.announcement_start, data?.announcement_end]);

  return {
    settings:             data,
    isLoading,

    // Contact info
    whatsapp_number:      data?.whatsapp_number,
    call_number:          data?.call_number,
    admin_name:           data?.admin_name,
    upi_id:               data?.upi_id,

    // Maintenance
    maintenanceMode:      !!data?.maintenance_mode,
    maintenanceMessage:   data?.maintenance_message || 'System maintenance in progress. Please try again later.',

    // Announcement
    announcement:         announcementActive ? data.announcement : null,
    announcementPriority: data?.announcement_priority || 'normal',

    // Plan entry limits (all 4 plans including custom — fixed in DB migration)
    trialLimit:           data?.trial_limit    ?? 50,
    basicLimit:           data?.basic_limit    ?? 200,
    premiumLimit:         data?.premium_limit  ?? 99999,
    customLimit:          data?.custom_limit   ?? 500,   // ← was missing before
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// usePrivateMessages
// Reads unread admin_messages for the current user.
// Polls every 30s so messages appear without a page refresh.
// ─────────────────────────────────────────────────────────────────────────────
export function usePrivateMessages() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: messages = [], refetch } = useQuery({
    queryKey: ['user-private-messages', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const today = getServerDate();
      const { data, error } = await supabase
        .from('admin_messages')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_read', false)
        .or(`expires_at.is.null,expires_at.gte.${today}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('admin_messages fetch error:', error.message);
        return [];
      }
      return data || [];
    },
    enabled:         !!user?.id,
    staleTime:       30 * 1000,
    refetchInterval: 30 * 1000,
  });

  // Mark a single message as read and immediately remove it from the UI
  const markRead = async (id) => {
    const { error } = await supabase
      .from('admin_messages')
      .update({ is_read: true })
      .eq('id', id);

    if (error) {
      console.warn('markRead error:', error.message);
      return;
    }
    // Optimistic: remove from cache instantly, then background-refetch
    queryClient.setQueryData(
      ['user-private-messages', user?.id],
      (old = []) => old.filter(m => m.id !== id)
    );
    refetch();
  };

  return { messages, markRead };
}