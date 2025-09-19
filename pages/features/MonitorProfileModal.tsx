import React, { useState, useEffect } from 'react';
import { api } from '../../services/apiService';
import { User, Task, TaskStatus, MagazineLog, Magazine } from '../../types';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import MonitorHours from './MonitorHours';

interface Props {
    monitor: User;
    onClose: () => void;
    onUpdate: () => void;
}

const MonitorProfileModal: React.FC<Props> = ({ monitor, onClose, onUpdate }) => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [magazineLogs, setMagazineLogs] = useState<MagazineLog[]>([]);
    const [magazines, setMagazines] = useState<Magazine[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const [taskData, magLogData, magData] = await Promise.all([
                 api.getTasksForMonitor(monitor.id),
                 api.getMagazineLogs(),
                 api.getMagazines(),
            ]);
            setTasks(taskData);
            setMagazineLogs(magLogData.filter((log: any) => log.checkedByVolunteerId === monitor.id));
            setMagazines(magData);
            setLoading(false);
        };
        fetchData();
    }, [monitor]);
    
    const statusColors = {
        [TaskStatus.Pending]: 'text-yellow-600',
        [TaskStatus.Completed]: 'text-green-600',
        [TaskStatus.CannotComplete]: 'text-red-600',
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-start p-4 pt-10 sm:pt-16 overflow-y-auto">
            <Card className="w-full max-w-4xl relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>

                <div className="flex items-center space-x-4 mb-6">
                    <img src={monitor.profilePicture} alt={monitor.name} className="h-20 w-20 rounded-full"/>
                    <div>
                        <h2 className="text-2xl font-bold">{monitor.name}</h2>
                        <p className="text-gray-600">{monitor.email}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="space-y-6">
                         {/* Assigned Tasks */}
                        <div>
                            <h3 className="text-lg font-semibold mb-2 border-b pb-2">Assigned Tasks</h3>
                            {loading ? <Spinner /> : (
                                <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
                                    {tasks.length > 0 ? tasks.map(task => {
                                        const monitorStatus = task.statuses.find(s => s.monitorId === monitor.id)?.status || TaskStatus.Pending;
                                        return (
                                            <div key={task.id} className="text-sm p-2 bg-gray-50 rounded">
                                                <div className="flex justify-between">
                                                    <p className="font-medium">{task.title}</p>
                                                    <p className={`text-xs font-bold ${statusColors[monitorStatus]}`}>{monitorStatus}</p>
                                                </div>
                                                <p className="text-xs text-gray-500">Due: {task.dueDate}</p>
                                            </div>
                                        )
                                    }) : <p className="text-sm text-gray-500">No tasks assigned.</p>}
                                </div>
                            )}
                        </div>
                         {/* Magazines Checked */}
                        <div>
                            <h3 className="text-lg font-semibold mb-2 border-b pb-2">Magazines Checked</h3>
                            {loading ? <Spinner /> : (
                                <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
                                    {magazineLogs.length > 0 ? magazineLogs.map(log => {
                                        const magazineTitle = magazines.find(m => m.id === log.magazineId)?.title || "Unknown Magazine";
                                        return (
                                            <div key={log.id} className="text-sm p-2 bg-gray-50 rounded">
                                                <p className="font-medium">{magazineTitle}</p>
                                                <p className="text-xs text-gray-500">Week: {log.weekIdentifier} | Checked on: {new Date(log.timestamp).toLocaleDateString()}</p>
                                            </div>
                                        )
                                    }) : <p className="text-sm text-gray-500">No magazines checked.</p>}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column - Hour Log */}
                    <div>
                        <h3 className="text-lg font-semibold mb-2 border-b pb-2">Hour Log</h3>
                        <div className="max-h-96 overflow-y-auto pr-2">
                            <MonitorHours monitorId={monitor.id} />
                        </div>
                    </div>
                </div>

                <div className="mt-6 text-right">
                    <Button variant="secondary" onClick={onClose}>Close</Button>
                </div>
            </Card>
        </div>
    );
};

export default MonitorProfileModal;
