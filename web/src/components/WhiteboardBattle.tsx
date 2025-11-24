import React, { useRef, useEffect, useState } from 'react';
import type { WhiteboardDrawing } from '../types/cohort';
import { circleIntersectsSegment, getPathCenter, Point } from '../utils/geometry';

interface WhiteboardBattleProps {
  drawings: WhiteboardDrawing[];
  onBattleEnd: () => void;
}

interface Enemy {
  id: string;
  path: Point[]; // Current path points
  originalPath: Point[]; // Reference for scaling
  center: Point; // Current center of mass
  color: string;
  speed: number;
  scale: number;
  maxScale: number;
  growthRate: number;
  health: number; // Maybe for later, currently 1 hit kill
}

interface Player {
  x: number;
  y: number;
  radius: number;
  color: string;
  speed: number;
  isAlive: boolean;
}

interface Projectile {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
}

export default function WhiteboardBattle({ drawings, onBattleEnd }: WhiteboardBattleProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const mouseRef = useRef<{ x: number, y: number }>({ x: 0, y: 0 });
  
  // Game State
  const [health, setHealth] = useState(100);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [enemiesCount, setEnemiesCount] = useState(0);
  
  // Refs for mutable game state to avoid re-renders in game loop
  const gameStateRef = useRef({
    player: { x: 0, y: 0, radius: 15, color: '#00FFFF', speed: 3, isAlive: true },
    enemies: [] as Enemy[],
    projectiles: [] as Projectile[],
    lastShotTime: 0,
    health: 100
  });

  // Initialize Game
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const width = canvas.parentElement?.clientWidth || 800;
    const height = canvas.parentElement?.clientHeight || 600;
    canvas.width = width;
    canvas.height = height;

    // Initialize Player at center
    gameStateRef.current.player.x = width / 2;
    gameStateRef.current.player.y = height / 2;
    gameStateRef.current.health = 100;
    setHealth(100);
    setGameOver(false);
    setGameWon(false);

    // Initialize Enemies from Drawings
    const initialEnemies: Enemy[] = [];
    drawings.forEach((drawing, index) => {
      if (drawing.path.length < 2) return;

      const center = getPathCenter(drawing.path);
      
      // Store relative coordinates to center for easier scaling/moving
      const relativePath = drawing.path.map(p => ({
        x: p.x - center.x,
        y: p.y - center.y
      }));

      initialEnemies.push({
        id: `enemy-${index}`,
        path: drawing.path.map(p => ({ ...p })), // Deep copy initial
        originalPath: relativePath,
        center: { ...center },
        color: drawing.color,
        speed: 0.5 + Math.random() * 0.5,
        scale: 0.1, // Start small
        maxScale: 1.0 + Math.random() * 0.5, // Grow to full size or larger
        growthRate: 0.005 + Math.random() * 0.005,
        health: 1
      });
    });
    
    gameStateRef.current.enemies = initialEnemies;
    setEnemiesCount(initialEnemies.length);

    // Input Handling
    const handleKeyDown = (e: KeyboardEvent) => { keysRef.current[e.code] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keysRef.current[e.code] = false; };
    const handleMouseMove = (e: MouseEvent) => {
        const rect = canvas.getBoundingClientRect();
        mouseRef.current = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('mousemove', handleMouseMove);

    // Start Loop
    requestRef.current = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      canvas.removeEventListener('mousemove', handleMouseMove);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [drawings]);

  const gameLoop = (time: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const width = canvas.width;
    const height = canvas.height;
    const state = gameStateRef.current;

    // 1. Update Player
    if (state.health > 0) {
      if (keysRef.current['KeyW'] || keysRef.current['ArrowUp']) state.player.y = Math.max(state.player.radius, state.player.y - state.player.speed);
      if (keysRef.current['KeyS'] || keysRef.current['ArrowDown']) state.player.y = Math.min(height - state.player.radius, state.player.y + state.player.speed);
      if (keysRef.current['KeyA'] || keysRef.current['ArrowLeft']) state.player.x = Math.max(state.player.radius, state.player.x - state.player.speed);
      if (keysRef.current['KeyD'] || keysRef.current['ArrowRight']) state.player.x = Math.min(width - state.player.radius, state.player.x + state.player.speed);

      // Shooting (Aim at mouse)
      if (keysRef.current['Space']) {
        if (time - state.lastShotTime > 200) { // Fire rate limit
          const dx = mouseRef.current.x - state.player.x;
          const dy = mouseRef.current.y - state.player.y;
          const mag = Math.sqrt(dx*dx + dy*dy);
          
          const projectileSpeed = 10;
          const vx = mag > 0 ? (dx / mag) * projectileSpeed : 0;
          const vy = mag > 0 ? (dy / mag) * projectileSpeed : -projectileSpeed; // Default up if aiming at self

          const projectile: Projectile = {
            id: `proj-${time}`,
            x: state.player.x,
            y: state.player.y,
            vx,
            vy,
            radius: 4,
            color: '#FF0055'
          };
          
          state.projectiles.push(projectile);
          state.lastShotTime = time;
        }
      }
    }

    // 2. Update Projectiles
    state.projectiles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
    });
    state.projectiles = state.projectiles.filter(p => 
      p.x > 0 && p.x < width && p.y > 0 && p.y < height
    );

    // 3. Update Enemies
    state.enemies.forEach(enemy => {
      // Growth
      if (enemy.scale < enemy.maxScale) {
        enemy.scale += enemy.growthRate;
      }

      // Chase Player
      if (state.health > 0) {
        const dx = state.player.x - enemy.center.x;
        const dy = state.player.y - enemy.center.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
          enemy.center.x += (dx / dist) * enemy.speed;
          enemy.center.y += (dy / dist) * enemy.speed;
        }
      }

      // Update Path Points based on Center and Scale
      enemy.path = enemy.originalPath.map(p => ({
        x: enemy.center.x + p.x * enemy.scale,
        y: enemy.center.y + p.y * enemy.scale
      }));

      // Collision with Player (Check every segment vs Player Circle)
      if (state.health > 0) {
        let hit = false;
        // Optimization: Bounding box check first
        const dx = state.player.x - enemy.center.x;
        const dy = state.player.y - enemy.center.y;
        // Rough radius check (assuming drawing isn't massive relative to center)
        if (dx*dx + dy*dy < 10000) { // 100px proximity
            for (let i = 0; i < enemy.path.length - 1; i++) {
                if (circleIntersectsSegment(
                    { x: state.player.x, y: state.player.y }, 
                    state.player.radius, 
                    enemy.path[i], 
                    enemy.path[i+1]
                )) {
                    hit = true;
                    break;
                }
            }
        }

        if (hit) {
          state.health -= 0.5; // Damage per frame
          setHealth(Math.floor(state.health));
        }
      }
    });

    // 4. Collision: Projectiles vs Enemies
    for (let pIdx = state.projectiles.length - 1; pIdx >= 0; pIdx--) {
        const p = state.projectiles[pIdx];
        let projectileHit = false;

        for (let eIdx = state.enemies.length - 1; eIdx >= 0; eIdx--) {
            const enemy = state.enemies[eIdx];
            
            // Optimization: Bounding box check first
            const dx = p.x - enemy.center.x;
            const dy = p.y - enemy.center.y;
            if (dx*dx + dy*dy > 10000) continue; // Too far

            let hit = false;
            for (let i = 0; i < enemy.path.length - 1; i++) {
                if (circleIntersectsSegment(
                    { x: p.x, y: p.y },
                    p.radius + 5, // Extra hitbox padding for ease
                    enemy.path[i],
                    enemy.path[i+1]
                )) {
                    hit = true;
                    break;
                }
            }

            if (hit) {
                state.enemies.splice(eIdx, 1); // Destroy enemy
                projectileHit = true;
                setEnemiesCount(state.enemies.length);
                break; // Projectile used up
            }
        }

        if (projectileHit) {
            state.projectiles.splice(pIdx, 1);
        }
    }

    // 5. Check Game State
    if (state.health <= 0 && !gameOver) {
      setGameOver(true);
    }
    if (state.enemies.length === 0 && !gameWon && !gameOver) {
      setGameWon(true);
    }

    // 6. Render
    ctx.clearRect(0, 0, width, height);

    // Grid
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 1;
    for(let x = 0; x < width; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke(); }
    for(let y = 0; y < height; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); }

    // Enemies (Draw strokes)
    state.enemies.forEach(enemy => {
      if (enemy.path.length < 2) return;
      
      ctx.beginPath();
      ctx.moveTo(enemy.path[0].x, enemy.path[0].y);
      for (let i = 1; i < enemy.path.length; i++) {
        ctx.lineTo(enemy.path[i].x, enemy.path[i].y);
      }
      
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 5 * enemy.scale; // Scale thickness
      ctx.strokeStyle = enemy.color;
      
      // Glow effect
      ctx.shadowBlur = 15;
      ctx.shadowColor = enemy.color;
      ctx.stroke();
      ctx.shadowBlur = 0;
    });

    // Projectiles
    state.projectiles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
    });

    // Player
    if (state.health > 0) {
      ctx.beginPath();
      ctx.arc(state.player.x, state.player.y, state.player.radius, 0, Math.PI * 2);
      ctx.fillStyle = state.player.color;
      ctx.shadowBlur = 15;
      ctx.shadowColor = state.player.color;
      ctx.fill();
      ctx.shadowBlur = 0;
      
      // Aim line (faint)
      ctx.beginPath();
      ctx.moveTo(state.player.x, state.player.y);
      ctx.lineTo(mouseRef.current.x, mouseRef.current.y);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Health Bar above player
      ctx.fillStyle = 'red';
      ctx.fillRect(state.player.x - 20, state.player.y - 30, 40, 4);
      ctx.fillStyle = '#00FF00';
      ctx.fillRect(state.player.x - 20, state.player.y - 30, 40 * (state.health / 100), 4);
    }

    if (!gameOver && !gameWon) {
      requestRef.current = requestAnimationFrame(gameLoop);
    }
  };

  return (
    <div className="flex-1 relative bg-gray-900 overflow-hidden">
      <canvas ref={canvasRef} className="block w-full h-full cursor-crosshair" />
      
      {/* Battle UI Overlay */}
      <div className="absolute top-4 left-4 text-neon-cyan font-['Press_Start_2P'] z-50 pointer-events-none">
        <div className="text-neon-pink">TEAM HP: {Math.max(0, health)}%</div>
        <div className="text-xs text-gray-400 mt-2">ENEMIES LEFT: {enemiesCount}</div>
      </div>

      {/* Game Over / Win Screens */}
      {(gameOver || gameWon) && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-50">
          <h2 className={`text-3xl font-['Press_Start_2P'] mb-4 ${gameWon ? 'text-neon-green' : 'text-neon-pink'}`}>
            {gameWon ? 'VICTORY!' : 'DEFEAT'}
          </h2>
          <p className="text-white mb-8 font-['Press_Start_2P'] text-sm">
            {gameWon ? 'ALL ENEMIES DESTROYED' : 'YOUR TEAM FELL'}
          </p>
          <button 
            onClick={onBattleEnd}
            className="px-6 py-3 bg-neon-cyan hover:bg-neon-cyan/80 text-black font-bold rounded font-['Press_Start_2P'] transition-all"
          >
            RETURN TO WHITEBOARD
          </button>
        </div>
      )}
    </div>
  );
}
