import React, { useState, useEffect, useContext } from 'react';
import { api } from '../../services/apiService';
import { User, Role } from '../../types';
import { AuthContext } from '../../context/AuthContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import MonitorProfileModal from './MonitorProfileModal';

const UserManagement: React.FC = () => {
    const { user } = useContext(AuthContext);
    const [monitors, setMonitors] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMonitor, setSelectedMonitor] = useState<User | null>(null);
    const [editingMonitor, setEditingMonitor] = useState<User | null>(null);
    const [formState, setFormState] = useState<{name: string; email: string; password: string; role: Role; profilePicture: string; backgroundColor: string}>({
        name: '', email: '', password: '', role: Role.Monitor, profilePicture: '', backgroundColor: '#f3f4f6'
    });
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const fetchMonitors = async () => {
        setLoading(true);
        try {
            const data = await api.getAllUsers();
            setMonitors(data);
        } catch (error) {
            console.error('Failed to fetch monitors:', error);
            // You could set an error state here if needed
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.role === Role.Librarian) {
            fetchMonitors();
        } else if (user) {
            // If user is logged in but not a librarian, stop loading
            setLoading(false);
        }
    }, [user]);

    const handleCreateUser = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const name = formData.get('name') as string;
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;
        
        await api.createUser(name, email, password);
        setIsCreateModalOpen(false);
        fetchMonitors(); // Refresh list
    };
    
    if (loading) return <div className="flex justify-center"><Spinner /></div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">User Management</h1>
                <Button onClick={() => setIsCreateModalOpen(true)}>Add Monitor</Button>
            </div>

            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3">Name</th>
                                <th scope="col" className="px-6 py-3">Email</th>
                                <th scope="col" className="px-6 py-3">Role</th>
                                <th scope="col" className="px-6 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {monitors.map(mon => (
                                <tr key={mon.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-900 flex items-center space-x-3">
                                        <img className="h-8 w-8 rounded-full" src={mon.profilePicture} alt={`${mon.name}'s profile`} />
                                        <span>{mon.name}</span>
                                    </td>
                                    <td className="px-6 py-4">{mon.email}</td>
                                    <td className="px-6 py-4">{mon.role}</td>
                                    <td className="px-6 py-4 space-x-3">
                                        <button onClick={() => setSelectedMonitor(mon)} className="font-medium text-blue-600 hover:underline">View</button>
                                        <button onClick={() => { setEditingMonitor(mon); setFormState({ name: mon.name, email: mon.email, password: '', role: mon.role, profilePicture: mon.profilePicture, backgroundColor: mon.backgroundColor || '#f3f4f6' }); }} className="font-medium text-gray-700 hover:underline">Edit</button>
                                        <button onClick={async () => {
                                            if (!window.confirm(`Delete ${mon.name}? This cannot be undone.`)) return;
                                            try {
                                                await api.deleteUser(mon.id);
                                                fetchMonitors();
                                            } catch (e) {
                                                alert('Failed to delete user');
                                            }
                                        }} className="font-medium text-red-600 hover:underline">Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {selectedMonitor && (
                <MonitorProfileModal 
                    monitor={selectedMonitor} 
                    onClose={() => setSelectedMonitor(null)}
                    onUpdate={fetchMonitors}
                />
            )}

            {isCreateModalOpen && (
                 <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
                    <Card className="w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4">Create New Monitor</h2>
                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium">Full Name</label>
                                <input name="name" type="text" required className="mt-1 w-full p-2 border rounded-md"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Email</label>
                                <input name="email" type="email" required className="mt-1 w-full p-2 border rounded-md"/>
                            </div>
                             <div>
                                <label className="block text-sm font-medium">Password</label>
                                <input name="password" type="password" required className="mt-1 w-full p-2 border rounded-md"/>
                            </div>
                            <div className="flex justify-end space-x-2 pt-4">
                                <Button type="button" variant="secondary" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
                                <Button type="submit">Create User</Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}

            {editingMonitor && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
                    <Card className="w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4">Edit User</h2>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            // Confirm role change if changing to/from librarian
                            const originalRole = editingMonitor.role;
                            const roleChanged = originalRole !== formState.role;
                            if (roleChanged) {
                              const ok = window.confirm(`Are you sure you want to change role from ${originalRole} to ${formState.role}?`);
                              if (!ok) return;
                            }
                            await api.updateUser(
                              editingMonitor.id,
                              formState.name,
                              formState.email,
                              formState.password || undefined,
                              formState.profilePicture,
                              formState.backgroundColor,
                              formState.role,
                            );
                            setEditingMonitor(null);
                            fetchMonitors();
                        }} className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium">Full Name</label>
                                <input value={formState.name} onChange={(e) => setFormState({ ...formState, name: e.target.value })} type="text" required className="mt-1 w-full p-2 border rounded-md"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Email</label>
                                <input value={formState.email} onChange={(e) => setFormState({ ...formState, email: e.target.value })} type="email" required className="mt-1 w-full p-2 border rounded-md"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium">New Password (optional)</label>
                                <input value={formState.password} onChange={(e) => setFormState({ ...formState, password: e.target.value })} type="password" className="mt-1 w-full p-2 border rounded-md"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Profile Picture URL</label>
                                <input value={formState.profilePicture} onChange={(e) => setFormState({ ...formState, profilePicture: e.target.value })} type="text" className="mt-1 w-full p-2 border rounded-md"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Background Color</label>
                                <input value={formState.backgroundColor} onChange={(e) => setFormState({ ...formState, backgroundColor: e.target.value })} type="text" className="mt-1 w-full p-2 border rounded-md"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Role</label>
                                <select value={formState.role} onChange={(e) => setFormState({ ...formState, role: e.target.value as Role })} className="mt-1 w-full p-2 border rounded-md">
                                    <option value={Role.Monitor}>MONITOR</option>
                                    <option value={Role.Librarian}>LIBRARIAN</option>
                                </select>
                            </div>
                            <div className="flex justify-end space-x-2 pt-3">
                                <Button type="button" variant="secondary" onClick={() => setEditingMonitor(null)}>Cancel</Button>
                                <Button type="submit">Save</Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default UserManagement;
