// core-frontend/src/App.tsx
import React, { useEffect, useState } from "react";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import { getModules } from "./api";
import AIHelper from "./components/AIHelper";

// Sleutel waaronder we het core-token in localStorage bewaren
const TOKEN_STORAGE_KEY = "casuse_core_auth_token";

const App: React.FC = () => {
  // 1) Probeer bij het opstarten van de app een bestaand token uit localStorage te halen
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY);
    } catch {
      // localStorage kan theoretisch falen (bijv. in private mode); dan starten we gewoon "leeg"
      return null;
    }
  });

  const [modules, setModules] = useState<any[]>([]);

  // 2) Telkens als het token verandert → modules laden (of leegmaken)
  useEffect(() => {
    if (!token) {
      // geen token → geen modules
      setModules([]);
      return;
    }

    getModules(token)
      .then(setModules)
      .catch(() => {
        // als het token ongeldig/verlopen is:
        // - modules leegmaken
        // - token verwijderen zodat we terug naar login gaan
        setModules([]);
        setToken(null);
      });
  }, [token]);

  // 3) Token synchroniseren met localStorage
  useEffect(() => {
    try {
      if (token) {
        localStorage.setItem(TOKEN_STORAGE_KEY, token);
      } else {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      }
    } catch {
      // Fouten in localStorage negeren – app blijft gewoon werken
    }
  }, [token]);

  // 4) Logout in core: token resetten (localStorage wordt via useEffect hierboven ook gewist)
  const handleLogout = () => {
    setToken(null);
  };

  // 5) Login-succes handler die we aan de Login-component doorgeven
  const handleLoginSuccess = (newToken: string) => {
    setToken(newToken);
  };

  return (
    <div className="app">
      <header className="topbar">
        <h1>casuse-hp</h1>
        {token && (
          <button className="logout-button" onClick={handleLogout}>
            Log uit
          </button>
        )}
      </header>

      <div className="content">
        {!token ? (
          <Login onSuccess={handleLoginSuccess} />
        ) : (
          <>
            <Dashboard modules={modules} />
            <AIHelper />
          </>
        )}
      </div>
    </div>
  );
};

export default App;
