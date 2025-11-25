import { useEffect, useRef, useState, useCallback } from 'react';
import { GameFrame } from '../components/GameFrame';
import { useGameCompletion } from '../hooks/useGameCompletion';

interface GameObject {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  radius: number;
  type: 'player' | 'asteroid' | 'bullet' | 'particle';
  color?: string;
  text?: string;
  dead?: boolean;
  ttl?: number;
}

const VOCAB_DECK = [
  { word: 'HAPPY', synonyms: ['JOYFUL', 'GLAD', 'ELATED'] },
  { word: 'FAST', synonyms: ['QUICK', 'RAPID', 'SWIFT'] },
  { word: 'SMART', synonyms: ['CLEVER', 'BRIGHT', 'WISE'] },
  { word: 'BIG', synonyms: ['HUGE', 'GIANT', 'LARGE'] },
];

const createInitialGameState = () => ({
  player: { x: 400, y: 225, vx: 0, vy: 0, angle: 0, radius: 15, type: 'player' } as GameObject,
  bullets: [] as GameObject[],
  asteroids: [] as GameObject[],
  particles: [] as GameObject[],
  keys: { w: false, a: false, s: false, d: false },
  mouseDown: false,
  lastMouseX: null as number | null,
  lastMouseY: null as number | null,
  lastShot: 0,
  score: 0,
  lives: 3,
  timeRemaining: 60,
  active: false
});

export const AsteroidsGame = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [wave, setWave] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [targetWord] = useState(() => VOCAB_DECK[Math.floor(Math.random() * VOCAB_DECK.length)]);
  
  const gameStateRef = useRef(createInitialGameState());
  const animationIdRef = useRef<number | null>(null);

  const { completeGame } = useGameCompletion({ gameType: 'asteroids', gameName: 'Asteroids' });

  const startGame = useCallback(() => {
    // Reset all state
    gameStateRef.current = createInitialGameState();
    gameStateRef.current.active = true;
    setScore(0);
    setLives(3);
    setWave(1);
    setGameOver(false);
    setTimeRemaining(60);
    setGameStarted(true);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, []);

  // Game loop - only runs when gameStarted is true
  useEffect(() => {
    if (!gameStarted || gameOver) return;
    
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
    let asteroidTimer = 0;

    const handleFocus = () => {
      isFocused = true;
      canvas.style.cursor = 'none';
      canvas.requestPointerLock?.();
    };

    const handleBlur = () => {
      isFocused = false;
      canvas.style.cursor = 'default';
      document.exitPointerLock?.();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isFocused) return;
      const key = e.key.toLowerCase();
      if (key in gameState.keys) {
        gameState.keys[key as keyof typeof gameState.keys] = true;
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (!isFocused) return;
      const key = e.key.toLowerCase();
      if (key in gameState.keys) {
        gameState.keys[key as keyof typeof gameState.keys] = false;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isFocused) return;
      
      let deltaX = 0;
      let deltaY = 0;
      
      if (document.pointerLockElement === canvas) {
        deltaX = e.movementX || 0;
        deltaY = e.movementY || 0;
      } else {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const currentX = (e.clientX - rect.left) * scaleX;
        const currentY = (e.clientY - rect.top) * scaleY;
        
        if (gameState.lastMouseX === null || gameState.lastMouseY === null) {
          gameState.lastMouseX = currentX;
          gameState.lastMouseY = currentY;
          return;
        }
        
        deltaX = currentX - gameState.lastMouseX;
        deltaY = currentY - gameState.lastMouseY;
        
        gameState.lastMouseX = currentX;
        gameState.lastMouseY = currentY;
      }
      
      if (deltaX !== 0 || deltaY !== 0) {
        const movementAngle = Math.atan2(deltaY, deltaX);
        let angleDiff = movementAngle - gameState.player.angle;
        
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
        
        gameState.player.angle += angleDiff * 0.1;
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (!isFocused) {
        canvas.focus();
        return;
      }
      if (e.button === 0) {
        gameState.mouseDown = true;
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!isFocused) return;
      if (e.button === 0) {
        gameState.mouseDown = false;
      }
    };

    const handlePointerLockChange = () => {
      if (!document.pointerLockElement) {
        handleBlur();
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleCanvasClick = () => {
      canvas.focus();
    };

    canvas.addEventListener('focus', handleFocus);
    canvas.addEventListener('blur', handleBlur);
    canvas.addEventListener('click', handleCanvasClick);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('pointerlockchange', handlePointerLockChange);

    const spawnAsteroid = () => {
      const isSynonym = Math.random() > 0.6;
      let text = "WRONG";
      
      if (isSynonym) {
         const syns = targetWord.synonyms;
         text = syns[Math.floor(Math.random() * syns.length)];
      } else {
         const decoys = ['SAD', 'SLOW', 'DUMB', 'TINY', 'COLD', 'WEAK'];
         text = decoys[Math.floor(Math.random() * decoys.length)];
      }

      let x, y;
      if (Math.random() > 0.5) {
        x = Math.random() > 0.5 ? 0 : canvas.width;
        y = Math.random() * canvas.height;
      } else {
        x = Math.random() * canvas.width;
        y = Math.random() > 0.5 ? 0 : canvas.height;
      }

      const angle = Math.atan2(canvas.height/2 - y, canvas.width/2 - x);
      const speed = 1 + Math.random();

      gameState.asteroids.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        angle: 0,
        radius: 25,
        type: 'asteroid',
        text,
        color: isSynonym ? '#00ff00' : '#ff00ff'
      });
    };

    const createExplosion = (x: number, y: number) => {
      for(let i=0; i<8; i++) {
        gameState.particles.push({
          x, y,
          vx: (Math.random() - 0.5) * 4,
          vy: (Math.random() - 0.5) * 4,
          angle: 0,
          radius: Math.random() * 3,
          type: 'particle',
          ttl: 30,
          color: '#ffffff'
        });
      }
    };

    const endGame = () => {
      gameState.active = false;
      setGameOver(true);
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
    };

    let lastTime = performance.now();

    const loop = (time: number) => {
      if (!gameState.active) return;

      const dt = Math.min((time - lastTime) / 16.66, 3);
      lastTime = time;

      // Update
      const { player, keys } = gameState;

      const moveSpeed = 0.3 * dt;
      if (keys.w) player.vy -= moveSpeed;
      if (keys.s) player.vy += moveSpeed;
      if (keys.a) player.vx -= moveSpeed;
      if (keys.d) player.vx += moveSpeed;

      player.vx *= 0.95;
      player.vy *= 0.95;
      player.x += player.vx * dt;
      player.y += player.vy * dt;

      if (player.x < 0) player.x = canvas.width;
      if (player.x > canvas.width) player.x = 0;
      if (player.y < 0) player.y = canvas.height;
      if (player.y > canvas.height) player.y = 0;

      if (gameState.mouseDown && time - gameState.lastShot > 300) {
        gameState.bullets.push({
          x: player.x + Math.cos(player.angle) * 20,
          y: player.y + Math.sin(player.angle) * 20,
          vx: player.vx + Math.cos(player.angle) * 8,
          vy: player.vy + Math.sin(player.angle) * 8,
          angle: player.angle,
          radius: 3,
          type: 'bullet',
          ttl: 60
        });
        gameState.lastShot = time;
      }

      gameState.timeRemaining -= dt / 60;
      if (gameState.timeRemaining <= 0) {
        gameState.timeRemaining = 0;
        setTimeRemaining(0);
        endGame();
        return;
      }
      setTimeRemaining(Math.ceil(gameState.timeRemaining));

      asteroidTimer += dt;
      if (asteroidTimer > 300) {
        spawnAsteroid();
        asteroidTimer = 0;
      }

      gameState.bullets.forEach(b => {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        if (b.ttl) b.ttl -= dt;
        if (b.ttl && b.ttl <= 0) b.dead = true;
      });

      gameState.asteroids.forEach(a => {
        a.x += a.vx * dt;
        a.y += a.vy * dt;
        
        if (a.x < -50) a.x = canvas.width + 50;
        if (a.x > canvas.width + 50) a.x = -50;
        if (a.y < -50) a.y = canvas.height + 50;
        if (a.y > canvas.height + 50) a.y = -50;

        gameState.bullets.forEach(b => {
          if (b.dead) return;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          
          if (dist < a.radius + b.radius) {
            b.dead = true;
            a.dead = true;
            createExplosion(a.x, a.y);
            
            if (targetWord.synonyms.includes(a.text || '')) {
              gameState.score = Math.floor(gameState.score + 100);
              setScore(gameState.score);
            } else {
              gameState.lives -= 1;
              setLives(gameState.lives);
              if (gameState.lives <= 0) endGame();
            }
          }
        });

        const dx = player.x - a.x;
        const dy = player.y - a.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < player.radius + a.radius) {
            a.dead = true;
            createExplosion(a.x, a.y);
            gameState.lives -= 1;
            setLives(gameState.lives);
            if (gameState.lives <= 0) endGame();
        }
      });

      gameState.bullets = gameState.bullets.filter(b => !b.dead);
      gameState.asteroids = gameState.asteroids.filter(a => !a.dead);
      
      gameState.particles.forEach(p => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.ttl) p.ttl -= dt;
      });
      gameState.particles = gameState.particles.filter(p => (p.ttl || 0) > 0);

      // Draw
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.rotate(player.angle);
      ctx.strokeStyle = '#00f3ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(15, 0);
      ctx.lineTo(-10, 10);
      ctx.lineTo(-5, 0);
      ctx.lineTo(-10, -10);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = '#ffff00';
      gameState.bullets.forEach(b => {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI*2);
        ctx.fill();
      });

      gameState.asteroids.forEach(a => {
        ctx.save();
        ctx.translate(a.x, a.y);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.arc(0, 0, a.radius, 0, Math.PI*2);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = '12px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(a.text || '?', 0, 0);
        
        ctx.restore();
      });

      gameState.particles.forEach(p => {
        ctx.fillStyle = p.color || '#fff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI*2);
        ctx.fill();
      });

      animationIdRef.current = requestAnimationFrame(loop);
    };

    // Start the game loop
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
      canvas.removeEventListener('click', handleCanvasClick);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      document.exitPointerLock?.();
    };
  }, [gameStarted, gameOver, targetWord]);

  // Start Menu
  if (!gameStarted) {
    return (
      <GameFrame title="ASTEROIDS: SYNONYM SHOOTER" score={0} lives={3} wave={1} timeRemaining={60} aspectRatio={16/9}>
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90">
          <h1 className="text-2xl text-neon-cyan font-['Press_Start_2P'] mb-4 animate-pulse">
            ASTEROIDS
          </h1>
          <h2 className="text-sm text-neon-pink font-['Press_Start_2P'] mb-6">
            SYNONYM SHOOTER
          </h2>
          
          <div className="bg-gray-900/80 border-2 border-neon-cyan rounded-lg p-4 mb-6 max-w-sm text-left">
            <h3 className="text-xs text-neon-yellow font-['Press_Start_2P'] mb-3 text-center">
              HOW TO PLAY
            </h3>
            <ul className="text-[10px] text-gray-300 space-y-2">
              <li>▸ Move: <span className="text-neon-green">W A S D</span></li>
              <li>▸ Aim: <span className="text-neon-green">Mouse</span> | Shoot: <span className="text-neon-green">Click</span></li>
              <li>▸ Hit <span className="text-neon-yellow">synonyms</span> of the target word</li>
              <li>▸ Wrong words = lose a life!</li>
            </ul>
          </div>

          <button 
            onClick={startGame}
            className="px-6 py-3 bg-neon-pink text-white font-['Press_Start_2P'] text-xs rounded hover:bg-neon-pink/80 hover:scale-105 transition-all shadow-[0_0_20px_rgba(255,0,110,0.5)]"
          >
            START GAME
          </button>
        </div>
      </GameFrame>
    );
  }

  // Game Over Screen
  if (gameOver) {
    return (
      <GameFrame 
        title="ASTEROIDS" 
        score={score} 
        lives={0} 
        wave={wave} 
        timeRemaining={timeRemaining}
        aspectRatio={16/9}
        overlay={
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
           <h2 className="text-3xl text-neon-pink font-['Press_Start_2P'] mb-4 animate-pulse">GAME OVER</h2>
           <div className="text-xl text-white font-['Press_Start_2P'] mb-6">SCORE: {score}</div>
           
           <div className="flex gap-4">
             <button 
                onClick={startGame}
                className="retro-btn bg-neon-cyan text-black border-neon-cyan hover:bg-white text-xs"
             >
               RETRY
             </button>
             <button 
                onClick={() => completeGame(score)}
                className="retro-btn border-neon-pink text-neon-pink hover:bg-neon-pink hover:text-white text-xs"
             >
               CONTINUE
             </button>
           </div>
         </div>
        }
      >
        <canvas ref={canvasRef} className="w-full h-full bg-transparent" />
      </GameFrame>
    );
  }

  return (
    <GameFrame title="ASTEROIDS" score={score} lives={lives} wave={wave} timeRemaining={timeRemaining} aspectRatio={16/9}>
      <canvas ref={canvasRef} className="w-full h-full bg-transparent" />
      
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-space-800/80 border border-neon-cyan px-4 py-1.5 rounded">
        <span className="text-gray-400 text-[10px] block text-center font-['Press_Start_2P'] mb-0.5">SYNONYM OF</span>
        <span className="text-neon-cyan text-base font-['Press_Start_2P']">{targetWord.word}</span>
      </div>
    </GameFrame>
  );
};
