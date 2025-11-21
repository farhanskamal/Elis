import React, { useState, useEffect, useContext, useMemo } from 'react';
import { api } from '../../services/apiService';
import { Shift, User, Role, PeriodDefinition, EventType, CalendarEvent } from '../../types';
import { AuthContext } from '../../context/AuthContext';
import Card from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';
import Button from '../../components/ui/Button';

const ScheduleView: React.FC = () => {
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [monitors, setMonitors] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useContext(AuthContext);

    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
    const [assignedMonitors, setAssignedMonitors] = useState<Set<string>>(new Set());

    // State for period definitions modal
    const [isDefinitionModalOpen, setIsDefinitionModalOpen] = useState(false);
    const [periodDefinitions, setPeriodDefinitions] = useState<PeriodDefinition[]>([]);
    const [editedPeriodDefinitions, setEditedPeriodDefinitions] = useState<PeriodDefinition[]>([]);

    // Calendar view and events
    const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
    const [eventTypes, setEventTypes] = useState<EventType[]>([]);
    const [closureTypeId, setClosureTypeId] = useState<string | null>(null);
    const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
    const [editableTypes, setEditableTypes] = useState<EventType[]>([]);
    const [monthAnchor, setMonthAnchor] = useState(() => {
        const d = new Date();
        d.setDate(1);
        d.setHours(0, 0, 0, 0);
        return d;
    });
    const [monthEvents, setMonthEvents] = useState<CalendarEvent[]>([]);
    const [weekEvents, setWeekEvents] = useState<CalendarEvent[]>([]);
    const [showClosing, setShowClosing] = useState(true);
    const [showNonClosing, setShowNonClosing] = useState(true);
    const [showOverlays, setShowOverlays] = useState(true);
    const [mobileMergePartials, setMobileMergePartials] = useState(true);

    // Bulk copy modal state
    const [isBulkCopyModalOpen, setIsBulkCopyModalOpen] = useState(false);
    const [bulkCopy, setBulkCopy] = useState<{ targetWeekStart: string; weeksCount: number }>({ targetWeekStart: '', weeksCount: 1 });

    // Closure modal
    const [isClosureModalOpen, setIsClosureModalOpen] = useState(false);
    const [closureMode, setClosureMode] = useState<'create' | 'edit'>('create');
    const [closureEditingId, setClosureEditingId] = useState<string | null>(null);
    const [closureApplicableList, setClosureApplicableList] = useState<CalendarEvent[]>([]);
    const [closureSelectedIndex, setClosureSelectedIndex] = useState(0);
    const [closureForm, setClosureForm] = useState<{ title: string; date: string; endDate: string; allDay: boolean; typeId?: string; periodStart?: number; periodEnd?: number; description?: string }>({
        title: '',
        date: '',
        endDate: '',
        allDay: true,
        typeId: undefined,
        periodStart: undefined,
        periodEnd: undefined,
        description: ''
    });
    // Copy range for duplicating closures
    const [copyRange, setCopyRange] = useState<{ start: string; end: string }>({ start: '', end: '' });

    // State for week navigation
    const [currentDate, setCurrentDate] = useState(() => {
        const today = new Date();
        // Get Monday of current week
        const day = today.getDay(); // Sun=0..Sat=6
        const diff = today.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(today);
        monday.setDate(diff);
        monday.setHours(0, 0, 0, 0);
        return monday;
    });

    const weekDates = useMemo(() => {
        return Array.from({ length: 5 }, (_, i) => {
            const day = new Date(currentDate);
            day.setDate(day.getDate() + i);
            return day.toISOString().split('T')[0];
        });
    }, [currentDate]);

    const timeZone = (user?.themePreferences?.timeZone as string) || 'America/New_York';
    const fmtDate = (d: Date) => d.toLocaleDateString('en-US', { timeZone });
    const monthParam = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    const isClosure = (ev: CalendarEvent) => {
        const name = (ev.type?.name || '').toLowerCase();
        const byFlag = (ev.type as any)?.closesLibrary === true;
        const byNameFallback = ['closure', 'holiday', 'maintenance'].includes(name);
        return byFlag || byNameFallback;
    };

    const iconFor = (icon?: string) => {
        const key = (icon || '').toLowerCase();
        switch (key) {
            case 'ban': return '🚫';
            case 'calendar': return '📅';
            case 'wrench': return '🔧';
            case 'star': return '⭐';
            case 'info': return 'ℹ️';
            case 'alert': return '⚠️';
            case 'dot': return '•';
            default: return key ? '•' : '';
        }
    };

    // Edison Wednesday times for labels
    const wedTimes: Record<number, { start: string; end: string }> = {
        0: { start: '07:00', end: '07:45' },
        1: { start: '08:00', end: '08:40' },
        2: { start: '08:43', end: '09:23' },
        3: { start: '09:26', end: '10:06' },
        4: { start: '10:09', end: '10:49' },
        5: { start: '10:52', end: '11:32' },
        6: { start: '11:35', end: '12:15' },
        7: { start: '12:18', end: '12:58' },
        8: { start: '13:01', end: '13:41' },
        9: { start: '13:44', end: '14:24' },
    };

    const labelFor = (dateStr: string, period: number) => {
        const day = new Date(dateStr + 'T00:00:00').getDay();
        if (day === 3 && wedTimes[period]) {
            const t = wedTimes[period];
            return `Period ${period} (${t.start}–${t.end})`;
        }
        const pd = periodDefinitions.find(p => p.period === period);
        return pd ? `Period ${period} (${pd.startTime}–${pd.endTime})` : `Period ${period}`;
    };

    const hexToRgba = (hex: string, alpha: number) => {
        const cleaned = hex.replace('#', '');
        const bigint = parseInt(cleaned.length === 3 ? cleaned.split('').map(c => c + c).join('') : cleaned, 16);
        const r = (bigint >> 16) & 255;
        const g = (bigint >> 8) & 255;
        const b = bigint & 255;
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    const dateInRange = (dateStr: string, start: string, end: string) => {
        return dateStr >= start && dateStr <= end;
    };

    const fetchShifts = async () => {
        try {
            setLoading(true);
            const scheduleData = await api.getScheduleForWeek(weekDates[0]);
            setShifts(scheduleData);
        } catch (e) {
            console.error('Failed to load schedule', e);
        } finally {
            setLoading(false);
        }
    }

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const [scheduleData, definitionData, types] = await Promise.all([
                api.getScheduleForWeek(weekDates[0]),
                api.getPeriodDefinitions(),
                api.getEventTypes()
            ]);
            setShifts(scheduleData);
            setPeriodDefinitions(definitionData);
            setEventTypes(types);
            const closureType = types.find(t => t.name.toLowerCase() === 'closure');
            setClosureTypeId(closureType ? closureType.id : null);
            try {
                if (user?.role === Role.Librarian) {
                    const users = await api.getAllUsers();
                    setMonitors(users.filter(u => u.role === 'MONITOR'));
                } else {
                    setMonitors([]);
                }
            } catch {
                // Failed to load monitors (likely due to permissions)
                setMonitors([]);
            }
        } catch (e) {
            console.error('Failed to load initial schedule data', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInitialData();
    }, [weekDates]);

    // Fetch month events when month changes or view switches to month
    useEffect(() => {
        if (viewMode === 'month') {
            (async () => {
                try {
                    const events = await api.getEventsForMonth(monthParam(monthAnchor));
                    setMonthEvents(events);
                } catch (e) {
                    console.error('Failed to load month events', e);
                }
            })();
        }
    }, [viewMode, monthAnchor]);

    // Fetch week events for closures overlay
    useEffect(() => {
        const start = weekDates[0];
        const end = new Date(weekDates[4]);
        end.setDate(end.getDate() + 1); // exclusive end
        const endStr = end.toISOString().split('T')[0];
        (async () => {
            try {
                const events = await api.getEventsInRange(start, endStr);
                setWeekEvents(events);
            } catch (e) {
                console.error('Failed to load week events', e);
            }
        })();
    }, [weekDates]);

    const getShiftFor = (date: string, period: number) => {
        return shifts.find(s => s.date === date && s.period === period);
    };

    const getMonitorNamesFromShift = (monitorIds: string[], shiftObj?: any) => {
        if (monitorIds.length === 0) return <span className="text-gray-400">Open</span>;

        // Use monitor names from shift data if available
        if (shiftObj && Array.isArray(shiftObj.monitors)) {
            const names = shiftObj.monitors
                .filter((m: any) => m && m.name)
                .map((m: any) => m.name);

            if (names.length > 0) {
                if (names.length > 2) {
                    return `${names.slice(0, 2).join(', ')} & ${names.length - 2} more`;
                }
                return names.join(', ');
            }
        }

        // Fallback: try to find names in monitors array (for librarians) or current user
        const names = monitorIds.map(id => {
            const monitor = monitors.find(m => m.id === id);
            if (monitor) return monitor.name;
            if (user && user.id === id) return user.name;
            return 'Unknown';
        });

        if (names.length > 2) {
            return `${names.slice(0, 2).join(', ')} & ${names.length - 2} more`;
        }
        return names.join(', ');
    };

    const handleCellClick = (date: string, period: number) => {
        if (user?.role !== Role.Librarian) return;
        // Determine if this cell has closures
        const dayClosures = weekClosureMaps.fullDay.get(date) || [];
        const partialClosures = (weekClosureMaps.partial.get(date) || []).filter(ev => (ev.periodStart ?? -Infinity) <= period && period <= (ev.periodEnd ?? Infinity));
        const applicableRaw = dayClosures.length > 0 ? dayClosures : partialClosures;
        const applicable = showOverlays ? applicableRaw : [];
        if (applicable.length > 0) {
            // Open closure edit modal
            setClosureApplicableList(applicable);
            setClosureSelectedIndex(0);
            const ev = applicable[0];
            setClosureEditingId(ev.id);
            setClosureForm({
                title: ev.title,
                date: ev.startDate,
                endDate: ev.endDate,
                allDay: ev.allDay || (!ev.periodStart && !ev.periodEnd),
                typeId: ev.typeId,
                periodStart: ev.periodStart,
                periodEnd: ev.periodEnd,
                description: ev.description || ''
            });
            setClosureMode('edit');
            setIsClosureModalOpen(true);
            return;
        }
        // Otherwise open assign modal for monitors
        const shift = getShiftFor(date, period);
        const shiftToEdit = shift || {
            id: `new-${date}-${period}`, // Temporary ID
            date,
            period,
            monitorIds: [],
        };
        setSelectedShift(shiftToEdit);
        setAssignedMonitors(new Set(shiftToEdit.monitorIds));
        setIsAssignModalOpen(true);
    };

    const handleUpdateShift = async () => {
        if (!selectedShift) return;
        const monitorIds: string[] = Array.from(assignedMonitors);

        try {
            if (selectedShift.id.startsWith('new-')) {
                if (monitorIds.length > 0) {
                    await api.createShift(selectedShift.date, selectedShift.period, monitorIds);
                }
            } else {
                await api.updateShift(selectedShift.id, monitorIds);
            }

            setIsAssignModalOpen(false);
            setSelectedShift(null);
            fetchShifts(); // Refetch to show changes
        } catch (error) {
            console.error('Failed to update shift:', error);
            alert('Failed to update shift. Please try again.');
        }
    };

    const handleMonitorSelection = (monitorId: string) => {
        const newSelection = new Set(assignedMonitors);
        if (newSelection.has(monitorId)) {
            newSelection.delete(monitorId);
        } else {
            newSelection.add(monitorId);
        }
        setAssignedMonitors(newSelection);
    };

    const handleDefinitionChange = (index: number, field: keyof PeriodDefinition, value: string | number) => {
        const newDefinitions = [...editedPeriodDefinitions];
        (newDefinitions[index] as any)[field] = value;
        setEditedPeriodDefinitions(newDefinitions);
    };

    const handleSaveDefinitions = async () => {
        try {
            const res = await api.updatePeriodDefinitions(editedPeriodDefinitions);
            setPeriodDefinitions(res.definitions || editedPeriodDefinitions);
            setIsDefinitionModalOpen(false);
        } catch (error) {
            console.error('Failed to save period definitions:', error);
            alert('Failed to save period definitions. Please try again.');
        }
    };

    const handleOpenDefinitionModal = () => {
        setEditedPeriodDefinitions(JSON.parse(JSON.stringify(periodDefinitions)));
        setIsDefinitionModalOpen(true);
    };

    const addPeriod = () => {
        const newPeriodNum = editedPeriodDefinitions.length > 0 ? Math.max(...editedPeriodDefinitions.map(p => p.period)) + 1 : 1;
        setEditedPeriodDefinitions([...editedPeriodDefinitions, { period: newPeriodNum, duration: 50, startTime: '00:00', endTime: '00:00' }]);
    };

    const removeLastPeriod = () => {
        if (editedPeriodDefinitions.length > 1) {
            setEditedPeriodDefinitions(editedPeriodDefinitions.slice(0, -1));
        }
    };

    const changeWeek = (direction: 'prev' | 'next') => {
        const newDate = new Date(currentDate);
        const offset = direction === 'prev' ? -7 : 7;
        newDate.setDate(newDate.getDate() + offset);
        setCurrentDate(newDate);
    };

    // Mobile day carousel index (0..4)
    const [mobileDayIndex, setMobileDayIndex] = useState(0);
    useEffect(() => {
        // Set to today's day in the current week if available
        const todayStr = new Date().toISOString().split('T')[0];
        const idx = weekDates.findIndex(d => d === todayStr);
        setMobileDayIndex(idx >= 0 ? idx : 0);
    }, [weekDates]);

    const weekClosureMaps = useMemo(() => {
        const fullDay = new Map<string, CalendarEvent[]>();
        const partial = new Map<string, CalendarEvent[]>();
        for (const ev of weekEvents) {
            if (!isClosure(ev)) continue;
            for (const date of weekDates) {
                if (dateInRange(date, ev.startDate, ev.endDate)) {
                    if (ev.allDay || (!ev.periodStart && !ev.periodEnd)) {
                        const arr = fullDay.get(date) || [];
                        arr.push(ev);
                        fullDay.set(date, arr);
                    } else if (typeof ev.periodStart === 'number') {
                        const arr = partial.get(date) || [];
                        arr.push(ev);
                        partial.set(date, arr);
                    }
                }
            }
        }
        return { fullDay, partial };
    }, [weekEvents, weekDates]);

    // Merge contiguous/overlapping partial closures into ranges for rowSpan rendering
    const mergedRangesByDate = useMemo(() => {
        const map = new Map<string, { start: number; end: number; events: CalendarEvent[] }[]>();
        for (const date of weekDates) {
            const list = (weekClosureMaps.partial.get(date) || []).slice().sort((a, b) => (a.periodStart || 0) - (b.periodStart || 0));
            const ranges: { start: number; end: number; events: CalendarEvent[] }[] = [];
            for (const ev of list as any[]) {
                const s = ev.periodStart || 0;
                const e = ev.periodEnd ?? s;
                if (ranges.length === 0) {
                    ranges.push({ start: s, end: e, events: [ev] });
                } else {
                    const last = ranges[ranges.length - 1];
                    // merge if overlapping or adjacent
                    if (s <= last.end + 1) {
                        last.end = Math.max(last.end, e);
                        last.events.push(ev);
                    } else {
                        ranges.push({ start: s, end: e, events: [ev] });
                    }
                }
            }
            map.set(date, ranges);
        }
        return map;
    }, [weekDates, weekClosureMaps.partial]);

    const handleCreateClosure = async () => {
        try {
            let typeId = closureForm.typeId || closureTypeId || (eventTypes.find(t => t.name.toLowerCase() === 'closure')?.id || null);
            if (!typeId) {
                // Attempt to create the default Closure type on the fly
                try {
                    const created = await api.createEventType({ name: 'Closure', color: '#ef4444', icon: 'ban' });
                    setEventTypes(prev => [...prev, created]);
                    typeId = created.id;
                } catch (err) {
                    console.error('Failed to ensure Closure event type', err);
                    alert('Events API is unavailable (Closure type missing). Please restart the backend in dev mode or rebuild, then try again.');
                    return;
                }
            }
            if (!closureForm.title || !closureForm.date) {
                alert('Please enter a title and start date.');
                return;
            }
            const payload: any = {
                title: closureForm.title,
                typeId,
                startDate: closureForm.date,
                endDate: closureForm.endDate || closureForm.date,
                allDay: closureForm.allDay,
                description: closureForm.description || undefined,
            };
            if (!closureForm.allDay) {
                payload.periodStart = closureForm.periodStart;
                payload.periodEnd = closureForm.periodEnd ?? closureForm.periodStart;
                if (payload.periodStart == null) {
                    alert('Please select a period for partial closure.');
                    return;
                }
                if (payload.periodEnd != null && payload.periodEnd < payload.periodStart) {
                    alert('Period end cannot be before period start.');
                    return;
                }
            }
            await api.createEvent(payload);
            setIsClosureModalOpen(false);
            // Refresh events
            const start = weekDates[0];
            const end = new Date(weekDates[4]);
            end.setDate(end.getDate() + 1);
            const endStr = end.toISOString().split('T')[0];
            try {
                const events = await api.getEventsInRange(start, endStr);
                setWeekEvents(events);
            } catch { }
            try {
                const monthEv = await api.getEventsForMonth(monthParam(monthAnchor));
                setMonthEvents(monthEv);
            } catch { }
        } catch (e) {
            console.error('Failed to create closure', e);
            alert('Failed to create closure.');
        }
    };

    const addTempTag = () => {
        const newTag = { id: `temp-${Date.now()}`, name: 'New Tag', color: '#3b82f6', icon: 'dot', closesLibrary: false } as any;
        setEditableTypes(et => [...et, newTag]);
    };

    const saveTags = async () => {
        try {
            for (const t of editableTypes) {
                if (String(t.id).startsWith('temp-')) {
                    const created = await api.createEventType({ name: t.name, color: t.color, icon: t.icon, closesLibrary: t.closesLibrary });
                    setEventTypes(prev => [...prev, created]);
                } else {
                    await api.updateEventType(t.id, { name: t.name, color: t.color, icon: t.icon, closesLibrary: t.closesLibrary });
                }
            }
            const types = await api.getEventTypes();
            setEventTypes(types);
            setIsTypeModalOpen(false);
        } catch {
            alert('Failed to save tags');
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-100">{viewMode === 'week' ? 'Weekly Schedule' : 'Monthly Calendar'}</h1>
                <div className="flex items-center space-x-2 flex-wrap gap-2">
                    {user?.role === Role.Librarian && (
                        <>
                            <Button onClick={() => { const defaultType = eventTypes.find(t => t.closesLibrary) || eventTypes.find(t => t.name.toLowerCase() === 'closure') || eventTypes[0]; setClosureForm({ title: '', date: weekDates[0] || new Date().toISOString().split('T')[0], endDate: weekDates[0] || new Date().toISOString().split('T')[0], allDay: true, typeId: defaultType?.id, periodStart: undefined, periodEnd: undefined, description: '' }); setClosureMode('create'); setIsClosureModalOpen(true); }} variant="primary">Add Closure</Button>
                            <Button onClick={() => { setEditableTypes(JSON.parse(JSON.stringify(eventTypes))); setIsTypeModalOpen(true); }} variant="secondary">Manage Tags</Button>
                            <Button onClick={handleOpenDefinitionModal} variant="secondary">Manage Periods</Button>
                            <details className="group inline-block relative">
                                <summary className="list-none"><Button variant="secondary">Import/Export</Button></summary>
                                <div className="absolute mt-2 right-0 z-10 bg-white dark:bg-slate-800 dark:text-slate-100 border border-gray-200 dark:border-slate-700 rounded shadow p-3 space-y-3 w-72">
                                    <div className="text-xs font-semibold">Shifts</div>
                                    <div className="flex gap-2">
                                        <Button variant="secondary" className="text-xs" onClick={async () => { try { const data = await api.exportShifts(); const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'shifts.json'; a.click(); URL.revokeObjectURL(url); } catch { try { const fallback = { shifts: (shifts || []).map(s => ({ date: s.date, period: s.period, monitorIds: s.monitorIds || [] })) }; const blob = new Blob([JSON.stringify(fallback, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'shifts.json'; a.click(); URL.revokeObjectURL(url); } catch { alert('Export JSON failed'); } } }}>Export JSON</Button>
                                        <label className="inline-flex items-center">
                                            <input type="file" accept="application/json" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; try { const t = await f.text(); const p = JSON.parse(t); await api.importShifts(p.shifts || []); fetchShifts(); } catch { alert('Import JSON failed'); } finally { e.currentTarget.value = ''; } }} />
                                            <Button variant="secondary" className="text-xs" onClick={(ev) => ((ev.currentTarget.previousElementSibling as HTMLInputElement) || (ev.currentTarget.parentElement?.querySelector('input[type=file]') as HTMLInputElement))?.click()}>Import JSON</Button>
                                        </label>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="secondary" className="text-xs" onClick={async () => { try { const data = await api.exportShifts(); const rows = data.shifts.map(s => ({ date: s.date, period: s.period, monitorIds: s.monitorIds.join(';') })); const { downloadCsv } = await import('../../utils/csv'); downloadCsv('shifts.csv', rows, ['date', 'period', 'monitorIds']); } catch { try { const rows = (shifts || []).map((s: any) => ({ date: s.date, period: s.period, monitorIds: (s.monitorIds || []).join(';') })); const { downloadCsv } = await import('../../utils/csv'); downloadCsv('shifts.csv', rows, ['date', 'period', 'monitorIds']); } catch { alert('Export CSV failed'); } } }}>Export CSV</Button>
                                        <label className="inline-flex items-center">
                                            <input type="file" accept="text/csv" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; try { const t = await f.text(); const { parseCsv } = await import('../../utils/csv'); const rows = parseCsv(t); const shifts = rows.map(r => ({ date: r.date, period: Number(r.period), monitorIds: (r.monitorIds || '').split(/[;,\s]+/).filter(Boolean) })); await api.importShifts(shifts); fetchShifts(); } catch { alert('Import CSV failed'); } finally { e.currentTarget.value = ''; } }} />
                                            <Button variant="secondary" className="text-xs" onClick={(ev) => ((ev.currentTarget.previousElementSibling as HTMLInputElement) || (ev.currentTarget.parentElement?.querySelector('input[type=file]') as HTMLInputElement))?.click()}>Import CSV</Button>
                                        </label>
                                    </div>
                                    <div className="text-xs font-semibold pt-1">Periods</div>
                                    <div className="flex gap-2">
                                        <Button variant="secondary" className="text-xs" onClick={async () => { try { const data = await api.exportPeriods(); const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'periods.json'; a.click(); URL.revokeObjectURL(url); } catch { try { const fallback = { definitions: (periodDefinitions || []).map(p => ({ period: p.period, duration: p.duration, startTime: p.startTime, endTime: p.endTime })) }; const blob = new Blob([JSON.stringify(fallback, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'periods.json'; a.click(); URL.revokeObjectURL(url); } catch { alert('Export periods JSON failed'); } } }}>Export JSON</Button>
                                        <label className="inline-flex items-center">
                                            <input type="file" accept="application/json" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; try { const t = await f.text(); const p = JSON.parse(t); await api.importPeriods(p.definitions || []); alert('Imported periods'); } catch { alert('Import periods JSON failed'); } finally { e.currentTarget.value = ''; } }} />
                                            <Button variant="secondary" className="text-xs" onClick={(ev) => ((ev.currentTarget.previousElementSibling as HTMLInputElement) || (ev.currentTarget.parentElement?.querySelector('input[type=file]') as HTMLInputElement))?.click()}>Import JSON</Button>
                                        </label>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="secondary" className="text-xs" onClick={async () => { try { const d = await api.exportPeriods(); const { downloadCsv } = await import('../../utils/csv'); downloadCsv('periods.csv', d.definitions, ['period', 'duration', 'startTime', 'endTime']); } catch { try { const { downloadCsv } = await import('../../utils/csv'); downloadCsv('periods.csv', (periodDefinitions || []).map(p => ({ period: p.period, duration: p.duration, startTime: p.startTime, endTime: p.endTime })), ['period', 'duration', 'startTime', 'endTime']); } catch { alert('Export periods CSV failed'); } } }}>Export CSV</Button>
                                        <label className="inline-flex items-center">
                                            <input type="file" accept="text/csv" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; try { const t = await f.text(); const { parseCsv } = await import('../../utils/csv'); const rows = parseCsv(t); const defs = rows.map(r => ({ period: Number(r.period), duration: Number(r.duration), startTime: r.startTime, endTime: r.endTime })); await api.importPeriods(defs); alert('Imported periods'); } catch { alert('Import periods CSV failed'); } finally { e.currentTarget.value = ''; } }} />
                                            <Button variant="secondary" className="text-xs" onClick={(ev) => ((ev.currentTarget.previousElementSibling as HTMLInputElement) || (ev.currentTarget.parentElement?.querySelector('input[type=file]') as HTMLInputElement))?.click()}>Import CSV</Button>
                                        </label>
                                    </div>
                                    <div className="text-xs font-semibold pt-1">Event Types</div>
                                    <div className="flex gap-2">
                                        <Button variant="secondary" className="text-xs" onClick={async () => { try { const d = await api.exportEventTypes(); const blob = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'event_types.json'; a.click(); URL.revokeObjectURL(url); } catch { try { const fallback = { types: (eventTypes || []).map(t => ({ name: t.name, color: t.color, icon: t.icon, closesLibrary: (t as any).closesLibrary })) }; const blob = new Blob([JSON.stringify(fallback, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'event_types.json'; a.click(); URL.revokeObjectURL(url); } catch { alert('Export event types JSON failed'); } } }}>Export JSON</Button>
                                        <label className="inline-flex items-center">
                                            <input type="file" accept="application/json" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; try { const t = await f.text(); const p = JSON.parse(t); await api.importEventTypes(p.types || []); alert('Imported event types'); } catch { alert('Import event types JSON failed'); } finally { e.currentTarget.value = ''; } }} />
                                            <Button variant="secondary" className="text-xs" onClick={(ev) => ((ev.currentTarget.previousElementSibling as HTMLInputElement) || (ev.currentTarget.parentElement?.querySelector('input[type=file]') as HTMLInputElement))?.click()}>Import JSON</Button>
                                        </label>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="secondary" className="text-xs" onClick={async () => { try { const d = await api.exportEventTypes(); const { downloadCsv } = await import('../../utils/csv'); downloadCsv('event_types.csv', d.types, ['name', 'color', 'icon', 'closesLibrary']); } catch { try { const { downloadCsv } = await import('../../utils/csv'); downloadCsv('event_types.csv', (eventTypes || []).map(t => ({ name: t.name, color: t.color, icon: t.icon || '', closesLibrary: (t as any).closesLibrary ? 'true' : 'false' })), ['name', 'color', 'icon', 'closesLibrary']); } catch { alert('Export event types CSV failed'); } } }}>Export CSV</Button>
                                        <label className="inline-flex items-center">
                                            <input type="file" accept="text/csv" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; try { const t = await f.text(); const { parseCsv } = await import('../../utils/csv'); const rows = parseCsv(t); const types = rows.map(r => ({ name: r.name, color: r.color, icon: r.icon || undefined, closesLibrary: String(r.closesLibrary || '').toLowerCase() === 'true' })); await api.importEventTypes(types); alert('Imported event types'); } catch { alert('Import event types CSV failed'); } finally { e.currentTarget.value = ''; } }} />
                                            <Button variant="secondary" className="text-xs" onClick={(ev) => ((ev.currentTarget.previousElementSibling as HTMLInputElement) || (ev.currentTarget.parentElement?.querySelector('input[type=file]') as HTMLInputElement))?.click()}>Import CSV</Button>
                                        </label>
                                    </div>
                                </div>
                            </details>
                            <Button variant="secondary" onClick={async () => { try { const data = await api.exportShifts(); const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'shifts.json'; a.click(); URL.revokeObjectURL(url); } catch { try { const fallback = { shifts: (shifts || []).map(s => ({ date: s.date, period: s.period, monitorIds: s.monitorIds || [] })) }; const blob = new Blob([JSON.stringify(fallback, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'shifts.json'; a.click(); URL.revokeObjectURL(url); } catch { alert('Export failed'); } } }}>Export JSON</Button>
                            <label className="inline-flex items-center">
                                <input type="file" accept="application/json" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; try { const t = await f.text(); const p = JSON.parse(t); await api.importShifts(p.shifts || []); fetchShifts(); } catch { alert('Import failed'); } finally { e.currentTarget.value = ''; } }} />
                                <Button variant="secondary" onClick={(ev) => ((ev.currentTarget.previousElementSibling as HTMLInputElement) || (ev.currentTarget.parentElement?.querySelector('input[type=file]') as HTMLInputElement))?.click()}>Import JSON</Button>
                            </label>
                            <Button variant="secondary" onClick={async () => { try { const data = await api.exportShifts(); const rows = data.shifts.map(s => ({ date: s.date, period: s.period, monitorIds: s.monitorIds.join(';') })); const { downloadCsv } = await import('../../utils/csv'); downloadCsv('shifts.csv', rows, ['date', 'period', 'monitorIds']); } catch { try { const rows = (shifts || []).map((s: any) => ({ date: s.date, period: s.period, monitorIds: (s.monitorIds || []).join(';') })); const { downloadCsv } = await import('../../utils/csv'); downloadCsv('shifts.csv', rows, ['date', 'period', 'monitorIds']); } catch { alert('Export CSV failed'); } } }}>Export CSV</Button>
                            <label className="inline-flex items-center">
                                <input type="file" accept="text/csv" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; try { const t = await f.text(); const { parseCsv } = await import('../../utils/csv'); const rows = parseCsv(t); const shifts = rows.map(r => ({ date: r.date, period: Number(r.period), monitorIds: (r.monitorIds || '').split(/[;,\s]+/).filter(Boolean) })); await api.importShifts(shifts); fetchShifts(); } catch { alert('Import CSV failed'); } finally { e.currentTarget.value = ''; } }} />
                                <Button variant="secondary" onClick={(ev) => ((ev.currentTarget.previousElementSibling as HTMLInputElement) || (ev.currentTarget.parentElement?.querySelector('input[type=file]') as HTMLInputElement))?.click()}>Import CSV</Button>
                            </label>
                            {/* Periods import/export */}
                            <Button variant="secondary" onClick={async () => { try { const data = await api.exportPeriods(); const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'periods.json'; a.click(); URL.revokeObjectURL(url); } catch { try { const fallback = { definitions: (periodDefinitions || []).map(p => ({ period: p.period, duration: p.duration, startTime: p.startTime, endTime: p.endTime })) }; const blob = new Blob([JSON.stringify(fallback, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'periods.json'; a.click(); URL.revokeObjectURL(url); } catch { alert('Export periods failed'); } } }}>Export Periods JSON</Button>
                            <label className="inline-flex items-center">
                                <input type="file" accept="application/json" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; try { const t = await f.text(); const p = JSON.parse(t); await api.importPeriods(p.definitions || []); alert('Imported periods'); } catch { alert('Import periods failed'); } finally { e.currentTarget.value = ''; } }} />
                                <Button variant="secondary" onClick={(ev) => ((ev.currentTarget.previousElementSibling as HTMLInputElement) || (ev.currentTarget.parentElement?.querySelector('input[type=file]') as HTMLInputElement))?.click()}>Import Periods JSON</Button>
                            </label>
                            <Button variant="secondary" onClick={async () => { try { const d = await api.exportPeriods(); const { downloadCsv } = await import('../../utils/csv'); downloadCsv('periods.csv', d.definitions, ['period', 'duration', 'startTime', 'endTime']); } catch { try { const { downloadCsv } = await import('../../utils/csv'); downloadCsv('periods.csv', (periodDefinitions || []).map(p => ({ period: p.period, duration: p.duration, startTime: p.startTime, endTime: p.endTime })), ['period', 'duration', 'startTime', 'endTime']); } catch { alert('Export periods CSV failed'); } } }}>Export Periods CSV</Button>
                            <label className="inline-flex items-center">
                                <input type="file" accept="text/csv" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; try { const t = await f.text(); const { parseCsv } = await import('../../utils/csv'); const rows = parseCsv(t); const defs = rows.map(r => ({ period: Number(r.period), duration: Number(r.duration), startTime: r.startTime, endTime: r.endTime })); await api.importPeriods(defs); alert('Imported periods'); } catch { alert('Import periods CSV failed'); } finally { e.currentTarget.value = ''; } }} />
                                <Button variant="secondary" onClick={(ev) => ((ev.currentTarget.previousElementSibling as HTMLInputElement) || (ev.currentTarget.parentElement?.querySelector('input[type=file]') as HTMLInputElement))?.click()}>Import Periods CSV</Button>
                            </label>
                            {/* Event Types import/export */}
                            <Button variant="secondary" onClick={async () => { try { const d = await api.exportEventTypes(); const blob = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'event_types.json'; a.click(); URL.revokeObjectURL(url); } catch { try { const fallback = { types: (eventTypes || []).map(t => ({ name: t.name, color: t.color, icon: t.icon, closesLibrary: (t as any).closesLibrary })) }; const blob = new Blob([JSON.stringify(fallback, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'event_types.json'; a.click(); URL.revokeObjectURL(url); } catch { alert('Export event types failed'); } } }}>Export Event Types JSON</Button>
                            <label className="inline-flex items-center">
                                <input type="file" accept="application/json" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; try { const t = await f.text(); const p = JSON.parse(t); await api.importEventTypes(p.types || []); alert('Imported event types'); } catch { alert('Import event types failed'); } finally { e.currentTarget.value = ''; } }} />
                                <Button variant="secondary" onClick={(ev) => ((ev.currentTarget.previousElementSibling as HTMLInputElement) || (ev.currentTarget.parentElement?.querySelector('input[type=file]') as HTMLInputElement))?.click()}>Import Event Types JSON</Button>
                            </label>
                            <Button variant="secondary" onClick={async () => { try { const d = await api.exportEventTypes(); const { downloadCsv } = await import('../../utils/csv'); downloadCsv('event_types.csv', d.types, ['name', 'color', 'icon', 'closesLibrary']); } catch { try { const { downloadCsv } = await import('../../utils/csv'); downloadCsv('event_types.csv', (eventTypes || []).map(t => ({ name: t.name, color: t.color, icon: t.icon || '', closesLibrary: (t as any).closesLibrary ? 'true' : 'false' })), ['name', 'color', 'icon', 'closesLibrary']); } catch { alert('Export event types CSV failed'); } } }}>Export Event Types CSV</Button>
                            <label className="inline-flex items-center">
                                <input type="file" accept="text/csv" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; try { const t = await f.text(); const { parseCsv } = await import('../../utils/csv'); const rows = parseCsv(t); const types = rows.map(r => ({ name: r.name, color: r.color, icon: r.icon || undefined, closesLibrary: String(r.closesLibrary || '').toLowerCase() === 'true' })); await api.importEventTypes(types); alert('Imported event types'); } catch { alert('Import event types CSV failed'); } finally { e.currentTarget.value = ''; } }} />
                                <Button variant="secondary" onClick={(ev) => ((ev.currentTarget.previousElementSibling as HTMLInputElement) || (ev.currentTarget.parentElement?.querySelector('input[type=file]') as HTMLInputElement))?.click()}>Import Event Types CSV</Button>
                            </label>
                            {viewMode === 'week' && (
                                <>
                                    <Button variant="secondary" onClick={async () => {
                                        if (!confirm('Copy this week\'s closures to next week?')) return;
                                        try {
                                            const copied = [] as any[];
                                            for (const ev of weekEvents) {
                                                if (!isClosure(ev)) continue;
                                                // copy only if overlaps current week
                                                for (const date of weekDates) {
                                                    if (date >= ev.startDate && date <= ev.endDate) { copied.push(ev); break; }
                                                }
                                            }
                                            for (const ev of copied) {
                                                const start = new Date(ev.startDate); start.setDate(start.getDate() + 7);
                                                const end = new Date(ev.endDate); end.setDate(end.getDate() + 7);
                                                await api.createEvent({
                                                    title: ev.title,
                                                    typeId: ev.typeId,
                                                    startDate: start.toISOString().split('T')[0],
                                                    endDate: end.toISOString().split('T')[0],
                                                    allDay: ev.allDay,
                                                    periodStart: ev.periodStart,
                                                    periodEnd: ev.periodEnd,
                                                    description: ev.description
                                                } as any);
                                            }
                                            alert(`Copied ${copied.length} closure(s) to next week.`);
                                        } catch (e) {
                                            alert('Failed to copy closures.');
                                        }
                                    }}>Copy week ▶ next week</Button>
                                    <Button variant="secondary" onClick={() => { setBulkCopy({ targetWeekStart: weekDates[0], weeksCount: 1 }); setIsBulkCopyModalOpen(true); }}>Bulk copy…</Button>
                                </>
                            )}
                        </>
                    )}
                    {viewMode === 'week' ? (
                        <>
                            <Button onClick={() => changeWeek('prev')} variant="secondary">&larr; Previous</Button>
                            <span className="text-sm font-medium text-gray-700 hidden md:block">
                                {new Date(weekDates[0]).toLocaleDateString('en-US', { timeZone })} - {new Date(weekDates[4]).toLocaleDateString('en-US', { timeZone })}
                            </span>
                            <Button onClick={() => changeWeek('next')} variant="secondary">Next &rarr;</Button>
                        </>
                    ) : (
                        <>
                            <Button onClick={() => { const d = new Date(monthAnchor); d.setMonth(d.getMonth() - 1); setMonthAnchor(d); }} variant="secondary">&larr; Previous</Button>
                            <span className="text-sm font-medium text-gray-700 hidden md:block">
                                {monthAnchor.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone })}
                            </span>
                            <Button onClick={() => { const d = new Date(monthAnchor); d.setMonth(d.getMonth() + 1); setMonthAnchor(d); }} variant="secondary">Next &rarr;</Button>
                        </>
                    )}
                    <Button onClick={() => setViewMode(viewMode === 'week' ? 'month' : 'week')} variant="secondary">
                        {viewMode === 'week' ? 'Month View' : 'Week View'}
                    </Button>
                    {viewMode === 'week' && (
                        <label className="ml-2 text-xs flex items-center gap-1">
                            <input type="checkbox" checked={showOverlays} onChange={e => setShowOverlays(e.target.checked)} /> Show closures overlay
                        </label>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64"><Spinner /></div>
            ) : viewMode === 'week' ? (
                <>
                    {/* Mobile carousel view */}
                    <div className="md:hidden bg-white dark:bg-slate-800 dark:text-slate-100 rounded-lg shadow p-3">
                        <div className="flex items-center justify-between mb-3 gap-2">
                            <Button variant="secondary" onClick={() => setMobileDayIndex(i => Math.max(0, i - 1))}>&larr;</Button>
                            <div className="flex-1 text-center">
                                <div className="text-sm font-medium text-gray-700">
                                    {new Date(weekDates[mobileDayIndex] + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', timeZone })}
                                </div>
                                <label className="mt-1 inline-flex items-center gap-1 text-[11px] text-gray-600">
                                    <input type="checkbox" checked={mobileMergePartials} onChange={e => setMobileMergePartials(e.target.checked)} /> Merge partials
                                </label>
                            </div>
                            <Button variant="secondary" onClick={() => setMobileDayIndex(i => Math.min(weekDates.length - 1, i + 1))}>&rarr;</Button>
                        </div>
                        <div className="divide-y">
                            {(() => {
                                const date = weekDates[mobileDayIndex];
                                const canModify = user?.role === Role.Librarian;
                                const dayClosures = weekClosureMaps.fullDay.get(date) || [];
                                const ranges = mergedRangesByDate.get(date) || [];
                                if (!mobileMergePartials) {
                                    // Per-period display (original style)
                                    return (
                                        <>
                                            {periodDefinitions.map(({ period }) => {
                                                const shift = getShiftFor(date, period) as any;
                                                const isCurrentUserShift = shift?.monitorIds.includes(user?.id || '');
                                                const canModify2 = user?.role === Role.Librarian;
                                                const dayClosures2 = weekClosureMaps.fullDay.get(date) || [];
                                                const partialClosures2 = (weekClosureMaps.partial.get(date) || []).filter(ev => (ev.periodStart ?? -Infinity) <= period && period <= (ev.periodEnd ?? Infinity));
                                                const applicableClosures2 = dayClosures2.length > 0 ? dayClosures2 : partialClosures2;
                                                const cellClosed2 = showOverlays && applicableClosures2.length > 0;
                                                const primaryClosure2 = applicableClosures2[0];
                                                const bgStyle2 = cellClosed2 ? { backgroundColor: hexToRgba(primaryClosure2?.type?.color || '#ef4444', 0.15) } : {};
                                                const monitorDisplay2 = shift ? getMonitorNamesFromShift(shift.monitorIds, shift) : <span className="text-gray-300">-</span>;
                                                return (
                                                    <div key={`m-${date}-${period}`} className={`py-3 px-2 ${isCurrentUserShift ? 'bg-sky-100' : ''}`} style={bgStyle2} onClick={() => canModify2 && handleCellClick(date, period)}>
                                                        <div className="text-xs font-semibold text-gray-700 mb-1">{labelFor(date, period)}</div>
                                                        {cellClosed2 && primaryClosure2 ? (
                                                            <div className="mb-1 flex items-center gap-2">
                                                                <span className="text-xs">{iconFor(primaryClosure2.type?.icon)}</span>
                                                                <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: primaryClosure2.type?.color || '#ef4444' }}></span>
                                                                <span className="text-xs font-semibold text-gray-700 truncate" title={primaryClosure2.title}>{primaryClosure2.title}</span>
                                                                <span className="text-[10px] text-gray-500">({primaryClosure2.type?.name || 'Closed'})</span>
                                                            </div>
                                                        ) : (
                                                            <div className="text-xs">{monitorDisplay2}</div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </>
                                    );
                                }
                                if (showOverlays && dayClosures.length > 0) {
                                    const primary = dayClosures[0];
                                    return (
                                        <div key={`m-${date}-fullday`} className="py-3 px-2" style={{ backgroundColor: hexToRgba(primary?.type?.color || '#ef4444', 0.15) }} onClick={() => canModify && handleCellClick(date, (periodDefinitions[0]?.period || 1))}>
                                            <div className="text-xs font-semibold text-gray-700 mb-1">Full day</div>
                                            <div className="flex items-center gap-2 flex-wrap text-[11px]">
                                                <span>{iconFor(primary?.type?.icon)}</span>
                                                <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: primary?.type?.color || '#ef4444' }}></span>
                                                <span className="font-semibold text-gray-700 truncate" title={primary?.title}>{primary?.title}</span>
                                                {dayClosures.length > 1 && <span className="text-[10px] text-gray-500">+{dayClosures.length - 1} more</span>}
                                            </div>
                                        </div>
                                    );
                                }
                                // Build merged display items (ranges + open periods)
                                const covered = new Set<number>();
                                for (const r of ranges) { for (let p = r.start; p <= r.end; p++) covered.add(p); }
                                type Item = { key: string; order: number; node: React.ReactNode };
                                const items: Item[] = [];
                                for (const r of ranges) {
                                    const primary = r.events[0];
                                    items.push({
                                        key: `range-${r.start}`,
                                        order: r.start,
                                        node: (
                                            <div key={`m-${date}-range-${r.start}`} className="py-3 px-2" style={{ backgroundColor: hexToRgba(primary?.type?.color || '#ef4444', 0.15) }} onClick={() => canModify && handleCellClick(date, r.start)}>
                                                <div className="text-xs font-semibold text-gray-700 mb-1">Periods {r.start}–{r.end}</div>
                                                <div className="flex items-center gap-2 flex-wrap text-[11px]">
                                                    <span>{iconFor(primary?.type?.icon)}</span>
                                                    <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: primary?.type?.color || '#ef4444' }}></span>
                                                    <span className="font-semibold text-gray-700 truncate" title={primary?.title}>{primary?.title}</span>
                                                    {r.events.length > 1 && <span className="text-[10px] text-gray-500">+{r.events.length - 1} more</span>}
                                                </div>
                                            </div>
                                        )
                                    });
                                }
                                for (const { period } of periodDefinitions) {
                                    if (covered.has(period)) continue;
                                    const shift = getShiftFor(date, period) as any;
                                    const isCurrentUserShift = shift?.monitorIds.includes(user?.id || '');
                                    const monitorDisplay = shift ? getMonitorNamesFromShift(shift.monitorIds, shift) : <span className="text-gray-300">-</span>;
                                    items.push({
                                        key: `open-${period}`,
                                        order: period,
                                        node: (
                                            <div key={`m-${date}-open-${period}`} className={`py-3 px-2 ${isCurrentUserShift ? 'bg-sky-100' : ''}`} onClick={() => canModify && handleCellClick(date, period)}>
                                                <div className="text-xs font-semibold text-gray-700 mb-1">{labelFor(date, period)}</div>
                                                <div className="text-xs">{monitorDisplay}</div>
                                            </div>
                                        )
                                    });
                                }
                                items.sort((a, b) => a.order - b.order);
                                return items.map(x => x.node);
                            })()}
                        </div>
                    </div>
                    {/* Desktop/tablet table view */}
                    <div className="hidden md:block overflow-x-auto bg-white rounded-lg shadow transition-all duration-200 ease-out">
                        <table className="w-full text-sm text-left text-gray-500">
                            <thead className="text-xs text-gray-700 dark:text-slate-200 uppercase bg-gray-50 dark:bg-slate-700">
                                <tr>
                                    <th scope="col" className="px-6 py-3">Period</th>
                                    {weekDates.map((date) => {
                                        const d = new Date(date + 'T00:00:00');
                                        const weekday = d.toLocaleDateString('en-US', { weekday: 'long', timeZone });
                                        const mm = d.getMonth() + 1;
                                        const dd = d.getDate();
                                        const yyyy = d.getFullYear();
                                        const closures = weekClosureMaps.fullDay.get(date) || [];
                                        const underline = closures.length > 0 ? { borderBottom: `2px solid ${closures[0]?.type?.color || '#ef4444'}` } : {};
                                        return (
                                            <th key={date} scope="col" className="px-6 py-3" style={underline}>{`${weekday} - ${mm}/${dd}/${yyyy}`}</th>
                                        );
                                    })}
                                </tr>
                            </thead>
                            <tbody>
                                {/* Closed banner row removed per request; closures are rendered within period cells */}
                                {periodDefinitions.map(({ period }) => (
                                    <tr key={period} className="border-b">
                                        <th scope="row" className="px-6 py-4 font-medium text-gray-900 bg-gray-50">
                                            {labelFor(weekDates[0], period)}
                                        </th>
                                        {weekDates.map(date => {
                                            const shift = getShiftFor(date, period) as any;
                                            const isCurrentUserShift = shift?.monitorIds.includes(user?.id || '');
                                            const canModify = user?.role === Role.Librarian;
                                            const dayClosures = weekClosureMaps.fullDay.get(date) || [];
                                            const ranges = mergedRangesByDate.get(date) || [];

                                            // If full day closure: render single block only at first period row, skip others
                                            if (showOverlays && dayClosures.length > 0) {
                                                const firstPeriod = Math.min(...periodDefinitions.map(p => p.period));
                                                if (period === firstPeriod) {
                                                    const primary = dayClosures[0];
                                                    return (
                                                        <td key={`${date}-${period}`}
                                                            rowSpan={periodDefinitions.length}
                                                            onClick={() => canModify && handleCellClick(date, period)}
                                                            className={`px-4 py-3 border-l relative ${canModify ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                                                            style={{ backgroundColor: hexToRgba(primary?.type?.color || '#ef4444', 0.15) }}>
                                                            <div className="flex items-center gap-2 flex-wrap text-xs">
                                                                <span>{iconFor(primary?.type?.icon)}</span>
                                                                <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: primary?.type?.color || '#ef4444' }}></span>
                                                                <span className="font-semibold text-gray-700 truncate" title={primary?.title}>{primary?.title}</span>
                                                                {dayClosures.length > 1 && <span className="text-[10px] text-gray-500">+{dayClosures.length - 1} more</span>}
                                                                <span className="ml-auto text-[10px] text-gray-500">Full day</span>
                                                            </div>
                                                        </td>
                                                    );
                                                }
                                                // skip cell for other period rows
                                                return null;
                                            }

                                            // Check if current period is start of a merged partial range
                                            const range = ranges.find(r => r.start === period);
                                            const withinRange = ranges.some(r => period >= r.start && period <= r.end);
                                            if (showOverlays && range) {
                                                const primary = range.events[0];
                                                const rowSpan = range.end - range.start + 1;
                                                return (
                                                    <td key={`${date}-${period}`}
                                                        rowSpan={rowSpan}
                                                        onClick={() => canModify && handleCellClick(date, period)}
                                                        className={`px-4 py-3 border-l relative ${canModify ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                                                        style={{ backgroundColor: hexToRgba(primary?.type?.color || '#ef4444', 0.15) }}>
                                                        <div className="flex items-center gap-2 flex-wrap text-xs">
                                                            <span>{iconFor(primary?.type?.icon)}</span>
                                                            <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: primary?.type?.color || '#ef4444' }}></span>
                                                            <span className="font-semibold text-gray-700 truncate" title={primary?.title}>{primary?.title}</span>
                                                            {range.events.length > 1 && <span className="text-[10px] text-gray-500">+{range.events.length - 1} more</span>}
                                                            <span className="ml-auto text-[10px] text-gray-500">Periods {range.start}–{range.end}</span>
                                                        </div>
                                                    </td>
                                                );
                                            }
                                            // If within a range but not at the start, skip rendering (covered by rowSpan)
                                            if (showOverlays && withinRange) {
                                                return null;
                                            }

                                            // Normal open cell
                                            const monitorDisplay = shift ? getMonitorNamesFromShift(shift.monitorIds, shift) : <span className="text-gray-300">-</span>;
                                            return (
                                                <td key={`${date}-${period}`}
                                                    onClick={() => canModify && handleCellClick(date, period)}
                                                    className={`px-4 py-3 border-l relative ${canModify ? 'cursor-pointer hover:bg-gray-50' : ''} ${isCurrentUserShift ? 'bg-sky-100 font-semibold text-sky-800' : ''}`}>
                                                    <div className="text-xs">{monitorDisplay}</div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {/* Filters */}
                    <div className="mt-2 flex items-center gap-4 text-xs text-gray-600">
                        <label className="flex items-center gap-1">
                            <input type="checkbox" checked={showClosing} onChange={e => setShowClosing(e.target.checked)} /> Show closing
                        </label>
                        <label className="flex items-center gap-1">
                            <input type="checkbox" checked={showNonClosing} onChange={e => setShowNonClosing(e.target.checked)} /> Show non-closing
                        </label>
                    </div>
                    {/* Tag legend */}
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-600">
                        {eventTypes.map(t => (
                            <div key={t.id} className="flex items-center gap-1">
                                <span className="text-[11px]">{iconFor(t.icon)}</span>
                                <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: t.color }}></span>
                                <span>{t.name}{t.closesLibrary ? ' (closes)' : ''}</span>
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                // Month view
                <div className="bg-white rounded-lg shadow p-3 transition-all duration-200 ease-out">
                    {/* Weekday headers */}
                    <div className="grid grid-cols-7 text-xs text-gray-500 mb-2">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                            <div key={d} className="text-center font-medium">{d}</div>
                        ))}
                    </div>
                    {/* Grid days */}
                    {(() => {
                        const first = new Date(monthAnchor);
                        first.setDate(1);
                        const gridStart = new Date(first);
                        gridStart.setDate(first.getDate() - first.getDay()); // start on Sunday
                        const days: Date[] = [];
                        for (let i = 0; i < 42; i++) { const d = new Date(gridStart); d.setDate(gridStart.getDate() + i); days.push(d); }
                        const eventsByDate = new Map<string, CalendarEvent[]>();
                        for (const ev of monthEvents) {
                            const closing = isClosure(ev);
                            if ((closing && !showClosing) || (!closing && !showNonClosing)) continue;
                            // expand each date in range (bounded to this grid)
                            for (const d of days) {
                                const ds = d.toISOString().split('T')[0];
                                if (ds >= ev.startDate && ds <= ev.endDate) {
                                    const arr = eventsByDate.get(ds) || [];
                                    arr.push(ev);
                                    eventsByDate.set(ds, arr);
                                }
                            }
                        }
                        return (
                            <div className="grid grid-cols-7 gap-1">
                                {days.map((d, idx) => {
                                    const ds = d.toISOString().split('T')[0];
                                    const inMonth = d.getMonth() === monthAnchor.getMonth();
                                    const items = (eventsByDate.get(ds) || []).slice(0, 3);
                                    const extra = (eventsByDate.get(ds) || []).length - items.length;
                                    return (
                                        <div key={idx} className={`border rounded p-2 sm:h-24 h-20 flex flex-col ${inMonth ? 'bg-white' : 'bg-gray-50 text-gray-400'}`}>
                                            <div className="text-xs font-semibold mb-1">{d.getDate()}</div>
                                            <div className="space-y-1 overflow-hidden">
                                                {items.map((ev, i) => (
                                                    <div key={i} className="text-[11px] truncate flex items-center gap-1">
                                                        <span className="text-[10px]">{iconFor(ev.type?.icon)}</span>
                                                        <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: ev.type?.color || '#9ca3af' }}></span>
                                                        <span className="truncate">{ev.title}</span>
                                                    </div>
                                                ))}
                                                {extra > 0 && <div className="text-[10px] text-gray-500">+{extra} more</div>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })()}
                    {/* Filters */}
                    <div className="mb-2 flex items-center gap-4 text-xs text-gray-600">
                        <label className="flex items-center gap-1">
                            <input type="checkbox" checked={showClosing} onChange={e => setShowClosing(e.target.checked)} /> Show closing
                        </label>
                        <label className="flex items-center gap-1">
                            <input type="checkbox" checked={showNonClosing} onChange={e => setShowNonClosing(e.target.checked)} /> Show non-closing
                        </label>
                    </div>
                    {/* Tag legend */}
                    <div className="mb-3 flex flex-wrap gap-3 text-xs text-gray-600">
                        {eventTypes.map(t => (
                            <div key={t.id} className="flex items-center gap-1">
                                <span className="text-[11px]">{iconFor(t.icon)}</span>
                                <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: t.color }}></span>
                                <span>{t.name}{t.closesLibrary ? ' (closes)' : ''}</span>
                            </div>
                        ))}
                    </div>
                    {/* Upcoming events */}
                    <div className="mt-4">
                        <h3 className="text-sm font-semibold text-gray-700 mb-2">Upcoming this month</h3>
                        <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                            {(() => {
                                const now = new Date();
                                const todayStr = now.toISOString().split('T')[0];
                                const mStart = new Date(monthAnchor); mStart.setDate(1);
                                const mEnd = new Date(monthAnchor); mEnd.setMonth(mEnd.getMonth() + 1); mEnd.setDate(0);
                                const mStartStr = mStart.toISOString().split('T')[0];
                                const mEndStr = mEnd.toISOString().split('T')[0];
                                const list = [...monthEvents]
                                    .filter(ev => ev.endDate >= todayStr && ev.startDate <= mEndStr && ev.endDate >= mStartStr)
                                    .sort((a, b) => a.startDate.localeCompare(b.startDate))
                                    .slice(0, 10);
                                if (list.length === 0) return <div className="text-xs text-gray-500">No upcoming events.</div>;
                                return list.map(ev => (
                                    <div key={ev.id} className="flex items-center gap-2 text-xs">
                                        <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: ev.type?.color || '#9ca3af' }}></span>
                                        <span className="font-medium">{ev.title}</span>
                                        <span className="text-gray-500">{ev.startDate}{ev.endDate !== ev.startDate ? ` - ${ev.endDate}` : ''}</span>
                                        {isClosure(ev) && <span className="text-red-600 font-semibold">(Closed)</span>}
                                    </div>
                                ));
                            })()}
                        </div>
                    </div>
                </div>
            )}

            {isAssignModalOpen && selectedShift && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
                    <Card className="w-full max-w-md">
                        <h2 className="text-xl font-bold mb-2">Assign Monitors</h2>
                        <p className="mb-4 text-gray-600">Period {selectedShift.period} on {selectedShift.date}</p>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {monitors.length === 0 ? (
                                <div className="text-sm text-gray-500 p-2">No monitors available or you may not have permission.</div>
                            ) : (
                                monitors.map(m => (
                                    <label key={m.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-100 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            checked={assignedMonitors.has(m.id)}
                                            onChange={() => handleMonitorSelection(m.id)}
                                        />
                                        <span>{m.name}</span>
                                    </label>
                                ))
                            )}
                        </div>
                        <div className="mt-6 flex space-x-2">
                            <Button onClick={() => setIsAssignModalOpen(false)} variant="secondary" className="w-full">Cancel</Button>
                            <Button onClick={handleUpdateShift} className="w-full">Save Changes</Button>
                        </div>
                    </Card>
                </div>
            )}

            {isBulkCopyModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
                    <Card className="w-full max-w-md">
                        <h2 className="text-xl font-bold mb-2">Bulk copy closures</h2>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs block mb-1">From week</label>
                                <div className="text-xs text-gray-600">{weekDates[0]} to {weekDates[4]}</div>
                            </div>
                            <div>
                                <label className="text-xs block mb-1">Target week start (Monday)</label>
                                <input type="date" value={bulkCopy.targetWeekStart} onChange={e => setBulkCopy({ ...bulkCopy, targetWeekStart: e.target.value })} className="w-full p-2 border rounded" />
                            </div>
                            <div>
                                <label className="text-xs block mb-1">Repeat for N weeks</label>
                                <input type="number" min={1} value={bulkCopy.weeksCount} onChange={e => setBulkCopy({ ...bulkCopy, weeksCount: Math.max(1, parseInt(e.target.value) || 1) })} className="w-full p-2 border rounded" />
                            </div>
                        </div>
                        <div className="mt-6 flex space-x-2">
                            <Button variant="secondary" className="w-full" onClick={() => setIsBulkCopyModalOpen(false)}>Cancel</Button>
                            <Button className="w-full" onClick={async () => {
                                try {
                                    if (!bulkCopy.targetWeekStart) { alert('Select a target week start date.'); return; }
                                    const currentMonday = new Date(weekDates[0] + 'T00:00:00');
                                    const targetMonday = new Date(bulkCopy.targetWeekStart + 'T00:00:00');
                                    const dayDiff = Math.round((targetMonday.getTime() - currentMonday.getTime()) / (1000 * 60 * 60 * 24));
                                    const closuresToCopy = weekEvents.filter(ev => isClosure(ev) && (ev.endDate >= weekDates[0] && ev.startDate <= weekDates[4]));
                                    for (let w = 0; w < bulkCopy.weeksCount; w++) {
                                        const offsetDays = dayDiff + (7 * w);
                                        for (const ev of closuresToCopy) {
                                            const ns = new Date(ev.startDate + 'T00:00:00'); ns.setDate(ns.getDate() + offsetDays);
                                            const ne = new Date(ev.endDate + 'T00:00:00'); ne.setDate(ne.getDate() + offsetDays);
                                            await api.createEvent({
                                                title: ev.title,
                                                typeId: ev.typeId,
                                                startDate: ns.toISOString().split('T')[0],
                                                endDate: ne.toISOString().split('T')[0],
                                                allDay: ev.allDay,
                                                periodStart: ev.periodStart,
                                                periodEnd: ev.periodEnd,
                                                description: ev.description,
                                            } as any);
                                        }
                                    }
                                    // refresh
                                    const start = weekDates[0];
                                    const end = new Date(weekDates[4]); end.setDate(end.getDate() + 1);
                                    const endStr = end.toISOString().split('T')[0];
                                    try { setWeekEvents(await api.getEventsInRange(start, endStr)); } catch { }
                                    try { setMonthEvents(await api.getEventsForMonth(monthParam(monthAnchor))); } catch { }
                                    alert('Bulk copy complete.');
                                    setIsBulkCopyModalOpen(false);
                                } catch (e) {
                                    alert('Bulk copy failed.');
                                }
                            }}>Copy</Button>
                        </div>
                    </Card>
                </div>
            )}

            {isClosureModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
                    <Card className="w-full max-w-md">
                        <h2 className="text-xl font-bold mb-2">{closureMode === 'edit' ? 'Edit Closure' : 'Add Closure'}</h2>
                        <div className="space-y-3">
                            {closureMode === 'edit' && closureApplicableList.length > 1 && (
                                <div className="grid grid-cols-3 gap-2 items-center">
                                    <div className="text-xs text-gray-600">Select closure</div>
                                    <select className="col-span-2 p-2 border rounded" value={closureSelectedIndex} onChange={e => {
                                        const idx = parseInt(e.target.value) || 0;
                                        setClosureSelectedIndex(idx);
                                        const ev = closureApplicableList[idx];
                                        setClosureEditingId(ev.id);
                                        setClosureForm({
                                            title: ev.title,
                                            date: ev.startDate,
                                            endDate: ev.endDate,
                                            allDay: ev.allDay || (!ev.periodStart && !ev.periodEnd),
                                            typeId: ev.typeId,
                                            periodStart: ev.periodStart,
                                            periodEnd: ev.periodEnd,
                                            description: ev.description || ''
                                        });
                                    }}>
                                        {closureApplicableList.map((ev, i) => (
                                            <option key={ev.id} value={i}>{ev.title} ({ev.type?.name || 'Closed'})</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-xs block mb-1">Title</label>
                                    <input type="text" value={closureForm.title} onChange={e => setClosureForm({ ...closureForm, title: e.target.value })} className="w-full p-2 border rounded" placeholder="Reason (e.g., Holiday, Staff Day)" />
                                </div>
                                <div>
                                    <label className="text-xs block mb-1">Tag</label>
                                    <select value={closureForm.typeId || ''} onChange={e => setClosureForm({ ...closureForm, typeId: e.target.value })} className="w-full p-2 border rounded">
                                        {eventTypes.map(t => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-xs block mb-1">Start Date</label>
                                    <input type="date" value={closureForm.date} onChange={e => setClosureForm({ ...closureForm, date: e.target.value })} className="w-full p-2 border rounded" />
                                </div>
                                <div>
                                    <label className="text-xs block mb-1">End Date</label>
                                    <input type="date" value={closureForm.endDate} onChange={e => setClosureForm({ ...closureForm, endDate: e.target.value })} className="w-full p-2 border rounded" />
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <input id="allday" type="checkbox" checked={closureForm.allDay} onChange={e => setClosureForm({ ...closureForm, allDay: e.target.checked })} />
                                <label htmlFor="allday" className="text-sm">All day</label>
                            </div>
                            {!closureForm.allDay && (
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-xs block mb-1">Period Start</label>
                                        <select value={closureForm.periodStart ?? ''} onChange={e => setClosureForm({ ...closureForm, periodStart: e.target.value ? parseInt(e.target.value) : undefined })} className="w-full p-2 border rounded">
                                            <option value="">Select</option>
                                            {periodDefinitions.map(p => <option key={p.period} value={p.period}>Period {p.period}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs block mb-1">Period End</label>
                                        <select value={closureForm.periodEnd ?? ''} onChange={e => setClosureForm({ ...closureForm, periodEnd: e.target.value ? parseInt(e.target.value) : undefined })} className="w-full p-2 border rounded">
                                            <option value="">Same as start</option>
                                            {periodDefinitions.map(p => <option key={p.period} value={p.period}>Period {p.period}</option>)}
                                        </select>
                                    </div>
                                </div>
                            )}
                            <div>
                                <label className="text-xs block mb-1">Notes (optional)</label>
                                <textarea value={closureForm.description} onChange={e => setClosureForm({ ...closureForm, description: e.target.value })} className="w-full p-2 border rounded" rows={3} />
                            </div>
                            {closureMode === 'edit' && (
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-xs block mb-1">Copy start</label>
                                        <input type="date" value={copyRange.start} onChange={e => setCopyRange({ ...copyRange, start: e.target.value })} className="w-full p-2 border rounded" />
                                    </div>
                                    <div>
                                        <label className="text-xs block mb-1">Copy end (optional)</label>
                                        <input type="date" value={copyRange.end} onChange={e => setCopyRange({ ...copyRange, end: e.target.value })} className="w-full p-2 border rounded" />
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="mt-6 flex space-x-2">
                            <Button onClick={() => setIsClosureModalOpen(false)} variant="secondary" className="w-full">Cancel</Button>
                            {closureMode === 'edit' ? (
                                <>
                                    <Button onClick={async () => {
                                        if (!closureEditingId) return;
                                        try {
                                            await api.updateEvent(closureEditingId, {
                                                title: closureForm.title,
                                                typeId: closureForm.typeId!,
                                                startDate: closureForm.date,
                                                endDate: closureForm.endDate || closureForm.date,
                                                allDay: closureForm.allDay,
                                                periodStart: closureForm.allDay ? undefined : closureForm.periodStart,
                                                periodEnd: closureForm.allDay ? undefined : (closureForm.periodEnd ?? closureForm.periodStart),
                                                description: closureForm.description,
                                            });
                                            setIsClosureModalOpen(false);
                                            // refresh week/month events
                                            const start = weekDates[0];
                                            const end = new Date(weekDates[4]); end.setDate(end.getDate() + 1);
                                            const endStr = end.toISOString().split('T')[0];
                                            try { setWeekEvents(await api.getEventsInRange(start, endStr)); } catch { }
                                            try { setMonthEvents(await api.getEventsForMonth(monthParam(monthAnchor))); } catch { }
                                        } catch (e) {
                                            alert('Failed to save changes.');
                                        }
                                    }} className="w-full">Save Changes</Button>
                                    <Button onClick={async () => {
                                        // Copy closure to another date range
                                        try {
                                            const startCopy = copyRange.start || closureForm.date;
                                            const endCopy = copyRange.end || copyRange.start || closureForm.date;
                                            if (!startCopy) { alert('Please select a copy start date.'); return; }
                                            await api.createEvent({
                                                title: closureForm.title,
                                                typeId: closureForm.typeId!,
                                                startDate: startCopy,
                                                endDate: endCopy,
                                                allDay: closureForm.allDay,
                                                periodStart: closureForm.allDay ? undefined : closureForm.periodStart,
                                                periodEnd: closureForm.allDay ? undefined : (closureForm.periodEnd ?? closureForm.periodStart),
                                                description: closureForm.description,
                                            } as any);
                                            // refresh without closing
                                            const start = weekDates[0];
                                            const end = new Date(weekDates[4]); end.setDate(end.getDate() + 1);
                                            const endStr = end.toISOString().split('T')[0];
                                            try { setWeekEvents(await api.getEventsInRange(start, endStr)); } catch { }
                                            try { setMonthEvents(await api.getEventsForMonth(monthParam(monthAnchor))); } catch { }
                                            alert('Closure copied.');
                                        } catch (e) {
                                            alert('Failed to copy closure.');
                                        }
                                    }} variant="secondary" className="w-full">Copy to dates</Button>
                                    <Button onClick={async () => {
                                        if (!closureEditingId) return;
                                        if (!confirm('Delete this closure?')) return;
                                        try {
                                            await api.deleteEvent(closureEditingId);
                                            setIsClosureModalOpen(false);
                                            const start = weekDates[0];
                                            const end = new Date(weekDates[4]); end.setDate(end.getDate() + 1);
                                            const endStr = end.toISOString().split('T')[0];
                                            try { setWeekEvents(await api.getEventsInRange(start, endStr)); } catch { }
                                            try { setMonthEvents(await api.getEventsForMonth(monthParam(monthAnchor))); } catch { }
                                        } catch (e) {
                                            alert('Failed to delete.');
                                        }
                                    }} variant="danger" className="w-full">Delete</Button>
                                </>
                            ) : (
                                <Button onClick={handleCreateClosure} className="w-full">Save Closure</Button>
                            )}
                        </div>
                    </Card>
                </div>
            )}

            {isTypeModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
                    <Card className="w-full max-w-lg">
                        <div className="space-y-3">
                            <h2 className="text-xl font-bold mb-3">Manage Tags</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-2">
                                {editableTypes.map((t, idx) => (
                                    <div key={t.id} className="border rounded p-3 flex flex-col gap-2 bg-white">
                                        <div className="flex items-center gap-2">
                                            <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: t.color }}></span>
                                            <input className="flex-1 p-2 border rounded" placeholder="Tag name" value={t.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { const next = [...editableTypes]; (next[idx] as any).name = e.target.value; setEditableTypes(next); }} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="flex items-center gap-2">
                                                <input type="color" className="w-10 h-10 p-0 border rounded" value={t.color} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { const next = [...editableTypes]; (next[idx] as any).color = e.target.value; setEditableTypes(next); }} />
                                                <input className="flex-1 p-2 border rounded" value={t.color} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { const next = [...editableTypes]; (next[idx] as any).color = e.target.value; setEditableTypes(next); }} />
                                            </div>
                                            <select className="p-2 border rounded" value={t.icon || ''} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { const next = [...editableTypes]; (next[idx] as any).icon = e.target.value; setEditableTypes(next); }}>
                                                <option value="">(no icon)</option>
                                                <option value="ban">🚫 ban</option>
                                                <option value="calendar">📅 calendar</option>
                                                <option value="wrench">🔧 wrench</option>
                                                <option value="star">⭐ star</option>
                                                <option value="info">ℹ️ info</option>
                                                <option value="alert">⚠️ alert</option>
                                                <option value="dot">• dot</option>
                                            </select>
                                        </div>
                                        <div className="flex items-center gap-1 text-xs flex-wrap">
                                            {['ban', 'calendar', 'wrench', 'star', 'info', 'alert', 'dot', ''].map(k => (
                                                <button key={k || 'none'} type="button" className={`px-2 py-1 border rounded ${t.icon === k ? 'bg-gray-200' : ''}`} onClick={() => { const next = [...editableTypes]; (next[idx] as any).icon = k; setEditableTypes(next); }}>
                                                    <span className="mr-1">{iconFor(k)}</span>{k || 'none'}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <label className="flex items-center gap-1 text-xs">
                                                <input type="checkbox" checked={!!t.closesLibrary} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { const next = [...editableTypes]; (next[idx] as any).closesLibrary = e.target.checked; setEditableTypes(next); }} />
                                                Closes library
                                            </label>
                                            <div className="flex items-center gap-2 text-xs text-gray-600">
                                                <span>Preview:</span>
                                                <div className="flex items-center gap-1">
                                                    <span>{iconFor(t.icon)}</span>
                                                    <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: t.color }}></span>
                                                    <span className="truncate max-w-[120px]">{t.name}</span>
                                                </div>
                                            </div>
                                            <Button variant="danger" onClick={async () => { try { await api.deleteEventType(t.id); setEditableTypes((et: EventType[]) => et.filter(x => x.id !== t.id)); setEventTypes((prev: EventType[]) => prev.filter(x => x.id !== t.id)); } catch { alert('Failed to delete'); } }}>Delete</Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-between mt-3">
                                <Button variant="secondary" onClick={addTempTag}>Add Tag</Button>
                                <div className="space-x-2">
                                    <Button variant="secondary" onClick={() => setIsTypeModalOpen(false)}>Close</Button>
                                    <Button onClick={saveTags}>Save</Button>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {isDefinitionModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
                    <Card className="w-full max-w-3xl">
                        <h2 className="text-xl font-bold mb-4">Manage Periods</h2>
                        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                            {editedPeriodDefinitions.map((def, index) => (
                                <div key={index} className="grid grid-cols-4 gap-3 items-center p-2 bg-gray-50 rounded-md">
                                    <div className="font-semibold">Period {def.period}</div>
                                    <div>
                                        <label className="text-xs">Duration (min)</label>
                                        <input
                                            type="number"
                                            value={def.duration}
                                            onChange={(e) => handleDefinitionChange(index, 'duration', parseInt(e.target.value) || 0)}
                                            className="w-full p-1 border rounded-md"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs">Start Time</label>
                                        <input
                                            type="time"
                                            value={def.startTime}
                                            onChange={(e) => handleDefinitionChange(index, 'startTime', e.target.value)}
                                            className="w-full p-1 border rounded-md"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs">End Time</label>
                                        <input
                                            type="time"
                                            value={def.endTime}
                                            onChange={(e) => handleDefinitionChange(index, 'endTime', e.target.value)}
                                            className="w-full p-1 border rounded-md"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between mt-4">
                            <div className="space-x-2">
                                <Button onClick={addPeriod} variant="secondary">Add Period</Button>
                                <Button onClick={removeLastPeriod} variant="danger">Remove Last</Button>
                            </div>
                            <div className="space-x-2">
                                <Button onClick={() => setIsDefinitionModalOpen(false)} variant="secondary">Cancel</Button>
                                <Button onClick={handleSaveDefinitions}>Save Definitions</Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default ScheduleView;
