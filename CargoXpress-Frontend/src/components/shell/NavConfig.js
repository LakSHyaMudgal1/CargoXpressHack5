import {
  LayoutDashboard,
  GitMerge,
  CalendarClock,
  Boxes,
  Truck,
  MapPin,
  PackagePlus,
  User,
  ShieldCheck,
  Building2,
  Briefcase
} from 'lucide-react';

/**
 * Returns role-tailored navigation items for the application shell.
 */
export const getNavigationGroups = (user) => {
  if (!user) return [];

  const isAdmin = user.emailId?.endsWith('@cargoxpress.com');
  const isTrader = !isAdmin && user.aadharNumber !== undefined;
  const isCompany = !isAdmin && user.registrationNumber !== undefined;

  if (isAdmin) {
    return [
      {
        title: 'Dispatch Control',
        items: [
          {
            name: 'Dashboard Overview',
            href: '/admin',
            icon: LayoutDashboard,
          },
        ],
      },
      {
        title: 'Merge Optimization',
        items: [
          {
            name: 'Mergeable Trucks',
            href: '/mergeable',
            icon: GitMerge,
            badge: 'AI Merge',
            badgeVariant: 'aqua',
          },
          {
            name: 'Approved Schedules',
            href: '/mergedSchedule',
            icon: CalendarClock,
          },
          {
            name: 'Trader Merge Pool',
            href: '/mergeableTraders',
            icon: Boxes,
          },
        ],
      },
      {
        title: 'Account',
        items: [
          {
            name: 'System Profile',
            href: '/profile',
            icon: User,
          },
        ],
      },
    ];
  }

  if (isCompany) {
    return [
      {
        title: 'Fleet Operations',
        items: [
          {
            name: 'Fleet Dashboard',
            href: '/company',
            icon: LayoutDashboard,
          },
          {
            name: 'Register Truck',
            href: '/truck',
            icon: Truck,
          },
          {
            name: 'Create Route',
            href: '/route',
            icon: MapPin,
          },
        ],
      },
      {
        title: 'Account',
        items: [
          {
            name: 'Company Profile',
            href: '/profile',
            icon: User,
          },
        ],
      },
    ];
  }

  if (isTrader) {
    return [
      {
        title: 'Shipments',
        items: [
          {
            name: 'Consignments Dashboard',
            href: '/trader',
            icon: LayoutDashboard,
          },
          {
            name: 'New Shipment Request',
            href: '/traderRequest',
            icon: PackagePlus,
            badge: 'New',
            badgeVariant: 'emerald',
          },
        ],
      },
      {
        title: 'Account',
        items: [
          {
            name: 'Trader Profile',
            href: '/profile',
            icon: User,
          },
        ],
      },
    ];
  }

  // Fallback profile
  return [
    {
      title: 'Navigation',
      items: [
        {
          name: 'Profile',
          href: '/profile',
          icon: User,
        },
      ],
    },
  ];
};

/**
 * Returns role metadata and badge info
 */
export const getUserRoleMeta = (user) => {
  if (!user) return { role: 'Guest', label: 'Guest User', icon: User, variant: 'neutral' };

  if (user.emailId?.endsWith('@cargoxpress.com')) {
    return {
      role: 'admin',
      label: 'System Dispatcher',
      icon: ShieldCheck,
      variant: 'purple',
    };
  }
  if (user.registrationNumber !== undefined) {
    return {
      role: 'company',
      label: 'Transport Carrier',
      icon: Building2,
      variant: 'aqua',
    };
  }
  if (user.aadharNumber !== undefined) {
    return {
      role: 'trader',
      label: 'Consignor Trader',
      icon: Briefcase,
      variant: 'emerald',
    };
  }
  return { role: 'user', label: 'Authenticated Member', icon: User, variant: 'neutral' };
};
