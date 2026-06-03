import React, { useState } from 'react';
import { LayoutDashboard, Users, FolderOpen, Calendar, Gamepad2, Settings, LogOut, ChevronRight, Wallet, CheckCircle } from 'lucide-react';
import AccountManager from './AccountManager';
import { getBranchConfig } from '../data/constants';

const ALL_NAV_ITEMS = [
  { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard, adminOnly: false },
  { id: 'members', label: 'Quản lý Đoàn viên', icon: Users, adminOnly: false },
  { id: 'funds', label: 'Quản lý Thu/Chi', icon: Wallet, adminOnly: false },
  { id: 'attendance', label: 'Điểm danh & Đánh giá', icon: CheckCircle, adminOnly: false },
  { id: 'plans', label: 'Kế hoạch & Báo cáo', icon: Calendar, adminOnly: false },
  { id: 'games', label: 'Trò chơi sinh hoạt', icon: Gamepad2, adminOnly: true },
  { id: 'settings', label: 'Cài đặt', icon: Settings, adminOnly: true },
];

export default function Sidebar({ activeTab, setActiveTab, currentUser, onAppLogout, selectedBranch, setSelectedBranch }) {
  const [showAccountManager, setShowAccountManager] = useState(false);
  const isAdmin = currentUser?.role === 'admin';
  const navItems = ALL_NAV_ITEMS.filter(item => !item.adminOnly || isAdmin);

  return (
    <>
      <div className="w-64 h-screen flex flex-col fixed left-0 top-0 shadow-xl"
        style={{ background: 'linear-gradient(180deg, #c8102e 0%, #a50d24 55%, #1a237e 100%)' }}>

        {/* Logo */}
        <div
          className="p-5 flex items-center justify-center cursor-pointer group relative overflow-hidden"
          onClick={() => setActiveTab('dashboard')}
          title="Về trang chủ"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.15)' }}
        >
          {/* Decorative stars */}
          <div className="absolute inset-0 opacity-10 pointer-events-none select-none" style={{
            backgroundImage: 'radial-gradient(circle, #ffd700 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }} />
          <div className="flex flex-col items-center text-center relative z-10">
            {/* Emblem */}
            <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3 group-hover:scale-105 transition-transform overflow-hidden p-1.5"
              style={{ background: 'linear-gradient(135deg, #ffd700, #ffb300)', boxShadow: '0 4px 16px rgba(255,200,0,0.4)' }}>
              <img src="/logo-doan.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <h2 className="font-bold text-white text-sm leading-tight text-center" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
              {getBranchConfig(currentUser?.username).title.split('\n').map((line, idx, arr) => (
                <React.Fragment key={idx}>
                  {line}
                  {idx < arr.length - 1 && <br />}
                </React.Fragment>
              ))}
            </h2>
            <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.65)' }}>Hệ thống Quản lý</p>
          </div>
        </div>

        {/* Branch Selector for Super Admin */}
        {currentUser?.username === 'admin-bvtks' && (
          <div className="px-3 pt-3 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
            <label className="block text-[10px] uppercase font-bold text-white/50 mb-1.5 text-left pl-1">
              Xem dữ liệu chi đoàn:
            </label>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full bg-white/10 hover:bg-white/15 border border-white/20 text-white rounded-xl px-3 py-2 text-xs font-semibold outline-none transition-all cursor-pointer"
              style={{ colorScheme: 'dark' }}
            >
              <option value="all" className="bg-[#a50d24] text-white">📊 Tất cả (Tổng hợp)</option>
              <option value="cs1" className="bg-[#a50d24] text-white">🏢 Chi đoàn Cơ sở 1</option>
              <option value="cs2" className="bg-[#a50d24] text-white">🏢 Chi đoàn Cơ sở 2</option>
            </select>
          </div>
        )}

        {/* Nav Items */}
        <div className="flex-1 overflow-y-auto py-3">
          <nav className="space-y-0.5 px-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all ${
                    isActive
                      ? 'text-red-800 shadow-md'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                  style={isActive ? { background: 'rgba(255,255,255,0.95)' } : {}}
                >
                  <Icon className={`mr-3 h-4 w-4 shrink-0 ${isActive ? 'text-red-700' : 'text-white/70'}`} />
                  {item.label}
                  {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-red-500" />}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Card + Đăng xuất */}
        <div className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.15)' }}>
          <button
            onClick={() => setShowAccountManager(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all mb-1 text-left"
            style={{ background: 'rgba(255,255,255,0.1)' }}
            title="Quản lý tài khoản"
          >
            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-md overflow-hidden bg-white/20 p-1">
              <img src="/logo-doan.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white leading-tight" style={{ wordBreak: 'break-word' }}>
                {currentUser?.displayName ? currentUser.displayName.replace('Bệnh viện Than Khoáng sản', 'BVTKS').replace('Bệnh viện Than - Khoáng sản', 'BVTKS') : ''}
              </p>
              <p className="text-[11px] mt-0.5 font-medium" style={{ color: isAdmin ? '#ffd700' : 'rgba(255,255,255,0.55)' }}>
                {isAdmin ? '👑 Quản trị viên' : '👁 Chỉ xem'}
              </p>
            </div>
            <ChevronRight size={15} className="text-white/40 shrink-0" />
          </button>

          <button
            onClick={onAppLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all"
            style={{ color: 'rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.08)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
          >
            <LogOut className="h-3.5 w-3.5" />
            Đăng xuất hệ thống
          </button>
        </div>
      </div>

      {/* Modal quản lý tài khoản */}
      {showAccountManager && (
        <AccountManager
          currentUser={currentUser}
          onClose={() => setShowAccountManager(false)}
        />
      )}
    </>
  );
}
