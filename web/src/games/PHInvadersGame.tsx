import { useEffect, useRef, useState, useCallback } from 'react';
import { GameFrame } from '../components/GameFrame';
import { useGameCompletion } from '../hooks/useGameCompletion';

interface Enemy {
  x: number;
  y: number;
  row: number;
  alive: boolean;
  color: string;
  width: number;
  height: number;
}

interface Bullet {
  x: number;
  y: number;
  vy: number;
  type: 'player' | 'enemy';
  dead: boolean;
}

interface Chemical {
  x: number;
  y: number;
  type: 'acidic' | 'basic';
  pHShift: number;
  vx: number;
  vy: number;
  dead: boolean;
  compound: string;
}

const CHEMICAL_COMPOUNDS = {
  acidic: ['HCl', 'H2SO4', 'HNO3', 'HF'],
  basic: ['NaOH', 'KOH', 'NH3', 'Ca(OH)2'],
};

const ENEMY_ROWS = 4;
const ENEMY_COLS = 8;
const ENEMY_SPACING = 45;
const ENEMY_WIDTH = 28;
const ENEMY_HEIGHT = 22;

export const PHInvadersGame = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [pH, setPH] = useState(7.0);
  
  const gameStateRef = useRef<{
    player: { x: number; y: number; width: number; height: number; lastShot: number };
    enemies: Enemy[];
    bullets: Bullet[];
    chemicals: Chemical[];
    pH: number;
    score: number;
    lives: number;
    timeRemaining: number;
    active: boolean;
    keys: { a: boolean; d: boolean; space: boolean };
    enemyDirection: number;
    enemyMoveTimer: number;
    enemyShootTimer: number;
    lastPHScoreTime: number;
  } | null>(null);
  
  const animationIdRef = useRef<number | null>(null);

  const { completeGame } = useGameCompletion({ gameType: 'ph-invaders', gameName: 'pH Invaders' });

  const startGame = useCallback(() => {
    const enemies: Enemy[] = [];
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00'];
    
    for (let row = 0; row < ENEMY_ROWS; row++) {
      for (let col = 0; col < ENEMY_COLS; col++) {
        enemies.push({
          x: 80 + col * ENEMY_SPACING,
          y: 50 + row * 35,
          row,
          alive: true,
          color: colors[row % colors.length],
          width: ENEMY_WIDTH,
          height: ENEMY_HEIGHT,
        });
      }
    }

    gameStateRef.current = {
      player: { x: 350, y: 360, width: 35, height: 18, lastShot: 0 },
      enemies,
      bullets: [],
      chemicals: [],
      pH: 7.0,
      score: 0,
      lives: 3,
      timeRemaining: 60,
      active: true,
      keys: { a: false, d: false, space: false },
      enemyDirection: 1,
      enemyMoveTimer: 0,
      enemyShootTimer: 0,
      lastPHScoreTime: 60,
    };
    
    setScore(0);
    setLives(3);
    setGameOver(false);
    setTimeRemaining(60);
    setPH(7.0);
    setGameStarted(true);
  }, []);

  useEffect(() => {
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!gameStarted || gameOver || !gameStateRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 700;
    canvas.height = 400;
    canvas.tabIndex = 0;
    canvas.style.outline = 'none';

    const gameState = gameStateRef.current;
    let isFocused = false;

    const handleFocus = () => { isFocused = true; };
    const handleBlur = () => { isFocused = false; };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isFocused) return;
      const key = e.key.toLowerCase();
      if (key === 'a' || key === 'arrowleft') gameState.keys.a = true;
      if (key === 'd' || key === 'arrowright') gameState.keys.d = true;
      if (key === ' ') { e.preventDefault(); gameState.keys.space = true; }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!isFocused) return;
      const key = e.key.toLowerCase();
      if (key === 'a' || key === 'arrowleft') gameState.keys.a = false;
      if (key === 'd' || key === 'arrowright') gameState.keys.d = false;
      if (key === ' ') gameState.keys.space = false;
    };

    canvas.addEventListener('focus', handleFocus);
    canvas.addEventListener('blur', handleBlur);
    canvas.addEventListener('click', () => canvas.focus());
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const spawnChemical = (x: number, y: number) => {
      if (Math.random() > 0.5) return;
      
      const type = Math.random() > 0.5 ? 'acidic' : 'basic';
      const compounds = CHEMICAL_COMPOUNDS[type];
      
      gameState.chemicals.push({
        x,
        y,
        type,
        pHShift: 0.5 + Math.random() * 1.5,
        vx: (Math.random() - 0.5) * 0.5,
        vy: 1.5,
        dead: false,
        compound: compounds[Math.floor(Math.random() * compounds.length)],
      });
    };

    const getPHColor = (pH: number): string => {
      if (pH <= 3) return '#ff0000';
      if (pH <= 6) return '#ff8800';
      if (pH <= 8) return '#00ff00';
      if (pH <= 11) return '#88ccff';
      return '#0000ff';
    };

    const calculatePHScore = (pH: number): number => {
      const dist = Math.abs(pH - 7);
      return Math.floor(Math.max(10, 100 - dist * 10));
    };

    let lastTime = performance.now();

    const endGame = () => {
      gameState.active = false;
      setGameOver(true);
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
    };

    const loop = (time: number) => {
      if (!gameState.active) return;

      const dt = Math.min((time - lastTime) / 16.66, 3);
      lastTime = time;

      const { player, keys } = gameState;

      // Player movement
      if (keys.a) player.x = Math.max(0, player.x - 2.5 * dt);
      if (keys.d) player.x = Math.min(canvas.width - player.width, player.x + 2.5 * dt);

      // Player shooting
      if (keys.space && time - player.lastShot > 300) {
        gameState.bullets.push({
          x: player.x + player.width / 2,
          y: player.y,
          vy: -6,
          type: 'player',
          dead: false,
        });
        player.lastShot = time;
      }

      // Timer
      gameState.timeRemaining -= dt / 60;
      if (gameState.timeRemaining <= 0) {
        gameState.timeRemaining = 0;
        setTimeRemaining(0);
        endGame();
        return;
      }
      setTimeRemaining(Math.ceil(gameState.timeRemaining));

      // pH scoring
      const currentSec = Math.floor(gameState.timeRemaining);
      if (currentSec !== gameState.lastPHScoreTime) {
        gameState.score += calculatePHScore(gameState.pH);
        setScore(gameState.score);
        gameState.lastPHScoreTime = currentSec;
      }

      // Enemy movement
      gameState.enemyMoveTimer += dt;
      if (gameState.enemyMoveTimer > 30) {
        let moveDown = false;
        gameState.enemies.forEach(e => {
          if (!e.alive) return;
          if (e.x + ENEMY_WIDTH >= canvas.width && gameState.enemyDirection === 1) moveDown = true;
          if (e.x <= 0 && gameState.enemyDirection === -1) moveDown = true;
        });

        if (moveDown) {
          gameState.enemyDirection *= -1;
          gameState.enemies.forEach(e => { if (e.alive) e.y += 15; });
        } else {
          gameState.enemies.forEach(e => { if (e.alive) e.x += gameState.enemyDirection * 4; });
        }
        gameState.enemyMoveTimer = 0;
      }

      // Enemy shooting
      gameState.enemyShootTimer += dt;
      if (gameState.enemyShootTimer > 60) {
        const alive = gameState.enemies.filter(e => e.alive);
        if (alive.length > 0) {
          const shooter = alive[Math.floor(Math.random() * alive.length)];
          gameState.bullets.push({
            x: shooter.x + shooter.width / 2,
            y: shooter.y + shooter.height,
            vy: 2.5,
            type: 'enemy',
            dead: false,
          });
        }
        gameState.enemyShootTimer = 0;
      }

      // Update bullets
      gameState.bullets.forEach(b => {
        b.y += b.vy * dt;
        if (b.y < 0 || b.y > canvas.height) b.dead = true;
      });

      // Bullet-enemy collision
      gameState.bullets.forEach(b => {
        if (b.dead || b.type !== 'player') return;
        gameState.enemies.forEach(e => {
          if (!e.alive) return;
          if (b.x >= e.x && b.x <= e.x + e.width && b.y >= e.y && b.y <= e.y + e.height) {
            b.dead = true;
            e.alive = false;
            spawnChemical(e.x + e.width / 2, e.y + e.height);
            gameState.score += 50 + e.row * 10;
            setScore(gameState.score);
          }
        });
      });

      // Enemy bullet-player collision
      gameState.bullets.forEach(b => {
        if (b.dead || b.type !== 'enemy') return;
        if (b.x >= player.x && b.x <= player.x + player.width && b.y >= player.y && b.y <= player.y + player.height) {
          b.dead = true;
          gameState.lives--;
          setLives(gameState.lives);
          if (gameState.lives <= 0) endGame();
        }
      });

      // Update chemicals
      gameState.chemicals.forEach(c => {
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        if (c.y > canvas.height) c.dead = true;
      });

      // Chemical-player collision
      gameState.chemicals.forEach(c => {
        if (c.dead) return;
        const dx = c.x - (player.x + player.width / 2);
        const dy = c.y - (player.y + player.height / 2);
        if (Math.sqrt(dx * dx + dy * dy) < 18) {
          c.dead = true;
          if (c.type === 'acidic') {
            gameState.pH = Math.max(0, gameState.pH - c.pHShift);
          } else {
            gameState.pH = Math.min(14, gameState.pH + c.pHShift);
          }
          setPH(gameState.pH);
        }
      });

      // Cleanup
      gameState.bullets = gameState.bullets.filter(b => !b.dead);
      gameState.chemicals = gameState.chemicals.filter(c => !c.dead);

      // Win check
      if (gameState.enemies.filter(e => e.alive).length === 0) endGame();

      // Draw
      ctx.fillStyle = '#050510';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Enemies
      gameState.enemies.forEach(e => {
        if (!e.alive) return;
        ctx.fillStyle = e.color;
        ctx.fillRect(e.x, e.y, e.width, e.height);
        ctx.fillStyle = '#000';
        ctx.fillRect(e.x + 6, e.y + 4, 4, 4);
        ctx.fillRect(e.x + 16, e.y + 4, 4, 4);
      });

      // Bullets
      gameState.bullets.forEach(b => {
        if (b.dead) return;
        ctx.fillStyle = b.type === 'player' ? '#ffff00' : '#ff0000';
        ctx.beginPath();
        ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
        ctx.fill();
      });

      // Chemicals
      gameState.chemicals.forEach(c => {
        if (c.dead) return;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(c.x, c.y, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.font = 'bold 8px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(c.compound, c.x, c.y);
      });

      // Player
      ctx.fillStyle = '#00f3ff';
      ctx.beginPath();
      ctx.moveTo(player.x + player.width / 2, player.y);
      ctx.lineTo(player.x, player.y + player.height);
      ctx.lineTo(player.x + player.width, player.y + player.height);
      ctx.closePath();
      ctx.fill();

      // pH bar
      ctx.fillStyle = '#222';
      ctx.fillRect(10, canvas.height - 20, 120, 12);
      ctx.fillStyle = getPHColor(gameState.pH);
      ctx.fillRect(10, canvas.height - 20, (gameState.pH / 14) * 120, 12);
      ctx.fillStyle = '#fff';
      ctx.font = '8px "Press Start 2P"';
      ctx.fillText(`pH: ${gameState.pH.toFixed(1)}`, 15, canvas.height - 11);

      animationIdRef.current = requestAnimationFrame(loop);
    };

    gameState.active = true;
    animationIdRef.current = requestAnimationFrame(loop);
    setTimeout(() => canvas.focus(), 100);

    return () => {
      gameState.active = false;
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
      canvas.removeEventListener('focus', handleFocus);
      canvas.removeEventListener('blur', handleBlur);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameStarted, gameOver]);

  if (!gameStarted) {
    return (
      <GameFrame title="pH INVADERS" score={0} lives={3} timeRemaining={60} aspectRatio={16/9}>
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90">
          <h1 className="text-2xl text-neon-green font-['Press_Start_2P'] mb-4 animate-pulse">
            pH INVADERS
          </h1>
          
          <div className="bg-gray-900/80 border-2 border-neon-green rounded-lg p-4 mb-6 max-w-sm text-left">
            <h3 className="text-xs text-neon-yellow font-['Press_Start_2P'] mb-3 text-center">
              HOW TO PLAY
            </h3>
            <ul className="text-[10px] text-gray-300 space-y-2">
              <li>▸ Move: <span className="text-neon-green">A / D</span> | Shoot: <span className="text-neon-green">SPACE</span></li>
              <li>▸ Aliens drop <span className="text-neon-cyan">chemical compounds</span></li>
              <li>▸ <span className="text-red-400">Acids</span> lower pH, <span className="text-blue-400">bases</span> raise pH</li>
              <li>▸ Keep pH at <span className="text-neon-yellow">7</span> for max points!</li>
            </ul>
          </div>

          <button 
            onClick={startGame}
            className="px-6 py-3 bg-neon-green text-black font-['Press_Start_2P'] text-xs rounded hover:bg-green-400 hover:scale-105 transition-all"
          >
            START GAME
          </button>
        </div>
      </GameFrame>
    );
  }

  if (gameOver) {
    const victory = gameStateRef.current?.enemies.filter(e => e.alive).length === 0;
    
    return (
      <GameFrame title="pH INVADERS" score={score} lives={lives} timeRemaining={timeRemaining} aspectRatio={16/9}
        overlay={
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
            <h2 className="text-3xl text-neon-pink font-['Press_Start_2P'] mb-4 animate-pulse">
              {victory ? 'VICTORY!' : 'GAME OVER'}
            </h2>
            <div className="text-xl text-white font-['Press_Start_2P'] mb-2">SCORE: {score}</div>
            <div className="text-sm text-neon-cyan font-['Press_Start_2P'] mb-6">pH: {pH.toFixed(1)}</div>
            
            <div className="flex gap-4">
              <button onClick={startGame} className="retro-btn bg-neon-cyan text-black border-neon-cyan hover:bg-white text-xs">
                RETRY
              </button>
              <button onClick={() => completeGame(score)} className="retro-btn border-neon-pink text-neon-pink hover:bg-neon-pink hover:text-white text-xs">
                CONTINUE
              </button>
            </div>
          </div>
        }
      >
        <canvas ref={canvasRef} className="w-full h-full" />
      </GameFrame>
    );
  }

  return (
    <GameFrame title="pH INVADERS" score={score} lives={lives} timeRemaining={timeRemaining} aspectRatio={16/9}>
      <canvas ref={canvasRef} className="w-full h-full bg-transparent" />
    </GameFrame>
  );
};
