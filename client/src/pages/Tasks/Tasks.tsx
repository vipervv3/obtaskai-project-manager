import React from 'react';

const Tasks: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
        <button className="btn-primary">New Task</button>
      </div>
      
      <div className="card">
        <p className="text-gray-600">Tasks page - Coming soon!</p>
      </div>
    </div>
  );
};

export default Tasks;