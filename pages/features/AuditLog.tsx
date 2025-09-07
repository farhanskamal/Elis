import React, { useEffect, useState, useContext } from 'react';
import { api } from '../../services/apiService';
import Card from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';
import Button from '../../components/ui/Button';
import { AuthContext } from '../../context/AuthContext';

const AuditLog: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useContext(AuthContext);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await api.getAuditLogs();
        setLogs(data);
      } catch (e) {
        console.error('Failed to load audit logs', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Audit Log</h1>
      <Card>
        {user?.email === ((import.meta.env as any).VITE_ADMIN_EMAIL || 'admin@school.edu') && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Broadcast Notification</h2>
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!title || !message) return;
              try {
                await api.broadcastNotification(title, message);
                setTitle('');
                setMessage('');
              } catch (e) {
                console.error('Broadcast failed', e);
                alert('Broadcast failed');
              }
            }} className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" className="p-2 border rounded-md" />
              <input value={message} onChange={e => setMessage(e.target.value)} placeholder="Message" className="p-2 border rounded-md md:col-span-2" />
              <div className="md:col-span-3 flex justify-end">
                <Button type="submit">Send</Button>
              </div>
            </form>
          </div>
        )}
        {loading ? <div className="flex justify-center p-8"><Spinner/></div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-700">
              <thead className="text-xs uppercase bg-gray-50">
                <tr>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Target</th>
                  <th className="px-4 py-3">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="bg-white border-b">
                    <td className="px-4 py-3">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3">{log.actor?.name} ({log.actor?.email})</td>
                    <td className="px-4 py-3">{log.action}</td>
                    <td className="px-4 py-3">{log.targetUser ? `${log.targetUser.name} (${log.targetUser.email})` : '-'}</td>
                    <td className="px-4 py-3">
                      <pre className="whitespace-pre-wrap text-xs text-gray-600">{log.details}</pre>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AuditLog;

