import React, { useEffect, useMemo, useState } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import { api } from '../../services/apiService';
import { Announcement, PeriodDefinition, Role, Shift, Task, TaskStatus, User } from '../../types';

// Helper to display FirstName + LastInitial or full
const displayName = (name: string) => {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
};

// ISO week identifier helper
const getWeekIdentifier = (d: Date): string => {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.valueOf() - yearStart.valueOf()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo}`;
};

const KioskDashboard: React.FC = () => {
  const [monitors, setMonitors] = useState<User[]>([]);
  const [selectedMonitor, setSelectedMonitor] = useState<User | null>(null);
  const [search, setSearch] = useState('');

  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [periods, setPeriods] = useState<PeriodDefinition[]>([]);
  const [todayShifts, setTodayShifts] = useState<Shift[]>([]);
  const [magazines, setMagazines] = useState<{ id: string; title: string }[]>([]);
  const [magWeekChecked, setMagWeekChecked] = useState<Record<string, boolean>>({});
  const [lastCheckin, setLastCheckin] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load initial data
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [users, annos, pdefs] = await Promise.all([
          api.getAllUsers(),
          api.getAnnouncements(),
          api.getPeriodDefinitions(),
        ]);
        setMonitors(users.filter(u => u.role === Role.Monitor));
        setAnnouncement(annos[0] || null);
        setPeriods(pdefs);

        const today = new Date();
        const day = new Date();
        // Compute Monday of current week
        const dow = day.getDay();
        const diff = day.getDate() - dow + (dow === 0 ? -6 : 1);
        const monday = new Date(day);
        monday.setDate(diff);
        monday.setHours(0,0,0,0);
        const weekStart = monday.toISOString().split('T')[0];
        const shifts = await api.getScheduleForWeek(weekStart);
        const todayStr = new Date().toISOString().split('T')[0];
        setTodayShifts(shifts.filter(s => s.date === todayStr));

        const mags = await api.getMagazines();
        setMagazines(mags);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // When monitor selected, load their tasks, magazine checks for current week, and last kiosk check-in
  useEffect(() => {
    const loadForMonitor = async () => {
      if (!selectedMonitor) return;
      const [userTasks] = await Promise.all([
        api.getTasksForMonitor(selectedMonitor.id),
      ]);
      setTasks(userTasks);

      // Magazine week checks
      const logs = await api.getMagazineLogs();
      const weekId = getWeekIdentifier(new Date());
      const map: Record<string, boolean> = {};
      magazines.forEach(m => { map[m.id] = false; });
      logs.forEach(l => {
        if (l.weekIdentifier === weekId) {
          map[l.magazineId] = true;
        }
      });
      setMagWeekChecked(map);

      // Last kiosk check-in
      try {
        const last = await api.getLastKioskCheckin(selectedMonitor.id);
        setLastCheckin(last ? new Date(last.timestamp).toLocaleString() : null);
      } catch {
        setLastCheckin(null);
      }
    };
    loadForMonitor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonitor, magazines.length]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return monitors;
    return monitors.filter(m => m.name.toLowerCase().includes(q));
  }, [search, monitors]);

  const handleCheckin = async () => {
    if (!selectedMonitor) return;
    try {
      await api.kioskCheckin(selectedMonitor.id);
      const last = await api.getLastKioskCheckin(selectedMonitor.id);
      setLastCheckin(last ? new Date(last.timestamp).toLocaleString() : null);
      alert('Checked in!');
    } catch (e: any) {
      alert(e.message || 'Failed to check in');
    }
  };

  const handleTaskStatus = async (taskId: string, status: TaskStatus) => {
    if (!selectedMonitor) return;
    try {
      await api.updateTaskStatus(taskId, selectedMonitor.id, status);
      const updated = await api.getTasksForMonitor(selectedMonitor.id);
      setTasks(updated);
    } catch (e: any) {
      alert(e.message || 'Failed to update task');
    }
  };

  const handleMagazineToggle = async (magazineId: string, checked: boolean) => {
    if (!selectedMonitor) return;
    const weekId = getWeekIdentifier(new Date());
    try {
      if (checked) {
        await api.logMagazineCheckAs(magazineId, weekId, selectedMonitor.id);
      } else {
        // Uncheck requires librarian or same monitor; kiosk runs as librarian, so allowed.
        await api.removeMagazineLog(magazineId, weekId);
      }
      const logs = await api.getMagazineLogs();
      const map: Record<string, boolean> = {};
      magazines.forEach(m => { map[m.id] = false; });
      logs.forEach(l => { if (l.weekIdentifier === weekId) map[l.magazineId] = true; });
      setMagWeekChecked(map);
    } catch (e: any) {
      alert(e.message || 'Failed to update magazine');
    }
  };

  const exitKiosk = () => {
    localStorage.removeItem('kioskMode');
    window.location.reload();
  };

  if (loading) return <div className="p-6"><Spinner/></div>;

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <img src="/TaehsLibraryLogo.png" alt="Library Logo" className="h-10 w-10" />
            <div>
              <h1 className="text-2xl font-bold">Liteer — Thomas A. Edison CTE HS Library</h1>
              <p className="text-sm text-gray-600">Kiosk Mode</p>
            </div>
          </div>
          <Button onClick={exitKiosk} variant="secondary">Exit Kiosk</Button>
        </div>

        {/* Monitor selector */}
        <Card className="mb-6">
          <div className="grid md:grid-cols-2 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700">Search Monitor</label>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Type a name..."
                className="mt-1 w-full p-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Select</label>
              <select
                value={selectedMonitor?.id || ''}
                onChange={e => setSelectedMonitor(monitors.find(m => m.id === e.target.value) || null)}
                className="mt-1 w-full p-2 border rounded-md"
              >
                <option value="" disabled>Select a monitor</option>
                {filtered.map(m => (
                  <option key={m.id} value={m.id}>{displayName(m.name)}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Announcements */}
          <div className="md:col-span-3">
            {announcement && (
              <Card className="bg-blue-50 border-l-4 border-blue-500">
                <h2 className="text-xl font-semibold mb-2">Latest Announcement</h2>
                <h3 className="font-bold">{announcement.title}</h3>
                <p className="text-gray-700 mt-1">{announcement.content}</p>
              </Card>
            )}
          </div>

          {/* Check-in */}
          <Card>
            <h2 className="text-xl font-semibold mb-3">Check In</h2>
            <p className="text-sm text-gray-600 mb-2">Select a monitor above, then press to check in (1-hour cooldown).</p>
            <Button onClick={handleCheckin} disabled={!selectedMonitor}>Check In</Button>
            <p className="text-xs text-gray-500 mt-2">Last check-in: {lastCheckin || '—'}</p>
          </Card>

          {/* Today’s schedule */}
          <Card>
            <h2 className="text-xl font-semibold mb-3">Today’s Schedule</h2>
            <ul className="space-y-1 text-sm">
              {todayShifts.length === 0 && <li className="text-gray-500">No shifts scheduled for today.</li>}
              {todayShifts.map(s => (
                <li key={s.id}>
                  <span className="font-medium">P{s.period}:</span> {s.monitors.map(m => displayName(m.name)).join(', ')}
                </li>
              ))}
            </ul>
          </Card>

          {/* Tasks for selected monitor */}
          <Card>
            <h2 className="text-xl font-semibold mb-3">Tasks</h2>
            {!selectedMonitor && <p className="text-sm text-gray-500">Select a monitor to view tasks.</p>}
            {selectedMonitor && (
              <ul className="space-y-2">
                {tasks.length === 0 && <li className="text-gray-500 text-sm">No tasks.</li>}
                {tasks.map(task => {
                  const myStatus = task.statuses.find(s => s.monitorId === selectedMonitor.id)?.status || TaskStatus.Pending;
                  return (
                    <li key={task.id} className="border rounded p-2">
                      <div className="flex justify-between">
                        <div>
                          <div className="font-semibold text-sm">{task.title}</div>
                          <div className="text-xs text-gray-500">Due {task.dueDate} {task.dueTime || ''}</div>
                        </div>
                        <div className="space-x-2">
                          <Button variant="secondary" className="px-2 py-1 text-xs" onClick={() => handleTaskStatus(task.id, TaskStatus.Pending)}>Pending</Button>
                          <Button variant="secondary" className="px-2 py-1 text-xs" onClick={() => handleTaskStatus(task.id, TaskStatus.CannotComplete)}>Can't</Button>
                          <Button className="px-2 py-1 text-xs" onClick={() => handleTaskStatus(task.id, TaskStatus.Completed)}>Done</Button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          {/* Magazine checklist - current week */}
          <div className="md:col-span-3">
            <Card>
              <h2 className="text-xl font-semibold mb-3">Magazine Checklist (This Week)</h2>
              {!selectedMonitor && <p className="text-sm text-gray-500">Select a monitor to attribute checks.</p>}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-600">
                      <th className="px-3 py-2">Magazine</th>
                      <th className="px-3 py-2">Checked</th>
                    </tr>
                  </thead>
                  <tbody>
                    {magazines.map(m => (
                      <tr key={m.id} className="border-t">
                        <td className="px-3 py-2">{m.title}</td>
                        <td className="px-3 py-2">
                          <input type="checkbox" disabled={!selectedMonitor} checked={!!magWeekChecked[m.id]} onChange={e => handleMagazineToggle(m.id, e.target.checked)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KioskDashboard;