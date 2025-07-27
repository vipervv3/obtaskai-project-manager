import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { AppDispatch, RootState } from '../../store';
import { fetchProjects, createProject, deleteProject, updateProject } from '../../store/slices/projectsSlice';
import { CreateProjectDto, Project, UpdateProjectDto } from '../../types';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import MobileModal from '../../components/Mobile/MobileModal';
import { useMobileKeyboard } from '../../hooks/useMobileKeyboard';
import { isMobileApp } from '../../utils/mobileUtils';
import apiService from '../../services/api';

const Projects: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { projects, loading, creating, deleting } = useSelector((state: RootState) => state.projects);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState<CreateProjectDto>({
    name: '',
    description: '',
    deadline: ''
  });
  const { isKeyboardVisible } = useMobileKeyboard();

  useEffect(() => {
    dispatch(fetchProjects());
  }, [dispatch]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Creating project with data:', formData);
    console.log('API URL:', apiService.getBaseUrl());
    
    try {
      const result = await dispatch(createProject(formData));
      if (createProject.fulfilled.match(result)) {
        setShowCreateModal(false);
        setFormData({ name: '', description: '', deadline: '' });
        // Refresh projects list
        dispatch(fetchProjects());
      } else {
        console.error('Failed to create project:', result);
        const errorMessage = result.payload || 'Failed to create project. Please try again.';
        alert(`Error: ${errorMessage}`);
      }
    } catch (error: any) {
      console.error('Error creating project:', error);
      alert(`An error occurred: ${error.message || 'Unknown error'}`);
    }
  };

  const handleProjectClick = (projectId: string) => {
    navigate(`/projects/${projectId}`);
  };

  const handleEditProject = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation(); // Prevent navigation
    setEditingProject(project);
    setFormData({
      name: project.name,
      description: project.description || '',
      deadline: project.deadline || ''
    });
    setShowEditModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;

    try {
      const updateData: UpdateProjectDto = {
        name: formData.name,
        description: formData.description,
        deadline: formData.deadline
      };
      
      const result = await dispatch(updateProject({ id: editingProject.id, updates: updateData }));
      if (updateProject.fulfilled.match(result)) {
        setShowEditModal(false);
        setEditingProject(null);
        setFormData({ name: '', description: '', deadline: '' });
        dispatch(fetchProjects());
        alert('Project updated successfully!');
      } else {
        alert('Failed to update project. Please try again.');
      }
    } catch (error) {
      console.error('Error updating project:', error);
      alert('An error occurred while updating the project.');
    }
  };

  const handleDeleteProject = async (e: React.MouseEvent, projectId: string, projectName: string) => {
    e.stopPropagation(); // Prevent navigation
    
    const confirmDelete = window.confirm(
      `Are you sure you want to delete the project "${projectName}"? This will also delete all tasks and data associated with this project. This action cannot be undone.`
    );
    
    if (!confirmDelete) return;
    
    try {
      const result = await dispatch(deleteProject(projectId));
      if (deleteProject.fulfilled.match(result)) {
        alert('Project deleted successfully!');
        dispatch(fetchProjects()); // Refresh the list
      } else {
        console.error('Failed to delete project:', result);
        const errorMessage = String(result.payload || 'Failed to delete project.');
        alert(`Failed to delete project: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      alert(`Error deleting project: ${error}`);
    }
  };

  console.log('Projects rendering, projects:', projects);
  console.log('ShowCreateModal:', showCreateModal);

  return (
    <div className={`${isMobileApp() ? 'mobile-app' : ''}`} style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Projects</h1>
        <button 
          onClick={() => setShowCreateModal(true)}
          style={{
            backgroundColor: '#3b82f6',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            fontWeight: '500',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          New Project
        </button>
      </div>
      
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
          <div style={{ 
            width: '32px', 
            height: '32px', 
            border: '3px solid #e5e7eb',
            borderTopColor: '#3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
        </div>
      ) : projects.length === 0 ? (
        <div style={{ 
          backgroundColor: 'white', 
          textAlign: 'center', 
          padding: '48px', 
          borderRadius: '8px',
          border: '1px solid #e5e7eb'
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: '500', marginBottom: '8px' }}>No projects yet</h3>
          <p style={{ color: '#6b7280', marginBottom: '16px' }}>Create your first project to get started</p>
          <button 
            onClick={() => setShowCreateModal(true)}
            style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              padding: '12px 24px',
              borderRadius: '8px',
              border: 'none',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Create Project
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {projects.map((project) => (
            <div 
              key={project.id}
              style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                position: 'relative',
                border: '1px solid #e5e7eb',
                cursor: 'pointer'
              }}
            >
              <div 
                onClick={() => handleProjectClick(project.id)}
                className="cursor-pointer"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{project.name}</h3>
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {project.description || 'No description'}
                </p>
                <div className="flex items-center justify-between text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    project.status === 'active' ? 'bg-green-100 text-green-800' :
                    project.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                    project.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {project.status}
                  </span>
                  {project.deadline && (
                    <span className="text-gray-500">
                      Due: {new Date(project.deadline).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <div style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                display: 'flex',
                gap: '8px'
              }}>
                <button
                  onClick={(e) => handleEditProject(e, project)}
                  style={{
                    backgroundColor: '#e0f2fe',
                    color: '#0284c7',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Edit project"
                >
                  <PencilIcon style={{ width: '16px', height: '16px' }} />
                </button>
                <button
                  onClick={(e) => handleDeleteProject(e, project.id, project.name)}
                  disabled={deleting}
                  style={{
                    backgroundColor: '#fef2f2',
                    color: '#dc2626',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Delete project"
                >
                  <TrashIcon style={{ width: '16px', height: '16px' }} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      <MobileModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Project"
        fullScreen={isMobileApp()}
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Project Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Enter project name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={3}
              placeholder="Enter project description"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Deadline
            </label>
            <input
              type="date"
              value={formData.deadline}
              onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className={`${isMobileApp() ? 'mobile-form-footer' : 'flex justify-end space-x-3 pt-4'}`}>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md font-medium hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {creating ? 'Creating...' : 'Create Project'}
              </button>
            </div>
          </div>
        </form>
      </MobileModal>

      {/* Edit Project Modal */}
      <MobileModal
        isOpen={showEditModal && editingProject !== null}
        onClose={() => {
          setShowEditModal(false);
          setEditingProject(null);
          setFormData({ name: '', description: '', deadline: '' });
        }}
        title="Edit Project"
        fullScreen={isMobileApp()}
      >
        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Project Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Enter project name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={3}
              placeholder="Enter project description"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Deadline
            </label>
            <input
              type="date"
              value={formData.deadline}
              onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className={`${isMobileApp() ? 'mobile-form-footer' : 'flex justify-end space-x-3 pt-4'}`}>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingProject(null);
                  setFormData({ name: '', description: '', deadline: '' });
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md font-medium hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700"
              >
                Update Project
              </button>
            </div>
          </div>
        </form>
      </MobileModal>
    </div>
  );
};

export default Projects;