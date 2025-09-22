import { User, Role, Shift, Magazine, MonitorLog, Announcement, Task, TaskPriority, MagazineLog, TaskStatus, MonitorTaskStatus, PeriodDefinition, EventType, CalendarEvent } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class ApiService {
  private async request<T>(endpoint: string, options: RequestInit = {}, retries: number = 3): Promise<T> {
    const token = localStorage.getItem('authToken');

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      timeout: 30000, // 30 second timeout
      ...options,
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...config,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      // Handle rate limiting with exponential backoff
      if (response.status === 429 && retries > 0) {
        const delay = Math.pow(2, 4 - retries) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.request<T>(endpoint, options, retries - 1);
      }

      // Handle unauthorized - clear token and redirect to login
      if (response.status === 401) {
        localStorage.removeItem('authToken');
        window.location.href = '/';
        throw new Error('Your session has expired. Please log in again.');
      }

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
        }
        
        // Provide user-friendly error messages
        const errorMessage = this.getErrorMessage(response.status, errorData);
        throw new Error(errorMessage);
      }

      // Handle empty responses
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return response.json();
      } else {
        return response.text() as unknown as T;
      }
    } catch (error) {
      // Handle network errors and retries
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timed out. Please check your connection and try again.');
        }
        
        // Retry on network errors (but not on 4xx/5xx HTTP errors)
        if (retries > 0 && (error.message.includes('Failed to fetch') || error.message.includes('NetworkError'))) {
          const delay = Math.pow(2, 4 - retries) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.request<T>(endpoint, options, retries - 1);
        }
      }
      throw error;
    }
  }

  private getErrorMessage(status: number, errorData: any): string {
    // Provide user-friendly error messages based on status codes
    switch (status) {
      case 400:
        return errorData.error || 'Invalid request. Please check your input and try again.';
      case 401:
        return 'Authentication required. Please log in.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 409:
        return errorData.error || 'This operation conflicts with existing data.';
      case 429:
        return 'Too many requests. Please wait a moment and try again.';
      case 500:
        return 'Internal server error. Please try again later.';
      case 503:
        return 'Service temporarily unavailable. Please try again later.';
      default:
        return errorData.error || `An unexpected error occurred (${status}).`;
    }
  }

  // --- AUTH ---
  async authenticateUser(email: string, password: string): Promise<{ user: User; token: string }> {
    const response = await this.request<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    // Store token
    localStorage.setItem('authToken', response.token);
    return response;
  }

  async registerUser(name: string, email: string, password: string, role: Role = Role.Monitor): Promise<{ user: User }> {
    return this.request<{ user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role }),
    });
  }

  async verifyToken(): Promise<{ user: User }> {
    return this.request<{ user: User }>('/auth/verify');
  }

  logout(): void {
    localStorage.removeItem('authToken');
  }

  // --- USERS ---
  async getAllUsers(): Promise<User[]> {
    return this.request<User[]>('/users');
  }

  async getUser(id: string): Promise<User> {
    return this.request<User>(`/users/${id}`);
  }

  async updateUser(userId: string, name?: string, email?: string, password?: string, profilePicture?: string, backgroundColor?: string, role?: Role, themePreferences?: any): Promise<User> {
    return this.request<User>(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify({ name, email, password, profilePicture, backgroundColor, role, themePreferences }),
    });
  }

  // --- AUDIT LOG ---
  async getAuditLogs(): Promise<Array<{
    id: string;
    actorId: string;
    targetUserId?: string;
    action: string;
    details?: string;
    createdAt: string;
    actor: { id: string; name: string; email: string };
    targetUser?: { id: string; name: string; email: string };
  }>> {
    return this.request('/audit');
  }

  // --- NOTIFICATIONS ---
  async broadcastNotification(title: string, message: string): Promise<{ success: boolean; sent: number }> {
    return this.request<{ success: boolean; sent: number }>(`/notifications/broadcast`, {
      method: 'POST',
      body: JSON.stringify({ title, message })
    });
  }

  async updateUserPreferences(userId: string, preferences: { profilePicture?: string; backgroundColor?: string; themePreferences?: any }): Promise<User> {
    return this.request<User>(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(preferences),
    });
  }

  async createUser(name: string, email: string, password: string, role: Role = Role.Monitor): Promise<User> {
    return this.request<User>('/users', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role }),
    });
  }

  async deleteUser(userId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/users/${userId}`, {
      method: 'DELETE',
    });
  }

  // --- SCHEDULE & PERIODS ---
  async getScheduleForWeek(startDate: string): Promise<Shift[]> {
    return this.request<Shift[]>(`/shifts/week/${startDate}`);
  }

  async createShift(date: string, period: number, monitorIds: string[]): Promise<Shift> {
    return this.request<Shift>('/shifts', {
      method: 'POST',
      body: JSON.stringify({ date, period, monitorIds }),
    });
  }

  async updateShift(shiftId: string, monitorIds: string[]): Promise<Shift> {
    return this.request<Shift>(`/shifts/${shiftId}`, {
      method: 'PUT',
      body: JSON.stringify({ monitorIds }),
    });
  }

  async deleteShift(shiftId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/shifts/${shiftId}`, {
      method: 'DELETE',
    });
  }

  async getPeriodDefinitions(): Promise<PeriodDefinition[]> {
    return this.request<PeriodDefinition[]>('/periods');
  }

  async updatePeriodDefinitions(definitions: PeriodDefinition[]): Promise<{ success: boolean; definitions: PeriodDefinition[] }> {
    return this.request<{ success: boolean; definitions: PeriodDefinition[] }>('/periods', {
      method: 'PUT',
      body: JSON.stringify({ definitions }),
    });
  }

  // --- MAGAZINES ---
  async getMagazines(): Promise<Magazine[]> {
    return this.request<Magazine[]>('/magazines');
  }

  async getMagazineLogs(): Promise<MagazineLog[]> {
    return this.request<MagazineLog[]>('/magazines/logs');
  }

  async addMagazine(title: string): Promise<Magazine> {
    return this.request<Magazine>('/magazines', {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
  }

  async removeMagazine(magazineId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/magazines/${magazineId}`, {
      method: 'DELETE',
    });
  }

  async logMagazineCheck(magazineId: string, weekIdentifier: string): Promise<any> {
    return this.request<any>(`/magazines/${magazineId}/log`, {
      method: 'POST',
      body: JSON.stringify({ weekIdentifier }),
    });
  }

  async removeMagazineLog(magazineId: string, weekIdentifier: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/magazines/${magazineId}/log/${weekIdentifier}`, {
      method: 'DELETE',
    });
  }

  // --- HOURS & CHECK-IN ---
  async getCheckinCode(): Promise<{ code: string }> {
    return this.request<{ code: string }>('/checkin/code');
  }

  async generateNewCheckinCode(): Promise<{ code: string }> {
    return this.request<{ code: string }>('/checkin/code', {
      method: 'POST',
    });
  }

  async logHoursWithCode(monitorId: string, date: string, period: number, code: string): Promise<MonitorLog> {
    return this.request<MonitorLog>('/monitor-logs/log-hours', {
      method: 'POST',
      body: JSON.stringify({ monitorId, date, period, code }),
    });
  }

  async logHoursByLibrarian(monitorId: string, date: string, period: number, durationMinutes?: number): Promise<MonitorLog> {
    return this.request<MonitorLog>('/monitor-logs/log-hours-librarian', {
      method: 'POST',
      body: JSON.stringify({ monitorId, date, period, durationMinutes }),
    });
  }

  async getMonitorLogs(monitorId?: string): Promise<MonitorLog[]> {
    const params = monitorId ? `?monitorId=${monitorId}` : '';
    return this.request<MonitorLog[]>(`/monitor-logs${params}`);
  }

  async updateMonitorLog(logId: string, updatedLogData: Partial<MonitorLog>): Promise<MonitorLog> {
    return this.request<MonitorLog>(`/monitor-logs/${logId}`, {
      method: 'PUT',
      body: JSON.stringify(updatedLogData),
    });
  }

  async deleteMonitorLog(logId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/monitor-logs/${logId}`, {
      method: 'DELETE',
    });
  }

  // --- ANNOUNCEMENTS ---
  async getAnnouncements(): Promise<Announcement[]> {
    return this.request<Announcement[]>('/announcements');
  }

  async getAnnouncement(id: string): Promise<Announcement> {
    return this.request<Announcement>(`/announcements/${id}`);
  }

  async createAnnouncement(title: string, content: string, imageUrl?: string): Promise<Announcement> {
    return this.request<Announcement>('/announcements', {
      method: 'POST',
      body: JSON.stringify({ title, content, imageUrl }),
    });
  }

  async updateAnnouncement(annoId: string, title: string, content: string, imageUrl?: string): Promise<Announcement> {
    return this.request<Announcement>(`/announcements/${annoId}`, {
      method: 'PUT',
      body: JSON.stringify({ title, content, imageUrl }),
    });
  }

  async deleteAnnouncement(annoId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/announcements/${annoId}`, {
      method: 'DELETE',
    });
  }

  // --- TASKS ---
  async getTasks(): Promise<Task[]> {
    return this.request<Task[]>('/tasks');
  }

  async getTasksForMonitor(monitorId: string): Promise<Task[]> {
    return this.request<Task[]>(`/tasks/monitor/${monitorId}`);
  }

  async createTask(data: Omit<Task, 'id' | 'createdAt' | 'statuses'>): Promise<Task> {
    return this.request<Task>('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTask(taskId: string, data: Partial<Omit<Task, 'id' | 'createdAt'>>): Promise<Task> {
    return this.request<Task>(`/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTask(taskId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/tasks/${taskId}`, {
      method: 'DELETE',
    });
  }

  async updateTaskStatus(taskId: string, monitorId: string, status: TaskStatus): Promise<MonitorTaskStatus> {
    return this.request<MonitorTaskStatus>(`/tasks/${taskId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ monitorId, status }),
    });
  }

  // --- EVENT TYPES ---
  async getEventTypes(): Promise<EventType[]> {
    return this.request<EventType[]>('/event-types');
  }
  async createEventType(data: { name: string; color: string; icon?: string; closesLibrary?: boolean }): Promise<EventType> {
    return this.request<EventType>('/event-types', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
  async updateEventType(id: string, data: Partial<{ name: string; color: string; icon?: string; closesLibrary?: boolean }>): Promise<EventType> {
    return this.request<EventType>(`/event-types/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }
  async deleteEventType(id: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/event-types/${id}`, { method: 'DELETE' });
  }

  // --- EVENTS ---
  async getEventsForMonth(month: string): Promise<CalendarEvent[]> {
    // month format: YYYY-MM
    return this.request<CalendarEvent[]>(`/events/month/${month}`);
  }
  async getEventsInRange(start: string, end: string): Promise<CalendarEvent[]> {
    const params = new URLSearchParams({ start, end }).toString();
    return this.request<CalendarEvent[]>(`/events/range?${params}`);
  }
  async createEvent(data: Omit<CalendarEvent, 'id' | 'type' > & { description?: string }): Promise<CalendarEvent> {
    return this.request<CalendarEvent>('/events', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
  async updateEvent(id: string, data: Partial<Omit<CalendarEvent, 'id' | 'type'>> & { description?: string }): Promise<CalendarEvent> {
    return this.request<CalendarEvent>(`/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }
  async deleteEvent(id: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/events/${id}`, { method: 'DELETE' });
  }
}

export const api = new ApiService();
