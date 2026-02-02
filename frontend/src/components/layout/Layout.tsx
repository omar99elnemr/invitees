/**
 * Main Layout Component
 * Provides the app shell with header, sidebar, and content area
 * Mobile responsive with collapsible sidebar
 */
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { useState, useEffect } from 'react';

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Handle responsive sidebar
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleSidebarClose = () => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <Header onMenuClick={handleSidebarToggle} sidebarOpen={sidebarOpen} />
      
      <div className="flex pt-16">
        <Sidebar isOpen={sidebarOpen} isMobile={isMobile} onClose={handleSidebarClose} />
        
        {/* Mobile overlay */}
        {isMobile && sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-sm"
            onClick={handleSidebarClose}
          />
        )}
        
        <main
          className={`flex-1 transition-all duration-300 ease-in-out ${
            sidebarOpen && !isMobile ? 'lg:ml-64' : 'ml-0'
          }`}
        >
          <div className="p-4 sm:p-6 lg:p-8 max-w-[1800px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
