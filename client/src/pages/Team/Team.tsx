import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import { fetchProjects, addProjectMember } from '../../store/slices/projectsSlice';
import { ProjectMember } from '../../types';

interface InviteForm {
  email: string;
  role: ProjectMember['role'];
  projectId: string;
}

const Team: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { projects, loading } = useSelector((state: RootState) => state.projects);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState<InviteForm>({
    email: '',
    role: 'member',
    projectId: ''
  });
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    dispatch(fetchProjects());
  }, [dispatch]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteForm.email || !inviteForm.projectId) return;

    setInviting(true);
    try {
      const result = await dispatch(addProjectMember({
        projectId: inviteForm.projectId,
        userEmail: inviteForm.email,
        role: inviteForm.role
      }));
      
      if (addProjectMember.fulfilled.match(result)) {
        setShowInviteModal(false);
        setInviteForm({ email: '', role: 'member', projectId: '' });
        // Refresh projects to show new member
        dispatch(fetchProjects());
        alert('Team member invited successfully!');
      } else {
        console.error('Failed to invite team member:', result);
        const errorMessage = String(result.payload || 'Failed to invite team member. Please try again.');
        if (errorMessage.includes('User not found')) {
          alert(`User with email "${inviteForm.email}" not found. The user must register first before being invited to projects.`);
        } else {
          alert(`Failed to invite team member: ${errorMessage}`);
        }
      }
    } catch (error) {
      console.error('Error inviting team member:', error);
      alert(`An error occurred while inviting the team member: ${error}`);
    } finally {
      setInviting(false);
    }
  };

  const getAllTeamMembers = () => {
    const membersMap = new Map();
    
    projects.forEach(project => {
      project.members?.forEach(member => {
        const key = member.user_id;
        if (!membersMap.has(key)) {
          membersMap.set(key, {
            ...member,
            projects: [project]
          });
        } else {
          const existing = membersMap.get(key);
          existing.projects.push(project);
        }
      });
    });
    
    return Array.from(membersMap.values());
  };

  const teamMembers = getAllTeamMembers();

  const getRoleColor = (role: ProjectMember['role']) => {
    switch (role) {
      case 'owner': return 'bg-purple-100 text-purple-800';
      case 'admin': return 'bg-blue-100 text-blue-800';
      case 'member': return 'bg-green-100 text-green-800';
      case 'viewer': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Team</h1>
        <button 
          onClick={() => setShowInviteModal(true)}
          className="btn-primary"
        >
          Invite Member
        </button>
      </div>

      {/* Team Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{teamMembers.length}</div>
            <div className="text-sm text-gray-600">Total Members</div>
          </div>
        </div>
        <div className="card">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">{projects.length}</div>
            <div className="text-sm text-gray-600">Active Projects</div>
          </div>
        </div>
        <div className="card">
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">
              {projects.filter(p => p.members?.some(m => m.role === 'admin')).length}
            </div>
            <div className="text-sm text-gray-600">Projects with Admins</div>
          </div>
        </div>
      </div>

      {/* Team Members List */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Team Members</h2>
          <span className="text-sm text-gray-500">{teamMembers.length} members</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : teamMembers.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No team members yet</h3>
            <p className="text-gray-600 mb-4">Start building your team by inviting members to your projects</p>
            <button 
              onClick={() => setShowInviteModal(true)}
              className="btn-primary"
            >
              Invite First Member
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {teamMembers.map((member) => (
              <div key={member.user_id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-primary-600">
                      {member.user?.full_name?.charAt(0) || 'U'}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">
                      {member.user?.full_name || 'Unknown User'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {member.user?.email}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {member.projects.length} project{member.projects.length !== 1 ? 's' : ''}
                    </div>
                    <div className="text-xs text-gray-500">
                      Joined {new Date(member.joined_at).toLocaleDateString()}
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(member.role)}`}>
                    {member.role}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Projects and Members */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Projects & Members</h2>
        <div className="space-y-6">
          {projects.map((project) => (
            <div key={project.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-900">{project.name}</h3>
                <span className="text-sm text-gray-500">
                  {project.members?.length || 0} member{(project.members?.length || 0) !== 1 ? 's' : ''}
                </span>
              </div>
              
              {project.members && project.members.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {project.members.map((member) => (
                    <div key={member.id} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                      <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-primary-600">
                          {member.user?.full_name?.charAt(0) || 'U'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {member.user?.full_name || 'Unknown User'}
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded ${getRoleColor(member.role)}`}>
                        {member.role}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No members in this project</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Invite Team Member</h2>
            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="colleague@company.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project *
                </label>
                <select
                  required
                  value={inviteForm.projectId}
                  onChange={(e) => setInviteForm({ ...inviteForm, projectId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select a project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as ProjectMember['role'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="viewer">Viewer - Can view project</option>
                  <option value="member">Member - Can edit tasks</option>
                  <option value="admin">Admin - Can manage project</option>
                </select>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviting}
                  className="btn-primary"
                >
                  {inviting ? 'Inviting...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Team;