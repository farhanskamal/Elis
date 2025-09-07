import React, { useContext, useEffect } from 'react';
import { NotificationsContext } from '../context/NotificationsContext';
import { AuthContext } from '../context/AuthContext';

const NotificationsToaster: React.FC = () => {
  const { notifications, remove, add } = useContext(NotificationsContext);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('authToken');
    const url = new URL(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/notifications/stream`);
    if (token) url.searchParams.set('token', token);
    const es = new EventSource(url.toString());
    es.addEventListener('notification', (evt: any) => {
      try {
        const data = JSON.parse(evt.data);
        if (data.type === 'role_change') {
          add({ type: 'role_change', message: `Your role is now ${data.role}` });
        } else if (data.type === 'broadcast') {
          add({ type: 'broadcast', title: data.title, message: data.message });
        }
      } catch {}
    });
    es.onerror = () => {
      // Attempt reconnect later
    };
    return () => es.close();
  }, [user, add]);

  useEffect(() => {
    const timers = notifications.map(n => setTimeout(() => remove(n.id), 6000));
    return () => { timers.forEach(t => clearTimeout(t)); };
  }, [notifications, remove]);

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 w-80">
      {notifications.map(n => (
        <div key={n.id} className="bg-white shadow rounded-md p-3 border border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-semibold">{n.title || (n.type === 'role_change' ? 'Role Updated' : 'Notification')}</p>
              {n.message && <p className="text-sm text-gray-700 mt-1">{n.message}</p>}
            </div>
            <button className="text-gray-400 hover:text-gray-600" onClick={() => remove(n.id)}>×</button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default NotificationsToaster;

