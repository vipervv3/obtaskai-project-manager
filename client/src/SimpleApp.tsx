import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';

// Simple auth state without Redux
const useAuth = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const login = async (email: string, password: string) => {
    setLoading(true);
    // Mock login - just set a user
    setTimeout(() => {
      setUser({ email, name: email.split('@')[0] });
      setLoading(false);
    }, 1000);
  };

  const logout = () => {
    setUser(null);
  };

  return { user, loading, login, logout };
};

// Simple login component
const LoginPage = ({ onLogin }: { onLogin: (email: string, password: string) => void }) => {
  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('password');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(email, password);
  };

  return (
    <div style={{ padding: '40px', maxWidth: '400px', margin: '0 auto' }}>
      <h1>Login to Obtask AI</h1>
      <form onSubmit={handleSubmit} style={{ marginTop: '20px' }}>
        <div style={{ marginBottom: '15px' }}>
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>
        <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}>
          Login
        </button>
      </form>
    </div>
  );
};

// Simple dashboard
const Dashboard = ({ user, onLogout }: { user: any; onLogout: () => void }) => {
  return (
    <div style={{ padding: '20px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '1px solid #eee', paddingBottom: '15px' }}>
        <h1>Obtask AI</h1>
        <div>
          <span style={{ marginRight: '15px' }}>Welcome, {user.name}</span>
          <button onClick={onLogout} style={{ padding: '5px 10px' }}>Logout</button>
        </div>
      </header>
      
      <nav style={{ marginBottom: '30px' }}>
        <Link to="/dashboard" style={{ marginRight: '20px', color: '#007bff', textDecoration: 'none' }}>Dashboard</Link>
        <Link to="/projects" style={{ marginRight: '20px', color: '#007bff', textDecoration: 'none' }}>Projects</Link>
        <Link to="/meetings" style={{ marginRight: '20px', color: '#007bff', textDecoration: 'none' }}>Meetings</Link>
        <Link to="/ai" style={{ color: '#007bff', textDecoration: 'none' }}>AI Insights</Link>
      </nav>

      <Routes>
        <Route path="/dashboard" element={<DashboardContent />} />
        <Route path="/projects" element={<ProjectsContent />} />
        <Route path="/meetings" element={<MeetingsContent />} />
        <Route path="/ai" element={<AIContent />} />
        <Route path="/" element={<DashboardContent />} />
      </Routes>
    </div>
  );
};

const DashboardContent = () => (
  <div>
    <h2>Dashboard</h2>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginTop: '20px' }}>
      <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h3>Recent Activity</h3>
        <p>Your recent project updates will appear here.</p>
      </div>
      <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h3>Quick Stats</h3>
        <p>Projects: 3</p>
        <p>Tasks: 12</p>
        <p>Meetings: 5</p>
      </div>
    </div>
  </div>
);

const ProjectsContent = () => (
  <div>
    <h2>Projects</h2>
    <div style={{ marginTop: '20px' }}>
      <div style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '8px', marginBottom: '10px' }}>
        <h3>Sample Project 1</h3>
        <p>A demo project to show the interface</p>
      </div>
      <div style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '8px', marginBottom: '10px' }}>
        <h3>Sample Project 2</h3>
        <p>Another demo project</p>
      </div>
    </div>
  </div>
);

const MeetingsContent = () => (
  <div>
    <h2>Meetings</h2>
    <div style={{ marginTop: '20px' }}>
      <div style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '8px', marginBottom: '10px' }}>
        <h3>Weekly Standup</h3>
        <p>Last meeting: Yesterday</p>
      </div>
      <div style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '8px', marginBottom: '10px' }}>
        <h3>Project Review</h3>
        <p>Scheduled for tomorrow</p>
      </div>
    </div>
  </div>
);

const AIContent = () => (
  <div>
    <h2>AI Insights</h2>
    <div style={{ marginTop: '20px' }}>
      <div style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '8px', marginBottom: '10px' }}>
        <h3>📊 Project Analytics</h3>
        <p>Your projects are on track with 85% completion rate</p>
      </div>
      <div style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '8px', marginBottom: '10px' }}>
        <h3>🤖 Smart Recommendations</h3>
        <p>Consider scheduling a team meeting to discuss upcoming deadlines</p>
      </div>
    </div>
  </div>
);

// Main app component
const SimpleApp = () => {
  const { user, loading, login, logout } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      {!user ? (
        <LoginPage onLogin={login} />
      ) : (
        <Dashboard user={user} onLogout={logout} />
      )}
    </BrowserRouter>
  );
};

export default SimpleApp;