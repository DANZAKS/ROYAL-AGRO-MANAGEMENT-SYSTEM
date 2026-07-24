import React, { useState } from 'react';
import { Sprout, Shield, User, Key, X, Lock } from 'lucide-react';
import { User as UserType } from '../../types';

interface LoginModalProps {
  users: UserType[];
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: UserType) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  users,
  isOpen,
  onClose,
  onLogin
}) => {
  const [selectedUsername, setSelectedUsername] = useState(users[0]?.username || '');
  const [password, setPassword] = useState('password');

  if (!isOpen) return null;

  const handleCustomLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const found = users.find((u) => u.username === selectedUsername);
    if (found) {
      onLogin(found);
      onClose();
    } else {
      alert('Invalid username or password!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 animate-in fade-in zoom-in-95">
        {/* Brand Header */}
        <div className="text-center pb-4 border-b border-slate-100">
          <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-900/30">
            <Sprout className="w-7 h-7 text-amber-300" />
          </div>
          <h2 className="text-base font-extrabold text-slate-900 mt-2">
            ROYAL AGRO MANAGEMENT SYSTEM
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Select a demo account role or enter credentials to sign in.
          </p>
        </div>

        {/* Quick Switcher Role Grid */}
        <div className="mt-4 space-y-2">
          <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
            Quick Actor Role Switcher
          </label>
          <div className="grid grid-cols-2 gap-2">
            {users.map((u) => (
              <button
                key={u.id}
                onClick={() => {
                  onLogin(u);
                  onClose();
                }}
                className="p-3 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-xl text-left transition-all group"
              >
                <div className="flex items-center gap-2">
                  <img
                    src={u.avatarUrl}
                    alt={u.name}
                    className="w-7 h-7 rounded-full object-cover shrink-0"
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-800">
                      {u.name}
                    </p>
                    <span className="text-[9px] font-bold text-amber-700 block">
                      {u.role.replace('_', ' ')}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 mt-1 truncate">📍 {u.branchName}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Manual Login Form */}
        <form onSubmit={handleCustomLogin} className="mt-5 pt-4 border-t border-slate-100 space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Username *</label>
            <input
              type="text"
              required
              value={selectedUsername}
              onChange={(e) => setSelectedUsername(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Password *</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-md"
            >
              Sign In
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
