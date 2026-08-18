import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { Overview } from './pages/Overview';
import { Requests } from './pages/Requests';
import { Findings } from './pages/Findings';
import { Policies } from './pages/Policies';
import { Users } from './pages/Users';
import { Settings } from './pages/Settings';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<Overview />} />
          <Route path="requests" element={<Requests />} />
          <Route path="findings" element={<Findings />} />
          <Route path="policies" element={<Policies />} />
          <Route path="users" element={<Users />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
