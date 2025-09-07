import React, { useState, useEffect } from 'react';
import { api } from '../../services/apiService';
import { Task, TaskPriority, User, TaskStatus } from '../../types';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';

const TaskAssignment: React.FC = () => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [volunteers, setVolunteers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingTask, setEditingTask] = useState<Task | null>(null);

    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState<TaskPriority>(TaskPriority.Medium);
    const [dueDate, setDueDate] = useState('');
    const [dueTime, setDueTime] = useState('');
    const [assignedTo, setAssignedTo] = useState<string[]>([]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [taskData, userData] = await Promise.all([api.getTasks(), api.getAllUsers()]);
            setTasks(taskData);
            setVolunteers(userData.filter(u => u.role === 'VOLUNTEER'));
        } catch (e) {
            console.error('Failed to load tasks/users', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setPriority(TaskPriority.Medium);
        setDueDate('');
        setDueTime('');
        setAssignedTo([]);
        setEditingTask(null);
    }

    const handleEditClick = (task: Task) => {
        setEditingTask(task);
        setTitle(task.title);
        setDescription(task.description);
        setPriority(task.priority);
        setDueDate(task.dueDate);
        setDueTime(task.dueTime || '');
        setAssignedTo(task.assignedTo);
    };

    const handleDelete = async (taskId: string) => {
        if(window.confirm('Are you sure you want to delete this task?')) {
            await api.deleteTask(taskId);
            fetchData();
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const taskData = { title, description, priority, dueDate, dueTime, assignedTo };

        if(editingTask) {
            await api.updateTask(editingTask.id, taskData);
        } else {
            await api.createTask(taskData);
        }
        
        resetForm();
        fetchData(); // Refresh list
    };
    
    const getVolunteerNames = (ids: string[]) => {
        if(ids.length === volunteers.length) return "All Volunteers";
        return ids.map(id => volunteers.find(v => v.id === id)?.name).join(', ');
    };
    
    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if(e.target.checked) {
            setAssignedTo(volunteers.map(v => v.id));
        } else {
            setAssignedTo([]);
        }
    }
    
    const statusColors = {
        [TaskStatus.Pending]: 'bg-yellow-200 text-yellow-800',
        [TaskStatus.Completed]: 'bg-green-200 text-green-800',
        [TaskStatus.CannotComplete]: 'bg-red-200 text-red-800',
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
                <Card>
                    <h2 className="text-xl font-bold mb-4">{editingTask ? 'Edit Task' : 'Create a New Task'}</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="text-sm font-medium">Title</label>
                            <input value={title} onChange={e => setTitle(e.target.value)} required className="w-full p-2 border rounded-md mt-1" />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Description</label>
                            <textarea value={description} onChange={e => setDescription(e.target.value)} required className="w-full p-2 border rounded-md mt-1 h-24" />
                        </div>
                         <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium">Priority</label>
                                <select value={priority} onChange={e => setPriority(e.target.value as TaskPriority)} className="w-full p-2 border rounded-md mt-1">
                                    <option value={TaskPriority.Low}>Low</option>
                                    <option value={TaskPriority.Medium}>Medium</option>
                                    <option value={TaskPriority.High}>High</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-medium">Due Date</label>
                                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} required className="w-full p-2 border rounded-md mt-1" />
                            </div>
                        </div>
                         <div>
                            <label className="text-sm font-medium">Due Time (Optional)</label>
                            <input type="time" value={dueTime} onChange={e => setDueTime(e.target.value)} className="w-full p-2 border rounded-md mt-1" />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Assign To</label>
                            <div className="mt-2 p-2 border rounded-md max-h-40 overflow-y-auto space-y-2">
                                <label className="flex items-center space-x-2">
                                    <input type="checkbox" onChange={handleSelectAll} checked={assignedTo.length === volunteers.length && volunteers.length > 0} />
                                    <span>Assign to All</span>
                                </label>
                                {volunteers.map(v => (
                                    <label key={v.id} className="flex items-center space-x-2">
                                        <input 
                                            type="checkbox" 
                                            value={v.id}
                                            checked={assignedTo.includes(v.id)}
                                            onChange={e => {
                                                if (e.target.checked) {
                                                    setAssignedTo([...assignedTo, v.id]);
                                                } else {
                                                    setAssignedTo(assignedTo.filter(id => id !== v.id));
                                                }
                                            }}
                                        />
                                        <span>{v.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="flex space-x-2">
                            {editingTask && <Button type="button" variant="secondary" onClick={resetForm} className="w-full">Cancel</Button>}
                            <Button type="submit" className="w-full">{editingTask ? 'Update Task' : 'Create Task'}</Button>
                        </div>
                    </form>
                </Card>
            </div>
            <div className="lg:col-span-2">
                <Card>
                    <h2 className="text-xl font-bold mb-4">Assigned Tasks</h2>
                    {loading ? <Spinner/> : (
                        <div className="space-y-4">
                            {tasks.map(task => {
                                const completedCount = task.statuses.filter(s => s.status === TaskStatus.Completed).length;
                                return (
                                <details key={task.id} className="p-3 bg-gray-50 rounded-md block">
                                    <summary className="font-semibold text-gray-800 cursor-pointer">
                                        <div className="flex justify-between items-start">
                                            <span>{task.title}</span>
                                            <span className="text-sm font-medium">{completedCount} / {task.assignedTo.length} Done</span>
                                        </div>
                                    </summary>
                                    <div className="mt-3 pt-3 border-t">
                                        <p className="text-xs text-gray-500">
                                            Assigned: {new Date(task.createdAt).toLocaleString()}
                                            {task.updatedAt && ` (Edited: ${new Date(task.updatedAt).toLocaleString()})`}
                                        </p>
                                        <p className="text-sm text-gray-500 mt-1">Due: {task.dueDate} {task.dueTime}</p>
                                        <p className="text-sm text-gray-700 mt-2">{task.description}</p>
                                        <h4 className="text-sm font-semibold mt-3 mb-1">Status:</h4>
                                        <ul className="text-sm space-y-1">
                                            {task.statuses.map(s => (
                                                <li key={s.volunteerId} className="flex justify-between items-center">
                                                    <span>{volunteers.find(v => v.id === s.volunteerId)?.name}</span>
                                                    <span className={`px-2 py-0.5 text-xs rounded-full ${statusColors[s.status]}`}>{s.status}</span>
                                                </li>
                                            ))}
                                        </ul>
                                        <div className="flex justify-end space-x-2 mt-4 text-sm">
                                            <button onClick={() => handleEditClick(task)} className="font-medium text-blue-600 hover:underline">Edit</button>
                                            <button onClick={() => handleDelete(task.id)} className="font-medium text-red-600 hover:underline">Delete</button>
                                        </div>
                                    </div>
                                </details>
                            )})}
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
};

export default TaskAssignment;
