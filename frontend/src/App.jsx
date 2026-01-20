import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Director from "./pages/director/Director";
import { Asosiy, Sotish, Ombor, Hisob } from "./pages";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/director" />} />
        <Route path="/director" element={<Director />}>
          <Route index element={<Navigate to="asosiy" />} />
          <Route path="asosiy" element={<Asosiy />} />
          <Route path="sotish" element={<Sotish />} />
          <Route path="ombor" element={<Ombor />} />
          <Route path="hisob" element={<Hisob />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;