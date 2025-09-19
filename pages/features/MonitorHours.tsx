import React, { useState, useEffect, useContext, useCallback } from 'react';
import { api } from '../../services/apiService';
import { MonitorLog, Role } from '../../types';
import { AuthContext } from '../../context/AuthContext';
import Card from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';
import Button from '../../components/ui/Button';

interface MonitorHoursProps {
    monitorId?: string;
}

const MonitorHours: React.FC<MonitorHoursProps> = ({ monitorId }) => {
    const { user } = useContext(AuthContext);
    const [logs, setLogs] = useState<MonitorLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingLog, setEditingLog] = useState<MonitorLog | null>(null);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        const data = await api.getMonitorLogs(monitorId);
        setLogs(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        setLoading(false);
    }, [monitorId]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const handleDelete = async (logId: string) => {
        if(window.confirm('Are you sure you want to delete this log?')) {
            try {
                await api.deleteMonitorLog(logId);
                fetchLogs(); // Refetch logs to ensure UI is up-to-date
            } catch (error) {
                console.error("Failed to delete log:", error);
                alert("Could not delete the log. Please try again.");
            }
        }
    };
    
    const handleSaveEdit = async () => {
        if (!editingLog) return;
        await api.updateMonitorLog(editingLog.id, {
             date: editingLog.date,
             period: editingLog.period,
             durationMinutes: editingLog.durationMinutes
        });
        setEditingLog(null);
        fetchLogs(); // Refetch logs to show updated data
    };
    
    const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!editingLog) return;
        setEditingLog({
            ...editingLog,
            [e.target.name]: e.target.name === 'period' || e.target.name === 'durationMinutes' ? parseInt(e.target.value) || 0 : e.target.value
        });
    };

    const totalMinutes = logs.reduce((acc, log) => acc + (log.durationMinutes || 0), 0);
    const totalHours = (totalMinutes / 60).toFixed(2);
    
    const title = monitorId ? "My Hour Log" : "All Monitor Hours";
    const subTitle = `Total Hours Logged: ${totalHours}`;

    return (
        <Card>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">{title}</h1>
            <p className="text-gray-600 mb-6">{subTitle}</p>
            {loading ? <div className="flex justify-center items-center h-40"><Spinner /></div> : (
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                {!monitorId && <th scope="col" className="px-6 py-3">Monitor</th>}
                                <th scope="col" className="px-6 py-3">Date</th>
                                <th scope="col" className="px-6 py-3">Period</th>
                                <th scope="col" className="px-6 py-3">Duration (min)</th>
                                {user?.role === Role.Librarian && <th scope="col" className="px-6 py-3">Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map(log => (
                                <tr key={log.id} className="bg-white border-b">
                                    {!monitorId && <td className="px-6 py-4 font-medium text-gray-900">{log.monitorName}</td>}
                                    <td className="px-6 py-4">{editingLog?.id === log.id ? <input type="date" name="date" value={editingLog.date} onChange={handleEditChange} className="p-1 border rounded-md" /> : new Date(log.date + 'T12:00:00Z').toLocaleDateString()}</td>
                                    <td className="px-6 py-4">{editingLog?.id === log.id ? <input type="number" name="period" value={editingLog.period} onChange={handleEditChange} className="w-16 p-1 border rounded-md" /> : log.period}</td>
                                    <td className="px-6 py-4">{editingLog?.id === log.id ? <input type="number" name="durationMinutes" value={editingLog.durationMinutes || ''} onChange={handleEditChange} className="w-20 p-1 border rounded-md" /> : (log.durationMinutes || 'N/A')}</td>
                                    {user?.role === Role.Librarian && (
                                        <td className="px-6 py-4 space-x-2 flex items-center">
                                            {editingLog?.id === log.id ? (
                                                <>
                                                    <button onClick={handleSaveEdit} className="font-medium text-green-600 hover:underline">Save</button>
                                                    <button onClick={() => setEditingLog(null)} className="font-medium text-gray-600 hover:underline">Cancel</button>
                                                </>
                                            ) : (
                                                <>
                                                    <button onClick={() => setEditingLog(log)} className="font-medium text-blue-600 hover:underline">Edit</button>
                                                    <button onClick={() => handleDelete(log.id)} className="font-medium text-red-600 hover:underline flex items-center">
                                                    <TrashIcon /> Delete</button>
                                                </>
                                            )}
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
            )}
        </Card>
    );
};

const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>

export default MonitorHours;
