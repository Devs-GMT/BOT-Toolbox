import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AppLayout, ToolPage } from "./components/AppLayout";
import CommandPalette from "./components/CommandPalette";
import Home from "./pages/Home";
import { Guide } from "./pages/Guides";
import { Legal } from "./pages/Legal";
import NotFound from "./pages/NotFound";
import { SiteShell } from "./components/Site";
import Verify from "./pages/Verify";

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <ScrollTop />
      <CommandPalette />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/tools" element={<Navigate to="/tools/units" replace />} />
        <Route element={<AppLayout />}>
          <Route path="/tools/:tool" element={<ToolPage />} />
        </Route>
        <Route element={<SiteShell />}>
          <Route path="/verify" element={<Verify />} />
          <Route path="/verify/:id" element={<Verify />} />
          <Route path="/guides/:slug" element={<Guide />} />
          <Route path="/privacy" element={<Legal kind="privacy" />} />
          <Route path="/terms" element={<Legal kind="terms" />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </>
  );
}
