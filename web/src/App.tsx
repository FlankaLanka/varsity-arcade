import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ArcadeHub } from './pages/ArcadeHub';
import { AsteroidsGame } from './games/AsteroidsGame';
import { PacManMathGame } from './games/PacManMathGame';
import { PHInvadersGame } from './games/PHInvadersGame';
import { ResultsPage } from './pages/ResultsPage';
import { LeaderboardPage } from './pages/LeaderboardPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<ArcadeHub />} />
          <Route path="/game/asteroids" element={<AsteroidsGame />} />
          <Route path="/game/pacman-math" element={<PacManMathGame />} />
          <Route path="/game/ph-invaders" element={<PHInvadersGame />} />
          <Route path="/results" element={<ResultsPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="*" element={<div className="p-10 text-center text-neon-pink font-pixel">404: LEVEL NOT FOUND</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
