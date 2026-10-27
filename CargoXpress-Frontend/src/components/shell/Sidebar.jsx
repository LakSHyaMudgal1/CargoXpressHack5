import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, X, ArrowUpRight } from 'lucide-react';
import { getNavigationGroups, getUserRoleMeta } from './NavConfig';
import Badge from '../ui/Badge';

/**
 * CargoXpress Responsive Collapsible Sidebar
 * Inspired by CE Growth Partners: structured, hairline borders, geometric mark, high contrast.
 */
export const Sidebar = ({
  user,
  isCollapsed = false,
  onToggleCollapse,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const groups = getNavigationGroups(user);
  const roleMeta = getUserRoleMeta(user);
  const homePath = user?.emailId?.endsWith('@cargoxpress.com')
    ? '/admin'
    : user?.registrationNumber !== undefined
    ? '/company'
    : user?.aadharNumber !== undefined
    ? '/trader'
    : '/';

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-canvas/80 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 bg-surface border-r border-border flex flex-col transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-20' : 'w-64'
        } ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 border-b border-border/80 px-4 flex items-center justify-between shrink-0">
          <Link
            to={homePath}
            className="flex items-center gap-3 select-none no-underline group"
            onClick={onCloseMobile}
          >
            {/* CargoXpress Geometric Mark */}
            <div className="w-8 h-8 rounded bg-surface-elevated border border-border-strong flex items-center justify-center text-signal-aqua font-mono font-bold text-xs tracking-wider shrink-0 shadow-sm group-hover:border-signal-aqua/60 transition-all">
              CX
            </div>

            {!isCollapsed && (
              <div className="flex flex-col leading-none">
                <span className="text-base font-bold tracking-tight text-ink">
                  Cargo<span className="text-signal-aqua">Xpress</span>
                </span>
                <span className="text-[10px] font-mono tracking-widest uppercase text-ink-subtle mt-0.5">
                  Freight Fleet Ops
                </span>
              </div>
            )}
          </Link>

          {/* Mobile close button */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg text-ink-subtle hover:text-ink hover:bg-white/5 lg:hidden"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Role Identity Tag (When expanded) */}
        {!isCollapsed && user && (
          <div className="px-4 py-3 border-b border-border/40 bg-surface-subtle/40 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <roleMeta.icon className="w-4 h-4 text-signal-aqua shrink-0" />
              <span className="text-xs font-mono uppercase tracking-wider text-ink-muted truncate">
                {roleMeta.label}
              </span>
            </div>
            <span className="w-1.5 h-1.5 rounded-full bg-signal-aqua animate-pulse shrink-0" />
          </div>
        )}

        {/* Navigation Groups */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {groups.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-1">
              {!isCollapsed && (
                <div className="px-3 pb-1 text-[10px] font-mono uppercase tracking-widest text-ink-subtle/80 font-semibold select-none">
                  {group.title}
                </div>
              )}

              {group.items.map((item) => (
                <NavLink
                  key={item.href}
                  to={item.href}
                  end={item.href === '/admin' || item.href === '/'}
                  onClick={onCloseMobile}
                  title={isCollapsed ? item.name : undefined}
                  className={({ isActive }) =>
                    `group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-150 select-none ${
                      isActive
                        ? 'bg-signal-aqua/10 text-signal-aqua border border-signal-aqua/20 shadow-sm'
                        : 'text-ink-secondary hover:text-ink hover:bg-white/5 border border-transparent'
                    } ${isCollapsed ? 'justify-center px-0' : ''}`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {/* Active indicator bar */}
                      {isActive && !isCollapsed && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-signal-aqua rounded-r-full" />
                      )}

                      <item.icon
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          isActive
                            ? 'text-signal-aqua'
                            : 'text-ink-subtle group-hover:text-ink'
                        }`}
                      />

                      {!isCollapsed && (
                        <span className="truncate flex-1">{item.name}</span>
                      )}

                      {!isCollapsed && item.badge && (
                        <Badge
                          variant={item.badgeVariant || 'neutral'}
                          size="sm"
                          className="shrink-0 font-mono text-[10px] uppercase py-0"
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </div>

        {/* Footer & Collapse Toggle */}
        <div className="p-3 border-t border-border/80 bg-surface-subtle/40 flex flex-col gap-2 shrink-0">
          {/* Quick External Link */}
          {!isCollapsed && (
            <Link
              to="/"
              className="flex items-center justify-between px-3 py-2 rounded-lg text-xs text-ink-subtle hover:text-ink hover:bg-white/5 transition-colors"
            >
              <span className="flex items-center gap-2">
                Public Overview
              </span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          )}

          {/* Desktop Collapse Button */}
          <div className="hidden lg:flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={onToggleCollapse}
              className={`p-2 rounded-lg text-ink-subtle hover:text-ink hover:bg-white/5 transition-colors flex items-center gap-2 text-xs w-full ${
                isCollapsed ? 'justify-center' : ''
              }`}
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <>
                  <ChevronLeft className="w-4 h-4" />
                  <span className="font-mono text-[11px] uppercase tracking-wider">Collapse Sidebar</span>
                </>
              )}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
