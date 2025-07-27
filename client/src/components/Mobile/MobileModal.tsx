import React, { useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { isMobileApp } from '../../utils/mobileUtils';

interface MobileModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  fullScreen?: boolean;
}

const MobileModal: React.FC<MobileModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  children,
  fullScreen = false 
}) => {
  useEffect(() => {
    if (isOpen && isMobileApp()) {
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      
      return () => {
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const modalClass = isMobileApp() && fullScreen
    ? "fixed inset-0 z-50 bg-white"
    : "fixed inset-0 bg-gray-500 bg-opacity-75 flex items-end sm:items-center justify-center z-50";

  const contentClass = isMobileApp() && fullScreen
    ? "h-full flex flex-col"
    : "bg-white rounded-t-xl sm:rounded-lg shadow-xl w-full sm:max-w-md mx-auto animate-slide-up sm:animate-none";

  return (
    <div className={modalClass}>
      <div className={contentClass}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content with keyboard-aware padding */}
        <div className={`flex-1 overflow-y-auto ${isMobileApp() ? 'pb-safe' : 'p-4'}`}>
          <div className={isMobileApp() ? 'p-4' : ''}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileModal;