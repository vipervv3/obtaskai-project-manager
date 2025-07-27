import React, { useState, useEffect } from 'react';
import { 
  PaintBrushIcon,
  MoonIcon,
  SunIcon,
  ComputerDesktopIcon,
  CheckCircleIcon,
  XCircleIcon,
  SwatchIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import apiService from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';

interface AppearanceSettingsData {
  theme: 'light' | 'dark' | 'system';
  primary_color: string;
  sidebar_position: 'left' | 'right';
  compact_mode: boolean;
  animations_enabled: boolean;
  font_size: 'small' | 'medium' | 'large';
  language: string;
  timezone: string;
}

const AppearanceSettings: React.FC = () => {
  const themeContext = useTheme();
  const [settings, setSettings] = useState<AppearanceSettingsData>({
    theme: themeContext.theme,
    primary_color: themeContext.primaryColor,
    sidebar_position: themeContext.sidebarPosition,
    compact_mode: themeContext.compactMode,
    animations_enabled: themeContext.animationsEnabled,
    font_size: themeContext.fontSize,
    language: 'en',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const themeOptions = [
    { value: 'light', label: 'Light', icon: SunIcon, description: 'Light theme' },
    { value: 'dark', label: 'Dark', icon: MoonIcon, description: 'Dark theme' },
    { value: 'system', label: 'System', icon: ComputerDesktopIcon, description: 'Follow system preference' }
  ];

  const colorOptions = [
    { name: 'Blue', value: '#3B82F6', class: 'bg-blue-500' },
    { name: 'Purple', value: '#8B5CF6', class: 'bg-purple-500' },
    { name: 'Green', value: '#10B981', class: 'bg-green-500' },
    { name: 'Orange', value: '#F59E0B', class: 'bg-orange-500' },
    { name: 'Red', value: '#EF4444', class: 'bg-red-500' },
    { name: 'Pink', value: '#EC4899', class: 'bg-pink-500' },
    { name: 'Indigo', value: '#6366F1', class: 'bg-indigo-500' },
    { name: 'Teal', value: '#14B8A6', class: 'bg-teal-500' }
  ];

  const fontSizeOptions = [
    { value: 'small', label: 'Small', example: 'text-sm' },
    { value: 'medium', label: 'Medium', example: 'text-base' },
    { value: 'large', label: 'Large', example: 'text-lg' }
  ];

  const languageOptions = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Español' },
    { value: 'fr', label: 'Français' },
    { value: 'de', label: 'Deutsch' },
    { value: 'it', label: 'Italiano' },
    { value: 'pt', label: 'Português' },
    { value: 'ru', label: 'Русский' },
    { value: 'zh', label: '中文' },
    { value: 'ja', label: '日本語' },
    { value: 'ko', label: '한국어' }
  ];

  const timezoneOptions = [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Toronto',
    'America/Vancouver',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Europe/Rome',
    'Europe/Madrid',
    'Europe/Amsterdam',
    'Europe/Stockholm',
    'Europe/Zurich',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Asia/Hong_Kong',
    'Asia/Singapore',
    'Asia/Seoul',
    'Asia/Mumbai',
    'Asia/Dubai',
    'Australia/Sydney',
    'Australia/Melbourne',
    'Pacific/Auckland'
  ];

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await apiService.get('/user/appearance');
      if (response.data.data) {
        const loadedSettings = { ...settings, ...response.data.data };
        setSettings(loadedSettings);
        
        // Sync with theme context
        if (loadedSettings.theme !== themeContext.theme) {
          themeContext.setTheme(loadedSettings.theme);
        }
        if (loadedSettings.primary_color !== themeContext.primaryColor) {
          themeContext.setPrimaryColor(loadedSettings.primary_color);
        }
        if (loadedSettings.compact_mode !== themeContext.compactMode) {
          themeContext.setCompactMode(loadedSettings.compact_mode);
        }
        if (loadedSettings.animations_enabled !== themeContext.animationsEnabled) {
          themeContext.setAnimationsEnabled(loadedSettings.animations_enabled);
        }
        if (loadedSettings.font_size !== themeContext.fontSize) {
          themeContext.setFontSize(loadedSettings.font_size);
        }
        if (loadedSettings.sidebar_position !== themeContext.sidebarPosition) {
          themeContext.setSidebarPosition(loadedSettings.sidebar_position);
        }
      }
    } catch (error) {
      console.error('Error loading appearance settings:', error);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    setSaveStatus('idle');

    try {
      const response = await apiService.put('/user/appearance', settings);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error: any) {
      console.error('Error saving appearance settings:', error);
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const handleSettingChange = (key: keyof AppearanceSettingsData, value: any) => {
    setSettings({ ...settings, [key]: value });
    
    // Update theme context immediately for real-time preview
    switch (key) {
      case 'theme':
        themeContext.setTheme(value);
        break;
      case 'primary_color':
        themeContext.setPrimaryColor(value);
        break;
      case 'sidebar_position':
        themeContext.setSidebarPosition(value);
        break;
      case 'compact_mode':
        themeContext.setCompactMode(value);
        break;
      case 'animations_enabled':
        themeContext.setAnimationsEnabled(value);
        break;
      case 'font_size':
        themeContext.setFontSize(value);
        break;
    }
  };

  const resetToDefaults = () => {
    const defaults = {
      theme: 'system' as const,
      primary_color: '#3B82F6',
      sidebar_position: 'left' as const,
      compact_mode: false,
      animations_enabled: true,
      font_size: 'medium' as const,
      language: 'en',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
    
    setSettings(defaults);
    
    // Update theme context
    themeContext.setTheme(defaults.theme);
    themeContext.setPrimaryColor(defaults.primary_color);
    themeContext.setSidebarPosition(defaults.sidebar_position);
    themeContext.setCompactMode(defaults.compact_mode);
    themeContext.setAnimationsEnabled(defaults.animations_enabled);
    themeContext.setFontSize(defaults.font_size);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Appearance Settings</h3>
          <p className="text-sm text-gray-600">
            Customize the look and feel of your application
          </p>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={resetToDefaults}
            className="btn-secondary"
          >
            Reset to Defaults
          </button>
          <button
            onClick={saveSettings}
            disabled={saving}
            className="btn-primary"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
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
          {saveStatus === 'success' ? 'Settings saved successfully' : 'Failed to save settings'}
        </div>
      )}

      {/* Theme Selection */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <MoonIcon className="h-5 w-5 text-gray-500 mr-2" />
          <h4 className="text-md font-medium text-gray-900">Theme</h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {themeOptions.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.value}
                onClick={() => handleSettingChange('theme', option.value)}
                className={`p-4 border-2 rounded-lg transition-all ${
                  settings.theme === option.value
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Icon className="h-6 w-6 mx-auto mb-2 text-gray-600" />
                <p className="font-medium text-gray-900">{option.label}</p>
                <p className="text-sm text-gray-500">{option.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Color Scheme */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <SwatchIcon className="h-5 w-5 text-gray-500 mr-2" />
          <h4 className="text-md font-medium text-gray-900">Primary Color</h4>
        </div>

        <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
          {colorOptions.map((color) => (
            <button
              key={color.value}
              onClick={() => handleSettingChange('primary_color', color.value)}
              className={`relative w-12 h-12 rounded-lg ${color.class} transition-all hover:scale-110`}
              title={color.name}
            >
              {settings.primary_color === color.value && (
                <CheckCircleIcon className="absolute inset-0 w-full h-full text-white p-2" />
              )}
            </button>
          ))}
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Custom Color
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="color"
              value={settings.primary_color}
              onChange={(e) => handleSettingChange('primary_color', e.target.value)}
              className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
            />
            <input
              type="text"
              value={settings.primary_color}
              onChange={(e) => handleSettingChange('primary_color', e.target.value)}
              placeholder="#3B82F6"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>
      </div>

      {/* Layout & Interface */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <PaintBrushIcon className="h-5 w-5 text-gray-500 mr-2" />
          <h4 className="text-md font-medium text-gray-900">Layout & Interface</h4>
        </div>

        <div className="space-y-6">
          {/* Sidebar Position */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sidebar Position
            </label>
            <div className="flex space-x-4">
              {['left', 'right'].map((position) => (
                <label key={position} className="flex items-center">
                  <input
                    type="radio"
                    value={position}
                    checked={settings.sidebar_position === position}
                    onChange={(e) => handleSettingChange('sidebar_position', e.target.value)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700 capitalize">{position}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Font Size */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Font Size
            </label>
            <div className="grid grid-cols-3 gap-3">
              {fontSizeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSettingChange('font_size', option.value)}
                  className={`p-3 border rounded-lg text-center transition-all ${
                    settings.font_size === option.value
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={option.example}>Aa</div>
                  <div className="text-sm font-medium mt-1">{option.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Toggle Options */}
          <div className="space-y-4">
            {/* Compact Mode */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Compact Mode
                </label>
                <p className="text-sm text-gray-500">
                  Reduce padding and spacing throughout the interface
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.compact_mode}
                  onChange={(e) => handleSettingChange('compact_mode', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>

            {/* Animations */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Enable Animations
                </label>
                <p className="text-sm text-gray-500">
                  Show smooth transitions and animations
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.animations_enabled}
                  onChange={(e) => handleSettingChange('animations_enabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Localization */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <EyeIcon className="h-5 w-5 text-gray-500 mr-2" />
          <h4 className="text-md font-medium text-gray-900">Localization</h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Language */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Language
            </label>
            <select
              value={settings.language}
              onChange={(e) => handleSettingChange('language', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            >
              {languageOptions.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

          {/* Timezone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Timezone
            </label>
            <select
              value={settings.timezone}
              onChange={(e) => handleSettingChange('timezone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            >
              {timezoneOptions.map((tz) => (
                <option key={tz} value={tz}>
                  {tz.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h4 className="text-md font-medium text-gray-900 mb-4">Preview</h4>
        
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <div className="mb-4">
            <div 
              className="inline-block px-4 py-2 rounded-md text-white font-medium"
              style={{ backgroundColor: settings.primary_color }}
            >
              Primary Button
            </div>
          </div>
          
          <div className={`space-y-2 ${
            settings.font_size === 'small' ? 'text-sm' :
            settings.font_size === 'large' ? 'text-lg' : 'text-base'
          }`}>
            <p className="font-medium text-gray-900">Sample Heading</p>
            <p className="text-gray-600">
              This is how your content will appear with the selected font size and theme.
            </p>
          </div>
          
          {settings.compact_mode && (
            <div className="mt-2 text-xs text-blue-600">
              ✓ Compact mode enabled - reduced spacing
            </div>
          )}
          
          {!settings.animations_enabled && (
            <div className="mt-2 text-xs text-orange-600">
              ⚠ Animations disabled - static interface
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AppearanceSettings;