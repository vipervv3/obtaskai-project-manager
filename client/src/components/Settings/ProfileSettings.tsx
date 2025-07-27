import React, { useState, useEffect } from 'react';
import { 
  UserCircleIcon, 
  PencilIcon,
  CheckCircleIcon,
  XCircleIcon,
  CameraIcon
} from '@heroicons/react/24/outline';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import apiService from '../../services/api';

interface ProfileData {
  full_name: string;
  email: string;
  phone?: string;
  job_title?: string;
  department?: string;
  location?: string;
  bio?: string;
  avatar_url?: string;
}

const ProfileSettings: React.FC = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const [profile, setProfile] = useState<ProfileData>({
    full_name: user?.full_name || '',
    email: user?.email || '',
    phone: '',
    job_title: '',
    department: '',
    location: '',
    bio: '',
    avatar_url: user?.avatar_url || '',
  });
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await apiService.get('/user/profile');
      if (response.data.data) {
        setProfile({ ...profile, ...response.data.data });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const handleInputChange = (field: keyof ProfileData, value: string) => {
    setProfile({ ...profile, [field]: value });
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    setSaveStatus('idle');

    try {
      // Upload avatar if changed
      if (avatarFile) {
        console.log('Uploading avatar...');
        const avatarResponse = await apiService.uploadFile('/user/avatar', avatarFile);
        console.log('Avatar upload response:', avatarResponse.data);
        if (avatarResponse.data.avatar_url) {
          profile.avatar_url = avatarResponse.data.avatar_url;
        }
      }

      console.log('Saving profile:', profile);
      const response = await apiService.put('/user/profile', profile);
      console.log('Profile save response:', response.data);
      setSaveStatus('success');
      setIsEditing(false);
      setAvatarFile(null);
      setAvatarPreview('');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error: any) {
      console.error('Error saving profile:', error);
      console.error('Error details:', error.response?.data);
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setAvatarFile(null);
    setAvatarPreview('');
    loadProfile(); // Reset to original values
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Profile Information</h3>
          <p className="text-sm text-gray-600">
            Update your personal information and profile settings
          </p>
        </div>
        
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <PencilIcon className="h-4 w-4 mr-2" />
            Edit Profile
          </button>
        ) : (
          <div className="flex space-x-2">
            <button
              onClick={cancelEdit}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={saveProfile}
              disabled={saving}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      {/* Save Status */}
      {saveStatus !== 'idle' && (
        <div className={`flex items-center p-3 rounded-md ${
          saveStatus === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {saveStatus === 'success' ? (
            <CheckCircleIcon className="h-5 w-5 mr-2" />
          ) : (
            <XCircleIcon className="h-5 w-5 mr-2" />
          )}
          {saveStatus === 'success' ? 'Profile updated successfully' : 'Failed to update profile'}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {/* Avatar Section */}
        <div className="flex items-center space-x-6 mb-6">
          <div className="relative">
            {avatarPreview || profile.avatar_url ? (
              <img
                className="h-20 w-20 rounded-full object-cover"
                src={avatarPreview || profile.avatar_url}
                alt="Profile"
              />
            ) : (
              <UserCircleIcon className="h-20 w-20 text-gray-300" />
            )}
            
            {isEditing && (
              <label className="absolute bottom-0 right-0 bg-white rounded-full p-1 shadow-lg cursor-pointer hover:bg-gray-50">
                <CameraIcon className="h-4 w-4 text-gray-600" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </label>
            )}
          </div>
          
          <div>
            <h4 className="text-lg font-medium text-gray-900">{profile.full_name || 'Your Name'}</h4>
            <p className="text-sm text-gray-500">{profile.email}</p>
            {profile.job_title && (
              <p className="text-sm text-gray-500">{profile.job_title}</p>
            )}
          </div>
        </div>

        {/* Form Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            {isEditing ? (
              <input
                type="text"
                value={profile.full_name}
                onChange={(e) => handleInputChange('full_name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            ) : (
              <p className="py-2 text-gray-900">{profile.full_name || 'Not set'}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <p className="py-2 text-gray-500">{profile.email}</p>
            <p className="text-xs text-gray-400">Email cannot be changed here</p>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            {isEditing ? (
              <input
                type="tel"
                value={profile.phone || ''}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="+1 (555) 123-4567"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            ) : (
              <p className="py-2 text-gray-900">{profile.phone || 'Not set'}</p>
            )}
          </div>

          {/* Job Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Job Title
            </label>
            {isEditing ? (
              <input
                type="text"
                value={profile.job_title || ''}
                onChange={(e) => handleInputChange('job_title', e.target.value)}
                placeholder="Software Engineer"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            ) : (
              <p className="py-2 text-gray-900">{profile.job_title || 'Not set'}</p>
            )}
          </div>

          {/* Department */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Department
            </label>
            {isEditing ? (
              <input
                type="text"
                value={profile.department || ''}
                onChange={(e) => handleInputChange('department', e.target.value)}
                placeholder="Engineering"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            ) : (
              <p className="py-2 text-gray-900">{profile.department || 'Not set'}</p>
            )}
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            {isEditing ? (
              <input
                type="text"
                value={profile.location || ''}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="New York, NY"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            ) : (
              <p className="py-2 text-gray-900">{profile.location || 'Not set'}</p>
            )}
          </div>
        </div>

        {/* Bio */}
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Bio
          </label>
          {isEditing ? (
            <textarea
              value={profile.bio || ''}
              onChange={(e) => handleInputChange('bio', e.target.value)}
              placeholder="Tell us about yourself..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            />
          ) : (
            <p className="py-2 text-gray-900">{profile.bio || 'Not set'}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;