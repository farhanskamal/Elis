import cron from 'node-cron';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

const BACKUP_DIR = '/app/backups';
const RETENTION_DAYS = 30;

// Ensure backup directory exists
function ensureBackupDirectory() {
    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
        console.log(`📁 Created backup directory: ${BACKUP_DIR}`);
    }
}

// Generate timestamp for backup filename
function getBackupFilename(): string {
    const now = new Date();
    const timestamp = now.toISOString()
        .replace(/[-:]/g, '')
        .replace('T', '_')
        .split('.')[0];
    return `backup_${timestamp}.sql`;
}

// Perform database backup
async function performBackup(): Promise<void> {
    try {
        ensureBackupDirectory();

        const filename = getBackupFilename();
        const filepath = path.join(BACKUP_DIR, filename);

        console.log(`🔄 Starting automatic backup: ${filename}`);

        // Use pg_dump to export database
        const command = `pg_dump -h db -U postgres -d library_volunteer_hub > ${filepath}`;
        await execAsync(command, {
            env: { ...process.env, PGPASSWORD: 'postgres' }
        });

        console.log(`✅ Backup completed: ${filename}`);

        // Clean up old backups
        await cleanupOldBackups();
    } catch (error) {
        console.error('❌ Backup failed:', error);
    }
}

// Remove backups older than retention period
async function cleanupOldBackups(): Promise<void> {
    try {
        const files = fs.readdirSync(BACKUP_DIR);
        const now = Date.now();
        const retentionMs = RETENTION_DAYS * 24 * 60 * 60 * 1000;

        let deletedCount = 0;

        for (const file of files) {
            if (!file.startsWith('backup_') || !file.endsWith('.sql')) {
                continue;
            }

            const filepath = path.join(BACKUP_DIR, file);
            const stats = fs.statSync(filepath);
            const fileAge = now - stats.mtimeMs;

            if (fileAge > retentionMs) {
                fs.unlinkSync(filepath);
                deletedCount++;
                console.log(`🗑️  Deleted old backup: ${file}`);
            }
        }

        if (deletedCount > 0) {
            console.log(`🧹 Cleaned up ${deletedCount} old backup(s)`);
        }
    } catch (error) {
        console.error('⚠️  Failed to cleanup old backups:', error);
    }
}

// Initialize backup scheduler
export function startBackupScheduler(): void {
    // Schedule backup at 5pm EST (17:00) every day
    // EST is UTC-5, so when it's 5pm EST, it's 10pm UTC (22:00)
    // However, cron runs in container's timezone, so we use 17:00 and set TZ env var
    cron.schedule('0 17 * * *', async () => {
        console.log('⏰ Scheduled backup triggered at 5pm EST');
        await performBackup();
    }, {
        timezone: 'America/New_York' // EST/EDT timezone
    });

    console.log('📅 Backup scheduler started - Daily backups at 5pm EST');
    console.log(`💾 Backups stored in: ${BACKUP_DIR}`);
    console.log(`⏳ Retention: ${RETENTION_DAYS} days`);
}

// Manual backup function (can be called from API endpoint if needed)
export async function manualBackup(): Promise<string> {
    await performBackup();
    return getBackupFilename();
}
