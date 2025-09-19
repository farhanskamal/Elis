import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { api } from '../../services/apiService';
import { Magazine, MagazineLog, Role, User } from '../../types';
import { AuthContext } from '../../context/AuthContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';

// Helper to get week number
const getWeekIdentifier = (d: Date): string => {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.valueOf() - yearStart.valueOf()) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${weekNo}`;
};


const MagazineTracker: React.FC = () => {
    const [magazines, setMagazines] = useState<Magazine[]>([]);
    const [magazineLogs, setMagazineLogs] = useState<MagazineLog[]>([]);
    const [allMonitors, setAllMonitors] = useState<User[]>([]);
    const [selectedMonitorId, setSelectedMonitorId] = useState<string>('ALL');
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [newMagazineTitle, setNewMagazineTitle] = useState('');
    const { user } = useContext(AuthContext);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [magData, logData] = await Promise.all([
                api.getMagazines(),
                api.getMagazineLogs(),
            ]);
            setMagazines(magData);
            setMagazineLogs(logData);
            if (user?.role === Role.Librarian) {
                try {
                    const userData = await api.getAllUsers();
                    setAllMonitors(userData.filter(u => u.role === Role.Monitor));
                } catch {
                    setAllMonitors([]);
                }
            } else {
                setAllMonitors([]);
            }
        } catch (e) {
            console.error('Failed to load magazines/logs', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const weeksInMonth = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        let weeks = [];
        let weekCounter = 1;
        for (let i = 1; i <= lastDay.getDate(); i++) {
            const date = new Date(year, month, i);
            const identifier = getWeekIdentifier(date);
            if (!weeks.find(w => w.identifier === identifier)) {
                weeks.push({ display: `Week ${weekCounter}`, identifier: identifier });
                weekCounter++;
            }
        }
        return weeks;
    }, [currentDate]);

    const handleCheck = async (magazineId: string, weekIdentifier: string, isChecked: boolean) => {
        if (!user) return;
        
        const existingLog = magazineLogs.find(log => log.magazineId === magazineId && log.weekIdentifier === weekIdentifier);

        if (isChecked) {
             if (existingLog) return; // Already checked
            await api.logMagazineCheck(magazineId, weekIdentifier);
        } else {
            if (!existingLog) return;
            // Permission check for unchecking
            if (user.role !== Role.Librarian && user.id !== existingLog.checkedByMonitorId) {
                alert("You can only uncheck magazines you have checked yourself. Please ask a librarian for assistance.");
                return;
            }
            await api.removeMagazineLog(magazineId, weekIdentifier);
        }
        fetchData(); // Refetch data to ensure UI consistency
    };
    
    const handleAddMagazine = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!newMagazineTitle) return;
        await api.addMagazine(newMagazineTitle);
        setNewMagazineTitle('');
        fetchData(); // Refetch
    };
    
    const handleRemoveMagazine = async (magazineId: string) => {
        if(window.confirm("Are you sure you want to remove this magazine and all its logs?")) {
            await api.removeMagazine(magazineId);
            fetchData(); // Refetch to guarantee removal from UI
        }
    };

    const getLogInfo = (magazineId: string, weekIdentifier: string) => {
        const candidateLogs = magazineLogs.filter(l => l.magazineId === magazineId && l.weekIdentifier === weekIdentifier);
        const log: any = candidateLogs[0];
        if (!log) return null;

        // Use name from backend response if available
        let name = 'Unknown';
        if (log.checkedByMonitor?.name) {
            name = log.checkedByMonitor.name;
        } else {
            // Fallback: try to find name in allMonitors array or current user
            const monitor = [...allMonitors, user].find(v => v?.id === log.checkedByMonitorId);
            if (monitor?.name) {
                name = monitor.name;
            }
        }

        return {
            checked: true,
            log,
            tooltip: `Checked by ${name} on ${new Date(log.timestamp).toLocaleDateString()}`
        };
    };
    
    const changeMonth = (offset: number) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + offset);
        setCurrentDate(newDate);
    };

    const exportToCsv = () => {
        const headers = ['Magazine Title', 'Week', 'Checked By', 'Timestamp'];
        const rows = [];

        magazines.forEach(mag => {
            weeksInMonth.forEach(week => {
                const log = magazineLogs.find(l => l.magazineId === mag.id && l.weekIdentifier === week.identifier);
                if (log) {
                    // Use name from backend response if available
                    let monitorName = 'Unknown';
                    if (log.checkedByMonitor?.name) {
                        monitorName = log.checkedByMonitor.name;
                    } else {
                        // Fallback: try to find name in allMonitors array or current user
                        const monitor = [...allMonitors, user].find(v => v?.id === log.checkedByMonitorId);
                        if (monitor?.name) {
                            monitorName = monitor.name;
                        }
                    }

                    // Ensure values with commas are wrapped in quotes
                    const rowData = [
                        `"${mag.title.replace(/"/g, '""')}"`,
                        week.identifier,
                        `"${monitorName.replace(/"/g, '""')}"`,
                        new Date(log.timestamp).toLocaleString()
                    ];
                    rows.push(rowData.join(','));
                }
            });
        });

        const csvContent = "data:text/csv;charset=utf-8," 
            + headers.join(',') + "\n" 
            + rows.join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `magazine_checklist_${currentDate.getFullYear()}_${currentDate.getMonth()+1}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                 <h1 className="text-3xl font-bold text-gray-800">Magazine Tracker</h1>
                 <div className="flex items-center space-x-4">
                    <Button onClick={exportToCsv} variant="secondary">Export to CSV</Button>
                    <div className="flex items-center space-x-2">
                        <Button onClick={() => changeMonth(-1)} variant="secondary">&larr;</Button>
                        <span className="text-lg font-medium text-gray-700 w-32 text-center">
                            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </span>
                        <Button onClick={() => changeMonth(1)} variant="secondary">&rarr;</Button>
                    </div>
                </div>
            </div>
            
            {loading ? <Spinner /> : (
            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[800px] text-sm text-left">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th scope="col" className="px-4 py-3 rounded-tl-lg w-48">Magazine</th>
                                {weeksInMonth.map(week => (
                                    <th key={week.identifier} scope="col" className="px-4 py-3 text-center">{week.display}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {magazines.map(mag => (
                                <tr key={mag.id} className="bg-white border-b">
                                    <td className="px-4 py-3 font-medium text-gray-900 flex items-center justify-between">
                                        <span>{mag.title}</span>
                                        {user?.role === Role.Librarian && (
                                            <button onClick={() => handleRemoveMagazine(mag.id)} className="text-red-500 hover:text-red-700">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                                            </button>
                                        )}
                                    </td>
                                    {weeksInMonth.map(week => {
                                        const logInfo = getLogInfo(mag.id, week.identifier);
                                        const isChecked = !!logInfo?.checked;
                                        let canUncheck = false;
                                        if (isChecked && user && logInfo?.log) {
                                            canUncheck = user.role === Role.Librarian || user.id === logInfo.log.checkedByMonitorId;
                                        }
                                        const canCheck = !isChecked;
                                        return (
                                            <td key={`${mag.id}-${week.identifier}`} className="px-4 py-3 text-center relative group">
                                                <input
                                                    type="checkbox"
                                                    className={`h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${(canCheck || canUncheck) ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                                                    checked={isChecked}
                                                    onChange={(e) => handleCheck(mag.id, week.identifier, e.target.checked)}
                                                    disabled={isChecked && !canUncheck}
                                                />
                                                {logInfo && <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">{logInfo.tooltip}</div>}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                 {user?.role === Role.Librarian && (
                    <form onSubmit={handleAddMagazine} className="mt-4 flex items-center space-x-2 p-2 border-t">
                        <input 
                            type="text" 
                            value={newMagazineTitle}
                            onChange={e => setNewMagazineTitle(e.target.value)}
                            placeholder="New magazine title..."
                            className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                        <Button type="submit">Add</Button>
                    </form>
                )}
            </Card>
            )}
        </div>
    );
};

export default MagazineTracker;
