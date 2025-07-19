import React from 'react';
import { NavLink } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { toggleSidebar } from '../../store/slices/uiSlice';
import {
  HomeIcon,
  FolderIcon,
  Square2StackIcon,
  CalendarIcon,
  UsersIcon,
  CogIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MicrophoneIcon,
} from '@heroicons/react/24/outline';

interface SidebarProps {
  onMobileClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onMobileClose }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { sidebarOpen } = useSelector((state: RootState) => state.ui);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'Projects', href: '/projects', icon: FolderIcon },
    { name: 'Tasks', href: '/tasks', icon: Square2StackIcon },
    { name: 'Meetings', href: '/meetings', icon: MicrophoneIcon },
    { name: 'Calendar', href: '/calendar', icon: CalendarIcon },
    { name: 'Team', href: '/team', icon: UsersIcon },
    { name: 'Settings', href: '/settings', icon: CogIcon },
  ];

  return (
    <div className={`h-full bg-white border-r border-gray-200 transition-all duration-300 ${
      sidebarOpen ? 'w-64' : 'w-16'
    } lg:${sidebarOpen ? 'w-64' : 'w-16'}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        {sidebarOpen && (
          <h1 className="text-xl font-semibold text-gray-900">AI PM</h1>
        )}
        <button
          onClick={() => dispatch(toggleSidebar())}
          className="hidden lg:block p-1 rounded-md hover:bg-gray-100 transition-colors"
        >
          {sidebarOpen ? (
            <ChevronLeftIcon className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronRightIcon className="w-5 h-5 text-gray-500" />
          )}
        </button>
        {/* Mobile close button */}
        <button
          onClick={onMobileClose}
          className="lg:hidden p-1 rounded-md hover:bg-gray-100 transition-colors"
        >
          <ChevronLeftIcon className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="mt-4 px-2">
        <ul className="space-y-1">
          {navigation.map((item) => (
            <li key={item.name}>
              <NavLink
                to={item.href}
                onClick={() => onMobileClose && onMobileClose()}
                className={({ isActive }) => `
                  group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors
                  ${isActive
                    ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
              >
                <item.icon
                  className={`flex-shrink-0 w-6 h-6 ${
                    sidebarOpen ? 'mr-3' : 'mx-auto'
                  }`}
                  aria-hidden="true"
                />
                {sidebarOpen && item.name}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      {sidebarOpen && (
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <div className="text-xs text-gray-500 text-center">
            v1.0.0 • AI-Powered
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;