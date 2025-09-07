import React, { useState, useEffect, useContext } from 'react';
import { api } from '../../services/apiService';
import { Task, TaskPriority, TaskStatus } from '../../types';
import { AuthContext } from '../../context/AuthContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';

const VolunteerTasks: React.FC = () => {
    const { user } = useContext(AuthContext);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchTasks = async () => {
        if (!user) return;
        setLoading(true);
        const data = await api.getTasksForVolunteer(user.id);
        setTasks(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchTasks();
    }, [user]);
    
    const handleUpdateStatus = async (taskId: string, status: TaskStatus) => {
        if (!user) return;
        await api.updateTaskStatus(taskId, user.id, status);
        fetchTasks(); // Refresh list
    };
    
    const priorityStyles = {
        [TaskPriority.High]: 'border-red-300',
        [TaskPriority.Medium]: 'border-yellow-300',
        [TaskPriority.Low]: 'border-green-300',
    };
    
     const priorityBadgeStyles = {
        [TaskPriority.High]: 'bg-red-100 text-red-800',
        [TaskPriority.Medium]: 'bg-yellow-100 text-yellow-800',
        [TaskPriority.Low]: 'bg-green-100 text-green-800',
    };

    if(loading) return <Spinner/>

    const pending = tasks.filter(t => (t.statuses.find(s => s.volunteerId === user?.id)?.status || TaskStatus.Pending) === TaskStatus.Pending);
    const completed = tasks.filter(t => (t.statuses.find(s => s.volunteerId === user?.id)?.status) === TaskStatus.Completed);
    const cannot = tasks.filter(t => (t.statuses.find(s => s.volunteerId === user?.id)?.status) === TaskStatus.CannotComplete);

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">My Tasks</h1>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div>
                    <h2 className="text-lg font-semibold mb-2">Pending</h2>
                    {pending.length === 0 ? <Card><p className="text-sm text-gray-500">No pending tasks.</p></Card> : pending.map(task => (
                        <Card key={task.id} className={`mb-3 border-l-4 ${priorityStyles[task.priority]}`}>
                            <div className="flex justify-between items-start">
                                <h3 className="text-md font-bold text-gray-900">{task.title}</h3>
                                <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${priorityBadgeStyles[task.priority]}`}>{task.priority}</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Due: {task.dueDate} {task.dueTime}</p>
                            <p className="mt-2 text-gray-700 text-sm">{task.description}</p>
                            <div className="mt-3 pt-3 border-t flex justify-end gap-2">
                                <Button onClick={() => handleUpdateStatus(task.id, TaskStatus.CannotComplete)} variant="secondary" className="px-3 py-1 text-xs">Can't Complete</Button>
                                <Button onClick={() => handleUpdateStatus(task.id, TaskStatus.Completed)} className="px-3 py-1 text-xs">Complete</Button>
                            </div>
                        </Card>
                    ))}
                </div>
                <div>
                    <h2 className="text-lg font-semibold mb-2">Completed</h2>
                    {completed.length === 0 ? <Card><p className="text-sm text-gray-500">Nothing completed yet.</p></Card> : completed.map(task => (
                        <Card key={task.id} className={`mb-3 border-l-4 ${priorityStyles[task.priority]}`}>
                            <div className="flex justify-between items-start">
                                <h3 className="text-md font-bold text-gray-900">{task.title}</h3>
                                <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${priorityBadgeStyles[task.priority]}`}>{task.priority}</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Due: {task.dueDate} {task.dueTime}</p>
                            <p className="mt-2 text-gray-700 text-sm">{task.description}</p>
                            <div className="mt-3 pt-3 border-t flex justify-end gap-2">
                                <Button onClick={() => handleUpdateStatus(task.id, TaskStatus.Pending)} variant="secondary" className="px-3 py-1 text-xs">Mark Pending</Button>
                            </div>
                        </Card>
                    ))}
                </div>
                <div>
                    <h2 className="text-lg font-semibold mb-2">Unable to Complete</h2>
                    {cannot.length === 0 ? <Card><p className="text-sm text-gray-500">Nothing here.</p></Card> : cannot.map(task => (
                        <Card key={task.id} className={`mb-3 border-l-4 ${priorityStyles[task.priority]}`}>
                            <div className="flex justify-between items-start">
                                <h3 className="text-md font-bold text-gray-900">{task.title}</h3>
                                <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${priorityBadgeStyles[task.priority]}`}>{task.priority}</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Due: {task.dueDate} {task.dueTime}</p>
                            <p className="mt-2 text-gray-700 text-sm">{task.description}</p>
                            <div className="mt-3 pt-3 border-t flex justify-end gap-2">
                                <Button onClick={() => handleUpdateStatus(task.id, TaskStatus.Pending)} variant="secondary" className="px-3 py-1 text-xs">Mark Pending</Button>
                                <Button onClick={() => handleUpdateStatus(task.id, TaskStatus.Completed)} className="px-3 py-1 text-xs">Complete</Button>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default VolunteerTasks;
