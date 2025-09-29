import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationAPI } from '@/api/api';
import { useNotificationStore } from '@/store/notificationStore';
import { NotificationFilter } from '@/types/notification';
import { toast } from 'react-hot-toast';
import { QUERY_KEYS, SUCCESS_MESSAGES } from '@/utils/constants';

export const useNotifications = (filters?: NotificationFilter) => {
  const queryClient = useQueryClient();
  const { 
    notifications, 
    unreadCount, 
    setNotifications, 
    markAsRead, 
    markAllAsRead, 
    removeNotification,
    setUnreadCount
  } = useNotificationStore();

  const notificationsQuery = useQuery({
    queryKey: [QUERY_KEYS.NOTIFICATIONS, filters],
    queryFn: () => notificationAPI.getNotifications(filters),
  });

  // Handle data updates when query is successful
  React.useEffect(() => {
    if (notificationsQuery.data) {
      const response = notificationsQuery.data.data;
      setNotifications(response.data.notifications);
      setUnreadCount(response.data.summary.unread_count);
    }
  }, [notificationsQuery.data, setNotifications, setUnreadCount]);

  const markAsReadMutation = useMutation({
    mutationFn: (id: number) => notificationAPI.markAsRead(id),
    onSuccess: (_, id) => {
      markAsRead(id.toString());
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.NOTIFICATIONS] });
      toast.success(SUCCESS_MESSAGES.NOTIFICATION_READ);
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationAPI.markAllAsRead(),
    onSuccess: () => {
      markAllAsRead();
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.NOTIFICATIONS] });
      toast.success(SUCCESS_MESSAGES.ALL_NOTIFICATIONS_READ);
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: (id: number) => notificationAPI.deleteNotification(id),
    onSuccess: (_, id) => {
      removeNotification(id.toString());
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.NOTIFICATIONS] });
      toast.success('Notification deleted');
    },
  });

  return {
    notifications,
    unreadCount,
    isLoading: notificationsQuery.isLoading,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    deleteNotification: deleteNotificationMutation.mutate,
    isMarkingAsRead: markAsReadMutation.isPending,
    isMarkingAllAsRead: markAllAsReadMutation.isPending,
    isDeletingNotification: deleteNotificationMutation.isPending,
    refetch: notificationsQuery.refetch,
  };
};