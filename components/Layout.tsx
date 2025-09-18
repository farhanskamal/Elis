import React, { ReactNode, useContext, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Role } from '../types';
import UserProfileModal from './UserProfileModal';
import { ThemeContext } from '../context/ThemeContext';

interface LayoutProps {
  children: ReactNode;
  activeView: string;
  setActiveView: (view: string) => void;
}

const NavLink: React.FC<{ text: string; icon: ReactNode; isActive: boolean; onClick: () => void; }> = ({ text, icon, isActive, onClick }) => (
    <li
        onClick={onClick}
        className={`flex items-center p-2 text-base font-normal rounded-lg cursor-pointer transition-colors ${
            isActive
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-900 hover:bg-gray-100'
        }`}
    >
        {icon}
        <span className="ml-3">{text}</span>
    </li>
);

const Layout: React.FC<LayoutProps> = ({ children, activeView, setActiveView }) => {
    const { user, logout } = useContext(AuthContext);
    const { theme } = useContext(ThemeContext);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

    const commonLinks = [
        { id: 'dashboard', text: 'Dashboard', icon: <HomeIcon /> },
        { id: 'schedule', text: 'Schedule', icon: <CalendarIcon /> },
        { id: 'magazines', text: 'Magazines', icon: <BookOpenIcon /> },
    ];
    
    const librarianLinks = [
        ...commonLinks,
        { id: 'tasks', text: 'Assign Tasks', icon: <ClipboardListIcon /> },
        { id: 'announcements', text: 'Announcements', icon: <MegaphoneIcon /> },
        { id: 'users', text: 'Manage Users', icon: <UsersIcon /> },
        { id: 'hours', text: 'Volunteer Hours', icon: <ClockIcon /> },
        { id: 'checkin-codes', text: 'Check-in Codes', icon: <KeyIcon /> },
        { id: 'audit', text: 'Audit Log', icon: <ClipboardListIcon /> },
    ];

    const volunteerLinks = [
        ...commonLinks,
        { id: 'my-tasks', text: 'My Tasks', icon: <ClipboardListIcon /> },
        { id: 'announcements', text: 'Announcements', icon: <MegaphoneIcon /> },
        { id: 'my-hours', text: 'My Hours', icon: <ClockIcon /> },
    ];

    const navLinks = user?.role === Role.Librarian ? librarianLinks : volunteerLinks;
    
    const handleLinkClick = (view: string) => {
        setActiveView(view);
        setIsSidebarOpen(false); // Close sidebar on mobile after navigation
    };

    const sidebar = (
        <aside className={`fixed top-0 left-0 z-40 w-64 h-screen transition-transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} sm:translate-x-0 bg-white shadow-md`}>
            <div className="h-full px-3 py-4 overflow-y-auto">
                <a href="#" className="flex items-center pl-2.5 mb-5">
                    <img src="/TaehsLibraryLogo.png" alt="Library Logo" className="h-8 w-auto" />
                </a>
                <ul className="space-y-2">
                    {navLinks.map(link => (
                       <NavLink 
                          key={link.id}
                          text={link.text}
                          icon={link.icon}
                          isActive={activeView === link.id}
                          onClick={() => handleLinkClick(link.id)}
                       />
                    ))}
                </ul>
            </div>
        </aside>
    );

  return (
    <>
      <div className="flex" style={{ backgroundColor: 'var(--color-bg)' }}>
        {sidebar}
        <div className="flex flex-col flex-1 sm:ml-64">
          <header className="flex items-center justify-between p-4 bg-white border-b border-gray-200 sm:justify-end">
              <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="sm:hidden p-2 text-gray-600 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200">
                  <MenuIcon/>
              </button>
              <div className="flex items-center">
                  <button onClick={() => setIsProfileModalOpen(true)} className="flex items-center text-left rounded-md p-1 hover:bg-gray-100">
                      <span className="mr-3 font-medium">{user?.name}</span>
                      <img className="w-8 h-8 rounded-full" src={user?.profilePicture} alt="user photo" />
                  </button>
                  <button onClick={logout} className="ml-4 text-sm font-medium hover:underline" style={{ color: 'var(--color-primary)' }}>
                      Logout
                  </button>
              </div>
          </header>
          <main className="flex-1 p-4 md:p-6 lg:p-8">
              {children}
          </main>
        </div>
      </div>
      {isProfileModalOpen && user && (
        <UserProfileModal 
            user={user}
            onClose={() => setIsProfileModalOpen(false)}
        />
      )}
    </>
  );
};

export default Layout;


// SVG Icons
const HomeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
const CalendarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
const BookOpenIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>;
const ClockIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const MenuIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>;
const UsersIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.122-1.28-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.653.122-1.28.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;
const MegaphoneIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.136A1.76 1.76 0 015.882 11H1v-2h4.882a1.76 1.76 0 011.649 1.231l2.147 6.136A1.76 1.76 0 0111 5.882zM19 12a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
const ClipboardListIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>;
const KeyIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4v-1.258l-2.293-2.293a1 1 0 010-1.414l2.586-2.586a1 1 0 011.414 0L9 13.258V12h2.743L17.5 6.257A6 6 0 0115 7z" /></svg>;
