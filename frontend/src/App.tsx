import { Routes, Route } from "react-router-dom"
import Layout from "./components/Layout"
import Landing from "./pages/Landing"
import Analyze from "./pages/Analyze"
import Reports from "./pages/Reports"

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/analyze" element={<Analyze />} />
        <Route path="/reports" element={<Reports />} />
      </Route>
    </Routes>
  )
}
