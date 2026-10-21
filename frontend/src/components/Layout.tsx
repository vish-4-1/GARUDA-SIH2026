import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';

export const Layout: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#050505] text-[#F7F5FA] flex flex-col font-sans selection:bg-[#00E5FF]/25 selection:text-[#00E5FF]">
      <Navbar />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-5 lg:p-7 bg-gradient-to-b from-[#050505] via-[#0D0B12] to-[#050505]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
