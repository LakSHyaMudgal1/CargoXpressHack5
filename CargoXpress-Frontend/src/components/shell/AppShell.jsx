import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import { BASE_URL } from '../../utils/constants';
import { removeUser } from '../../utils/userSlice';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

/**
 * CargoXpress AppShell
 * Professional fleet operations shell with collapsible sidebar, topbar, and responsive drawer.
 */
export const AppShell = ({ children }) => {
  const user = useSelector((store) => store.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  // Collapsed state persisted in localStorage
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem('cx_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('cx_sidebar_collapsed', String(next));
      } catch (err) {
        console.warn('Could not persist sidebar collapse state', err);
      }
      return next;
    });
  };

  const handleLogout = async () => {
    try {
      await axios.post(BASE_URL + '/logout', {}, { withCredentials: true });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      dispatch(removeUser());
      navigate('/login');
    }
  };

  // If on landing page (/) and user is not logged in, render naked or landing layout
  const isLandingPage = location.pathname === '/';
  if (isLandingPage && !user) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-canvas text-ink flex">
      {/* Sidebar Navigation */}
      <Sidebar
        user={user}
        isCollapsed={isCollapsed}
        onToggleCollapse={handleToggleCollapse}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
          isCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        {/* Topbar */}
        <Topbar
          user={user}
          onOpenMobile={() => setIsMobileOpen(true)}
          onLogout={handleLogout}
        />

        {/* Page Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppShell;
