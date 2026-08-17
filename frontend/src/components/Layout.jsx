import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function Layout({ title, search, onSearchChange, searchPlaceholder, children }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 md:ml-64 h-screen overflow-hidden">
        <Topbar
          title={title}
          onMenuClick={() => setMobileOpen(true)}
          search={search}
          onSearchChange={onSearchChange}
          searchPlaceholder={searchPlaceholder}
        />
        <div className="flex-1 overflow-y-auto p-md md:p-container-margin">
          <div className="max-w-7xl mx-auto space-y-xl pb-xl">{children}</div>
        </div>
      </div>
    </div>
  );
}
