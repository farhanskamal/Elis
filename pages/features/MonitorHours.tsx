import React, { useState, useEffect, useContext, useCallback } from 'react';
import { api } from '../../services/apiService';
import { MonitorLog, Role, User, PeriodDefinition } from '../../types';
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
    
    // Add Hours Modal State
    const [isAddHoursModalOpen, setIsAddHoursModalOpen] = useState(false);
    const [monitors, setMonitors] = useState<User[]>([]);
    const [periodDefinitions, setPeriodDefinitions] = useState<PeriodDefinition[]>([]);
    const [addHoursForm, setAddHoursForm] = useState({
        monitorId: '',
        date: new Date().toISOString().split('T')[0],
        period: '' as number | '',
        durationMinutes: '' as number | ''
    });
    const [isAddingHours, setIsAddingHours] = useState(false);
    const [addHoursError, setAddHoursError] = useState<string | null>(null);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.getMonitorLogs(monitorId);
            setLogs(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        } catch (error) {
            console.error('Failed to fetch logs:', error);
        } finally {
            setLoading(false);
        }
    }, [monitorId]);

    const fetchAddHoursData = useCallback(async () => {
        if (user?.role !== Role.Librarian) return;
        
        try {
            const [usersData, periodsData] = await Promise.all([
                api.getAllUsers(),
                api.getPeriodDefinitions()
            ]);
            
            // Filter only monitors
            const monitorUsers = usersData.filter(u => u.role === Role.Monitor);
            setMonitors(monitorUsers);
            setPeriodDefinitions(periodsData);
            
            // Set default values
            if (monitorUsers.length > 0 && !addHoursForm.monitorId) {
                setAddHoursForm(prev => ({ ...prev, monitorId: monitorUsers[0].id }));
            }
            if (periodsData.length > 0 && !addHoursForm.period) {
                setAddHoursForm(prev => ({ 
                    ...prev, 
                    period: periodsData[0].period,
                    durationMinutes: periodsData[0].duration
                }));
            }
        } catch (error) {
            console.error('Failed to fetch add hours data:', error);
        }
    }, [user?.role, addHoursForm.monitorId, addHoursForm.period]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    useEffect(() => {
        if (isAddHoursModalOpen) {
            fetchAddHoursData();
        }
    }, [isAddHoursModalOpen, fetchAddHoursData]);

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

    const handleAddHoursFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setAddHoursForm(prev => ({
            ...prev,
            [name]: name === 'period' || name === 'durationMinutes' ? 
                (value === '' ? '' : parseInt(value) || 0) : value
        }));

        // Auto-fill duration when period changes
        if (name === 'period' && value !== '') {
            const selectedPeriod = periodDefinitions.find(p => p.period === parseInt(value));
            if (selectedPeriod) {
                setAddHoursForm(prev => ({ ...prev, durationMinutes: selectedPeriod.duration }));
            }
        }
    };

    const handleAddHours = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!addHoursForm.monitorId || !addHoursForm.date || addHoursForm.period === '' || addHoursForm.durationMinutes === '') {
            setAddHoursError('All fields are required');
            return;
        }

        setIsAddingHours(true);
        setAddHoursError(null);
        
        try {
            await api.logHoursByLibrarian(
                addHoursForm.monitorId,
                addHoursForm.date,
                addHoursForm.period as number,
                addHoursForm.durationMinutes as number
            );
            
            // Reset form and close modal
            setAddHoursForm({
                monitorId: monitors.length > 0 ? monitors[0].id : '',
                date: new Date().toISOString().split('T')[0],
                period: periodDefinitions.length > 0 ? periodDefinitions[0].period : '',
                durationMinutes: periodDefinitions.length > 0 ? periodDefinitions[0].duration : ''
            });
            setIsAddHoursModalOpen(false);
            
            // Refresh the logs
            await fetchLogs();
        } catch (error: any) {
            setAddHoursError(error.message || 'Failed to add hours');
        } finally {
            setIsAddingHours(false);
        }
    };

    const totalMinutes = logs.reduce((acc, log) => acc + (log.durationMinutes || 0), 0);
    const totalHours = (totalMinutes / 60).toFixed(2);
    
    const title = monitorId ? "My Hour Log" : "All Monitor Hours";
    const subTitle = `Total Hours Logged: ${totalHours}`;

    return (
        <>
        <Card>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-100 mb-2">{title}</h1>
                    <p className="text-gray-600 dark:text-slate-300">{subTitle}</p>
                </div>
                {user?.role === Role.Librarian && (
                  <div className="flex items-center gap-2">
                    {!monitorId && (
                      <>
                        <Button variant="secondary" onClick={async ()=>{ try{ const data=await api.exportMonitorLogs(); const blob=new Blob([JSON.stringify(data,null,2)], {type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='monitor_logs.json'; a.click(); URL.revokeObjectURL(url);}catch{ try{ const fallback={ logs: logs.map(l=>({ monitorId:l.monitorId, date:l.date, period:l.period, durationMinutes: l.durationMinutes??null })) }; const blob=new Blob([JSON.stringify(fallback,null,2)], {type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='monitor_logs.json'; a.click(); URL.revokeObjectURL(url);}catch{ alert('Export failed'); } } }}>Export JSON</Button>
                        <label className="inline-flex items-center">
                          <input type="file" accept="application/json" className="hidden" onChange={async (e)=>{ const f=e.target.files?.[0]; if(!f) return; try{ const t=await f.text(); const p=JSON.parse(t); await api.importMonitorLogs(p.logs||[]); fetchLogs(); }catch{ alert('Import failed'); } finally{ e.currentTarget.value=''; } }} />
                          <Button variant="secondary" onClick={(ev)=> ((ev.currentTarget.previousElementSibling as HTMLInputElement) || (ev.currentTarget.parentElement?.querySelector('input[type=file]') as HTMLInputElement))?.click()}>Import JSON</Button>
                        </label>
                        <Button variant="secondary" onClick={async ()=>{ try{ const data=await api.exportMonitorLogs(); const { downloadCsv } = await import('../../utils/csv'); downloadCsv('monitor_logs.csv', data.logs, ['monitorId','date','period','durationMinutes']); }catch{ try{ const { downloadCsv } = await import('../../utils/csv'); downloadCsv('monitor_logs.csv', logs.map(l=>({ monitorId:l.monitorId, date:l.date, period:l.period, durationMinutes: l.durationMinutes??'' })), ['monitorId','date','period','durationMinutes']); }catch{ alert('Export CSV failed'); } } }}>Export CSV</Button>
                        <label className="inline-flex items-center">
                          <input type="file" accept="text/csv" className="hidden" onChange={async (e)=>{ const f=e.target.files?.[0]; if(!f) return; try{ const t=await f.text(); const { parseCsv } = await import('../../utils/csv'); const rows=parseCsv(t); const logs = rows.map(r=>({ monitorId:r.monitorId, date:r.date, period:Number(r.period), durationMinutes: r.durationMinutes? Number(r.durationMinutes): null })); await api.importMonitorLogs(logs); fetchLogs(); }catch{ alert('Import CSV failed'); } finally { e.currentTarget.value=''; } }} />
                          <Button variant="secondary" onClick={(ev)=> ((ev.currentTarget.previousElementSibling as HTMLInputElement) || (ev.currentTarget.parentElement?.querySelector('input[type=file]') as HTMLInputElement))?.click()}>Import CSV</Button>
                        </label>
                      </>
                    )}
                    <Button onClick={() => setIsAddHoursModalOpen(true)}>
                        <PlusIcon className="w-4 h-4 mr-2" />
                        Add Hours
                    </Button>
                  </div>
                )}
            </div>
            {loading ? <div className="flex justify-center items-center h-40"><Spinner /></div> : (
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 dark:text-slate-200 uppercase bg-gray-50 dark:bg-slate-700">
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
                                <tr key={log.id} className="bg-white dark:bg-slate-800 dark:text-slate-100 border-b dark:border-slate-700">
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
        
        {/* Add Hours Modal */}
        {isAddHoursModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
                <Card className="w-full max-w-md">
                    <h2 className="text-xl font-bold mb-4">Add Monitor Hours</h2>
                    <form onSubmit={handleAddHours} className="space-y-4">
                        <div>
                            <label htmlFor="add-monitor" className="block text-sm font-medium text-gray-700">Monitor</label>
                            <select
                                id="add-monitor"
                                name="monitorId"
                                value={addHoursForm.monitorId}
                                onChange={handleAddHoursFormChange}
                                required
                                className="mt-1 w-full p-2 border rounded-md"
                            >
                                <option value="" disabled>Select Monitor</option>
                                {monitors.map(monitor => (
                                    <option key={monitor.id} value={monitor.id}>{monitor.name} ({monitor.email})</option>
                                ))}
                            </select>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="add-date" className="block text-sm font-medium text-gray-700">Date</label>
                                <input
                                    id="add-date"
                                    name="date"
                                    type="date"
                                    value={addHoursForm.date}
                                    onChange={handleAddHoursFormChange}
                                    required
                                    className="mt-1 w-full p-2 border rounded-md"
                                />
                            </div>
                            <div>
                                <label htmlFor="add-period" className="block text-sm font-medium text-gray-700">Period</label>
                                <select
                                    id="add-period"
                                    name="period"
                                    value={addHoursForm.period}
                                    onChange={handleAddHoursFormChange}
                                    required
                                    className="mt-1 w-full p-2 border rounded-md"
                                >
                                    <option value="" disabled>Select</option>
                                    {periodDefinitions.map(p => (
                                        <option key={p.period} value={p.period}>Period {p.period}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        
                        <div>
                            <label htmlFor="add-duration" className="block text-sm font-medium text-gray-700">Duration (minutes)</label>
                            <input
                                id="add-duration"
                                name="durationMinutes"
                                type="number"
                                value={addHoursForm.durationMinutes}
                                onChange={handleAddHoursFormChange}
                                required
                                min="1"
                                max="300"
                                className="mt-1 w-full p-2 border rounded-md"
                                placeholder="e.g., 50"
                            />
                        </div>
                        
                        {addHoursError && <p className="text-sm text-red-600">{addHoursError}</p>}
                        
                        <div className="flex justify-end space-x-2 pt-2">
                            <Button 
                                type="button" 
                                variant="secondary" 
                                onClick={() => {
                                    setIsAddHoursModalOpen(false);
                                    setAddHoursError(null);
                                }}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isAddingHours}>
                                {isAddingHours ? 'Adding...' : 'Add Hours'}
                            </Button>
                        </div>
                    </form>
                </Card>
            </div>
        )}
        </>
    );
};

const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>

const PlusIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
);

export default MonitorHours;
