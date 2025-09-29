import { create } from 'zustand';
import { Notification } from '@/types/notification';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setUnreadCount: (count: number) => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  setNotifications: (notifications) => {
    const unreadCount = notifications.filter(n => !n.is_read).length;
    set({ notifications, unreadCount });
  },
  addNotification: (notification) => {
    const notifications = [notification, ...get().notifications];
    const unreadCount = notifications.filter(n => !n.is_read).length;
    set({ notifications, unreadCount });
  },
  markAsRead: (id) => {
    const notifications = get().notifications.map(n => 
      n.id === id ? { ...n, is_read: true } : n
    );
    const unreadCount = notifications.filter(n => !n.is_read).length;
    set({ notifications, unreadCount });
  },
  markAllAsRead: () => {
    const notifications = get().notifications.map(n => ({ ...n, is_read: true }));
    set({ notifications, unreadCount: 0 });
  },
  removeNotification: (id) => {
    const notifications = get().notifications.filter(n => n.id !== id);
    const unreadCount = notifications.filter(n => !n.is_read).length;
    set({ notifications, unreadCount });
  },
  setLoading: (loading) => set({ loading }),
  setUnreadCount: (count) => set({ unreadCount: count }),
}));