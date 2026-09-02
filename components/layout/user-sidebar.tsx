'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ShoppingCart, CreditCard, Ticket, Settings, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

const menuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/order/new', label: 'Order', icon: ShoppingCart, children: [
    { href: '/dashboard/order/new', label: 'New Order' },
    { href: '/dashboard/order/bulk', label: 'Bulk Order' },
    { href: '/dashboard/order/history', label: 'Order History' },
    { href: '/dashboard/order/refill/history', label: 'Refill History' },
    { href: '/dashboard/order/monitoring', label: 'Monitoring' },
  ] },
  { href: '/dashboard/deposit/new', label: 'Deposit', icon: CreditCard, children: [
    { href: '/dashboard/deposit/new', label: 'New Deposit' },
    { href: '/dashboard/deposit/history', label: 'Deposit History' },
  ]},
  { href: '/dashboard/ticket/list', label: 'Ticket', icon: Ticket, children: [
    { href: '/dashboard/ticket/list', label: 'My Tickets' },
    { href: '/dashboard/ticket/new', label: 'New Ticket' },
  ]},
  { href: '/dashboard/service/favorites', label: 'Favorites', icon: Star, children: [] },
  { href: '/dashboard/account/profile', label: 'Account', icon: Settings, children: [
    { href: '/dashboard/account/profile', label: 'Profile' },
    { href: '/dashboard/account/settings', label: 'Settings' },
    { href: '/dashboard/account/log/login', label: 'Login Log' },
    { href: '/dashboard/account/log/balance', label: 'Balance Log' },
  ]},
];

export function UserSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  const toggleMenu = (label: string) => {
    setExpandedMenus(prev => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <aside className={`${collapsed ? 'w-16' : 'w-64'} border-r bg-card transition-all duration-200 flex flex-col`}>
      <div className="flex items-center justify-between h-16 px-4 border-b">
        {!collapsed && <span className="font-bold text-lg">SMM Panel</span>}
        <button onClick={() => setCollapsed(!collapsed)} className="p-1.5 rounded-md hover:bg-accent">
          {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {menuItems.map(item => {
          const Icon = item.icon;
          const active = isActive(item.href);
          const hasChildren = item.children && item.children.length > 0;
          const expanded = expandedMenus[item.label];

          if (hasChildren && !collapsed) {
            return (
              <div key={item.label}>
                <button
                  onClick={() => toggleMenu(item.label)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                    active ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="flex-1 text-left">{item.label}</span>
                </button>
                {expanded && (
                  <div className="ml-8 mt-1 space-y-1">
                    {item.children.map(child => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`block px-3 py-2 rounded-md text-sm transition-colors ${
                          pathname === child.href ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                        }`}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                active ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}