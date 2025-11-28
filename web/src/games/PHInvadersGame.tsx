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
  vx: number;
  vy: number;
  dead: boolean;
  compound: string;
  strength: number;
}

interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

interface Environment {
  type: 'acidic' | 'basic' | null;
  timer: number;
  duration: number;
}

const CHEMICAL_COMPOUNDS = {
  acidic: [
    { name: 'HCl', strength: 3 },    // Strong
    { name: 'H2SO4', strength: 3 },  // Strong
    { name: 'HNO3', strength: 3 },   // Strong
    { name: 'HF', strength: 2 },     // Medium
  ],
  basic: [
    { name: 'NaOH', strength: 3 },   // Strong
    { name: 'KOH', strength: 3 },    // Strong
    { name: 'NH3', strength: 1 },    // Weak
    { name: 'Ca(OH)2', strength: 2 }, // Medium
  ],
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
  
  const gameStateRef = useRef<{
    player: { x: number; y: number; width: number; height: number; lastShot: number };
    enemies: Enemy[];
    bullets: Bullet[];
    chemicals: Chemical[];
    floatingTexts: FloatingText[];
    environment: Environment;
    environmentTimer: number;
    score: number;
    lives: number;
    timeRemaining: number;
    active: boolean;
    keys: { a: boolean; d: boolean; space: boolean };
    enemyDirection: number;
    enemyMoveTimer: number;
    enemyShootTimer: number;
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

    // Trigger initial environment
    const initialType = Math.random() > 0.5 ? 'acidic' : 'basic';
    const initialDuration = 180 + Math.random() * 120;
    
    gameStateRef.current = {
      player: { x: 350, y: 360, width: 35, height: 18, lastShot: 0 },
      enemies,
      bullets: [],
      chemicals: [],
      floatingTexts: [],
      environment: { type: initialType, timer: initialDuration, duration: initialDuration },
      environmentTimer: 0,
      score: 0,
      lives: 3,
      timeRemaining: 60,
      active: true,
      keys: { a: false, d: false, space: false },
      enemyDirection: 1,
      enemyMoveTimer: 0,
      enemyShootTimer: 0,
    };
    
    setScore(0);
    setLives(3);
    setGameOver(false);
    setTimeRemaining(60);
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
      // Always spawn 2 compounds: 1 acid and 1 base, in random order
      const types: ('acidic' | 'basic')[] = ['acidic', 'basic'];
      // Randomize order
      if (Math.random() > 0.5) types.reverse();
      
      types.forEach((type, index) => {
        const compounds = CHEMICAL_COMPOUNDS[type];
        const compoundData = compounds[Math.floor(Math.random() * compounds.length)];
        const offsetX = (index - 0.5) * 25; // Less spread horizontally
        const direction = index === 0 ? -1 : 1; // First goes left, second goes right
        
        gameState.chemicals.push({
          x: x + offsetX,
          y,
          type,
          vx: direction * (0.8 + Math.random() * 0.4), // Less divergence
          vy: 1.0, // Slower movement
          dead: false,
          compound: compoundData.name,
          strength: compoundData.strength,
        });
      });
    };

    const triggerEnvironment = () => {
      const type = Math.random() > 0.5 ? 'acidic' : 'basic';
      const duration = 180 + Math.random() * 120; // 3-5 seconds in frames (60fps)
      gameState.environment = {
        type,
        timer: duration,
        duration,
      };
    };

    const addFloatingText = (x: number, y: number, text: string, color: string) => {
      gameState.floatingTexts.push({
        x,
        y,
        text,
        color,
        life: 60, // frames
        maxLife: 60,
      });
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

      // Environment system - ensure there's always an active environment
      if (gameState.environment.type) {
        // Update current environment timer
        gameState.environment.timer -= dt;
        if (gameState.environment.timer <= 0) {
          // Immediately trigger next environment when current ends
          triggerEnvironment();
        }
      } else {
        // If somehow no environment, trigger one immediately
        triggerEnvironment();
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
          
          // Score based on environment and compound strength
          const env = gameState.environment.type;
          let points = 0;
          
          // Base points: strength 1 = 30, strength 2 = 50, strength 3 = 75
          const basePoints = c.strength === 1 ? 30 : c.strength === 2 ? 50 : 75;
          const penaltyPoints = c.strength === 1 ? -15 : c.strength === 2 ? -25 : -35;
          
          if (env === 'acidic') {
            // In acidic environment: collect acids = +points, collect bases = -points
            points = c.type === 'acidic' ? basePoints : penaltyPoints;
          } else if (env === 'basic') {
            // In basic environment: collect bases = +points, collect acids = -points
            points = c.type === 'basic' ? basePoints : penaltyPoints;
          } else {
            // No active environment: no points
            points = 0;
          }
          
          gameState.score += points;
          setScore(gameState.score);
          
          // Add floating text feedback
          if (points !== 0) {
            const text = points > 0 ? `+${points}` : `${points}`;
            const color = points > 0 ? '#00ff00' : '#ff0000';
            addFloatingText(c.x, c.y, text, color);
          }
        }
      });

      // Update floating texts
      gameState.floatingTexts.forEach(ft => {
        ft.y -= 1 * dt;
        ft.life -= dt;
      });
      gameState.floatingTexts = gameState.floatingTexts.filter(ft => ft.life > 0);

      // Cleanup
      gameState.bullets = gameState.bullets.filter(b => !b.dead);
      gameState.chemicals = gameState.chemicals.filter(c => !c.dead);

      // Win check
      if (gameState.enemies.filter(e => e.alive).length === 0) endGame();

      // Draw background with environment fade
      ctx.fillStyle = '#050510';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Environment background fade
      if (gameState.environment.type) {
        const progress = 1 - (gameState.environment.timer / gameState.environment.duration);
        const alpha = 0.3 * (0.5 + 0.5 * Math.sin(progress * Math.PI * 4)); // Pulsing effect
        
        if (gameState.environment.type === 'acidic') {
          ctx.fillStyle = `rgba(255, 0, 0, ${alpha})`;
        } else {
          ctx.fillStyle = `rgba(0, 100, 255, ${alpha})`;
        }
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

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

      // Chemicals (all pH paper color - no visual distinction)
      gameState.chemicals.forEach(c => {
        if (c.dead) return;
        // Draw circle in pH paper color (yellow/orange neutral)
        ctx.fillStyle = '#f4a460'; // Sandy brown / pH paper color
        ctx.beginPath();
        ctx.arc(c.x, c.y, 14, 0, Math.PI * 2);
        ctx.fill();
        // Draw border for contrast
        ctx.strokeStyle = '#8b7355';
        ctx.lineWidth = 2;
        ctx.stroke();
        // Draw text with better contrast
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 10px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // Add text shadow for readability
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 2;
        ctx.fillText(c.compound, c.x, c.y);
        ctx.shadowBlur = 0;
      });

      // Player
      ctx.fillStyle = '#00f3ff';
      ctx.beginPath();
      ctx.moveTo(player.x + player.width / 2, player.y);
      ctx.lineTo(player.x, player.y + player.height);
      ctx.lineTo(player.x + player.width, player.y + player.height);
      ctx.closePath();
      ctx.fill();

      // Environment indicator
      if (gameState.environment.type) {
        ctx.fillStyle = gameState.environment.type === 'acidic' ? '#ff0000' : '#0064ff';
        ctx.font = 'bold 10px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText(
          gameState.environment.type === 'acidic' ? 'ACIDIC ENVIRONMENT' : 'BASIC ENVIRONMENT',
          canvas.width / 2,
          20
        );
      }

      // Floating score texts
      gameState.floatingTexts.forEach(ft => {
        const alpha = ft.life / ft.maxLife;
        ctx.fillStyle = ft.color.replace(')', `, ${alpha})`).replace('rgb', 'rgba');
        ctx.font = 'bold 14px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x, ft.y);
      });

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
              <li>▸ Aliens drop <span className="text-neon-cyan">2 compounds</span> (1 acid, 1 base)</li>
              <li>▸ <span className="text-red-400">Red background</span> = Acidic environment</li>
              <li>▸ <span className="text-blue-400">Blue background</span> = Basic environment</li>
              <li>▸ Collect <span className="text-red-400">acids</span> in acidic, <span className="text-blue-400">bases</span> in basic!</li>
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
            <div className="text-xl text-white font-['Press_Start_2P'] mb-6">SCORE: {score}</div>
              
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
