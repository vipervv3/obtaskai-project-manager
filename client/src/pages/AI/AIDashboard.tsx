import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { fetchProjects } from '../../store/slices/projectsSlice';
import { User } from '../../types';
import aiService from '../../services/aiService';
import {
  LightBulbIcon,
  ClockIcon,
  ChartBarIcon,
  UsersIcon,
  CalendarIcon,
  BellIcon,
  ArrowTrendingUpIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  SparklesIcon,
  CpuChipIcon,
} from '@heroicons/react/24/outline';

interface AIInsight {
  id: string;
  type: string;
  title: string;
  description: string;
  confidence: number;
  priority?: string;
  estimatedImpact?: string;
  suggestedAction?: string;
  actionable: boolean;
  data?: any;
}

const AIDashboard: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { projects, loading } = useSelector((state: RootState) => state.projects);
  const { user } = useSelector((state: RootState) => state.auth);

  const [activeTab, setActiveTab] = useState<'scheduling' | 'analytics' | 'meetings' | 'resources' | 'timeline' | 'notifications'>('scheduling');
  const [insights, setInsights] = useState<{
    scheduling: AIInsight[];
    analytics: any[];
    meetings: any[];
    resources: AIInsight[];
    timeline: AIInsight[];
    notifications: AIInsight[];
  }>({
    scheduling: [],
    analytics: [],
    meetings: [],
    resources: [],
    timeline: [],
    notifications: []
  });

  useEffect(() => {
    dispatch(fetchProjects());
  }, [dispatch]);

  useEffect(() => {
    if (projects.length > 0 && user) {
      generateAllInsights();
    }
  }, [projects, user]);

  const generateAllInsights = () => {
    const allTasks = projects.flatMap(p => p.tasks || []);
    const teamMembers = projects.flatMap(p => p.members?.map(m => m.user).filter(Boolean) || []) as User[];
    const recentActivity: any[] = []; // Mock data

    // 1. Smart Task Scheduling
    const schedulingInsights = aiService.suggestOptimalSchedule(allTasks);

    // 2. Advanced Project Analytics
    const analyticsInsights = projects.map(project => 
      aiService.generateAdvancedProjectInsights(project)
    );

    // 3. Meeting Summaries (mock data)
    const meetingInsights = [
      aiService.generateMeetingSummary(
        "We discussed the project timeline and agreed to extend the deadline by one week. John will handle the backend integration by Friday. Sarah needs to complete the frontend design review.",
        ['John Doe', 'Sarah Smith', 'Mike Johnson'],
        45
      )
    ];

    // 4. Smart Resource Allocation
    const resourceInsights = aiService.optimizeResourceAllocation(projects, teamMembers);

    // 5. Predictive Timeline Management
    const timelineInsights = aiService.generateTimelinePredictions(projects);

    // 6. Intelligent Notifications
    const notificationInsights = aiService.generateContextualNotifications(user!, projects, recentActivity);

    setInsights({
      scheduling: schedulingInsights,
      analytics: analyticsInsights,
      meetings: meetingInsights,
      resources: resourceInsights,
      timeline: timelineInsights,
      notifications: notificationInsights
    });
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'scheduling':
        return <ClockIcon className="w-5 h-5" />;
      case 'analytics':
        return <ChartBarIcon className="w-5 h-5" />;
      case 'meetings':
        return <UsersIcon className="w-5 h-5" />;
      case 'resources':
        return <UsersIcon className="w-5 h-5" />;
      case 'timeline':
        return <ArrowTrendingUpIcon className="w-5 h-5" />;
      case 'notifications':
        return <BellIcon className="w-5 h-5" />;
      default:
        return <LightBulbIcon className="w-5 h-5" />;
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'high':
        return 'bg-orange-50 border-orange-200 text-orange-800';
      case 'medium':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'low':
        return 'bg-green-50 border-green-200 text-green-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const tabs = [
    { id: 'scheduling', name: 'Smart Scheduling', icon: ClockIcon, count: insights.scheduling.length },
    { id: 'analytics', name: 'Project Analytics', icon: ChartBarIcon, count: insights.analytics.length },
    { id: 'meetings', name: 'Meeting Summaries', icon: UsersIcon, count: insights.meetings.length },
    { id: 'resources', name: 'Resource Allocation', icon: UsersIcon, count: insights.resources.length },
    { id: 'timeline', name: 'Timeline Predictions', icon: ArrowTrendingUpIcon, count: insights.timeline.length },
    { id: 'notifications', name: 'Smart Notifications', icon: BellIcon, count: insights.notifications.length },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CpuChipIcon className="w-7 h-7 text-primary-600" />
            AI-Powered Insights
          </h1>
          <p className="text-gray-600 mt-1">Advanced AI analysis and recommendations for your projects</p>
        </div>
        <button
          onClick={generateAllInsights}
          className="btn-primary flex items-center gap-2"
        >
          <SparklesIcon className="w-4 h-4" />
          Refresh Insights
        </button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {tabs.map((tab) => (
          <div key={tab.id} className="card text-center">
            <tab.icon className="w-8 h-8 text-primary-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{tab.count}</div>
            <div className="text-sm text-gray-600">{tab.name}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {tabs.map((tab) => {
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <TabIcon className="w-4 h-4" />
                {tab.name}
                {tab.count > 0 && (
                  <span className="bg-gray-100 text-gray-900 rounded-full px-2 py-1 text-xs">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {/* Smart Scheduling */}
        {activeTab === 'scheduling' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Smart Task Scheduling</h2>
            {insights.scheduling.length === 0 ? (
              <div className="card text-center py-8">
                <ClockIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Scheduling Insights</h3>
                <p className="text-gray-600">Create some tasks with deadlines to get AI scheduling recommendations.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {insights.scheduling.map((insight) => (
                  <div key={insight.id} className={`card border ${getPriorityColor(insight.priority)}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {getInsightIcon('scheduling')}
                        <h3 className="font-semibold">{insight.title}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${getConfidenceColor(insight.confidence)}`}>
                          {Math.round(insight.confidence * 100)}%
                        </span>
                        {insight.priority && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-white border">
                            {insight.priority}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm mb-3">{insight.description}</p>
                    {insight.estimatedImpact && (
                      <p className="text-xs text-gray-600 mb-2">
                        <strong>Impact:</strong> {insight.estimatedImpact}
                      </p>
                    )}
                    {insight.suggestedAction && insight.actionable && (
                      <div className="mt-3 p-2 bg-white rounded border">
                        <p className="text-sm font-medium text-gray-900">Suggested Action:</p>
                        <p className="text-sm text-gray-700">{insight.suggestedAction}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Project Analytics */}
        {activeTab === 'analytics' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Advanced Project Analytics</h2>
            {insights.analytics.length === 0 ? (
              <div className="card text-center py-8">
                <ChartBarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Analytics Available</h3>
                <p className="text-gray-600">Create some projects with tasks to get detailed analytics.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {insights.analytics.map((analytics, index) => (
                  <div key={index} className="card">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">{projects[index]?.name}</h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        analytics.riskLevel === 'high' ? 'bg-red-100 text-red-800' :
                        analytics.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {analytics.riskLevel} risk
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary-600">
                          {Math.round(analytics.predictiveAnalytics?.successProbability * 100 || 0)}%
                        </div>
                        <div className="text-sm text-gray-600">Success Probability</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {analytics.performanceMetrics?.qualityScore || 0}
                        </div>
                        <div className="text-sm text-gray-600">Quality Score</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {analytics.performanceMetrics?.teamSatisfaction || 0}
                        </div>
                        <div className="text-sm text-gray-600">Team Satisfaction</div>
                      </div>
                    </div>

                    {analytics.predictiveAnalytics?.riskFactors?.length > 0 && (
                      <div className="mb-4">
                        <h4 className="font-medium text-gray-900 mb-2">Risk Factors</h4>
                        <div className="space-y-2">
                          {analytics.predictiveAnalytics.riskFactors.map((risk: any, i: number) => (
                            <div key={i} className="flex items-center justify-between p-2 bg-red-50 rounded">
                              <span className="text-sm text-red-800">{risk.factor}</span>
                              <span className="text-xs text-red-600">
                                {Math.round(risk.probability * 100)}% probability
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="text-sm text-gray-600">
                      <strong>Velocity Trend:</strong> {analytics.performanceMetrics?.velocityTrend}
                      <br />
                      <strong>Estimated Completion:</strong> {new Date(analytics.completionPrediction.estimatedDate).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Meeting Summaries */}
        {activeTab === 'meetings' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">AI Meeting Summaries</h2>
            {insights.meetings.length === 0 ? (
              <div className="card text-center py-8">
                <UsersIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Meeting Summaries</h3>
                <p className="text-gray-600">Conduct meetings to get AI-generated summaries and action items.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {insights.meetings.map((meeting, index) => (
                  <div key={index} className="card">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Meeting Summary</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Engagement: {meeting.engagementScore}%</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          meeting.sentiment === 'positive' ? 'bg-green-100 text-green-800' :
                          meeting.sentiment === 'negative' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {meeting.sentiment}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Executive Summary</h4>
                        <p className="text-sm text-gray-600 mb-4">{meeting.executiveSummary}</p>
                        
                        <h4 className="font-medium text-gray-900 mb-2">Action Items</h4>
                        <div className="space-y-2">
                          {meeting.actionItems.map((item: any, i: number) => (
                            <div key={i} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                              <span className="text-sm text-blue-800">{item.item}</span>
                              <div className="flex items-center gap-2">
                                {item.assignee && (
                                  <span className="text-xs text-blue-600">{item.assignee}</span>
                                )}
                                <span className={`px-2 py-1 rounded text-xs ${
                                  item.priority === 'high' ? 'bg-red-100 text-red-800' :
                                  item.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-green-100 text-green-800'
                                }`}>
                                  {item.priority}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Key Decisions</h4>
                        <div className="space-y-2 mb-4">
                          {meeting.keyDecisions.map((decision: any, i: number) => (
                            <div key={i} className="p-2 bg-green-50 rounded">
                              <span className="text-sm text-green-800">{decision.decision}</span>
                              <div className="text-xs text-green-600 mt-1">
                                Impact: {decision.impact}
                              </div>
                            </div>
                          ))}
                        </div>

                        <h4 className="font-medium text-gray-900 mb-2">Next Steps</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {meeting.nextSteps.map((step: string, i: number) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-primary-600 mt-1">•</span>
                              {step}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Resource Allocation, Timeline, and Notifications tabs follow similar patterns */}
        {/* For brevity, showing simplified versions */}
        
        {activeTab === 'resources' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Smart Resource Allocation</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {insights.resources.map((insight) => (
                <div key={insight.id} className={`card border ${getPriorityColor(insight.priority)}`}>
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold">{insight.title}</h3>
                    <span className={`text-sm font-medium ${getConfidenceColor(insight.confidence)}`}>
                      {Math.round(insight.confidence * 100)}%
                    </span>
                  </div>
                  <p className="text-sm mb-3">{insight.description}</p>
                  {insight.suggestedAction && (
                    <div className="mt-3 p-2 bg-white rounded border">
                      <p className="text-sm font-medium">Suggested Action:</p>
                      <p className="text-sm text-gray-700">{insight.suggestedAction}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'timeline' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Predictive Timeline Management</h2>
            <div className="space-y-4">
              {insights.timeline.map((insight) => (
                <div key={insight.id} className={`card border ${getPriorityColor(insight.priority)}`}>
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold">{insight.title}</h3>
                    <span className={`text-sm font-medium ${getConfidenceColor(insight.confidence)}`}>
                      {Math.round(insight.confidence * 100)}%
                    </span>
                  </div>
                  <p className="text-sm mb-3">{insight.description}</p>
                  {insight.estimatedImpact && (
                    <p className="text-xs text-gray-600 mb-2">
                      <strong>Impact:</strong> {insight.estimatedImpact}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Intelligent Notifications</h2>
            <div className="space-y-4">
              {insights.notifications.map((insight) => (
                <div key={insight.id} className={`card border ${getPriorityColor(insight.priority)}`}>
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold">{insight.title}</h3>
                    <span className={`text-sm font-medium ${getConfidenceColor(insight.confidence)}`}>
                      {Math.round(insight.confidence * 100)}%
                    </span>
                  </div>
                  <p className="text-sm mb-3">{insight.description}</p>
                  {insight.suggestedAction && (
                    <div className="mt-3 p-2 bg-white rounded border">
                      <p className="text-sm font-medium">Suggested Action:</p>
                      <p className="text-sm text-gray-700">{insight.suggestedAction}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIDashboard;