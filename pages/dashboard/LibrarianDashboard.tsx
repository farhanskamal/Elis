import React, { useState } from 'react';
import Layout from '../../components/Layout';
import ScheduleView from '../features/ScheduleView';
import MagazineTracker from '../features/MagazineTracker';
import MonitorHours from '../features/MonitorHours';
import Card from '../../components/ui/Card';
import UserManagement from '../features/UserManagement';
import Announcements from '../features/Announcements';
import TaskAssignment from '../features/TaskAssignment';
import CheckinCodes from '../features/CheckinCodes';
import AuditLog from '../features/AuditLog';

const LibrarianDashboard: React.FC = () => {
    const [activeView, setActiveView] = useState('dashboard');

    const renderContent = () => {
        switch (activeView) {
            case 'schedule':
                return <ScheduleView />;
            case 'magazines':
                return <MagazineTracker />;
            case 'hours':
                return <MonitorHours />;
            case 'users':
                return <UserManagement />;
            case 'announcements':
                return <Announcements />;
            case 'tasks':
                return <TaskAssignment />;
            case 'checkin-codes':
                return <CheckinCodes />;
            case 'audit':
                return <AuditLog />;
            case 'dashboard':
            default:
                return (
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800 mb-6">Librarian Dashboard</h1>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <Card className="hover:shadow-lg transition-shadow">
                                <div className="flex items-center mb-2">
                                    <CalendarIcon className="w-6 h-6 text-blue-600 mr-3" />
                                    <h2 className="text-xl font-semibold">Manage Schedule</h2>
                                </div>
                                <p className="text-gray-600">Assign monitors and set period durations for hour logging.</p>
                                <button onClick={() => setActiveView('schedule')} className="mt-4 text-blue-600 font-semibold">Go to Schedule &rarr;</button>
                            </Card>
                             <Card className="hover:shadow-lg transition-shadow">
                                <div className="flex items-center mb-2">
                                    <ClipboardListIcon className="w-6 h-6 text-blue-600 mr-3" />
                                    <h2 className="text-xl font-semibold">Assign Tasks</h2>
                                </div>
                                <p className="text-gray-600">Create and delegate tasks to individual or all monitors.</p>
                                <button onClick={() => setActiveView('tasks')} className="mt-4 text-blue-600 font-semibold">Go to Tasks &rarr;</button>
                            </Card>
                            <Card className="hover:shadow-lg transition-shadow">
                                <div className="flex items-center mb-2">
                                    <MegaphoneIcon className="w-6 h-6 text-blue-600 mr-3" />
                                    <h2 className="text-xl font-semibold">Post Announcements</h2>
                                </div>
                                <p className="text-gray-600">Share important updates and news with all monitors.</p>
                                <button onClick={() => setActiveView('announcements')} className="mt-4 text-blue-600 font-semibold">View Announcements &rarr;</button>
                            </Card>
                            <Card className="hover:shadow-lg transition-shadow">
                                <div className="flex items-center mb-2">
                                    <KeyIcon className="w-6 h-6 text-blue-600 mr-3" />
                                    <h2 className="text-xl font-semibold">Check-in Codes</h2>
                                </div>
                                <p className="text-gray-600">View and generate new codes for monitor hour logging.</p>
                                <button onClick={() => setActiveView('checkin-codes')} className="mt-4 text-blue-600 font-semibold">Manage Codes &rarr;</button>
                            </Card>
                             <Card className="hover:shadow-lg transition-shadow">
                                <div className="flex items-center mb-2">
                                    <UsersIcon className="w-6 h-6 text-blue-600 mr-3" />
                                    <h2 className="text-xl font-semibold">Manage Users</h2>
                                </div>
                                <p className="text-gray-600">View monitor profiles and manage their accounts.</p>
                                <button onClick={() => setActiveView('users')} className="mt-4 text-blue-600 font-semibold">Go to Users &rarr;</button>
                            </Card>
                            <Card className="hover:shadow-lg transition-shadow">
                                <div className="flex items-center mb-2">
                                    <ClockIcon className="w-6 h-6 text-blue-600 mr-3" />
                                    <h2 className="text-xl font-semibold">Monitor Hours</h2>
                                </div>
                                <p className="text-gray-600">Review and generate reports on all monitor hours logged.</p>
                                <button onClick={() => setActiveView('hours')} className="mt-4 text-blue-600 font-semibold">View Hours &rarr;</button>
                            </Card>
                        </div>
                    </div>
                );
        }
    };

    return (
        <Layout activeView={activeView} setActiveView={setActiveView}>
            {renderContent()}
        </Layout>
    );
};

// Icon Components
const MegaphoneIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
    </svg>
);

const KeyIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
    </svg>
);

const CalendarIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);

const ClipboardListIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
);

const UsersIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.122-1.28-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.653.122-1.28.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
);

const ClockIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

export default LibrarianDashboard;
