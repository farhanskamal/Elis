import React, { useContext, useEffect, useMemo, useState } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import { api } from '../../services/apiService';
import { Announcement, PeriodDefinition, Role, Shift, Task, TaskStatus, User } from '../../types';
import { NotificationsContext } from '../../context/NotificationsContext';
import { AuthContext } from '../../context/AuthContext';
import LaptopCheckup from './LaptopCheckup';

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

// Compute Monday (week start) for a given date
const getWeekStartDateString = (date: Date) => {
  const d = new Date(date);
  const dow = d.getDay();
  const diff = d.getDate() - dow + (dow === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split('T')[0];
};

const KioskDashboard: React.FC = () => {
  const { add: notify } = useContext(NotificationsContext);
  const { user: currentUser } = useContext(AuthContext);

  const [monitors, setMonitors] = useState<User[]>([]);
  const [selectedMonitor, setSelectedMonitor] = useState<User | null>(null);
  const [search, setSearch] = useState('');

  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [periods, setPeriods] = useState<PeriodDefinition[]>([]);

  // Header clock and optional weather
  const [nowText, setNowText] = useState<string>(new Date().toLocaleString());
  const [weather, setWeather] = useState<null | { tempC: number; description: string }>(null);

  // Schedule as a day view
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [weekShifts, setWeekShifts] = useState<Shift[]>([]);

  // Magazines (monthly weeks view)
  const [magazines, setMagazines] = useState<{ id: string; title: string }[]>([]);
  const [magazineLogs, setMagazineLogs] = useState<{ magazineId: string; weekIdentifier: string; checkedByMonitorId: string; timestamp: string }[]>([]);
  const [magMonthDate, setMagMonthDate] = useState<Date>(new Date());

  // Last logged hours string for monitor (not kiosk checkin code)
  const [lastLogged, setLastLogged] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);

  // Header: live clock and basic weather using Open-Meteo if geolocation is allowed
  useEffect(() => {
    const timer = setInterval(() => setNowText(new Date().toLocaleTimeString()), 1_000);
    setNowText(new Date().toLocaleTimeString());
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`;
          const resp = await fetch(url);
          const data = await resp.json();
          if (data?.current_weather) {
            setWeather({ tempC: data.current_weather.temperature, description: 'Now' });
          }
        } catch {
          // ignore weather errors silently
        }
      }, () => { /* ignore denied */ });
    }
    return () => clearInterval(timer);
  }, []);

  // Load initial data (monitors, announcement, periods, magazines, schedule for current week)
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [users, annos, pdefs, mags] = await Promise.all([
          api.getAllUsers(),
          api.getAnnouncements(),
          api.getPeriodDefinitions(),
          api.getMagazines(),
        ]);
        setMonitors(users.filter(u => u.role === Role.Monitor));
        setAnnouncement(annos[0] || null);
        setPeriods(pdefs);
        setMagazines(mags);

        const weekStart = getWeekStartDateString(new Date());
        const shifts = await api.getScheduleForWeek(weekStart);
        setWeekShifts(shifts);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // When date changes, ensure shifts for that date's week are loaded
  useEffect(() => {
    const ensureWeek = async () => {
      const weekStart = getWeekStartDateString(new Date(selectedDate));
      const haveWeek = weekShifts.some(s => s.date >= weekStart && s.date <= new Date(new Date(weekStart).getTime() + 6*86400000).toISOString().split('T')[0]);
      if (!haveWeek) {
        const shifts = await api.getScheduleForWeek(weekStart);
        setWeekShifts(shifts);
      }
    };
    ensureWeek();
  }, [selectedDate]);

  // When monitor selected, load their tasks, magazine logs for current month, and last hours log
  useEffect(() => {
    const loadForMonitor = async () => {
      if (!selectedMonitor) return;
      const [userTasks] = await Promise.all([
        api.getTasksForMonitor(selectedMonitor.id),
      ]);
      setTasks(userTasks);

      // Magazine logs (all) so we can compute month view
      const logs = await api.getMagazineLogs();
      setMagazineLogs(logs);

      // Last logged hours for this monitor
      try {
        const logs2 = await api.getMonitorLogs(selectedMonitor.id);
        // Sort by date then period descending to find latest log
        const last = logs2.sort((a,b) => {
          const ad = new Date(a.date + 'T00:00:00').valueOf();
          const bd = new Date(b.date + 'T00:00:00').valueOf();
          if (bd !== ad) return bd - ad;
          return (b.period || 0) - (a.period || 0);
        })[0];
        setLastLogged(last ? `${last.date} (P${last.period})` : null);
      } catch {
        setLastLogged(null);
      }
    };
    loadForMonitor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonitor, magMonthDate.getMonth(), magMonthDate.getFullYear()]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return monitors;
    return monitors.filter(m => m.name.toLowerCase().includes(q));
  }, [search, monitors]);

  // Day schedule for selectedDate
  const dayShifts = useMemo(() => weekShifts.filter(s => s.date === selectedDate), [weekShifts, selectedDate]);

  const prevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };
  const nextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  // Check-in modal state (no code required)
  const [isCheckinOpen, setIsCheckinOpen] = useState(false);
  const [checkinDate, setCheckinDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [checkinPeriod, setCheckinPeriod] = useState<number | ''>('');
  const [isLogging, setIsLogging] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);

  const openCheckin = () => {
    if (periods.length > 0 && checkinPeriod === '') setCheckinPeriod(periods[0].period);
    setIsCheckinOpen(true);
  };

  const submitCheckin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMonitor || checkinPeriod === '') return;
    try {
      setIsLogging(true);
      setLogError(null);
      await api.logHoursByLibrarian(selectedMonitor.id, checkinDate, Number(checkinPeriod));
      setIsCheckinOpen(false);
      notify({ type: 'info', title: 'Hours Logged', message: `Logged for ${checkinDate}, period ${checkinPeriod}` });
      // refresh last logged
      try {
        const logs2 = await api.getMonitorLogs(selectedMonitor.id);
        const last = logs2.sort((a,b) => {
          const ad = new Date(a.date + 'T00:00:00').valueOf();
          const bd = new Date(b.date + 'T00:00:00').valueOf();
          if (bd !== ad) return bd - ad;
          return (b.period || 0) - (a.period || 0);
        })[0];
        setLastLogged(last ? `${last.date} (P${last.period})` : null);
      } catch {}
    } catch (e: any) {
      setLogError(e.message || 'Failed to log hours');
    } finally {
      setIsLogging(false);
    }
  };

  const handleTaskStatus = async (taskId: string, status: TaskStatus) => {
    if (!selectedMonitor) return;
    try {
      await api.updateTaskStatus(taskId, selectedMonitor.id, status);
      const updated = await api.getTasksForMonitor(selectedMonitor.id);
      setTasks(updated);
      const label = status === TaskStatus.Completed ? 'Completed' : status === TaskStatus.CannotComplete ? "Can't Complete" : 'Pending';
      notify({ type: 'info', title: 'Task Updated', message: `Set to ${label}` });
    } catch (e: any) {
      notify({ type: 'error', title: 'Task Update Failed', message: e.message || 'Failed to update task' });
    }
  };

  // Magazine month view helpers
  const weeksInMonth = useMemo(() => {
    const year = magMonthDate.getFullYear();
    const month = magMonthDate.getMonth();
    const lastDay = new Date(year, month + 1, 0);
    const weeks: { display: string; identifier: string }[] = [];
    let counter = 1;
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const id = getWeekIdentifier(new Date(year, month, i));
      if (!weeks.find(w => w.identifier === id)) {
        weeks.push({ display: `Week ${counter}`, identifier: id });
        counter++;
      }
    }
    return weeks;
  }, [magMonthDate]);

  const getMonthIdentifierKiosk = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `MONTH-${y}-${m}`;
  };

  const isMagWeekChecked = (magazineId: string, weekIdentifier: string) =>
    !!magazineLogs.find(l => l.magazineId === magazineId && l.weekIdentifier === weekIdentifier);
  const getMagLogInfo = (magazineId: string, identifier: string) => {
    const log = magazineLogs.find(l => l.magazineId === magazineId && l.weekIdentifier === identifier);
    if (!log) return null;
    const mon = monitors.find(m => m.id === log.checkedByMonitorId);
    const name = mon?.name || log.checkedByMonitorId;
    const when = new Date(log.timestamp).toLocaleString();
    return `${name} • ${when}`;
  };

  const toggleMagazineWeek = async (magazineId: string, weekIdentifier: string, checked: boolean) => {
    if (!selectedMonitor) return;
    // Kiosk rule: do not allow unchecking once checked
    if (!checked) return;
    try {
      try {
        await api.logMagazineCheckAs(magazineId, weekIdentifier, selectedMonitor.id);
      } catch (err: any) {
        // Fallback for servers that don't have /log-as yet
        if ((err?.message || '').toLowerCase().includes('not found')) {
          await api.logMagazineCheck(magazineId, weekIdentifier);
          notify({ type: 'info', title: 'Fallback used', message: 'Logged without attribution to selected monitor (server missing log-as endpoint).' });
        } else {
          throw err;
        }
      }
      const logs = await api.getMagazineLogs();
      setMagazineLogs(logs);
    } catch (e: any) {
      notify({ type: 'error', title: 'Magazine Update Failed', message: e.message || 'Failed to update magazine' });
    }
  };

  const exitKiosk = async () => {
    // Do not call any API that might 401 and clear token; use current user from context.
    if (!currentUser?.email) {
      notify({ type: 'error', title: 'Unable to verify session', message: 'No user in session. Please refresh and try again.' });
      return;
    }
    const pwd = window.prompt('Enter your password to exit kiosk:');
    if (!pwd) return;
    // Verify password without altering current session/token
    const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api';
    try {
      // Suppress any global auth redirects during password check
      sessionStorage.setItem('suppressAuthRedirect', 'true');
      const resp = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentUser.email, password: pwd })
      });
      if (!resp.ok) {
        notify({ type: 'error', title: 'Incorrect Password', message: 'Password was incorrect.' });
        return;
      }
      // Success: keep existing session, just exit kiosk
      localStorage.removeItem('kioskMode');
      window.location.reload();
    } catch (e) {
      notify({ type: 'error', title: 'Verification Failed', message: 'Could not verify password. Check your connection and try again.' });
    } finally {
      sessionStorage.removeItem('suppressAuthRedirect');
    }
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
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-sm font-medium">{new Date(selectedDate).toLocaleDateString()}</div>
              <div className="text-xs text-gray-600">{nowText}</div>
            </div>
            {weather && (
              <div className="hidden md:block text-sm text-gray-700">{Math.round(weather.tempC)}°C</div>
            )}
            <Button onClick={exitKiosk} variant="secondary">Exit Kiosk</Button>
          </div>
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

          {/* Laptop Check Up */}
          <div className="md:col-span-3">
            <LaptopCheckup />
          </div>

          {/* Check-in (no code; choose date & period) */}
          <Card>
            <h2 className="text-xl font-semibold mb-3">Check In</h2>
            <p className="text-sm text-gray-600 mb-2">Select a monitor above, then choose a date and period to log hours.</p>
            <Button onClick={openCheckin} disabled={!selectedMonitor}>Check In</Button>
          </Card>

          {/* Day schedule */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-semibold">Schedule (Day)</h2>
              <div className="flex items-center space-x-2">
                <Button variant="secondary" className="px-2 py-1 text-xs" onClick={prevDay}>Prev</Button>
                <input type="date" className="border rounded px-2 py-1 text-sm" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
                <Button variant="secondary" className="px-2 py-1 text-xs" onClick={nextDay}>Next</Button>
              </div>
            </div>
            <ul className="space-y-1 text-sm">
              {dayShifts.length === 0 && <li className="text-gray-500">No shifts scheduled for this day.</li>}
              {dayShifts.map(s => (
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
                {tasks.map(task => (
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
                ))}
              </ul>
            )}
          </Card>

          {/* Magazine checklist - monthly weeks view */}
          <div className="md:col-span-3">
            <Card>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-semibold">Magazine Checklist</h2>
                <div className="flex items-center space-x-2">
                  <Button variant="secondary" className="px-2 py-1 text-xs" onClick={() => setMagMonthDate(new Date(magMonthDate.setMonth(magMonthDate.getMonth() - 1)))}>◀</Button>
                  <span className="text-sm font-medium w-36 text-center">{magMonthDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
                  <Button variant="secondary" className="px-2 py-1 text-xs" onClick={() => setMagMonthDate(new Date(magMonthDate.setMonth(magMonthDate.getMonth() + 1)))}>▶</Button>
                </div>
              </div>
              {!selectedMonitor && <p className="text-sm text-gray-500">Select a monitor to attribute checks.</p>}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-600">
                      <th className="px-3 py-2">Magazine</th>
                      {weeksInMonth.map(w => (
                        <th key={w.identifier} className="px-3 py-2 text-center">{w.display}</th>
                      ))}
                      <th className="px-3 py-2 text-center">Monthly</th>
                    </tr>
                  </thead>
                  <tbody>
                    {magazines.map(m => (
                      <tr key={m.id} className="border-t">
                        <td className="px-3 py-2">{m.title}</td>
                        {weeksInMonth.map(w => {
                          const checked = isMagWeekChecked(m.id, w.identifier);
                          return (
                            <td key={`${m.id}-${w.identifier}`} className="px-3 py-2 text-center">
                              <input
                                type="checkbox"
                                disabled={!selectedMonitor}
                                checked={checked}
                                onChange={e => toggleMagazineWeek(m.id, w.identifier, e.target.checked)}
                              />
                              {checked && (
                                <div className="mt-1 text-[10px] text-gray-500">{getMagLogInfo(m.id, w.identifier)}</div>
                              )}
                            </td>
                          );
                        })}
                        {/* Monthly column */}
                        {(() => {
                          const monthId = getMonthIdentifierKiosk(magMonthDate);
                          const checked = isMagWeekChecked(m.id, monthId);
                          return (
                            <td className="px-3 py-2 text-center">
                              <input
                                type="checkbox"
                                disabled={!selectedMonitor}
                                checked={checked}
                                onChange={async (e) => {
                                  const want = e.target.checked;
                                  if (want) {
                                    try {
                                      await api.logMagazineCheckAs(m.id, monthId, selectedMonitor!.id);
                                    } catch (err: any) {
                                      if ((err?.message || '').toLowerCase().includes('not found')) {
                                        await api.logMagazineCheck(m.id, monthId);
                                      } else {
                                        throw err;
                                      }
                                    }
                                  } else {
                                    const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api';
                                    const token = localStorage.getItem('authToken');
                                    await fetch(`${API_BASE}/magazines/${m.id}/log/${monthId}?monitorId=${encodeURIComponent(selectedMonitor!.id)}`, {
                                      method: 'DELETE',
                                      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
                                    });
                                  }
                                  const logs = await api.getMagazineLogs();
                                  setMagazineLogs(logs);
                                }}
                              />
                              {checked && (
                                <div className="mt-1 text-[10px] text-gray-500">{getMagLogInfo(m.id, monthId)}</div>
                              )}
                            </td>
                          );
                        })()}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Check-in Modal */}
      {isCheckinOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
          <Card className="w-full max-w-sm">
            <h2 className="text-xl font-bold mb-4">Log Hours</h2>
            <form onSubmit={submitCheckin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Date</label>
                <input type="date" className="mt-1 w-full p-2 border rounded-md" value={checkinDate} onChange={e => setCheckinDate(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Period</label>
                <select className="mt-1 w-full p-2 border rounded-md" value={checkinPeriod} onChange={e => setCheckinPeriod(Number(e.target.value))} required>
                  <option value="" disabled>Select</option>
                  {periods.map(p => (
                    <option key={p.period} value={p.period}>Period {p.period}</option>
                  ))}
                </select>
              </div>
              {logError && <p className="text-sm text-red-600">{logError}</p>}
              <div className="flex justify-end space-x-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => setIsCheckinOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isLogging}>{isLogging ? 'Logging...' : 'Submit'}</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default KioskDashboard;
