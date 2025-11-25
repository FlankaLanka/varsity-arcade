import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ArcadeHub } from './pages/ArcadeHub';
import { AsteroidsGame } from './games/AsteroidsGame';
import { PacManMathGame } from './games/PacManMathGame';
import { PHInvadersGame } from './games/PHInvadersGame';
import { PongArithmeticGame } from './games/PongArithmeticGame';
import { ResultsPage } from './pages/ResultsPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { ProfilePage } from './pages/ProfilePage';
import { FriendProfilePage } from './pages/FriendProfilePage';
import CohortsPage from './pages/CohortsPage';
import CohortRoomPage from './pages/CohortRoomPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthPage } from './pages/AuthPage';

function AuthenticatedApp() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<ArcadeHub />} />
          <Route path="/game/asteroids" element={<AsteroidsGame />} />
          <Route path="/game/pacman-math" element={<PacManMathGame />} />
          <Route path="/game/ph-invaders" element={<PHInvadersGame />} />
          <Route path="/game/pong-arithmetic" element={<PongArithmeticGame />} />
          <Route path="/results" element={<ResultsPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/friend/:friendId" element={<FriendProfilePage />} />
          <Route path="/cohorts" element={<CohortsPage />} />
          <Route path="/cohorts/:cohortId" element={<CohortRoomPage />} />
          <Route path="*" element={<div className="p-10 text-center text-neon-pink font-pixel">404: LEVEL NOT FOUND</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

function App() {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
}

export default App;
