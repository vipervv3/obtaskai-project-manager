import React from 'react';
import { useParams } from 'react-router-dom';

const MeetingDetail: React.FC = () => {
  const { meetingId } = useParams<{ meetingId: string }>();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Meeting Detail</h1>
      <div className="card">
        <p className="text-gray-600">Meeting {meetingId} details - Coming soon!</p>
      </div>
    </div>
  );
};

export default MeetingDetail;