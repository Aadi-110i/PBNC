import React, { useState } from 'react';
import Landing from './components/Landing';
import Dashboard from './components/Dashboard';

function App() {
  const [showDashboard, setShowDashboard] = useState(false);

  return (
    <div className="App">
      {showDashboard ? (
        <Dashboard />
      ) : (
        <Landing onGetStarted={() => setShowDashboard(true)} />
      )}
    </div>
  );
}

export default App;
