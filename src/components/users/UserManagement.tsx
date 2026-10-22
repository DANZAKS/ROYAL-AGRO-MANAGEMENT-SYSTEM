import React, { useState, useRef } from 'react';
import {
  Users,
  Plus,
  Shield,
  Building2,
  Mail,
  Phone,
  Power,
  Key,
  Edit2,
  X,
  CheckCircle2,
  Upload,
  Camera
} from 'lucide-react';
import { User, UserRole, Branch } from '../../types';

interface UserManagementProps {
  users: User[];
  branches: Branch[];
  currentUser: User;
  onAddUser: (user: User) => void;
  onUpdateUser: (user: User) => void;
  onToggleUserStatus: (userId: string) => void;
  onResetPassword: (userId: string) => void;
}

export const UserManagement: React.FC<UserManagementProps> = ({
  users = [],
  branches = [],
  currentUser,
  onAddUser,
  onUpdateUser,
  onToggleUserStatus,
  onResetPassword
}) => {
  if (currentUser.role !== 'CEO') {
    return (
      <div className="bg-white rounded-2xl border border-rose-200 p-8 text-center space-y-3 shadow-xs">
        <Shield className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-base font-bold text-slate-900">Access Restricted</h2>
        <p className="text-xs text-slate-600 max-w-md mx-auto">
          Staff Account and Role-Based Access Control (RBAC) management is restricted to CEO / Super Administrator accounts.
        </p>
      </div>
    );
  }

  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('SALES_CASHIER');
  const [branchId, setBranchId] = useState(branches[0]?.id || '');
  const [password, setPassword] = useState('Password123!');
  const [avatarUrl, setAvatarUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenModal = (u?: User) => {
    if (u) {
      setEditingUser(u);
      setUsername(u.username);
      setName(u.name);
      setEmail(u.email);
      setPhone(u.phone);
      setRole(u.role);
      setBranchId(u.branchId || branches[0]?.id || '');
      setAvatarUrl(u.avatarUrl || '');
    } else {
      setEditingUser(null);
      setUsername('');
      setName('');
      setEmail('');
      setPhone('+234 ');
      setRole('SALES_CASHIER');
      setBranchId(branches[0]?.id || '');
      setPassword('RoyalAgro2026!');
      setAvatarUrl('');
    }
    setShowModal(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size exceeds 5MB limit.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setAvatarUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !username) return;

    const b = branches.find((br) => br.id === branchId);
    const defaultAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200';

    if (editingUser) {
      onUpdateUser({
        ...editingUser,
        username,
        name,
        email,
        phone,
        role,
        avatarUrl: avatarUrl || editingUser.avatarUrl || defaultAvatar,
        branchId: role === 'CEO' ? null : branchId,
        branchName: role === 'CEO' ? 'All Branches (Headquarters)' : b?.name || ''
      });
    } else {
      const newUser: User = {
        id: 'usr-' + Date.now(),
        username,
        name,
        email,
        phone,
        role,
        branchId: role === 'CEO' ? null : branchId,
        branchName: role === 'CEO' ? 'All Branches (Headquarters)' : b?.name || '',
        status: 'ACTIVE',
        avatarUrl: avatarUrl || defaultAvatar,
        createdAt: new Date().toISOString().split('T')[0]
      };
      onAddUser(newUser);
    }

    setShowModal(false);
  };

  const getRoleBadge = (r: UserRole) => {
    switch (r) {
      case 'CEO':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">CEO / SUPER ADMIN</span>;
      case 'BRANCH_MANAGER':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">BRANCH MANAGER</span>;
      case 'SALES_CASHIER':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">SALES CASHIER</span>;
      case 'INVENTORY_OFFICER':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">INVENTORY OFFICER</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">{r}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-600" />
            <h1 className="text-lg font-bold text-slate-900">Staff & System User Accounts (RBAC)</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Role-based access control for CEO, Branch Managers, Cashiers, and Inventory Officers across state branches.
          </p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-900/30 flex items-center gap-2 transition-all shrink-0"
        >
          <Plus className="w-4 h-4 text-amber-300" /> Create Staff Account
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px]">
              <tr>
                <th className="p-4">Staff Member</th>
                <th className="p-4">Username</th>
                <th className="p-4">System Role</th>
                <th className="p-4">Assigned Branch</th>
                <th className="p-4">Contact Phone</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={u.avatarUrl}
                        alt={u.name}
                        className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200 shrink-0"
                      />
                      <div>
                        <p className="font-bold text-slate-900">{u.name}</p>
                        <p className="text-[10px] text-slate-500">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 font-mono font-bold text-slate-800">@{u.username}</td>
                  <td className="p-4">{getRoleBadge(u.role)}</td>
                  <td className="p-4 font-semibold text-slate-700">📍 {u.branchName || 'Central'}</td>
                  <td className="p-4 text-slate-600">{u.phone}</td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        u.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onResetPassword(u.id)}
                        className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                        title="Reset Password"
                      >
                        <Key className="w-4 h-4 text-amber-600" />
                      </button>
                      <button
                        onClick={() => handleOpenModal(u)}
                        className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                        title="Edit User"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {u.id !== currentUser.id && (
                        <button
                          onClick={() => onToggleUserStatus(u.id)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            u.status === 'ACTIVE' ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={u.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit User Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                {editingUser ? 'Edit Staff Credentials' : 'Create Staff User Account'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 mt-4 text-xs">
              {/* Profile Photo Uploader */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="relative group">
                    <img
                      src={avatarUrl || editingUser?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100'}
                      alt="Staff Avatar"
                      className="w-12 h-12 rounded-full object-cover ring-2 ring-emerald-500 shadow-xs"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 bg-slate-900/40 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-xs">Staff Profile Picture</p>
                    <p className="text-[10px] text-slate-500">Upload custom avatar image</p>
                  </div>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-xs transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" /> Select Photo
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Username *</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="kano_cashier1"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Role Permission *</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold focus:outline-none"
                  >
                    <option value="SALES_CASHIER">SALES CASHIER</option>
                    <option value="INVENTORY_OFFICER">INVENTORY OFFICER</option>
                    <option value="BRANCH_MANAGER">BRANCH MANAGER</option>
                    <option value="CEO">CEO / SUPER ADMIN</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Musa Abdullahi"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="musa@royalagro.ng"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              {role !== 'CEO' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Assigned Branch *</label>
                  <select
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold focus:outline-none"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        📍 {b.name} ({b.state})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-xs"
                >
                  {editingUser ? 'Save User' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
