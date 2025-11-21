import { User, Role, Shift, Magazine, MonitorLog, Announcement, Task, TaskPriority, MagazineLog, TaskStatus, MonitorTaskStatus, PeriodDefinition } from '../types';

// --- MOCK DATABASE ---

// Passwords would be in a real database. Stored in plaintext for demo purposes ONLY.
export let mockUsers: User[] = [
    { id: 'user-1', name: 'Edison Admin', email: 'admin@school.edu', password: '3di$onL', role: Role.Librarian, profilePicture: 'https://pbs.twimg.com/profile_images/1436328729282764801/-bKoMQfK_400x400.jpg', backgroundColor: '#f3f4f6' },
];

let mockShifts: Shift[] = [
    { id: 'shift-1', date: '2024-07-29', period: 3, monitorIds: ['user-2'] },
    { id: 'shift-2', date: '2024-07-29', period: 4, monitorIds: ['user-3'] },
    { id: 'shift-3', date: '2024-07-30', period: 3, monitorIds: ['user-3', 'user-2'] },
    { id: 'shift-4', date: '2024-07-30', period: 4, monitorIds: ['user-2'] },
    { id: 'shift-5', date: '2024-08-05', period: 1, monitorIds: ['user-2'] },
];

let mockMagazines: Magazine[] = [
    { id: 'mag-1', title: 'National Geographic' },
    { id: 'mag-2', title: 'Time Magazine' },
    { id: 'mag-3', title: 'Scientific American' },
];

let mockMagazineLogs: MagazineLog[] = [
    { id: 'mlog-1', magazineId: 'mag-1', weekIdentifier: '2024-W31', checkedByMonitorId: 'user-2', timestamp: new Date().toISOString() }
];

let mockMonitorLogs: MonitorLog[] = [
    { id: 'log-1', monitorId: 'user-2', monitorName: 'Ben Carter', date: '2024-07-22', period: 3, checkIn: '10:05', checkOut: '10:50', durationMinutes: 45 },
    { id: 'log-2', monitorId: 'user-3', monitorName: 'Chloe Davis', date: '2024-07-22', period: 4, checkIn: '11:00', checkOut: '11:45', durationMinutes: 45 },
];

let mockAnnouncements: Announcement[] = [
    { id: 'anno-1', title: 'Welcome Back!', content: 'Welcome back to a new school year! We are excited to have our monitors back in the library.', authorId: 'user-1', authorName: 'Dr. Anya Sharma', createdAt: new Date().toISOString() }
];

let mockTasks: Task[] = [
    {
        id: 'task-1',
        title: 'Organize Biography Section',
        description: 'Please organize the biography section (920-929) alphabetically by subject last name.',
        priority: TaskPriority.Medium,
        dueDate: '2024-08-15',
        assignedTo: ['user-2', 'user-3'],
        statuses: [
            { monitorId: 'user-2', status: TaskStatus.Pending },
            { monitorId: 'user-3', status: TaskStatus.Pending }
        ],
        createdAt: new Date().toISOString()
    },
    {
        id: 'task-2',
        title: 'Prepare New Book Cart',
        description: 'Get the cart of new books ready for shelving. This includes stamping and adding security tags.',
        priority: TaskPriority.High,
        dueDate: '2024-08-01',
        assignedTo: ['user-2'],
        statuses: [
            { monitorId: 'user-2', status: TaskStatus.Completed, completedAt: new Date().toISOString() }
        ],
        createdAt: new Date().toISOString()
    },
];

let mockPeriodDefinitions: PeriodDefinition[] = [
    { period: 1, duration: 50, startTime: '08:00', endTime: '08:50' },
    { period: 2, duration: 50, startTime: '08:55', endTime: '09:45' },
    { period: 3, duration: 50, startTime: '09:50', endTime: '10:40' },
    { period: 4, duration: 50, startTime: '10:45', endTime: '11:35' },
    { period: 5, duration: 50, startTime: '11:40', endTime: '12:30' },
    { period: 6, duration: 50, startTime: '12:35', endTime: '13:25' },
    { period: 7, duration: 50, startTime: '13:30', endTime: '14:20' },
    { period: 8, duration: 50, startTime: '14:25', endTime: '15:15' },
    { period: 9, duration: 50, startTime: '15:20', endTime: '16:10' },
];

let mockCheckinCode = '123456';


// --- MOCK API FUNCTIONS ---

const simulateNetworkDelay = <T,>(data: T, delay = 500): Promise<T> => {
    return new Promise(resolve => setTimeout(() => resolve(JSON.parse(JSON.stringify(data))), delay));
};

const sanitizeUser = (user: User): User => {
    const { password, ...sanitized } = user;
    return sanitized;
}

export const api = {
    // --- AUTH ---
    authenticateUser: (email: string, password: string): Promise<User | null> => {
        const user = mockUsers.find(u => u.email === email && u.password === password);
        if (user) {
            return simulateNetworkDelay(sanitizeUser(user));
        }
        return simulateNetworkDelay(null);
    },

    // --- USERS ---
    getAllMonitors: () => simulateNetworkDelay(mockUsers.filter(u => u.role === Role.Monitor).map(sanitizeUser)),
    updateUser: (userId: string, name: string, email: string) => {
        const userIndex = mockUsers.findIndex(u => u.id === userId);
        if (userIndex > -1) {
            mockUsers[userIndex] = { ...mockUsers[userIndex], name, email };
            return simulateNetworkDelay(sanitizeUser(mockUsers[userIndex]));
        }
        return Promise.reject("User not found");
    },
    updateUserPreferences: (userId: string, preferences: { profilePicture?: string, backgroundColor?: string }) => {
        const userIndex = mockUsers.findIndex(u => u.id === userId);
        if (userIndex > -1) {
            if (preferences.profilePicture) {
                mockUsers[userIndex].profilePicture = preferences.profilePicture;
            }
            if (preferences.backgroundColor) {
                mockUsers[userIndex].backgroundColor = preferences.backgroundColor;
            }
            return simulateNetworkDelay(sanitizeUser(mockUsers[userIndex]));
        }
        return Promise.reject("User not found");
    },
    createUser: (name: string, email: string, password: string) => {
        const newUser: User = {
            id: `user-${Date.now()}`,
            name, email, password,
            role: Role.Monitor,
            profilePicture: `https://picsum.photos/seed/${name}/100/100`,
            backgroundColor: '#f3f4f6',
        };
        mockUsers.push(newUser);
        return simulateNetworkDelay(sanitizeUser(newUser));
    },

    // --- SCHEDULE & PERIODS ---
    getScheduleForWeek: (startDate: string) => {
        const start = new Date(startDate);
        const end = new Date(start);
        end.setDate(start.getDate() + 5);
        const shifts = mockShifts.filter(s => {
            const shiftDate = new Date(s.date);
            return shiftDate >= start && shiftDate < end;
        });
        return simulateNetworkDelay(shifts);
    },
    createShift: (date: string, period: number, monitorIds: string[]) => {
        const newShift: Shift = {
            id: `shift-${Date.now()}`,
            date,
            period,
            monitorIds,
        };
        mockShifts.push(newShift);
        return simulateNetworkDelay(newShift);
    },
    updateShift: (shiftId: string, monitorIds: string[]) => {
        const shiftIndex = mockShifts.findIndex(s => s.id === shiftId);
        if (shiftIndex > -1) {
            mockShifts[shiftIndex].monitorIds = monitorIds;
            return simulateNetworkDelay(mockShifts[shiftIndex]);
        }
        return Promise.reject("Shift not found");
    },
    getPeriodDefinitions: () => simulateNetworkDelay(mockPeriodDefinitions),
    updatePeriodDefinitions: (definitions: PeriodDefinition[]) => {
        mockPeriodDefinitions = definitions;
        return simulateNetworkDelay({ success: true, definitions });
    },

    // --- MAGAZINES ---
    getMagazines: () => simulateNetworkDelay(mockMagazines),
    getMagazineLogs: () => simulateNetworkDelay(mockMagazineLogs),
    addMagazine: (title: string) => {
        const newMagazine: Magazine = { id: `mag-${Date.now()}`, title };
        mockMagazines.push(newMagazine);
        return simulateNetworkDelay(newMagazine);
    },
    removeMagazine: (magazineId: string) => {
        mockMagazines = mockMagazines.filter(m => m.id !== magazineId);
        mockMagazineLogs = mockMagazineLogs.filter(ml => ml.magazineId !== magazineId);
        return simulateNetworkDelay({ success: true });
    },
    logMagazineCheck: (magazineId: string, weekIdentifier: string, monitorId: string) => {
        const newLog: MagazineLog = {
            id: `mlog-${Date.now()}`,
            magazineId,
            weekIdentifier,
            checkedByMonitorId: monitorId,
            timestamp: new Date().toISOString(),
        };
        mockMagazineLogs.push(newLog);
        return simulateNetworkDelay(newLog);
    },
    removeMagazineLog: (magazineId: string, weekIdentifier: string) => {
        mockMagazineLogs = mockMagazineLogs.filter(log => !(log.magazineId === magazineId && log.weekIdentifier === weekIdentifier));
        return simulateNetworkDelay({ success: true });
    },

    // --- HOURS & CHECK-IN ---
    getCheckinCode: () => simulateNetworkDelay({ code: mockCheckinCode }),
    generateNewCheckinCode: () => {
        mockCheckinCode = Math.floor(100000 + Math.random() * 900000).toString();
        return simulateNetworkDelay({ code: mockCheckinCode });
    },
    logHoursWithCode: (monitorId: string, date: string, period: number, code: string) => {
        if (code !== mockCheckinCode) {
            return Promise.reject("Invalid check-in code.");
        }
        const monitor = mockUsers.find(u => u.id === monitorId);
        if (!monitor) {
            return Promise.reject("Monitor not found.");
        }

        const scheduledShift = mockShifts.find(s => s.date === date && s.period === period && s.monitorIds.includes(monitorId));
        if (!scheduledShift) {
            return Promise.reject("You are not scheduled for this period on this date.");
        }

        const existingLog = mockMonitorLogs.find(l => l.monitorId === monitorId && l.date === date && l.period === period);
        if (existingLog) {
            return Promise.reject("Hours for this period have already been logged.");
        }

        const periodDefinition = mockPeriodDefinitions.find(p => p.period === period);

        const newLog: MonitorLog = {
            id: `log-${Date.now()}-${period}`,
            monitorId: monitorId,
            monitorName: monitor.name,
            date: date,
            period: period,
            checkIn: 'Logged',
            checkOut: 'Logged',
            durationMinutes: periodDefinition?.duration || 0
        };
        mockMonitorLogs.push(newLog);

        return simulateNetworkDelay({ success: true, log: newLog });
    },
    getMonitorLogs: (monitorId?: string) => {
        const logs = monitorId ? mockMonitorLogs.filter(l => l.monitorId === monitorId) : mockMonitorLogs;
        return simulateNetworkDelay(logs);
    },
    updateMonitorLog: (logId: string, updatedLogData: Partial<MonitorLog>) => {
        const logIndex = mockMonitorLogs.findIndex(l => l.id === logId);
        if (logIndex > -1) {
            mockMonitorLogs[logIndex] = { ...mockMonitorLogs[logIndex], ...updatedLogData };
            return simulateNetworkDelay(mockMonitorLogs[logIndex]);
        }
        return Promise.reject("Log not found");
    },
    deleteMonitorLog: (logId: string) => {
        mockMonitorLogs = mockMonitorLogs.filter(l => l.id !== logId);
        return simulateNetworkDelay({ success: true });
    },

    // --- ANNOUNCEMENTS ---
    getAnnouncements: () => simulateNetworkDelay(mockAnnouncements.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())),
    createAnnouncement: (title: string, content: string, imageUrl: string | undefined, author: User) => {
        const newAnno: Announcement = {
            id: `anno-${Date.now()}`,
            title, content, imageUrl,
            authorId: author.id,
            authorName: author.name,
            createdAt: new Date().toISOString(),
        };
        mockAnnouncements.push(newAnno);
        return simulateNetworkDelay(newAnno);
    },
    updateAnnouncement: (annoId: string, title: string, content: string, imageUrl: string | undefined) => {
        const annoIndex = mockAnnouncements.findIndex(a => a.id === annoId);
        if (annoIndex > -1) {
            mockAnnouncements[annoIndex] = {
                ...mockAnnouncements[annoIndex],
                title,
                content,
                imageUrl,
                updatedAt: new Date().toISOString(),
            };
            return simulateNetworkDelay(mockAnnouncements[annoIndex]);
        }
        return Promise.reject("Announcement not found");
    },
    deleteAnnouncement: (annoId: string) => {
        mockAnnouncements = mockAnnouncements.filter(a => a.id !== annoId);
        return simulateNetworkDelay({ success: true });
    },

    // --- TASKS ---
    getTasks: () => simulateNetworkDelay(mockTasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())),
    getTasksForMonitor: (monitorId: string) => {
        const tasks = mockTasks.filter(t => t.assignedTo.includes(monitorId));
        return simulateNetworkDelay(tasks);
    },
    createTask: (data: Omit<Task, 'id' | 'createdAt' | 'statuses'>) => {
        const statuses: MonitorTaskStatus[] = data.assignedTo.map(mid => ({
            monitorId: mid,
            status: TaskStatus.Pending
        }));
        const newTask: Task = {
            ...data,
            id: `task-${Date.now()}`,
            createdAt: new Date().toISOString(),
            statuses,
        };
        mockTasks.push(newTask);
        return simulateNetworkDelay(newTask);
    },
    updateTask: (taskId: string, data: Partial<Omit<Task, 'id' | 'createdAt'>>) => {
        const taskIndex = mockTasks.findIndex(t => t.id === taskId);
        if (taskIndex > -1) {
            const originalTask = mockTasks[taskIndex];
            mockTasks[taskIndex] = { ...originalTask, ...data, updatedAt: new Date().toISOString() };
            // If assignedTo changes, we might need to update statuses array
            if (data.assignedTo) {
                const newStatuses: MonitorTaskStatus[] = data.assignedTo.map(mid => {
                    return originalTask.statuses.find(s => s.monitorId === mid) || { monitorId: mid, status: TaskStatus.Pending };
                });
                mockTasks[taskIndex].statuses = newStatuses;
            }
            return simulateNetworkDelay(mockTasks[taskIndex]);
        }
        return Promise.reject("Task not found");
    },
    deleteTask: (taskId: string) => {
        mockTasks = mockTasks.filter(t => t.id !== taskId);
        return simulateNetworkDelay({ success: true });
    },
    updateTaskStatus: (taskId: string, monitorId: string, status: TaskStatus) => {
        const taskIndex = mockTasks.findIndex(t => t.id === taskId);
        if (taskIndex > -1) {
            const statusIndex = mockTasks[taskIndex].statuses.findIndex(s => s.monitorId === monitorId);
            if (statusIndex > -1) {
                mockTasks[taskIndex].statuses[statusIndex].status = status;
                if (status === TaskStatus.Completed) {
                    mockTasks[taskIndex].statuses[statusIndex].completedAt = new Date().toISOString();
                } else {
                    delete mockTasks[taskIndex].statuses[statusIndex].completedAt;
                }
                return simulateNetworkDelay(mockTasks[taskIndex]);
            }
            return Promise.reject("Monitor not assigned to this task");
        }
        return Promise.reject("Task not found");
    }
};