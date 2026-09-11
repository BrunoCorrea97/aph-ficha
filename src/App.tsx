import { Route, Routes } from "react-router-dom";
import { HomeScreen } from "./screens/HomeScreen";
import { HistoricoScreen } from "./screens/HistoricoScreen";
import { NovoAtendimentoWizard } from "./flow/NovoAtendimentoWizard";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeScreen />} />
      <Route path="/novo" element={<NovoAtendimentoWizard />} />
      <Route path="/historico" element={<HistoricoScreen />} />
    </Routes>
  );
}
