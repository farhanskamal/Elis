export enum Role {
  Librarian = 'LIBRARIAN',
  Volunteer = 'VOLUNTEER',
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // Only available in mock data, not sent to client
  role: Role;
  profilePicture: string;
  backgroundColor?: string;
}

export interface VolunteerLog {
  id: string;
  volunteerId: string;
  volunteerName: string;
  date: string;
  period: number;
  checkIn: string;
  checkOut: string | null;
  durationMinutes: number | null;
}

export interface Shift {
  id: string;
  date: string; // YYYY-MM-DD
  period: number; // 1-9
  volunteerIds: string[];
}

export interface Magazine {
  id: string;
  title: string;
}

export interface MagazineLog {
  id: string;
  magazineId: string;
  weekIdentifier: string; // e.g., "2024-W29"
  checkedByVolunteerId: string;
  timestamp: string; // ISO 8601 format
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string; // ISO 8601 format
  updatedAt?: string; // ISO 8601 format for edits
  imageUrl?: string;
}

export enum TaskPriority {
  Low = 'LOW',
  Medium = 'MEDIUM',
  High = 'HIGH',
}

export enum TaskStatus {
  Pending = 'PENDING',
  Completed = 'COMPLETED',
  CannotComplete = 'CANNOT_COMPLETE'
}

export interface VolunteerTaskStatus {
  volunteerId: string;
  status: TaskStatus;
  completedAt?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  dueDate: string; // YYYY-MM-DD
  dueTime?: string; // HH:mm
  assignedTo: string[]; // Array of volunteer IDs
  statuses: VolunteerTaskStatus[];
  createdAt: string;
  updatedAt?: string;
}

export interface PeriodDefinition {
  period: number;
  duration: number; // in minutes
  startTime: string; // HH:mm
  endTime: string; // HH:mm
}
