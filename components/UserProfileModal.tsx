import React, { useState, useContext, useRef } from 'react';
import { api } from '../services/apiService';
import { User } from '../types';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext, Theme } from '../context/ThemeContext';
import Card from './ui/Card';
import Button from './ui/Button';

interface Props {
    user: User;
    onClose: () => void;
}

const UserProfileModal: React.FC<Props> = ({ user, onClose }) => {
    const { updateCurrentUser } = useContext(AuthContext);
    const { theme: currentTheme } = useContext(ThemeContext);
    const [profilePictureUrl, setProfilePictureUrl] = useState(user.profilePicture);
    const [isSaving, setIsSaving] = useState(false);
    const [name, setName] = useState(user.name);
    const [email, setEmail] = useState(user.email);
    const [password, setPassword] = useState('');
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    
    // Initialize theme settings from user preferences or defaults
    const userTheme = user.themePreferences || currentTheme;
    const [theme, setTheme] = useState<Theme>({
        mode: userTheme.mode || 'system',
        primary: userTheme.primary || '#2563eb',
        secondary: userTheme.secondary || '#64748b',
        background: userTheme.background || '#f9fafb'
    });

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file.');
            return;
        }
        if (file.size > 4 * 1024 * 1024) { // 4MB client-side guard
            alert('Image too large. Please choose an image under 4MB.');
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            setProfilePictureUrl(result);
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            // Save preferences and optional credential updates with theme preferences
            // Don't pass role when users are updating their own profiles to avoid 403 errors
            const updatedUser = await api.updateUser(
                user.id, 
                name, 
                email, 
                password || undefined, 
                profilePictureUrl, 
                user.backgroundColor, // Keep legacy field for backwards compatibility
                undefined, // Don't pass role for self-updates
                theme // Save theme preferences
            );
            updateCurrentUser({ 
                name: updatedUser.name,
                email: updatedUser.email,
                profilePicture: updatedUser.profilePicture,
                backgroundColor: updatedUser.backgroundColor,
                themePreferences: theme // This will trigger theme update in App.tsx
            });
            onClose();
        } catch (error) {
            console.error("Failed to update profile", error);
            alert("Could not save your profile changes. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <Card className="w-full max-w-md relative">
                 <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                <div className="text-center">
                    <img src={profilePictureUrl} alt="Your profile" className="w-24 h-24 rounded-full mx-auto mb-4 object-cover" />
                    <h2 className="text-2xl font-bold">{user.name}</h2>
                    <p className="text-gray-600">{user.email}</p>
                </div>
                
                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                    <div className="grid grid-cols-1 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="mt-1 w-full p-2 border rounded-md"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="mt-1 w-full p-2 border rounded-md"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">New Password (optional)</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="mt-1 w-full p-2 border rounded-md"
                                placeholder="Leave blank to keep current password"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Profile Picture</label>
                        <div className="mt-1 grid grid-cols-1 gap-2">
                            <input
                                id="pfp-url"
                                type="text"
                                value={profilePictureUrl}
                                onChange={(e) => setProfilePictureUrl(e.target.value)}
                                className="w-full p-2 border rounded-md"
                                placeholder="Paste image URL or upload below"
                            />
                            <div className="flex items-center gap-2">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileSelect}
                                    className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                                />
                            </div>
                            <p className="text-xs text-gray-500">Supports image URLs or uploads (JPEG/PNG/GIF, up to 4MB).</p>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Theme</label>
                        <div className="mt-2 grid grid-cols-4 gap-2">
                            <button type="button" onClick={() => setTheme({ ...theme, mode: 'system' })} className={`p-2 rounded-md border ${theme.mode==='system' ? 'border-blue-500' : 'border-gray-200'} bg-white`}>System</button>
                            <button type="button" onClick={() => setTheme({ ...theme, mode: 'light' })} className={`p-2 rounded-md border ${theme.mode==='light' ? 'border-blue-500' : 'border-gray-200'} bg-white`}>Light</button>
                            <button type="button" onClick={() => setTheme({ ...theme, mode: 'dark' })} className={`p-2 rounded-md border ${theme.mode==='dark' ? 'border-blue-500' : 'border-gray-200'} bg-slate-900 text-white`}>Dark</button>
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-3">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Primary</label>
                                <input
                                    type="color"
                                    value={theme.primary}
                                    onChange={(e) => setTheme({ ...theme, primary: e.target.value })}
                                    className="h-10 w-full p-1 border rounded-md"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Secondary</label>
                                <input
                                    type="color"
                                    value={theme.secondary}
                                    onChange={(e) => setTheme({ ...theme, secondary: e.target.value })}
                                    className="h-10 w-full p-1 border rounded-md"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Background</label>
                                <input
                                    type="color"
                                    value={theme.background}
                                    onChange={(e) => setTheme({ ...theme, background: e.target.value })}
                                    className="h-10 w-full p-1 border rounded-md"
                                />
                            </div>
                        </div>
                        <div className="mt-3 flex gap-2">
                            <Button type="button" variant="secondary" onClick={() => setTheme({ mode: 'system', primary: '#2563eb', secondary: '#64748b', background: '#f9fafb' })}>Reset</Button>
                        </div>
                    </div>
                    <div className="flex justify-end space-x-2 pt-2">
                        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};

export default UserProfileModal;