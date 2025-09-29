export enum Role {
  Librarian = 'LIBRARIAN',
  Monitor = 'MONITOR',
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // Only available in mock data, not sent to client
  role: Role;
  profilePicture: string;
  backgroundColor?: string;
  themePreferences?: any; // JSON object containing theme settings
}

export interface MonitorLog {
  id: string;
  monitorId: string;
  monitorName: string;
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
  monitorIds: string[];
}

export interface Magazine {
  id: string;
  title: string;
}

export interface MagazineLog {
  id: string;
  magazineId: string;
  weekIdentifier: string; // e.g., "2024-W29"
  checkedByMonitorId: string;
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

export interface MonitorTaskStatus {
  monitorId: string;
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
  assignedTo: string[]; // Array of monitor IDs
  statuses: MonitorTaskStatus[];
  createdAt: string;
  updatedAt?: string;
}

export interface PeriodDefinition {
  period: number;
  duration: number; // in minutes
  startTime: string; // HH:mm
  endTime: string; // HH:mm
}

// --- Calendar & Events ---
export interface EventType {
  id: string;
  name: string; // e.g., Closure, Holiday, General Event, Maintenance
  color: string; // HEX color for display
  icon?: string; // optional icon key
}

export interface CalendarEvent {
  id: string;
  title: string;
  typeId: string;
  type?: EventType; // populated by backend includes
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD (inclusive)
  allDay: boolean;
  periodStart?: number; // for partial-day closures or period-based events
  periodEnd?: number;
  description?: string;
}

// --- Laptops ---
export interface LaptopCheckout {
  id: string;
  laptopId: string;
  borrowerName: string;
  ossis?: string;
  checkedOutAt: string;
  checkedInAt?: string | null;
  checkedOutBy?: { id: string; name: string };
  checkedInBy?: { id: string; name: string };
}

export interface Laptop {
  id: string;
  number: number;
  isAccessible: boolean;
  note?: string;
  createdAt?: string;
  updatedAt?: string;
  currentCheckout?: LaptopCheckout | null;
}
