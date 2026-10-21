import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { CommandCenter } from './pages/CommandCenter';
import { ScenarioLibrary } from './pages/ScenarioLibrary';
import { ScenarioBuilder } from './pages/ScenarioBuilder';
import { SimulationWorkspace } from './pages/SimulationWorkspace';
import { EvidenceTimeline } from './pages/EvidenceTimeline';
import { DecisionScoring } from './pages/DecisionScoring';
import { AfterActionReview } from './pages/AfterActionReview';
import { AdaptiveTraining } from './pages/AdaptiveTraining';
import { ReportsHistory } from './pages/ReportsHistory';
import { TelemetryMonitor } from './pages/TelemetryMonitor';
import { SystemHealth } from './pages/SystemHealth';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<CommandCenter />} />
          <Route path="scenarios" element={<ScenarioLibrary />} />
          <Route path="scenarios/builder" element={<ScenarioBuilder />} />
          <Route path="simulation" element={<SimulationWorkspace />} />
          <Route path="telemetry" element={<TelemetryMonitor />} />
          <Route path="timeline" element={<EvidenceTimeline />} />
          <Route path="scoring" element={<DecisionScoring />} />
          <Route path="review" element={<AfterActionReview />} />
          <Route path="training" element={<AdaptiveTraining />} />
          <Route path="reports" element={<ReportsHistory />} />
          <Route path="health" element={<SystemHealth />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
