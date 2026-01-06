'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { ChevronDown, LogOut, User, Settings, Ticket } from 'lucide-react';
import Link from 'next/link';

export function UserMenu() {
  const { user, logout, isLoading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (isLoading) {
    return (
      <div className="w-10 h-10 rounded-full bg-[var(--bg-tertiary)] animate-pulse" />
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 pr-3 rounded-full bg-[var(--bg-tertiary)] hover:bg-[var(--bg-elevated)] transition-colors border border-[var(--border-primary)] hover:border-[var(--border-hover)]"
      >
        <img
          src={user.avatar}
          alt={user.username}
          className="w-8 h-8 rounded-full"
        />
        <span className="text-sm font-medium text-[var(--text-primary)]">
          {user.username}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] shadow-lg animate-slide-down overflow-hidden z-50">
          {/* User info header */}
          <div className="p-4 border-b border-[var(--border-primary)]">
            <div className="flex items-center gap-3">
              <img
                src={user.avatar}
                alt={user.username}
                className="w-10 h-10 rounded-full"
              />
              <div>
                <p className="font-semibold text-[var(--text-primary)]">
                  {user.username}
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  {user.serverCount} servers connected
                </p>
              </div>
            </div>
          </div>

          {/* Menu items */}
          <div className="p-2">
            <Link
              href="/support/ticket"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
            >
              <Ticket className="w-4 h-4" />
              <span>My Tickets</span>
            </Link>
            <button
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors w-full"
              onClick={() => setIsOpen(false)}
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </button>
            <button
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors w-full"
              onClick={() => setIsOpen(false)}
            >
              <User className="w-4 h-4" />
              <span>Profile</span>
            </button>
          </div>

          {/* Logout */}
          <div className="p-2 border-t border-[var(--border-primary)]">
            <button
              onClick={() => {
                logout();
                setIsOpen(false);
              }}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-[var(--accent-danger)] hover:bg-[var(--accent-danger)]/10 transition-colors w-full"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
