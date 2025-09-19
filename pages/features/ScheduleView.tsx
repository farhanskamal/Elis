import React, { useState, useEffect, useContext, useMemo } from 'react';
import { api } from '../../services/apiService';
import { Shift, User, Role, PeriodDefinition } from '../../types';
import { AuthContext } from '../../context/AuthContext';
import Card from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';
import Button from '../../components/ui/Button';

const ScheduleView: React.FC = () => {
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [volunteers, setVolunteers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useContext(AuthContext);

    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
    const [assignedVolunteers, setAssignedVolunteers] = useState<Set<string>>(new Set());
    
    // State for period definitions modal
    const [isDefinitionModalOpen, setIsDefinitionModalOpen] = useState(false);
    const [periodDefinitions, setPeriodDefinitions] = useState<PeriodDefinition[]>([]);
    const [editedPeriodDefinitions, setEditedPeriodDefinitions] = useState<PeriodDefinition[]>([]);

    // State for week navigation
    const [currentDate, setCurrentDate] = useState(() => {
        const today = new Date();
        // Get Monday of current week
        const day = today.getDay(); // Sun=0..Sat=6
        const diff = today.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(today);
        monday.setDate(diff);
        monday.setHours(0,0,0,0);
        return monday;
    });

    const weekDates = useMemo(() => {
        return Array.from({ length: 5 }, (_, i) => {
            const day = new Date(currentDate);
            day.setDate(day.getDate() + i);
            return day.toISOString().split('T')[0];
        });
    }, [currentDate]);

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
            const [scheduleData, definitionData] = await Promise.all([
                api.getScheduleForWeek(weekDates[0]),
                api.getPeriodDefinitions()
            ]);
            setShifts(scheduleData);
            setPeriodDefinitions(definitionData);
            try {
                const users = await api.getAllUsers();
                setVolunteers(users.filter(u => u.role === 'VOLUNTEER'));
            } catch {
                // volunteers list optional for non-admins
                setVolunteers([]);
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

    const getShiftFor = (date: string, period: number) => {
        return shifts.find(s => s.date === date && s.period === period);
    };

    const getVolunteerNamesFromShift = (volunteerIds: string[], shiftObj?: any) => {
        if (volunteerIds.length === 0) return <span className="text-gray-400">Open</span>;

        // Use volunteer names from shift data if available
        if (shiftObj && Array.isArray(shiftObj.volunteers)) {
            const names = shiftObj.volunteers
                .filter((v: any) => v && v.name)
                .map((v: any) => v.name);

            if (names.length > 0) {
                if (names.length > 2) {
                    return `${names.slice(0, 2).join(', ')} & ${names.length - 2} more`;
                }
                return names.join(', ');
            }
        }

        // Fallback: try to find names in volunteers array (for librarians) or current user
        const names = volunteerIds.map(id => {
            const volunteer = volunteers.find(v => v.id === id);
            if (volunteer) return volunteer.name;
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
        const shift = getShiftFor(date, period);
        const shiftToEdit = shift || {
            id: `new-${date}-${period}`, // Temporary ID
            date,
            period,
            volunteerIds: [],
        };
        setSelectedShift(shiftToEdit);
        setAssignedVolunteers(new Set(shiftToEdit.volunteerIds));
        setIsAssignModalOpen(true);
    };
    
    const handleUpdateShift = async () => {
        if (!selectedShift) return;
        const volunteerIds: string[] = Array.from(assignedVolunteers);

        try {
            if (selectedShift.id.startsWith('new-')) {
                if (volunteerIds.length > 0) {
                     await api.createShift(selectedShift.date, selectedShift.period, volunteerIds);
                }
            } else {
                 await api.updateShift(selectedShift.id, volunteerIds);
            }

            setIsAssignModalOpen(false);
            setSelectedShift(null);
            fetchShifts(); // Refetch to show changes
        } catch (error) {
            console.error('Failed to update shift:', error);
            alert('Failed to update shift. Please try again.');
        }
    };

    const handleVolunteerSelection = (volunteerId: string) => {
        const newSelection = new Set(assignedVolunteers);
        if (newSelection.has(volunteerId)) {
            newSelection.delete(volunteerId);
        } else {
            newSelection.add(volunteerId);
        }
        setAssignedVolunteers(newSelection);
    };

    const handleDefinitionChange = (index: number, field: keyof PeriodDefinition, value: string | number) => {
        const newDefinitions = [...editedPeriodDefinitions];
        (newDefinitions[index] as any)[field] = value;
        setEditedPeriodDefinitions(newDefinitions);
    };

    const handleSaveDefinitions = async () => {
        try {
            await api.updatePeriodDefinitions(editedPeriodDefinitions);
            setPeriodDefinitions(editedPeriodDefinitions);
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
        if(editedPeriodDefinitions.length > 1) {
            setEditedPeriodDefinitions(editedPeriodDefinitions.slice(0, -1));
        }
    };

    const changeWeek = (direction: 'prev' | 'next') => {
        const newDate = new Date(currentDate);
        const offset = direction === 'prev' ? -7 : 7;
        newDate.setDate(newDate.getDate() + offset);
        setCurrentDate(newDate);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                <h1 className="text-3xl font-bold text-gray-800">Weekly Schedule</h1>
                <div className="flex items-center space-x-2 flex-wrap gap-2">
                    {user?.role === Role.Librarian && (
                         <Button onClick={handleOpenDefinitionModal} variant="secondary">Manage Periods</Button>
                    )}
                    <Button onClick={() => changeWeek('prev')} variant="secondary">&larr; Previous</Button>
                    <span className="text-sm font-medium text-gray-700 hidden md:block">
                        {new Date(weekDates[0]).toLocaleDateString()} - {new Date(weekDates[4]).toLocaleDateString()}
                    </span>
                    <Button onClick={() => changeWeek('next')} variant="secondary">Next &rarr;</Button>
                </div>
            </div>
            
            {loading ? <div className="flex justify-center items-center h-64"><Spinner /></div> : (
                <div className="overflow-x-auto bg-white rounded-lg shadow">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3">Period</th>
                                {weekDates.map((date) => {
                                    const d = new Date(date + 'T00:00:00');
                                    const weekday = d.toLocaleDateString('en-US', { weekday: 'long' });
                                    const mm = d.getMonth() + 1;
                                    const dd = d.getDate();
                                    const yyyy = d.getFullYear();
                                    return (
                                        <th key={date} scope="col" className="px-6 py-3">{`${weekday} - ${mm}/${dd}/${yyyy}`}</th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {periodDefinitions.map(({ period }) => (
                                <tr key={period} className="border-b">
                                    <th scope="row" className="px-6 py-4 font-medium text-gray-900 bg-gray-50">
                                        Period {period}
                                    </th>
                                    {weekDates.map(date => {
                                        const shift = getShiftFor(date, period) as any;
                                        const isCurrentUserShift = shift?.volunteerIds.includes(user?.id || '');
                                        const canModify = user?.role === Role.Librarian;
                                        return (
                                            <td key={`${date}-${period}`}
                                                onClick={() => canModify && handleCellClick(date, period)}
                                                className={`px-4 py-3 border-l ${canModify ? 'cursor-pointer hover:bg-gray-50' : ''} ${isCurrentUserShift ? 'bg-sky-100 font-semibold text-sky-800' : 'bg-white'}`}>
                                                {shift ? getVolunteerNamesFromShift(shift.volunteerIds, shift) : <span className="text-gray-300">-</span>}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            
            {isAssignModalOpen && selectedShift && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
                    <Card className="w-full max-w-md">
                        <h2 className="text-xl font-bold mb-2">Assign Volunteers</h2>
                        <p className="mb-4 text-gray-600">Period {selectedShift.period} on {selectedShift.date}</p>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                           {volunteers.map(v => (
                               <label key={v.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-100 cursor-pointer">
                                   <input
                                       type="checkbox"
                                       className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                       checked={assignedVolunteers.has(v.id)}
                                       onChange={() => handleVolunteerSelection(v.id)}
                                   />
                                   <span>{v.name}</span>
                               </label>
                           ))}
                        </div>
                        <div className="mt-6 flex space-x-2">
                           <Button onClick={() => setIsAssignModalOpen(false)} variant="secondary" className="w-full">Cancel</Button>
                           <Button onClick={handleUpdateShift} className="w-full">Save Changes</Button>
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
