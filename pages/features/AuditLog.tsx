import React, { useEffect, useState, useContext } from 'react';
import { api } from '../../services/apiService';
import Card from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';
import Button from '../../components/ui/Button';
import { AuthContext } from '../../context/AuthContext';
import { formatAuditLogEntry, getActionTypeColor, AuditLogEntry, FormattedAuditEntry } from '../../utils/auditLogFormatter';

const AuditLog: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [formattedLogs, setFormattedLogs] = useState<FormattedAuditEntry[]>([]);
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
        // Format the logs for display
        const formatted = data.map(formatAuditLogEntry);
        setFormattedLogs(formatted);
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
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Target</th>
                  <th className="px-4 py-3">Description</th>
                </tr>
              </thead>
              <tbody>
                {formattedLogs.map((log) => (
                  <tr key={log.id} className="bg-white border-b hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {log.timestamp}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">
                        {log.actor.split('(')[0].trim()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {log.actor.match(/\((.+)\)/)?.[1]}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionTypeColor(log.actionType)}`}>
                        <span className="mr-1">{log.icon}</span>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {log.target !== '-' ? (
                        <div>
                          <div className="font-medium text-gray-900">
                            {log.target.split('(')[0].trim()}
                          </div>
                          <div className="text-xs text-gray-500">
                            {log.target.match(/\((.+)\)/)?.[1]}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900">
                        {log.message}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {formattedLogs.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">📝</div>
                <p>No audit logs found</p>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};

export default AuditLog;

