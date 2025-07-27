import React, { useState, useEffect } from 'react';
import { 
  ShieldCheckIcon,
  KeyIcon,
  DevicePhoneMobileIcon,
  EyeIcon,
  EyeSlashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import apiService from '../../services/api';

interface SecuritySettingsData {
  two_factor_enabled: boolean;
  last_password_change: string;
  login_sessions: Array<{
    id: string;
    device: string;
    location: string;
    last_active: string;
    current: boolean;
  }>;
}

const SecuritySettings: React.FC = () => {
  const [securitySettings, setSecuritySettings] = useState<SecuritySettingsData>({
    two_factor_enabled: false,
    last_password_change: '',
    login_sessions: []
  });
  
  // Password change form
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [passwordStrength, setPasswordStrength] = useState(0);
  
  // States
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordChangeStatus, setPasswordChangeStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [twoFactorStatus, setTwoFactorStatus] = useState<'idle' | 'enabling' | 'disabling'>('idle');
  const [qrCode, setQrCode] = useState<string>('');
  const [twoFactorCode, setTwoFactorCode] = useState('');

  useEffect(() => {
    loadSecuritySettings();
  }, []);

  useEffect(() => {
    calculatePasswordStrength(passwordForm.new_password);
  }, [passwordForm.new_password]);

  const loadSecuritySettings = async () => {
    try {
      const response = await apiService.get('/user/security');
      if (response.data.data) {
        setSecuritySettings(response.data.data);
      }
    } catch (error) {
      console.error('Error loading security settings:', error);
    }
  };

  const calculatePasswordStrength = (password: string) => {
    let strength = 0;
    
    // Length check
    if (password.length >= 8) strength += 1;
    if (password.length >= 12) strength += 1;
    
    // Character variety checks
    if (/[a-z]/.test(password)) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    
    setPasswordStrength(strength);
  };

  const getPasswordStrengthText = () => {
    switch (passwordStrength) {
      case 0:
      case 1:
      case 2:
        return { text: 'Weak', color: 'text-red-600' };
      case 3:
      case 4:
        return { text: 'Medium', color: 'text-yellow-600' };
      case 5:
      case 6:
        return { text: 'Strong', color: 'text-green-600' };
      default:
        return { text: 'Weak', color: 'text-red-600' };
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordChangeStatus('error');
      return;
    }
    
    if (passwordStrength < 3) {
      setPasswordChangeStatus('error');
      return;
    }

    setChangingPassword(true);
    setPasswordChangeStatus('idle');

    try {
      await apiService.put('/user/change-password', {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password
      });
      
      setPasswordChangeStatus('success');
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
      setTimeout(() => setPasswordChangeStatus('idle'), 3000);
    } catch (error) {
      console.error('Error changing password:', error);
      setPasswordChangeStatus('error');
    } finally {
      setChangingPassword(false);
    }
  };

  const enableTwoFactor = async () => {
    setTwoFactorStatus('enabling');
    try {
      const response = await apiService.post('/user/two-factor/enable');
      setQrCode(response.data.qr_code);
    } catch (error) {
      console.error('Error enabling 2FA:', error);
      setTwoFactorStatus('idle');
    }
  };

  const confirmTwoFactor = async () => {
    try {
      await apiService.post('/user/two-factor/confirm', {
        code: twoFactorCode
      });
      
      setSecuritySettings({ ...securitySettings, two_factor_enabled: true });
      setTwoFactorStatus('idle');
      setQrCode('');
      setTwoFactorCode('');
    } catch (error) {
      console.error('Error confirming 2FA:', error);
    }
  };

  const disableTwoFactor = async () => {
    setTwoFactorStatus('disabling');
    try {
      await apiService.post('/user/two-factor/disable', {
        code: twoFactorCode
      });
      
      setSecuritySettings({ ...securitySettings, two_factor_enabled: false });
      setTwoFactorStatus('idle');
      setTwoFactorCode('');
    } catch (error) {
      console.error('Error disabling 2FA:', error);
      setTwoFactorStatus('idle');
    }
  };

  const revokeSession = async (sessionId: string) => {
    try {
      await apiService.delete(`/user/sessions/${sessionId}`);
      loadSecuritySettings();
    } catch (error) {
      console.error('Error revoking session:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Security Settings</h3>
        <p className="text-sm text-gray-600">
          Manage your account security and authentication settings
        </p>
      </div>

      {/* Password Change */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <KeyIcon className="h-5 w-5 text-gray-500 mr-2" />
          <h4 className="text-md font-medium text-gray-900">Change Password</h4>
        </div>

        {passwordChangeStatus !== 'idle' && (
          <div className={`flex items-center p-3 rounded-md mb-4 ${
            passwordChangeStatus === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {passwordChangeStatus === 'success' ? (
              <CheckCircleIcon className="h-5 w-5 mr-2" />
            ) : (
              <XCircleIcon className="h-5 w-5 mr-2" />
            )}
            {passwordChangeStatus === 'success' 
              ? 'Password changed successfully' 
              : 'Failed to change password. Please check your current password.'}
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4">
          {/* Current Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showPasswords.current ? 'text' : 'password'}
                value={passwordForm.current_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                required
              />
              <button
                type="button"
                onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showPasswords.current ? (
                  <EyeSlashIcon className="h-4 w-4 text-gray-400" />
                ) : (
                  <EyeIcon className="h-4 w-4 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPasswords.new ? 'text' : 'password'}
                value={passwordForm.new_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                required
              />
              <button
                type="button"
                onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showPasswords.new ? (
                  <EyeSlashIcon className="h-4 w-4 text-gray-400" />
                ) : (
                  <EyeIcon className="h-4 w-4 text-gray-400" />
                )}
              </button>
            </div>
            
            {/* Password Strength Indicator */}
            {passwordForm.new_password && (
              <div className="mt-2">
                <div className="flex items-center space-x-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        passwordStrength <= 2 ? 'bg-red-500' :
                        passwordStrength <= 4 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${(passwordStrength / 6) * 100}%` }}
                    />
                  </div>
                  <span className={`text-xs font-medium ${getPasswordStrengthText().color}`}>
                    {getPasswordStrengthText().text}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showPasswords.confirm ? 'text' : 'password'}
                value={passwordForm.confirm_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                required
              />
              <button
                type="button"
                onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showPasswords.confirm ? (
                  <EyeSlashIcon className="h-4 w-4 text-gray-400" />
                ) : (
                  <EyeIcon className="h-4 w-4 text-gray-400" />
                )}
              </button>
            </div>
            
            {passwordForm.confirm_password && passwordForm.new_password !== passwordForm.confirm_password && (
              <p className="mt-1 text-sm text-red-600">Passwords do not match</p>
            )}
          </div>

          <button
            type="submit"
            disabled={changingPassword || passwordStrength < 3 || passwordForm.new_password !== passwordForm.confirm_password}
            className="btn-primary disabled:opacity-50"
          >
            {changingPassword ? 'Changing Password...' : 'Change Password'}
          </button>
        </form>
      </div>

      {/* Two-Factor Authentication */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <DevicePhoneMobileIcon className="h-5 w-5 text-gray-500 mr-2" />
            <div>
              <h4 className="text-md font-medium text-gray-900">Two-Factor Authentication</h4>
              <p className="text-sm text-gray-500">
                Add an extra layer of security to your account
              </p>
            </div>
          </div>
          
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
            securitySettings.two_factor_enabled 
              ? 'bg-green-100 text-green-800' 
              : 'bg-gray-100 text-gray-800'
          }`}>
            {securitySettings.two_factor_enabled ? 'Enabled' : 'Disabled'}
          </div>
        </div>

        {!securitySettings.two_factor_enabled ? (
          <div>
            {twoFactorStatus === 'idle' ? (
              <button
                onClick={enableTwoFactor}
                className="btn-primary"
              >
                Enable Two-Factor Authentication
              </button>
            ) : (
              <div className="space-y-4">
                {qrCode && (
                  <div>
                    <p className="text-sm text-gray-700 mb-4">
                      Scan this QR code with your authenticator app:
                    </p>
                    <div className="bg-white p-4 rounded-lg border border-gray-200 inline-block">
                      <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
                    </div>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Enter verification code
                  </label>
                  <input
                    type="text"
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value)}
                    placeholder="123456"
                    className="w-32 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={confirmTwoFactor}
                    disabled={twoFactorCode.length !== 6}
                    className="btn-primary disabled:opacity-50"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => {
                      setTwoFactorStatus('idle');
                      setQrCode('');
                      setTwoFactorCode('');
                    }}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            {twoFactorStatus === 'idle' ? (
              <button
                onClick={() => setTwoFactorStatus('disabling')}
                className="text-red-600 hover:text-red-700 font-medium"
              >
                Disable Two-Factor Authentication
              </button>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Enter verification code to disable 2FA
                  </label>
                  <input
                    type="text"
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value)}
                    placeholder="123456"
                    className="w-32 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={disableTwoFactor}
                    disabled={twoFactorCode.length !== 6}
                    className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50"
                  >
                    Disable 2FA
                  </button>
                  <button
                    onClick={() => {
                      setTwoFactorStatus('idle');
                      setTwoFactorCode('');
                    }}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Active Sessions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <ClockIcon className="h-5 w-5 text-gray-500 mr-2" />
          <h4 className="text-md font-medium text-gray-900">Active Sessions</h4>
        </div>
        
        <div className="space-y-4">
          {securitySettings.login_sessions.map((session) => (
            <div key={session.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div>
                <div className="flex items-center space-x-2">
                  <p className="font-medium text-gray-900">{session.device}</p>
                  {session.current && (
                    <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
                      Current Session
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500">{session.location}</p>
                <p className="text-sm text-gray-500">Last active: {session.last_active}</p>
              </div>
              
              {!session.current && (
                <button
                  onClick={() => revokeSession(session.id)}
                  className="text-red-600 hover:text-red-700 text-sm font-medium"
                >
                  Revoke
                </button>
              )}
            </div>
          ))}
          
          {securitySettings.login_sessions.length === 0 && (
            <p className="text-gray-500 text-center py-4">No active sessions found</p>
          )}
        </div>
      </div>

      {/* Security Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <ExclamationTriangleIcon className="h-5 w-5 text-blue-400 mt-0.5" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Security Tips</h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li>Use a strong, unique password for your account</li>
                <li>Enable two-factor authentication for extra security</li>
                <li>Regularly review your active sessions</li>
                <li>Never share your login credentials with others</li>
                <li>Log out from shared or public devices</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecuritySettings;