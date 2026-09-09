'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, ShoppingCart, Package, CreditCard, Ticket, Shield, Settings, FileText, Logs, ChevronLeft, ChevronRight, Flame, History, Star, PlusCircle, Menu, X } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';

const menuItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/user/list', label: 'User', icon: Users },
  { href: '/admin/order/list', label: 'Order', icon: ShoppingCart, children: [
    { href: '/admin/order/list', label: 'Orders' },
    { href: '/admin/order/refill/list', label: 'Refills' },
    { href: '/admin/order/report', label: 'Laporan Order' },
  ]},
  { href: '/admin/service/category/list', label: 'Service', icon: Package, children: [
    { href: '/admin/service/category/list', label: 'Categories' },
    { href: '/admin/service/provider/list', label: 'Providers' },
    { href: '/admin/service/list', label: 'Services' },
    { href: '/admin/service/get', label: 'Ambil Service' },
    { href: '/admin/service/log', label: 'Service Log' },
    { href: '/admin/service/custom-price/list', label: 'Custom Price' },
  ]},
  { href: '/admin/deposit/list', label: 'Deposit', icon: CreditCard, children: [
    { href: '/admin/deposit/list', label: 'Deposits' },
    { href: '/admin/deposit/method/list', label: 'Methods' },
    { href: '/admin/deposit/report', label: 'Laporan Deposit' },
  ]},
  { href: '/admin/ticket/list', label: 'Ticket', icon: Ticket },
  { href: '/admin/admin/list', label: 'Admin', icon: Shield },
  { href: '/admin/settings/website', label: 'Settings', icon: Settings, children: [
    { href: '/admin/settings/website', label: 'Website' },
    { href: '/admin/settings/test-email', label: 'Test Email' },
  ]},
  { href: '/admin/log/user/login', label: 'Logs', icon: Logs, children: [
    { href: '/admin/log/user/login', label: 'User Login' },
    { href: '/admin/log/user/balance', label: 'User Balance' },
    { href: '/admin/log/user/balance/report', label: 'Balance Report' },
    { href: '/admin/log/user/register', label: 'User Register' },
    { href: '/admin/log/admin/login', label: 'Admin Login' },
  ]},
  { href: '/admin/page/notification', label: 'Pages', icon: FileText },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false); const [isMobile, setIsMobile] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({ Service: true, Order: true });
  const asideRef = useRef<HTMLElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  // Native inert when closed on mobile prevents keyboard focus on offscreen links
  useEffect(() => {
    const el = asideRef.current;
    if (!el) return;
    if (!mobileOpen) {
      el.setAttribute('inert', '');
    } else {
      el.removeAttribute('inert');
    }
    return () => el.removeAttribute('inert');
  }, [mobileOpen]);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    const on = () => { setIsMobile(mq.matches); if (mq.matches) setCollapsed(false); else setMobileOpen(false); };
    on(); mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  const toggleMenu = (label: string) => {
    setExpandedMenus(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  // Focus trap + Escape for mobile drawer
  useEffect(() => {
    if (!mobileOpen || !asideRef.current) return;
    const aside = asideRef.current;
    previousFocus.current = document.activeElement as HTMLElement;
    const isVisible = (el: HTMLElement) => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent !== null;
    };
    const getVisibleFocusable = () => Array.from(aside.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')).filter(isVisible);
    const focusable = getVisibleFocusable();
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    // Wait for transition to complete before focusing
    const focusTimer = setTimeout(() => first?.focus(), 300);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeMobile();
        return;
      }
      if (e.key !== 'Tab') return;
      const visibleFocusable = getVisibleFocusable();
      const currentFirst = visibleFocusable[0];
      const currentLast = visibleFocusable[visibleFocusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === currentFirst) {
          e.preventDefault();
          currentLast?.focus();
        }
      } else {
        if (document.activeElement === currentLast) {
          e.preventDefault();
          currentFirst?.focus();
        }
      }
    };

    aside.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      clearTimeout(focusTimer);
      aside.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
      previousFocus.current?.focus();
    };
  }, [mobileOpen, closeMobile]);

  return (
    <>
      {/* Mobile hamburger - fixed, only on small screens */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle menu"
        aria-expanded={mobileOpen}
        aria-controls="admin-sidebar"
        className="lg:hidden fixed top-3 left-3 z-50 flex h-10 w-10 items-center justify-center rounded-md bg-card border border-border shadow-md text-foreground"
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/60" onClick={closeMobile} aria-hidden="true" />
      )}

      <aside
        id="admin-sidebar"
        ref={asideRef}
        role={isMobile && mobileOpen ? 'dialog' : undefined}
        aria-modal={isMobile && mobileOpen ? 'true' : undefined}
        aria-label="Main navigation"
        aria-hidden={isMobile && !mobileOpen ? true : undefined}
        className={`${collapsed ? 'lg:w-16' : 'lg:w-64'} w-64 bg-sidebar text-sidebar-fg border-r border-border/50 flex flex-col transition-all duration-300 shadow-xl
        max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:z-40
        max-lg:transition-transform max-lg:duration-300
        ${mobileOpen ? 'max-lg:translate-x-0' : 'max-lg:-translate-x-full'}`}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-border/40">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/60 shadow-lg shadow-primary/30">
                <Flame className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg tracking-tight">KuyGas</span>
            </div>
          )}
          <button
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="p-1.5 rounded-md hover:bg-sidebar-hover text-sidebar-fg/60 max-lg:hidden"
        >
            {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
          <button onClick={closeMobile} className="p-1.5 rounded-md hover:bg-sidebar-hover text-sidebar-fg/60 lg:hidden" aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin">
          {menuItems.map(item => {
            const Icon = item.icon;
            const active = isActive(item.href);
            const hasChildren = item.children && item.children.length > 0;
            const expanded = expandedMenus[item.label];

            if (hasChildren && (!collapsed || isMobile)) {
              return (
                <div key={item.label}>
                  <button
                    onClick={() => toggleMenu(item.label)}
                    aria-expanded={expanded}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                      active ? 'bg-primary/20 text-primary font-medium' : 'text-sidebar-fg/70 hover:bg-sidebar-hover hover:text-sidebar-fg'
                    }`}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span className="flex-1 text-left">{item.label}</span>
                    <ChevronRight className={`h-4 w-4 transition-transform ${expanded ? 'rotate-90' : ''}`} />
                  </button>
                  {expanded && (
                    <div className="ml-8 mt-1 space-y-1" role="menu">
                      {item.children.map(child => (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={closeMobile}
                          role="menuitem"
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
                onClick={closeMobile}
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
    </>
  );
}