import React from 'react';
import { Menu, LogOut, User, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Dropdown, DropdownItem, DropdownSeparator } from '../ui/Dropdown';
import Badge from '../ui/Badge';
import { getUserRoleMeta } from './NavConfig';

/**
 * CargoXpress Topbar Component
 * Minimal editorial header with breadcrumbs, role badge, system health, and profile dropdown.
 */
export const Topbar = ({
  user,
  onOpenMobile,
  onLogout,
}) => {
  const roleMeta = getUserRoleMeta(user);

  return (
    <header className="sticky top-0 z-30 h-16 bg-surface/90 backdrop-blur-md border-b border-border px-4 sm:px-6 flex items-center justify-between gap-4">
      {/* Left: Mobile trigger & breadcrumb / context */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobile}
          className="p-2 rounded-lg text-ink-subtle hover:text-ink hover:bg-white/5 lg:hidden shrink-0"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Live System Indicator */}
        <div className="hidden sm:flex items-center gap-2 pl-1 text-xs text-ink-subtle select-none">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-signal-aqua opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-signal-aqua" />
          </span>
          <span className="font-mono text-[11px] tracking-wider uppercase text-ink-muted hidden md:inline">
            Load Optimization Online
          </span>
        </div>
      </div>

      {/* Right: Notifications, Role, User Profile */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Role Pill Badge */}
        {user && (
          <div className="hidden sm:block">
            <Badge variant={roleMeta.variant} size="sm" className="font-mono text-[11px] uppercase tracking-wider">
              {roleMeta.label}
            </Badge>
          </div>
        )}

        {/* User Dropdown */}
        {user ? (
          <Dropdown
            align="right"
            trigger={
              <button
                type="button"
                className="flex items-center gap-2.5 p-1.5 pl-2.5 rounded-xl border border-border hover:border-border-muted bg-surface-elevated/80 hover:bg-surface-elevated transition-all select-none"
              >
                <div className="w-7 h-7 rounded-lg overflow-hidden bg-white/10 ring-1 ring-border shrink-0 flex items-center justify-center text-xs font-bold text-signal-aqua">
                  {user.photoUrl ? (
                    <img
                      src={user.photoUrl}
                      alt={user.name || 'User'}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <span>{(user.name || 'U').charAt(0).toUpperCase()}</span>
                  )}
                </div>

                <div className="hidden md:flex flex-col text-left leading-tight">
                  <span className="text-xs font-semibold text-ink max-w-[120px] truncate">
                    {user.name || user.emailId}
                  </span>
                  <span className="text-[10px] font-mono text-ink-subtle truncate max-w-[120px]">
                    {user.emailId}
                  </span>
                </div>

                <ChevronDown className="w-3.5 h-3.5 text-ink-subtle shrink-0 hidden sm:block" />
              </button>
            }
          >
            {({ close }) => (
              <div className="py-1">
                <div className="px-3.5 py-2 border-b border-border/60">
                  <p className="text-xs font-semibold text-ink truncate">{user.name}</p>
                  <p className="text-[11px] font-mono text-ink-subtle truncate">{user.emailId}</p>
                </div>

                <DropdownItem
                  as={Link}
                  to="/profile"
                  icon={User}
                  onClick={close}
                >
                  My Profile
                </DropdownItem>

                <DropdownSeparator />

                <DropdownItem
                  icon={LogOut}
                  destructive
                  onClick={() => {
                    close();
                    onLogout?.();
                  }}
                >
                  Sign Out
                </DropdownItem>
              </div>
            )}
          </Dropdown>
        ) : (
          <Link
            to="/login"
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-signal-emerald text-canvas hover:bg-emerald-400 transition-colors"
          >
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
};

export default Topbar;
