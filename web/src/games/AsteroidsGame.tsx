import React, { useEffect, useRef, useState } from 'react';
import { GameFrame } from '../components/GameFrame';
import { useNavigate } from 'react-router-dom';

interface GameObject {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  radius: number;
  type: 'player' | 'asteroid' | 'bullet' | 'particle';
  color?: string;
  text?: string; // For word asteroids
  dead?: boolean;
  ttl?: number; // Time to live for particles/bullets
}

// Mock Vocabulary Data
const VOCAB_DECK = [
  { word: 'HAPPY', synonyms: ['JOYFUL', 'GLAD', 'ELATED'] },
  { word: 'FAST', synonyms: ['QUICK', 'RAPID', 'SWIFT'] },
  { word: 'SMART', synonyms: ['CLEVER', 'BRIGHT', 'WISE'] },
  { word: 'BIG', synonyms: ['HUGE', 'GIANT', 'LARGE'] },
];

export const AsteroidsGame = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [wave, setWave] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(60); // 60 seconds
  const [targetWord, setTargetWord] = useState(VOCAB_DECK[0]);
  
  const gameState = useRef({
    player: { x: 400, y: 300, vx: 0, vy: 0, angle: 0, radius: 15, type: 'player' } as GameObject,
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
    timeRemaining: 60, // 60 seconds
    active: true
  });

  const navigate = useNavigate();

  const spawnAsteroid = (canvas: HTMLCanvasElement) => {
    const isSynonym = Math.random() > 0.6; // 40% chance of synonym
    let text = "WRONG";
    
    if (isSynonym) {
       const syns = targetWord.synonyms;
       text = syns[Math.floor(Math.random() * syns.length)];
    } else {
       // Pick a random word from other sets or a generic decoy
       const decoys = ['SAD', 'SLOW', 'DUMB', 'TINY', 'COLD', 'WEAK'];
       text = decoys[Math.floor(Math.random() * decoys.length)];
    }

    // Spawn edge
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

    gameState.current.asteroids.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      angle: 0,
      radius: 25,
      type: 'asteroid',
      text,
      color: isSynonym ? '#00ff00' : '#ff00ff' // Debug colors, will hide in prod
    });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 800;
    canvas.height = 450; // 16:9 aspect ratio within container

    // Make canvas focusable
    canvas.tabIndex = 0;
    canvas.style.outline = 'none';

    // Track focus state
    let isFocused = false;

    // Focus/blur handlers
    const handleFocus = () => {
      isFocused = true;
      canvas.style.cursor = 'none';
      // Optionally request pointer lock for better experience
      canvas.requestPointerLock?.();
    };

    const handleBlur = () => {
      isFocused = false;
      canvas.style.cursor = 'default';
      document.exitPointerLock?.();
    };

    // Input handlers
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isFocused) return; // Only process input when focused
      const key = e.key.toLowerCase();
      if (gameState.current.keys.hasOwnProperty(key)) {
        gameState.current.keys[key as keyof typeof gameState.current.keys] = true;
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (!isFocused) return;
      const key = e.key.toLowerCase();
      if (gameState.current.keys.hasOwnProperty(key)) {
        gameState.current.keys[key as keyof typeof gameState.current.keys] = false;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isFocused) return;
      
      // Use movementX/movementY if pointer lock is active (relative movement)
      // Otherwise calculate delta from previous position
      let deltaX = 0;
      let deltaY = 0;
      
      if (document.pointerLockElement === canvas) {
        // Pointer lock gives us relative movement directly
        deltaX = e.movementX || 0;
        deltaY = e.movementY || 0;
      } else {
        // Fallback: track relative movement manually
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const currentX = (e.clientX - rect.left) * scaleX;
        const currentY = (e.clientY - rect.top) * scaleY;
        
        // Store last position for delta calculation
        if (gameState.current.lastMouseX === null || gameState.current.lastMouseY === null) {
          gameState.current.lastMouseX = currentX;
          gameState.current.lastMouseY = currentY;
          return;
        }
        
        deltaX = currentX - gameState.current.lastMouseX;
        deltaY = currentY - gameState.current.lastMouseY;
        
        gameState.current.lastMouseX = currentX;
        gameState.current.lastMouseY = currentY;
      }
      
      // Update ship angle based on mouse movement direction
      // The ship rotates to face the direction the mouse is moving
      if (deltaX !== 0 || deltaY !== 0) {
        const movementAngle = Math.atan2(deltaY, deltaX);
        const currentAngle = gameState.current.player.angle;
        
        // Calculate shortest rotation path
        let angleDiff = movementAngle - currentAngle;
        
        // Normalize to [-PI, PI]
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
        
        // Rotate towards movement direction with smoothing
        const rotationSpeed = 0.1; // How quickly ship rotates to face movement direction
        gameState.current.player.angle += angleDiff * rotationSpeed;
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (!isFocused) {
        // Clicking on canvas focuses it
        canvas.focus();
        return;
      }
      if (e.button === 0) { // Left mouse button
        gameState.current.mouseDown = true;
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!isFocused) return;
      if (e.button === 0) {
        gameState.current.mouseDown = false;
      }
    };

    // Handle pointer lock change (when user presses ESC or loses focus)
    const handlePointerLockChange = () => {
      if (!document.pointerLockElement) {
        handleBlur();
      }
    };

    // Prevent context menu on right click
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // Focus on click handler
    const handleCanvasClick = () => {
      canvas.focus();
    };

    // Add event listeners
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

    // Game Loop
    let animationId: number;
    let lastTime = 0;
    let asteroidTimer = 0;

    const loop = (time: number) => {
      const dt = (time - lastTime) / 16.66; // Normalize to 60fps
      lastTime = time;

      if (!gameState.current.active) return;

      update(dt, canvas, time);
      draw(ctx, canvas);
      
      animationId = requestAnimationFrame(loop);
    };

    const update = (dt: number, canvas: HTMLCanvasElement, time: number) => {
      const state = gameState.current;
      const { player, keys } = state;

      // Player angle is updated by mouse movement handler, not here

      // Player Movement - WASD moves in axis directions
      const moveSpeed = 0.3 * dt;
      if (keys.w) player.vy -= moveSpeed; // Up
      if (keys.s) player.vy += moveSpeed; // Down
      if (keys.a) player.vx -= moveSpeed; // Left
      if (keys.d) player.vx += moveSpeed; // Right

      // Friction
      player.vx *= 0.95;
      player.vy *= 0.95;
      player.x += player.vx * dt;
      player.y += player.vy * dt;

      // Wrap Player
      if (player.x < 0) player.x = canvas.width;
      if (player.x > canvas.width) player.x = 0;
      if (player.y < 0) player.y = canvas.height;
      if (player.y > canvas.height) player.y = 0;

      // Shooting - Mouse left click
      if (state.mouseDown && time - state.lastShot > 300) {
        state.bullets.push({
          x: player.x + Math.cos(player.angle) * 20,
          y: player.y + Math.sin(player.angle) * 20,
          vx: player.vx + Math.cos(player.angle) * 8,
          vy: player.vy + Math.sin(player.angle) * 8,
          angle: player.angle,
          radius: 3,
          type: 'bullet',
          ttl: 60
        });
        state.lastShot = time;
      }

      // Timer countdown
      state.timeRemaining -= dt / 60; // dt is in frames, divide by 60 to get seconds
      if (state.timeRemaining <= 0) {
        state.timeRemaining = 0;
        setTimeRemaining(0);
        endGame();
      } else {
        setTimeRemaining(Math.ceil(state.timeRemaining));
      }

      // Asteroid Spawning - reduced frequency
      asteroidTimer += dt;
      if (asteroidTimer > 300) { // Every ~5 seconds (was 120 = ~2 seconds)
        spawnAsteroid(canvas);
        asteroidTimer = 0;
      }

      // Update Bullets
      state.bullets.forEach(b => {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        if (b.ttl) b.ttl -= dt;
        if (b.ttl && b.ttl <= 0) b.dead = true;
      });

      // Update Asteroids
      state.asteroids.forEach(a => {
        a.x += a.vx * dt;
        a.y += a.vy * dt;
        
        // Wrap asteroids
        if (a.x < -50) a.x = canvas.width + 50;
        if (a.x > canvas.width + 50) a.x = -50;
        if (a.y < -50) a.y = canvas.height + 50;
        if (a.y > canvas.height + 50) a.y = -50;

        // Collision: Bullet vs Asteroid
        state.bullets.forEach(b => {
          if (b.dead) return;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          
          if (dist < a.radius + b.radius) {
            b.dead = true;
            a.dead = true;
            createExplosion(a.x, a.y);
            
            // Check if synonym
            if (targetWord.synonyms.includes(a.text || '')) {
              state.score = Math.floor(state.score + 100);
              setScore(state.score);
            } else {
              state.lives -= 1;
              setLives(state.lives);
              if (state.lives <= 0) endGame();
            }
          }
        });

        // Collision: Player vs Asteroid
        const dx = player.x - a.x;
        const dy = player.y - a.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < player.radius + a.radius) {
            a.dead = true;
            createExplosion(a.x, a.y);
            state.lives -= 1;
            setLives(state.lives);
            if (state.lives <= 0) endGame();
        }
      });

      // Cleanup
      state.bullets = state.bullets.filter(b => !b.dead);
      state.asteroids = state.asteroids.filter(a => !a.dead);
      
      // Update Particles
      state.particles.forEach(p => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.ttl) p.ttl -= dt;
      });
      state.particles = state.particles.filter(p => (p.ttl || 0) > 0);
    };

    const createExplosion = (x: number, y: number) => {
      for(let i=0; i<8; i++) {
        gameState.current.particles.push({
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
      gameState.current.active = false;
      setGameOver(true);
      cancelAnimationFrame(animationId);
    };

    const draw = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const { player, bullets, asteroids, particles } = gameState.current;

      // Draw Player
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

      // Draw Bullets
      ctx.fillStyle = '#ffff00';
      bullets.forEach(b => {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI*2);
        ctx.fill();
      });

      // Draw Asteroids
      asteroids.forEach(a => {
        ctx.save();
        ctx.translate(a.x, a.y);
        ctx.strokeStyle = targetWord.synonyms.includes(a.text || '') ? '#00ff00' : '#ff00ff'; // Hint for dev
        ctx.strokeStyle = '#ffffff'; // Production style: all white
        ctx.lineWidth = 2;
        
        // Rock shape
        ctx.beginPath();
        ctx.arc(0, 0, a.radius, 0, Math.PI*2);
        ctx.stroke();

        // Text
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(a.text || '?', 0, 0);
        
        ctx.restore();
      });

      // Draw Particles
      particles.forEach(p => {
        ctx.fillStyle = p.color || '#fff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI*2);
        ctx.fill();
      });
    };

    animationId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animationId);
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
  }, []);

  if (gameOver) {
    return (
      <GameFrame 
        title="ASTEROIDS" 
        score={score} 
        lives={0} 
        wave={wave} 
        timeRemaining={timeRemaining}
        overlay={
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
            <h2 className="text-4xl text-neon-pink font-pixel mb-4 animate-pulse">GAME OVER</h2>
            <div className="text-2xl text-white font-pixel mb-8">SCORE: {score}</div>
            
            <div className="flex gap-4">
              <button 
                 onClick={() => window.location.reload()} 
                 className="retro-btn bg-neon-cyan text-black border-neon-cyan hover:bg-white"
              >
                RETRY
              </button>
              <button 
                 onClick={() => navigate('/results', { state: { score, game: 'Asteroids' } })}
                 className="retro-btn border-neon-pink text-neon-pink hover:bg-neon-pink hover:text-white"
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
    <GameFrame title="ASTEROIDS" score={score} lives={lives} wave={wave} timeRemaining={timeRemaining}>
      <canvas ref={canvasRef} className="w-full h-full bg-transparent" />
      
      {/* Target Word Overlay */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-space-800/80 border border-neon-cyan px-6 py-2 rounded">
        <span className="text-gray-400 text-xs block text-center font-pixel mb-1">TARGET: SYNONYM OF</span>
        <span className="text-neon-cyan text-xl font-pixel">{targetWord.word}</span>
      </div>
    </GameFrame>
  );
};
