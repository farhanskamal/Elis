import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';

type NotificationItem = { id: string; type: string; title?: string; message?: string; role?: string; createdAt: number };

type NotificationsContextType = {
  notifications: NotificationItem[];
  add: (n: Omit<NotificationItem, 'id' | 'createdAt'>) => void;
  remove: (id: string) => void;
  clear: () => void;
};

export const NotificationsContext = createContext<NotificationsContextType>({
  notifications: [],
  add: () => {},
  remove: () => {},
  clear: () => {},
});

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const add = useCallback((n: Omit<NotificationItem, 'id' | 'createdAt'>) => {
    setNotifications(prev => [{ id: `${Date.now()}-${Math.random()}`, createdAt: Date.now(), ...n }, ...prev]);
  }, []);

  const remove = useCallback((id: string) => setNotifications(prev => prev.filter(n => n.id !== id)), []);
  const clear = useCallback(() => setNotifications([]), []);

  const value = useMemo(() => ({ notifications, add, remove, clear }), [notifications, add, remove, clear]);

  return (
    <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
  );
};

