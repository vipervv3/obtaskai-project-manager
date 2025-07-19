import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

const NotificationPanel: React.FC = () => {
  const { isOpen } = useSelector((state: RootState) => state.ui.notifications);
  const { notifications } = useSelector((state: RootState) => state.notifications);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-25" />
      <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-xl">
        <div className="p-4">
          <h2 className="text-lg font-semibold">Notifications</h2>
          <div className="mt-4 space-y-2">
            {notifications.length === 0 ? (
              <p className="text-gray-500">No notifications</p>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 rounded border ${
                    notification.read ? 'bg-gray-50' : 'bg-blue-50'
                  }`}
                >
                  <h3 className="font-medium">{notification.title}</h3>
                  <p className="text-sm text-gray-600">{notification.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationPanel;