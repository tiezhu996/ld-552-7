import { create } from 'zustand';
import { api } from '../utils/api';

type NotificationState = {
  items: Notification[];
  unreadCount: number;
  fetchList: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  pollTimer?: ReturnType<typeof setInterval>;
  startPolling: () => void;
  stopPolling: () => void;
};

export const useNotificationStore = create<NotificationState>((set, get) => ({
  items: [],
  unreadCount: 0,

  async fetchList() {
    try {
      const { data } = await api.get('/notifications', { params: { limit: 50 } });
      set({ items: data });
    } catch (e) { /* ignore */ }
  },

  async fetchUnreadCount() {
    try {
      const { data } = await api.get('/notifications/unread-count');
      set({ unreadCount: Number(data.count) || 0 });
    } catch (e) { /* ignore */ }
  },

  async markAsRead(id: number) {
    try {
      await api.patch(`/notifications/${id}/read`);
      set((s) => ({
        items: s.items.map(n => n.id === id ? { ...n, isRead: true } : n),
        unreadCount: Math.max(0, s.unreadCount - (get().items.find(n => n.id === id && !n.isRead) ? 1 : 0)),
      }));
    } catch (e) { /* ignore */ }
  },

  async markAllAsRead() {
    try {
      await api.patch('/notifications/read-all');
      set((s) => ({ items: s.items.map(n => ({ ...n, isRead: true })), unreadCount: 0 }));
    } catch (e) { /* ignore */ }
  },

  startPolling() {
    get().stopPolling();
    const timer = setInterval(() => get().fetchUnreadCount(), 30000);
    set({ pollTimer: timer });
  },

  stopPolling() {
    const t = get().pollTimer;
    if (t) clearInterval(t);
    set({ pollTimer: undefined });
  },
}));
