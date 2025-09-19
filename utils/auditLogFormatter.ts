export interface AuditLogEntry {
  id: string;
  actorId: string;
  targetUserId?: string;
  action: string;
  details?: string;
  createdAt: string;
  actor: { id: string; name: string; email: string };
  targetUser?: { id: string; name: string; email: string };
}

export interface FormattedAuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  target: string;
  message: string;
  actionType: 'user' | 'role' | 'system' | 'data';
  icon: string;
}

export const formatAuditLogEntry = (entry: AuditLogEntry): FormattedAuditEntry => {
  const timestamp = new Date(entry.createdAt).toLocaleString();
  const actor = `${entry.actor?.name || 'Unknown'} (${entry.actor?.email || 'Unknown'})`;
  const target = entry.targetUser 
    ? `${entry.targetUser.name} (${entry.targetUser.email})` 
    : '-';

  let message = '';
  let actionType: 'user' | 'role' | 'system' | 'data' = 'system';
  let icon = '🔍';
  let actionDisplay = entry.action;

  try {
    const details = entry.details ? JSON.parse(entry.details) : {};

    switch (entry.action) {
      case 'USER_ROLE_CHANGED':
        actionType = 'role';
        icon = '👤';
        actionDisplay = 'Role Changed';
        if (details.beforeRole && details.afterRole) {
          const beforeRole = details.beforeRole === 'MONITOR' ? 'Monitor' : 
                           details.beforeRole === 'LIBRARIAN' ? 'Librarian' : details.beforeRole;
          const afterRole = details.afterRole === 'MONITOR' ? 'Monitor' : 
                          details.afterRole === 'LIBRARIAN' ? 'Librarian' : details.afterRole;
          message = `Changed role from ${beforeRole} to ${afterRole}`;
        } else {
          message = 'Role was modified';
        }
        break;

      case 'USER_UPDATED':
        actionType = 'user';
        icon = '✏️';
        actionDisplay = 'Profile Updated';
        const updatedFields = [];
        
        if (details.name) updatedFields.push('name');
        if (details.email) updatedFields.push('email');
        if (details.profilePicture !== undefined) updatedFields.push('profile picture');
        if (details.backgroundColor !== undefined) updatedFields.push('theme color');
        
        if (updatedFields.length > 0) {
          message = `Updated ${updatedFields.join(', ')}`;
        } else {
          message = 'Profile information was updated';
        }
        break;

      case 'USER_CREATED':
        actionType = 'user';
        icon = '➕';
        actionDisplay = 'User Created';
        message = details.role ? `Created new ${details.role.toLowerCase()} account` : 'Created new user account';
        break;

      case 'USER_DELETED':
        actionType = 'user';
        icon = '🗑️';
        actionDisplay = 'User Deleted';
        message = 'User account was deleted';
        break;

      case 'LOGIN':
        actionType = 'system';
        icon = '🔑';
        actionDisplay = 'Login';
        message = 'Logged into the system';
        break;

      case 'LOGOUT':
        actionType = 'system';
        icon = '🚪';
        actionDisplay = 'Logout';
        message = 'Logged out of the system';
        break;

      case 'PASSWORD_CHANGED':
        actionType = 'user';
        icon = '🔒';
        actionDisplay = 'Password Changed';
        message = 'Changed account password';
        break;

      case 'SHIFT_CREATED':
        actionType = 'data';
        icon = '📅';
        actionDisplay = 'Shift Created';
        message = details.date && details.period ? 
          `Created shift for ${details.date}, Period ${details.period}` :
          'Created a new shift';
        break;

      case 'SHIFT_UPDATED':
        actionType = 'data';
        icon = '📝';
        actionDisplay = 'Shift Updated';
        message = 'Modified shift assignments';
        break;

      case 'SHIFT_DELETED':
        actionType = 'data';
        icon = '❌';
        actionDisplay = 'Shift Deleted';
        message = 'Deleted a shift';
        break;

      case 'HOURS_ADDED_BY_LIBRARIAN':
        actionType = 'data';
        icon = '⏰';
        actionDisplay = 'Hours Added';
        message = details.date && details.period && details.durationMinutes ? 
          `Added ${details.durationMinutes} minutes for ${details.date}, Period ${details.period}` :
          'Added monitor hours manually';
        break;

      default:
        // Fallback for unknown actions
        message = details && Object.keys(details).length > 0 ? 
          `Action performed with data: ${Object.keys(details).join(', ')}` :
          'Action was performed';
        break;
    }
  } catch (error) {
    // If JSON parsing fails, show a generic message
    message = entry.details || 'Action was performed';
  }

  return {
    id: entry.id,
    timestamp,
    actor,
    action: actionDisplay,
    target,
    message,
    actionType,
    icon
  };
};

export const getActionTypeColor = (actionType: 'user' | 'role' | 'system' | 'data'): string => {
  switch (actionType) {
    case 'user':
      return 'text-blue-600 bg-blue-50';
    case 'role':
      return 'text-purple-600 bg-purple-50';
    case 'system':
      return 'text-green-600 bg-green-50';
    case 'data':
      return 'text-orange-600 bg-orange-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
};