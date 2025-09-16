import { Routes, Route } from 'react-router-dom';
import IntakePatientSelector from './Intake/IntakePatientSelector';
import IntakeForm from './Intake/IntakeForm';
import { useFrontDeskRealtime } from '@/hooks/useFrontDeskRealtime';

export default function Intake() {
  // Ensure realtime invalidations also affect Intake views
  useFrontDeskRealtime();

  return (
    <Routes>
      <Route index element={<IntakePatientSelector />} />
      <Route path="form" element={<IntakeForm />} />
    </Routes>
  );
}
