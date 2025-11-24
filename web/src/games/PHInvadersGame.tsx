import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameFrame } from '../components/GameFrame';

interface Enemy {
  x: number;
  y: number;
  row: number;
  column: number;
  alive: boolean;
  lastShot: number;
  color: string;
  width: number;
  height: number;
}

interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: 'player' | 'enemy';
  dead: boolean;
}

interface Chemical {
  x: number;
  y: number;
  type: 'acidic' | 'basic';
  strength: 'weak' | 'medium' | 'strong';
  pHShift: number;
  vx: number;
  vy: number;
  dead: boolean;
  radius: number;
  compound: string; // Compound name like "CH4", "NH3", etc.
}

// Chemical compounds with their properties
const CHEMICAL_COMPOUNDS = {
  acidic: {
    strong: ['HCl', 'H2SO4', 'HNO3'],
    medium: ['H3PO4', 'H2CO3', 'CH3COOH'],
    weak: ['HF', 'HCN', 'H2S'],
  },
  basic: {
    strong: ['NaOH', 'KOH', 'Ca(OH)2'],
    medium: ['NH3', 'CH3NH2', 'C5H5N'],
    weak: ['Na2CO3', 'NaHCO3', 'CH3COO-'],
  },
};

interface EnvironmentEvent {
  active: boolean;
  type: 'acidic' | 'basic' | null;
  strength: number; // pH drift rate per second
  duration: number; // Remaining duration in seconds
  startTime: number;
}

const ENEMY_ROWS = 5;
const ENEMY_COLS = 10;
const ENEMY_SPACING = 50;
const ENEMY_START_Y = 50;
const ENEMY_WIDTH = 30;
const ENEMY_HEIGHT = 25;

const PLAYER_SPEED = 3;
const BULLET_SPEED = 8;
const ENEMY_BULLET_SPEED = 3;
const CHEMICAL_FALL_SPEED = 2;

export const PHInvadersGame = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [pH, setPH] = useState(7.0);
  const [environmentAlert, setEnvironmentAlert] = useState<string | null>(null);
  
  const gameState = useRef({
    player: {
      x: 400,
      y: 480, // Higher up in the playable area
      width: 40,
      height: 20,
      lastShot: 0,
    },
    enemies: [] as Enemy[],
    bullets: [] as Bullet[],
    chemicals: [] as Chemical[],
    pH: 7.0,
    score: 0,
    lives: 3,
    timeRemaining: 60,
    active: true,
    keys: { a: false, d: false, space: false },
    enemyDirection: 1, // 1 = right, -1 = left
    enemyMoveTimer: 0,
    enemyShootTimer: 0,
    lastPHScoreTime: 0,
    environmentEvent: {
      active: false,
      type: null as 'acidic' | 'basic' | null,
      strength: 0,
      duration: 0,
      startTime: 0,
    } as EnvironmentEvent,
    lastEnvironmentTrigger: 0,
  });

  const navigate = useNavigate();

  const initializeEnemies = (canvas: HTMLCanvasElement) => {
    const enemies: Enemy[] = [];
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff'];
    
    for (let row = 0; row < ENEMY_ROWS; row++) {
      for (let col = 0; col < ENEMY_COLS; col++) {
        const x = (canvas.width - (ENEMY_COLS * ENEMY_SPACING)) / 2 + col * ENEMY_SPACING;
        const y = ENEMY_START_Y + row * 40;
        enemies.push({
          x,
          y,
          row,
          column: col,
          alive: true,
          lastShot: 0,
          color: colors[row % colors.length],
          width: ENEMY_WIDTH,
          height: ENEMY_HEIGHT,
        });
      }
    }
    gameState.current.enemies = enemies;
  };

  const triggerEnvironmentalEvent = () => {
    const type = Math.random() > 0.5 ? 'acidic' : 'basic';
    const strengthTier = ['weak', 'medium', 'strong'][Math.floor(Math.random() * 3)];
    
    const strength = {
      weak: 0.1,
      medium: 0.3,
      strong: 0.5,
    }[strengthTier];
    
    const duration = {
      weak: 5,
      medium: 7,
      strong: 10,
    }[strengthTier];
    
    gameState.current.environmentEvent = {
      active: true,
      type,
      strength,
      duration,
      startTime: Date.now(),
    };
    
    setEnvironmentAlert(type === 'acidic' ? 'ACIDIC ENVIRONMENT' : 'BASIC ENVIRONMENT');
    
    // Clear alert after duration
    setTimeout(() => {
      setEnvironmentAlert(null);
    }, duration * 1000);
  };

  const spawnChemical = (x: number, y: number) => {
    if (Math.random() > 0.5) return; // 50% chance to drop
    
    // Spawn 2 chemicals side by side
    const spacing = 40; // Space between the two chemicals
    const leftX = x - spacing / 2;
    const rightX = x + spacing / 2;
    
    // Generate two different compounds
    const type1 = Math.random() > 0.5 ? 'acidic' : 'basic';
    const type2 = Math.random() > 0.5 ? 'acidic' : 'basic';
    
    const strengthTier1 = ['weak', 'medium', 'strong'][Math.floor(Math.random() * 3)] as 'weak' | 'medium' | 'strong';
    const strengthTier2 = ['weak', 'medium', 'strong'][Math.floor(Math.random() * 3)] as 'weak' | 'medium' | 'strong';
    
    const pHShift1 = {
      weak: 0.5,
      medium: 1.0,
      strong: 2.0,
    }[strengthTier1];
    
    const pHShift2 = {
      weak: 0.5,
      medium: 1.0,
      strong: 2.0,
    }[strengthTier2];
    
    // Get compound names
    const compounds1 = CHEMICAL_COMPOUNDS[type1][strengthTier1];
    const compounds2 = CHEMICAL_COMPOUNDS[type2][strengthTier2];
    const compound1 = compounds1[Math.floor(Math.random() * compounds1.length)];
    const compound2 = compounds2[Math.floor(Math.random() * compounds2.length)];
    
    // Spawn left chemical - drifts left (negative vx)
    gameState.current.chemicals.push({
      x: leftX,
      y,
      type: type1,
      strength: strengthTier1,
      pHShift: pHShift1,
      vx: -(0.2 + Math.random() * 0.3), // Drift left (negative)
      vy: CHEMICAL_FALL_SPEED,
      dead: false,
      radius: 18, // Larger size for compounds
      compound: compound1,
    });
    
    // Spawn right chemical - drifts right (positive vx)
    gameState.current.chemicals.push({
      x: rightX,
      y,
      type: type2,
      strength: strengthTier2,
      pHShift: pHShift2,
      vx: 0.2 + Math.random() * 0.3, // Drift right (positive)
      vy: CHEMICAL_FALL_SPEED,
      dead: false,
      radius: 18, // Larger size for compounds
      compound: compound2,
    });
  };

  const getPHColor = (pH: number): string => {
    if (pH <= 3) return '#ff0000'; // Strongly acidic - red
    if (pH <= 6) return '#ff8800'; // Weakly acidic - orange
    if (pH >= 7 && pH <= 7.5) return '#00ff00'; // Neutral - green
    if (pH <= 10) return '#88ccff'; // Weakly basic - light blue
    return '#0000ff'; // Strongly basic - blue
  };

  const calculatePHScore = (pH: number): number => {
    const distanceFromNeutral = Math.abs(pH - 7);
    return Math.floor(Math.max(10, 100 - (distanceFromNeutral * 10)));
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 800;
    canvas.height = 600; // Extended vertically to prevent player overlap with UI

    canvas.tabIndex = 0;
    canvas.style.outline = 'none';

    let isFocused = false;

    const handleFocus = () => {
      isFocused = true;
      canvas.style.cursor = 'none';
    };

    const handleBlur = () => {
      isFocused = false;
      canvas.style.cursor = 'default';
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isFocused) return;
      const key = e.key.toLowerCase();
      if (key === 'a' || key === 'arrowleft') gameState.current.keys.a = true;
      if (key === 'd' || key === 'arrowright') gameState.current.keys.d = true;
      if (key === ' ') {
        e.preventDefault();
        gameState.current.keys.space = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!isFocused) return;
      const key = e.key.toLowerCase();
      if (key === 'a' || key === 'arrowleft') gameState.current.keys.a = false;
      if (key === 'd' || key === 'arrowright') gameState.current.keys.d = false;
      if (key === ' ') {
        e.preventDefault();
        gameState.current.keys.space = false;
      }
    };

    const handleCanvasClick = () => {
      canvas.focus();
    };

    initializeEnemies(canvas);
    gameState.current.lastEnvironmentTrigger = Date.now();

    canvas.addEventListener('focus', handleFocus);
    canvas.addEventListener('blur', handleBlur);
    canvas.addEventListener('click', handleCanvasClick);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    let animationId: number;
    let lastTime = 0;

    const loop = (time: number) => {
      const dt = (time - lastTime) / 16.66;
      lastTime = time;

      if (!gameState.current.active) return;

      update(dt, canvas, time);
      draw(ctx, canvas);
      
      animationId = requestAnimationFrame(loop);
    };

    const update = (dt: number, canvas: HTMLCanvasElement, time: number) => {
      const state = gameState.current;
      const { player, keys } = state;

      // Player movement
      if (keys.a) player.x = Math.max(0, player.x - PLAYER_SPEED * dt);
      if (keys.d) player.x = Math.min(canvas.width - player.width, player.x + PLAYER_SPEED * dt);

      // Player shooting
      if (keys.space && time - player.lastShot > 300) {
        state.bullets.push({
          x: player.x + player.width / 2,
          y: player.y,
          vx: 0,
          vy: -BULLET_SPEED * dt,
          type: 'player',
          dead: false,
        });
        player.lastShot = time;
      }

      // Timer countdown
      state.timeRemaining -= dt / 60;
      if (state.timeRemaining <= 0) {
        state.timeRemaining = 0;
        setTimeRemaining(0);
        endGame();
      } else {
        setTimeRemaining(Math.ceil(state.timeRemaining));
      }

      // Environmental event system - trigger every 5 seconds
      const timeSinceLastEvent = (Date.now() - state.lastEnvironmentTrigger) / 1000;
      if (timeSinceLastEvent >= 5 && !state.environmentEvent.active) {
        triggerEnvironmentalEvent();
        state.lastEnvironmentTrigger = Date.now();
      }

      // Update environmental event
      if (state.environmentEvent.active) {
        const elapsed = (Date.now() - state.environmentEvent.startTime) / 1000;
        if (elapsed >= state.environmentEvent.duration) {
          state.environmentEvent.active = false;
          state.environmentEvent.type = null;
        } else {
          const deltaTime = dt / 60;
          if (state.environmentEvent.type === 'acidic') {
            state.pH = Math.max(0, state.pH - state.environmentEvent.strength * deltaTime);
          } else {
            state.pH = Math.min(14, state.pH + state.environmentEvent.strength * deltaTime);
          }
          setPH(state.pH);
        }
      }

      // pH scoring (every second)
      const currentSeconds = Math.floor(state.timeRemaining);
      if (currentSeconds !== state.lastPHScoreTime) {
        const pHPoints = calculatePHScore(state.pH);
        state.score = Math.floor(state.score + pHPoints);
        setScore(state.score);
        state.lastPHScoreTime = currentSeconds;
      }

      // Enemy movement
      state.enemyMoveTimer += dt;
      if (state.enemyMoveTimer > 30) { // Move every ~0.5 seconds
        let shouldMoveDown = false;
        state.enemies.forEach(enemy => {
          if (!enemy.alive) return;
          if (enemy.x + ENEMY_WIDTH >= canvas.width && state.enemyDirection === 1) {
            shouldMoveDown = true;
          }
          if (enemy.x <= 0 && state.enemyDirection === -1) {
            shouldMoveDown = true;
          }
        });

        if (shouldMoveDown) {
          state.enemyDirection *= -1;
          state.enemies.forEach(enemy => {
            if (enemy.alive) enemy.y += 20;
          });
        } else {
          state.enemies.forEach(enemy => {
            if (enemy.alive) enemy.x += state.enemyDirection * 5;
          });
        }
        state.enemyMoveTimer = 0;
      }

      // Enemy shooting
      state.enemyShootTimer += dt;
      if (state.enemyShootTimer > 60) { // Shoot every ~1 second
        const aliveEnemies = state.enemies.filter(e => e.alive);
        if (aliveEnemies.length > 0) {
          const shooter = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
          state.bullets.push({
            x: shooter.x + shooter.width / 2,
            y: shooter.y + shooter.height,
            vx: 0,
            vy: ENEMY_BULLET_SPEED * dt,
            type: 'enemy',
            dead: false,
          });
        }
        state.enemyShootTimer = 0;
      }

      // Update bullets
      state.bullets.forEach(bullet => {
        bullet.y += bullet.vy;
        if (bullet.y < 0 || bullet.y > canvas.height) {
          bullet.dead = true;
        }
      });

      // Bullet vs Enemy collision
      state.bullets.forEach(bullet => {
        if (bullet.dead || bullet.type !== 'player') return;
        state.enemies.forEach(enemy => {
          if (!enemy.alive) return;
          if (
            bullet.x >= enemy.x &&
            bullet.x <= enemy.x + enemy.width &&
            bullet.y >= enemy.y &&
            bullet.y <= enemy.y + enemy.height
          ) {
            bullet.dead = true;
            enemy.alive = false;
            spawnChemical(enemy.x + enemy.width / 2, enemy.y + enemy.height);
            state.score = Math.floor(state.score + 50 + enemy.row * 10); // More points for higher rows
            setScore(state.score);
          }
        });
      });

      // Enemy bullet vs Player collision
      state.bullets.forEach(bullet => {
        if (bullet.dead || bullet.type !== 'enemy') return;
        if (
          bullet.x >= player.x &&
          bullet.x <= player.x + player.width &&
          bullet.y >= player.y &&
          bullet.y <= player.y + player.height
        ) {
          bullet.dead = true;
          state.lives--;
          setLives(state.lives);
          if (state.lives <= 0) {
            endGame();
          }
        }
      });

      // Enemy vs Player collision (if enemy reaches bottom)
      state.enemies.forEach(enemy => {
        if (!enemy.alive) return;
        if (enemy.y + enemy.height >= player.y) {
          if (
            enemy.x + enemy.width >= player.x &&
            enemy.x <= player.x + player.width
          ) {
            state.lives--;
            setLives(state.lives);
            enemy.alive = false;
            if (state.lives <= 0) {
              endGame();
            }
          }
        }
      });

      // Update chemicals
      state.chemicals.forEach(chemical => {
        chemical.x += chemical.vx * dt;
        chemical.y += chemical.vy * dt;
        if (chemical.y > canvas.height) {
          chemical.dead = true;
        }
      });

      // Chemical vs Player collision
      state.chemicals.forEach(chemical => {
        if (chemical.dead) return;
        const dx = chemical.x - (player.x + player.width / 2);
        const dy = chemical.y - (player.y + player.height / 2);
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < chemical.radius + 20) { // Larger hitbox
          chemical.dead = true;
          if (chemical.type === 'acidic') {
            state.pH = Math.max(0, state.pH - chemical.pHShift);
          } else {
            state.pH = Math.min(14, state.pH + chemical.pHShift);
          }
          setPH(state.pH);
        }
      });

      // Cleanup
      state.bullets = state.bullets.filter(b => !b.dead);
      state.chemicals = state.chemicals.filter(c => !c.dead);

      // Check win condition
      const aliveEnemies = state.enemies.filter(e => e.alive);
      if (aliveEnemies.length === 0) {
        endGame();
      }
    };

    const endGame = () => {
      gameState.current.active = false;
      setGameOver(true);
      cancelAnimationFrame(animationId);
    };

    const draw = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Background with environmental overlay
      ctx.fillStyle = '#050510';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Environmental color overlay
      if (gameState.current.environmentEvent.active) {
        if (gameState.current.environmentEvent.type === 'acidic') {
          ctx.fillStyle = 'rgba(255, 100, 100, 0.3)';
        } else {
          ctx.fillStyle = 'rgba(100, 100, 255, 0.3)';
        }
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      const { player, enemies, bullets, chemicals } = gameState.current;

      // Draw enemies
      enemies.forEach(enemy => {
        if (!enemy.alive) return;
        ctx.fillStyle = enemy.color;
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
        // Simple alien shape
        ctx.fillStyle = '#000000';
        ctx.fillRect(enemy.x + 8, enemy.y + 5, 5, 5);
        ctx.fillRect(enemy.x + 17, enemy.y + 5, 5, 5);
      });

      // Draw bullets
      bullets.forEach(bullet => {
        if (bullet.dead) return;
        ctx.fillStyle = bullet.type === 'player' ? '#ffff00' : '#ff0000';
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, 3, 0, Math.PI * 2);
        ctx.fill();
      });

      // Helper function to render chemical formula with subscripts
      const drawChemicalFormula = (ctx: CanvasRenderingContext2D, formula: string, x: number, y: number) => {
        const baseFontSize = 10;
        const subscriptFontSize = 7;
        const subscriptOffset = 4; // How much to lower subscripts
        const textVerticalOffset = 2; // Lower the entire text to account for subscripts
        
        ctx.font = `bold ${baseFontSize}px "Press Start 2P"`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        
        let currentX = x;
        const chars = formula.split('');
        
        // Calculate total width to center the text
        let totalWidth = 0;
        chars.forEach(char => {
          if (/\d/.test(char)) {
            ctx.font = `bold ${subscriptFontSize}px "Press Start 2P"`;
            totalWidth += ctx.measureText(char).width;
            ctx.font = `bold ${baseFontSize}px "Press Start 2P"`;
          } else {
            totalWidth += ctx.measureText(char).width;
          }
        });
        
        // Start from left edge, centered
        currentX = x - totalWidth / 2;
        
        // Draw each character
        chars.forEach(char => {
          if (/\d/.test(char)) {
            // Draw as subscript
            ctx.font = `bold ${subscriptFontSize}px "Press Start 2P"`;
            ctx.fillStyle = '#000000';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.strokeText(char, currentX, y + textVerticalOffset + subscriptOffset);
            ctx.fillText(char, currentX, y + textVerticalOffset + subscriptOffset);
            currentX += ctx.measureText(char).width;
            ctx.font = `bold ${baseFontSize}px "Press Start 2P"`;
          } else {
            // Draw as normal
            ctx.fillStyle = '#000000';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.strokeText(char, currentX, y + textVerticalOffset);
            ctx.fillText(char, currentX, y + textVerticalOffset);
            currentX += ctx.measureText(char).width;
          }
        });
      };

      // Draw chemicals as white orbs with compound names
      chemicals.forEach(chemical => {
        if (chemical.dead) return;
        
        // Draw white orb
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(chemical.x, chemical.y, chemical.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // White glow effect
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#ffffff';
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Draw compound name with subscripts
        drawChemicalFormula(ctx, chemical.compound, chemical.x, chemical.y);
      });

      // Draw player ship
      ctx.fillStyle = '#00f3ff';
      ctx.beginPath();
      ctx.moveTo(player.x + player.width / 2, player.y);
      ctx.lineTo(player.x, player.y + player.height);
      ctx.lineTo(player.x + player.width / 4, player.y + player.height - 5);
      ctx.lineTo(player.x + player.width * 3 / 4, player.y + player.height - 5);
      ctx.lineTo(player.x + player.width, player.y + player.height);
      ctx.closePath();
      ctx.fill();
    };

    animationId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animationId);
      canvas.removeEventListener('focus', handleFocus);
      canvas.removeEventListener('blur', handleBlur);
      canvas.removeEventListener('click', handleCanvasClick);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  if (gameOver) {
    const aliveEnemies = gameState.current.enemies.filter(e => e.alive);
    const victory = aliveEnemies.length === 0;
    
    return (
      <GameFrame
        title="pH INVADERS"
        score={score}
        lives={lives}
        timeRemaining={timeRemaining}
        containerClassName="aspect-[4/3]"
        overlay={
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
            <h2 className="text-4xl text-neon-pink font-pixel mb-4 animate-pulse">
              {victory ? 'VICTORY!' : 'GAME OVER'}
            </h2>
            <div className="text-2xl text-white font-pixel mb-8">SCORE: {score}</div>
            <div className="text-lg text-neon-cyan font-pixel mb-4">Final pH: {pH.toFixed(1)}</div>
            
            <div className="flex gap-4">
              <button 
                onClick={() => window.location.reload()} 
                className="retro-btn bg-neon-cyan text-black border-neon-cyan hover:bg-white"
              >
                RETRY
              </button>
              <button 
                onClick={() => navigate('/results', { state: { score, game: 'pH Invaders' } })}
                className="retro-btn border-neon-pink text-neon-pink hover:bg-neon-pink hover:text-white"
              >
                CONTINUE
              </button>
            </div>
          </div>
        }
      >
        <canvas ref={canvasRef} className="block w-full h-full" />
      </GameFrame>
    );
  }

  return (
    <GameFrame
        title="pH INVADERS"
        score={score}
        lives={lives}
        timeRemaining={timeRemaining}
        containerClassName="aspect-[4/3]"
    >
      <canvas ref={canvasRef} className="w-full h-full bg-transparent" />
      
      {/* pH Bar - Bottom left, same level as timer */}
      <div className="absolute bottom-4 left-4 z-30 bg-space-800/90 border border-neon-cyan px-3 py-2 rounded">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-gray-400 text-xs font-pixel">pH</span>
          <div className="w-32 h-3 bg-space-900 rounded-full overflow-hidden relative">
            <div 
              className="h-full transition-all duration-100"
              style={{
                width: `${(pH / 14) * 100}%`,
                backgroundColor: getPHColor(pH),
              }}
            />
            <div 
              className="absolute top-0 left-0 w-full h-full flex items-center justify-center"
              style={{ pointerEvents: 'none' }}
            >
              <span className="text-white text-[10px] font-pixel font-bold">{pH.toFixed(1)}</span>
            </div>
          </div>
          <span className="text-neon-cyan text-[10px] font-pixel">
            +{calculatePHScore(pH)}/s
          </span>
        </div>
        <div className="flex justify-between text-[7px] text-gray-500 font-pixel">
          <span>0</span>
          <span className="text-neon-green">7</span>
          <span>14</span>
        </div>
      </div>

      {/* Environmental Alert - Higher up */}
      {environmentAlert && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 animate-pulse">
          <div className={`px-4 py-2 rounded border-2 font-pixel text-sm ${
            environmentAlert === 'ACIDIC ENVIRONMENT' 
              ? 'bg-red-900/90 border-red-500 text-red-200' 
              : 'bg-blue-900/90 border-blue-500 text-blue-200'
          }`}>
            {environmentAlert}
          </div>
        </div>
      )}
    </GameFrame>
  );
};
