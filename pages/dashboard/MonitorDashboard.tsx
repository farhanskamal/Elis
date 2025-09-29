import React, { useState, useContext, useEffect, useCallback } from 'react';
import Layout from '../../components/Layout';
import ScheduleView from '../features/ScheduleView';
import MagazineTracker from '../features/MagazineTracker';
import MonitorHours from '../features/MonitorHours';
import Announcements from '../features/Announcements';
import MonitorTasks from '../features/MonitorTasks';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { AuthContext } from '../../context/AuthContext';
import { api } from '../../services/apiService';
import { Announcement, Task, TaskStatus, PeriodDefinition } from '../../types';
import LaptopCheckupPage from '../features/LaptopCheckupPage';

const MonitorDashboard: React.FC = () => {
    const [activeView, setActiveView] = useState('dashboard');
    const { user } = useContext(AuthContext);
    const [totalHours, setTotalHours] = useState(0);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [periodDefinitions, setPeriodDefinitions] = useState<PeriodDefinition[]>([]);

    // State for check-in modal
    const [isCheckinModalOpen, setIsCheckinModalOpen] = useState(false);
    const [checkinCode, setCheckinCode] = useState('');
    const [checkinDate, setCheckinDate] = useState(new Date().toISOString().split('T')[0]);
    const [checkinPeriod, setCheckinPeriod] = useState<number | ''>('');
    const [isLoggingHours, setIsLoggingHours] = useState(false);
    const [logHoursError, setLogHoursError] = useState<string | null>(null);

    const fetchDashboardData = useCallback(async () => {
        if (!user) return;
        try {
            const [logs, annos, userTasks, periods] = await Promise.all([
                api.getMonitorLogs(user.id),
                api.getAnnouncements(),
                api.getTasksForMonitor(user.id),
                api.getPeriodDefinitions(),
            ]);
            
            const totalMinutes = logs.reduce((acc, log) => acc + (log.durationMinutes || 0), 0);
            setTotalHours(Number((totalMinutes / 60).toFixed(2)));
            setAnnouncements(annos.slice(0, 1)); // Show only the latest on dashboard
            setPeriodDefinitions(periods);
            if(periods.length > 0) {
                setCheckinPeriod(periods[0].period);
            }
            
            const pendingTasks = userTasks.filter(t => {
                const myStatus = t.statuses.find(s => s.monitorId === user.id);
                return myStatus?.status === TaskStatus.Pending;
            });
            setTasks(pendingTasks.slice(0, 3));
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } 

    }, [user?.id]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    const handleLogHours = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !checkinCode || !checkinDate || checkinPeriod === '') return;
        
        setIsLoggingHours(true);
        setLogHoursError(null);
        try {
            await api.logHoursWithCode(user.id, checkinDate, checkinPeriod, checkinCode);
            setIsCheckinModalOpen(false);
            setCheckinCode('');
            await fetchDashboardData(); // Refresh data to show new hours
        } catch (error: any) {
            setLogHoursError(error.message || "An unexpected error occurred.");
        } finally {
            setIsLoggingHours(false);
        }
    };


    const renderDashboardContent = () => (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Welcome, {user?.name}!</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Announcements */}
                <div className="md:col-span-3">
                    {announcements.length > 0 && (
                        <Card className="bg-blue-50 border-l-4 border-blue-500">
                             <h2 className="text-xl font-semibold mb-2 flex items-center">
                                <NewspaperIcon/> Latest Announcement
                             </h2>
                             <h3 className="font-bold text-gray-800">{announcements[0].title}</h3>
                             <p className="text-gray-700 mt-1">{announcements[0].content}</p>
                             {announcements[0].imageUrl && <img src={announcements[0].imageUrl} alt={announcements[0].title} className="mt-2 rounded-lg max-h-60" />}
                             <button onClick={() => setActiveView('announcements')} className="mt-2 text-sm text-blue-600 font-semibold">View all &rarr;</button>
                        </Card>
                    )}
                </div>

                {/* Hour Logging */}
                <Card>
                    <h2 className="text-xl font-semibold mb-4">Log My Hours</h2>
                    <p className="text-gray-600 text-sm mb-4">Get the daily code from a librarian to log your scheduled hours for a specific day and period.</p>
                    <Button onClick={() => setIsCheckinModalOpen(true)} className="w-full">
                       Log My Hours
                    </Button>
                </Card>
                <Card>
                    <h2 className="text-xl font-semibold mb-4">Total Service Hours</h2>
                    <p className="text-5xl font-bold text-blue-600">{totalHours}</p>
                    <p className="text-gray-500">hours completed</p>
                </Card>

                {/* Tasks */}
                <Card>
                    <h2 className="text-xl font-semibold mb-4">My Pending Tasks</h2>
                    {tasks.length > 0 ? (
                        <ul className="space-y-2">
                           {tasks.map(task => (
                               <li key={task.id} className="text-sm text-gray-700">{task.title}</li>
                           ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-gray-500">No pending tasks. Great job!</p>
                    )}
                    <button onClick={() => setActiveView('my-tasks')} className="mt-4 text-blue-600 font-semibold">Go to Tasks &rarr;</button>
                </Card>
            </div>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <h2 className="text-xl font-semibold mb-2">Laptop Check Up</h2>
                <p className="text-gray-600 text-sm mb-2">View laptop availability. To check in/out, use Kiosk Mode.</p>
                <Button onClick={() => setActiveView('laptops')} className="w-full">Open</Button>
              </Card>
            </div>
        </div>
    );

    const renderContent = () => {
        switch (activeView) {
            case 'schedule':
                return <ScheduleView />;
            case 'magazines':
                return <MagazineTracker />;
            case 'my-hours':
                return <MonitorHours monitorId={user?.id} />;
            case 'announcements':
                return <Announcements />;
            case 'my-tasks':
                return <MonitorTasks />;
            case 'laptops':
                return <LaptopCheckupPage />;
            case 'dashboard':
            default:
                return renderDashboardContent();
        }
    };

    return (
      <>
        <Layout activeView={activeView} setActiveView={setActiveView}>
            {renderContent()}
        </Layout>
        {isCheckinModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
                <Card className="w-full max-w-sm">
                    <h2 className="text-xl font-bold mb-4">Log Your Hours</h2>
                    <form onSubmit={handleLogHours} className="space-y-4">
                        <div>
                            <label htmlFor="checkin-code" className="block text-sm font-medium text-gray-700">Daily Code</label>
                            <input
                                id="checkin-code"
                                type="text"
                                value={checkinCode}
                                onChange={e => setCheckinCode(e.target.value)}
                                required
                                className="mt-1 w-full p-2 border rounded-md"
                                placeholder="Enter code from librarian"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="checkin-date" className="block text-sm font-medium text-gray-700">Date</label>
                                <input
                                    id="checkin-date"
                                    type="date"
                                    value={checkinDate}
                                    onChange={e => setCheckinDate(e.target.value)}
                                    required
                                    className="mt-1 w-full p-2 border rounded-md"
                                />
                            </div>
                             <div>
                                <label htmlFor="checkin-period" className="block text-sm font-medium text-gray-700">Period</label>
                                <select
                                    id="checkin-period"
                                    value={checkinPeriod}
                                    onChange={e => setCheckinPeriod(Number(e.target.value))}
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
                        {logHoursError && <p className="text-sm text-red-600">{logHoursError}</p>}
                        <div className="flex justify-end space-x-2 pt-2">
                            <Button type="button" variant="secondary" onClick={() => setIsCheckinModalOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={isLoggingHours}>
                                {isLoggingHours ? 'Logging...' : 'Submit'}
                            </Button>
                        </div>
                    </form>
                </Card>
            </div>
        )}
      </>
    );
};

export default MonitorDashboard;

const NewspaperIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 4H8a2 2 0 00-2 2v10a2 2 0 01-2 2h15a3 3 0 003-3V6a2 2 0 00-2-2zm-9 3h6a1 1 0 010 2H10a1 1 0 010-2zm0 4h8a1 1 0 010 2h-8a1 1 0 010-2zm0 4h8a1 1 0 010 2h-8a1 1 0 010-2zM5 8h1v9H5a1 1 0 01-1-1V9a1 1 0 011-1z" />
  </svg>
);