import React, { useState } from 'react';
import Layout from '../../components/Layout';
import ScheduleView from '../features/ScheduleView';
import MagazineTracker from '../features/MagazineTracker';
import VolunteerHours from '../features/VolunteerHours';
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
                return <VolunteerHours />;
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
                                <h2 className="text-xl font-semibold mb-2">Manage Schedule</h2>
                                <p className="text-gray-600">Assign volunteers and set period durations for hour logging.</p>
                                <button onClick={() => setActiveView('schedule')} className="mt-4 text-blue-600 font-semibold">Go to Schedule &rarr;</button>
                            </Card>
                             <Card className="hover:shadow-lg transition-shadow">
                                <h2 className="text-xl font-semibold mb-2">Assign Tasks</h2>
                                <p className="text-gray-600">Create and delegate tasks to individual or all volunteers.</p>
                                <button onClick={() => setActiveView('tasks')} className="mt-4 text-blue-600 font-semibold">Go to Tasks &rarr;</button>
                            </Card>
                            <Card className="hover:shadow-lg transition-shadow">
                                <h2 className="text-xl font-semibold mb-2">Post Announcements</h2>
                                <p className="text-gray-600">Share important updates and news with all volunteers.</p>
                                <button onClick={() => setActiveView('announcements')} className="mt-4 text-blue-600 font-semibold">View Announcements &rarr;</button>
                            </Card>
                            <Card className="hover:shadow-lg transition-shadow">
                                <h2 className="text-xl font-semibold mb-2">Check-in Codes</h2>
                                <p className="text-gray-600">View and generate new codes for volunteer hour logging.</p>
                                <button onClick={() => setActiveView('checkin-codes')} className="mt-4 text-blue-600 font-semibold">Manage Codes &rarr;</button>
                            </Card>
                             <Card className="hover:shadow-lg transition-shadow">
                                <h2 className="text-xl font-semibold mb-2">Manage Users</h2>
                                <p className="text-gray-600">View volunteer profiles and manage their accounts.</p>
                                <button onClick={() => setActiveView('users')} className="mt-4 text-blue-600 font-semibold">Go to Users &rarr;</button>
                            </Card>
                            <Card className="hover:shadow-lg transition-shadow">
                                <h2 className="text-xl font-semibold mb-2">Volunteer Hours</h2>
                                <p className="text-gray-600">Review and generate reports on all volunteer hours logged.</p>
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

export default LibrarianDashboard;