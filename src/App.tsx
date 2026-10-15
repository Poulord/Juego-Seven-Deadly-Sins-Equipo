import { lazy, Suspense } from "react";
import GameApp from "./game/GameApp";
const LegacyApp = lazy(() => import("./LegacyApp"));
export default function App() {
  return new URLSearchParams(location.search).get("legacy") === "1" ? (
    <Suspense fallback={<p>Cargando planes anteriores…</p>}>
      <LegacyApp />
    </Suspense>
  ) : (
    <GameApp />
  );
}
