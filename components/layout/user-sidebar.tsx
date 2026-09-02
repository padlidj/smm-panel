'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ShoppingCart, CreditCard, Ticket, Settings, Star, ChevronLeft, ChevronRight, Flame, FileBarChart, Trophy } from 'lucide-react';
import { useState } from 'react';

const menuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/order/new', label: 'Order', icon: ShoppingCart, children: [
    { href: '/dashboard/order/new', label: 'New Order' },
    { href: '/dashboard/order/bulk', label: 'Bulk Order' },
    { href: '/dashboard/order/history', label: 'Order History' },
    { href: '/dashboard/order/report', label: 'Order Report' },
    { href: '/dashboard/order/refill/history', label: 'Refill History' },
    { href: '/dashboard/order/monitoring', label: 'Monitoring' },
  ] },
  { href: '/dashboard/deposit/new', label: 'Deposit', icon: CreditCard, children: [
    { href: '/dashboard/deposit/new', label: 'New Deposit' },
    { href: '/dashboard/deposit/history', label: 'Deposit History' },
    { href: '/dashboard/deposit/report', label: 'Deposit Report' },
  ]},
  { href: '/dashboard/ticket/list', label: 'Ticket', icon: Ticket, children: [
    { href: '/dashboard/ticket/list', label: 'My Tickets' },
    { href: '/dashboard/ticket/new', label: 'New Ticket' },
  ]},
  { href: '/dashboard/service/favorites', label: 'Favorites', icon: Star },
  { href: '/dashboard/account/profile', label: 'Account', icon: Settings, children: [
    { href: '/dashboard/account/profile', label: 'Profile' },
    { href: '/dashboard/account/settings', label: 'Settings' },
    { href: '/dashboard/account/log/login', label: 'Login Log' },
    { href: '/dashboard/account/log/balance', label: 'Balance Log' },
    { href: '/dashboard/account/log/balance/report', label: 'Balance Report' },
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
    <aside className={`${collapsed ? 'w-16' : 'w-64'} bg-sidebar text-sidebar-fg border-r border-border/50 flex flex-col transition-all duration-300 shadow-xl`}>
      <div className="flex items-center justify-between h-16 px-4 border-b border-border/40">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/60 shadow-lg shadow-primary/30">
              <Flame className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight">KuyGas</span>
          </div>
        )}
        <button onClick={() => setCollapsed(!collapsed)} className="p-1.5 rounded-md hover:bg-sidebar-hover text-sidebar-fg/60">
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
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    active ? 'bg-primary/20 text-primary font-medium' : 'text-sidebar-fg/70 hover:bg-sidebar-hover hover:text-sidebar-fg'
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="flex-1 text-left">{item.label}</span>
                  <ChevronRight className={`h-4 w-4 transition-transform ${expanded ? 'rotate-90' : ''}`} />
                </button>
                {expanded && (
                  <div className="ml-8 mt-1 space-y-1">
                    {item.children.map(child => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                          pathname === child.href ? 'bg-primary/20 text-primary font-medium' : 'text-sidebar-fg/60 hover:bg-sidebar-hover hover:text-sidebar-fg'
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
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active ? 'bg-primary/20 text-primary font-medium shadow-sm' : 'text-sidebar-fg/70 hover:bg-sidebar-hover hover:text-sidebar-fg'
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-border/40">
        <div className="rounded-lg bg-sidebar-hover/50 p-3 text-xs text-sidebar-fg/50">
          {!collapsed && <p>KuyGas Panel v1.0</p>}
        </div>
      </div>
    </aside>
  );
}