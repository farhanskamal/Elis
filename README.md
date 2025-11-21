# Library Monitor Hub

**A complete solution for managing library volunteers, shifts, and tasks.**

This application helps libraries manage their volunteer workforce with features like:
- **Shift Scheduling**: Organize volunteer shifts and track attendance.
- **Task Management**: Assign and track tasks for volunteers.
- **Time Tracking**: Automated check-in/check-out and hour logging.
- **Announcements**: Communicate important updates to the team.
- **Role-Based Access**: Separate dashboards for Librarians (Admins) and Volunteers.

---

## 🚀 Quick Start (Recommended)

The easiest way to run this application is using **Docker**. This makes the app "self-dependable" and portable to any computer.

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop) installed and running.

### How to Run
1.  Double-click **`start-docker.bat`** in the project folder.
2.  Wait for the setup to complete.
3.  Open your browser to: **http://localhost**

That's it! The app is now running.

---

## 📚 Documentation

We have detailed guides for different needs:

- **[User Manual](USER_MANUAL.md)**  
  *For Librarians and Volunteers.*  
  Learn how to use the application, manage shifts, and track hours.

- **[Docker Guide](DOCKER_GUIDE.md)**  
  *For System Administrators.*  
  Learn how to manage the containerized application, backups, and updates.

- **[Technical Guide](TECHNICAL_GUIDE.md)**  
  *For Developers.*  
  Deep dive into the code architecture, database schema, and development workflow.

---

## 🌍 Remote Access

This application supports remote access via **Cloudflare Tunnel**.
If configured, you can access the app securely from anywhere at:
**https://letstestit.me** (or your configured domain)

See the [Docker Guide](DOCKER_GUIDE.md) for setup instructions.

---

## 🛠️ Management Tools

Inside the `scripts/` folder, you will find tools to manage your data:
- **`db-export.bat`**: Backup your database to a file.
- **`db-import.bat`**: Restore your database from a backup.
