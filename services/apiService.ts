import { User, Role, Shift, Magazine, VolunteerLog, Announcement, Task, TaskPriority, MagazineLog, TaskStatus, VolunteerTaskStatus, PeriodDefinition } from '../types';

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
      ...options,
    };

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

      if (response.status === 429 && retries > 0) {
        // Exponential backoff: wait 1s, 2s, 4s...
        const delay = Math.pow(2, 4 - retries) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.request<T>(endpoint, options, retries - 1);
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      return response.json();
    } catch (error) {
      if (retries > 0 && (error as Error).message.includes('429')) {
        const delay = Math.pow(2, 4 - retries) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.request<T>(endpoint, options, retries - 1);
      }
      throw error;
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

  async registerUser(name: string, email: string, password: string, role: Role = Role.Volunteer): Promise<{ user: User }> {
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

  async updateUser(userId: string, name?: string, email?: string, password?: string, profilePicture?: string, backgroundColor?: string, role?: Role): Promise<User> {
    return this.request<User>(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify({ name, email, password, profilePicture, backgroundColor, role }),
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

  async updateUserPreferences(userId: string, preferences: { profilePicture?: string; backgroundColor?: string }): Promise<User> {
    return this.request<User>(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(preferences),
    });
  }

  async createUser(name: string, email: string, password: string, role: Role = Role.Volunteer): Promise<User> {
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

  async createShift(date: string, period: number, volunteerIds: string[]): Promise<Shift> {
    return this.request<Shift>('/shifts', {
      method: 'POST',
      body: JSON.stringify({ date, period, volunteerIds }),
    });
  }

  async updateShift(shiftId: string, volunteerIds: string[]): Promise<Shift> {
    return this.request<Shift>(`/shifts/${shiftId}`, {
      method: 'PUT',
      body: JSON.stringify({ volunteerIds }),
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

  async logHoursWithCode(volunteerId: string, date: string, period: number, code: string): Promise<VolunteerLog> {
    return this.request<VolunteerLog>('/volunteer-logs/log-hours', {
      method: 'POST',
      body: JSON.stringify({ volunteerId, date, period, code }),
    });
  }

  async getVolunteerLogs(volunteerId?: string): Promise<VolunteerLog[]> {
    const params = volunteerId ? `?volunteerId=${volunteerId}` : '';
    return this.request<VolunteerLog[]>(`/volunteer-logs${params}`);
  }

  async updateVolunteerLog(logId: string, updatedLogData: Partial<VolunteerLog>): Promise<VolunteerLog> {
    return this.request<VolunteerLog>(`/volunteer-logs/${logId}`, {
      method: 'PUT',
      body: JSON.stringify(updatedLogData),
    });
  }

  async deleteVolunteerLog(logId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/volunteer-logs/${logId}`, {
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

  async getTasksForVolunteer(volunteerId: string): Promise<Task[]> {
    return this.request<Task[]>(`/tasks/volunteer/${volunteerId}`);
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

  async updateTaskStatus(taskId: string, volunteerId: string, status: TaskStatus): Promise<VolunteerTaskStatus> {
    return this.request<VolunteerTaskStatus>(`/tasks/${taskId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ volunteerId, status }),
    });
  }
}

export const api = new ApiService();
