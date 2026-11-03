import { useState, useEffect } from 'react';
import Navbar from './Navbar';
import { Outlet, useLocation } from 'react-router-dom';
import FooterSec from './Footer';
import ParticleBackground from './ParticleBackground';
import axios from 'axios';
import { useDispatch, useSelector } from 'react-redux';
import { addUser } from '../utils/userSlice';
import { BASE_URL } from '../utils/constants';
import AppShell from '../components/shell/AppShell';

const Body = () => {
  const dispatch = useDispatch();
  const user = useSelector((store) => store.user);
  const location = useLocation();
  const [authChecking, setAuthChecking] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchUser = async () => {
      try {
        const res = await axios.get(BASE_URL + '/me', { withCredentials: true });
        if (isMounted) {
          dispatch(addUser(res.data));
        }
      } catch {
        // Not logged in — leave store as null
      } finally {
        if (isMounted) {
          setAuthChecking(false);
        }
      }
    };
    fetchUser();
    return () => {
      isMounted = false;
    };
  }, [dispatch]);

  const isLandingPage = location.pathname === '/';

  // Prevent UI flash on direct refresh of operational routes
  if (authChecking && !isLandingPage) {
    return (
      <div className="min-h-screen bg-canvas text-ink flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4 text-center animate-in fade-in duration-200">
          <div className="w-12 h-12 rounded-xl bg-surface-elevated border border-border-strong flex items-center justify-center text-signal-aqua font-mono font-bold text-sm tracking-wider shadow-sm ring-1 ring-signal-aqua/20">
            CX
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-mono uppercase tracking-widest text-ink-muted">
              Cargo<span className="text-signal-aqua">Xpress</span>
            </span>
            <span className="text-[11px] text-ink-subtle font-mono">
              Synchronizing Fleet Session...
            </span>
          </div>
        </div>
      </div>
    );
  }

  // If user is authenticated and navigating an operational dashboard route, wrap in AppShell
  if (user && !isLandingPage) {
    return (
      <AppShell>
        <Outlet />
      </AppShell>
    );
  }

  return (
    <div className="relative min-h-screen bg-canvas text-ink">
      {/* Particle canvas — fixed, behind everything */}
      <ParticleBackground />

      {/* Page radial glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: 0,
          background:
            'radial-gradient(ellipse 80% 50% at 50% -5%, rgba(var(--color-primary-rgb), 0.08) 0%, transparent 70%)',
        }}
      />

      {/* Actual content — sits above the canvas */}
      <div className="relative" style={{ zIndex: 1 }}>
        <Navbar />
        <Outlet />
        <FooterSec />
      </div>
    </div>
  );
};

export default Body;
