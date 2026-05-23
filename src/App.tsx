import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import OverviewPage from '@/pages/OverviewPage';
import WeatherPage from '@/pages/WeatherPage';
import AirQualityPage from '@/pages/AirQualityPage';
import MtrPage from '@/pages/MtrPage';
import BusPage from '@/pages/BusPage';
import AssistantPage from '@/pages/AssistantPage';
import NotFoundPage from '@/pages/NotFoundPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/overview" replace />} />
        <Route path="overview" element={<OverviewPage />} />
        <Route path="weather" element={<WeatherPage />} />
        <Route path="air" element={<AirQualityPage />} />
        <Route path="mtr" element={<MtrPage />} />
        <Route path="bus" element={<BusPage />} />
        <Route path="assistant" element={<AssistantPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
