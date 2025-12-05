import React from 'react';
import { BookOpen, PieChart, Upload, GraduationCap, Settings, Menu, X, FileText, BrainCircuit } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const location = useLocation();
  const currentPath = location.pathname;

  const navItems = [
    { id: 'dashboard', label: 'Inputs & Library', icon: <Upload size={20} />, path: '/dashboard' },
    { id: 'smart-notes', label: 'Smart Notes', icon: <FileText size={20} />, path: '/smart-notes' },
    { id: 'study', label: 'AI Tutor', icon: <BookOpen size={20} />, path: '/study' },
    { id: 'evaluation', label: 'Evaluation', icon: <GraduationCap size={20} />, path: '/evaluation' },
    { id: 'analytics', label: 'Analytics', icon: <PieChart size={20} />, path: '/analytics' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b p-4 flex justify-between items-center sticky top-0 z-20">
        <div className="font-bold text-xl text-blue-600">StudentAI</div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-10 w-64 bg-white border-r shadow-sm transform transition-transform duration-200 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0 flex flex-col
      `}>
        <div className="p-6">
          <h1 className="text-2xl font-bold text-blue-600 flex items-center gap-2">
            <GraduationCap className="text-blue-600" />
            Edunova AI
          </h1>
          <p className="text-xs text-gray-500 mt-1">Where Learning Meets Intelligence</p>
        </div>

        <nav className="flex-1 mt-2 px-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.id}
              to={item.path}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors
                ${currentPath.startsWith(item.path)
                  ? 'bg-blue-50 text-blue-700 border border-blue-100'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t bg-gray-50">
          <div className="flex items-center justify-between px-4 py-2 text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <Settings size={14} />
              <span>v1.2.0 (OpenAI)</span>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem('access_token');
                window.location.reload();
              }}
              className="text-red-500 hover:text-red-700 font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto h-[calc(100vh-64px)] md:h-screen p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;