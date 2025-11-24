import React, { useRef, useEffect, useState } from 'react';
import { ref, onValue, set, push, remove, update, serverTimestamp } from 'firebase/database';
import { rtdb } from '../lib/firebase';
import type { WhiteboardDrawing, CohortMember } from '../types/cohort';
import { circleIntersectsSegment, getPathCenter, type Point } from '../utils/geometry';

interface WhiteboardBattleProps {
  drawings: WhiteboardDrawing[];
  onBattleEnd: () => void;
  onHealthUpdate?: (healths: Record<string, number>) => void;
  members: CohortMember[];
  currentUserId: string;
  cohortId?: string; // Optional for local/mock
}

// ... (Interfaces remain the same)
interface Enemy {
  id: string;
  path: Point[];
  originalPath: Point[];
  center: Point;
  color: string;
  speed: number;
  scale: number;
  maxScale: number;
  growthRate: number;
  health: number;
}

interface Player {
  id: string;
  x: number;
  y: number;
  radius: number;
  color: string;
  speed: number;
  isAlive: boolean;
  health: number;
  username: string;
  avatarUrl?: string;
  avatarImg?: HTMLImageElement;
}

interface Projectile {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  ownerId: string;
}

export default function WhiteboardBattle({ 
  drawings, 
  onBattleEnd, 
  onHealthUpdate, 
  members, 
  currentUserId,
  cohortId
}: WhiteboardBattleProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const mouseRef = useRef<{ x: number, y: number }>({ x: 0, y: 0 });
  const mouseDownRef = useRef(false);
  
  // Game State
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [enemiesCount, setEnemiesCount] = useState(0);
  const [isHost, setIsHost] = useState(false); // Host handles enemy logic
  
  // Refs for mutable game state
  const gameStateRef = useRef({
    players: [] as Player[],
    enemies: [] as Enemy[],
    projectiles: [] as Projectile[],
    lastShotTime: 0,
  });

  // Preload avatars
  useEffect(() => {
    members.forEach(member => {
      if (member.avatar) {
        const img = new Image();
        img.src = member.avatar;
      }
    });
  }, [members]);

  // Setup RTDB Sync
  useEffect(() => {
    if (!cohortId) return; // Local mode fallback handled in init

    // 1. Determine Host (Simplistic: First member in list or owner is host logic)
    // For now, let's say whoever initializes the battle state first or just the first member ID
    // A better way: use a 'host' field in RTDB or Firestore
    const sortedMembers = [...members].sort((a, b) => a.userId.localeCompare(b.userId));
    const hostId = sortedMembers[0]?.userId;
    const amIHost = currentUserId === hostId;
    setIsHost(amIHost);

    // 2. Listen for Game State Updates
    const gameRef = ref(rtdb, `cohorts/${cohortId}/battle`);
    
    // Player Updates
    const unsubscribePlayers = onValue(ref(rtdb, `cohorts/${cohortId}/battle/players`), (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const remotePlayers = Object.values(data) as Player[];
        // Merge remote state into local ref, but preserve local player's predicted position to avoid jitter
        // Actually, for a simple implementation, just updating the Ref is fine,
        // but the game loop will overwrite local player pos based on inputs.
        
        gameStateRef.current.players.forEach(localP => {
          const remoteP = remotePlayers.find(rp => rp.id === localP.id);
          if (remoteP) {
            if (localP.id !== currentUserId) {
              // Update other players fully
              localP.x = remoteP.x;
              localP.y = remoteP.y;
              localP.health = remoteP.health;
              localP.isAlive = remoteP.isAlive;
            } else {
                // Only sync health/alive status for self from server (if server/host dictates damage)
                // But here, clients claim damage on themselves or host claims it?
                // Let's stick to: Clients authorize their own movement, Host calculates enemy hits on players
                localP.health = remoteP.health;
                localP.isAlive = remoteP.isAlive;
            }
          }
        });
        
        // Add new players if they joined late
        remotePlayers.forEach(rp => {
            if (!gameStateRef.current.players.find(p => p.id === rp.id)) {
                // Hydrate image
                let avatarImg: HTMLImageElement | undefined;
                if (rp.avatarUrl) {
                    avatarImg = new Image();
                    avatarImg.src = rp.avatarUrl;
                }
                gameStateRef.current.players.push({ ...rp, avatarImg });
            }
        });
      }
    });

    // Enemy Updates (Only Non-Hosts listen, Hosts write)
    if (!amIHost) {
        const unsubscribeEnemies = onValue(ref(rtdb, `cohorts/${cohortId}/battle/enemies`), (snapshot) => {
            const data = snapshot.val();
            if (data) {
                // Full replace for enemies to keep sync simple
                const loadedEnemies = Object.values(data) as Enemy[];
                // We need to preserve path/originalPath structure if lost in serialization?
                // RTDB stores arrays as objects with numeric keys sometimes.
                gameStateRef.current.enemies = loadedEnemies;
                setEnemiesCount(loadedEnemies.length);
            }
        });
        return () => {
            unsubscribePlayers();
            unsubscribeEnemies();
        }
    }

    return () => unsubscribePlayers();
  }, [cohortId, currentUserId, members]);


  // Initialize Game (Local or Host init)
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const width = canvas.parentElement?.clientWidth || 800;
    const height = canvas.parentElement?.clientHeight || 600;
    canvas.width = width;
    canvas.height = height;

    // Initialize Players locally first
    const initialPlayers: Player[] = members.map((member) => {
      const padding = 50;
      const spawnX = padding + Math.random() * (width - padding * 2);
      const spawnY = padding + Math.random() * (height - padding * 2);
      
      let avatarImg: HTMLImageElement | undefined;
      if (member.avatar) {
        avatarImg = new Image();
        avatarImg.src = member.avatar;
      }

      return {
        id: member.userId,
        x: spawnX,
        y: spawnY,
        radius: 20,
        color: member.userId === currentUserId ? '#00FFFF' : '#CCCCCC',
        speed: 3,
        isAlive: true,
        health: 100,
        username: member.username,
        avatarUrl: member.avatar,
        avatarImg
      };
    });

    // If I am the host (or local mode), I initialize the DB
    // But typically, 'battle' start triggers this on server or one client. 
    // We'll assume this component mounting means battle started.
    // We should check if battle state already exists to avoid reset on refresh.
    
    gameStateRef.current.players = initialPlayers;
    
    // Host initializes enemies
    if (isHost || !cohortId) {
        const initialEnemies: Enemy[] = [];
        drawings.forEach((drawing, index) => {
            if (drawing.path.length < 2) return;
            const center = getPathCenter(drawing.path);
            const relativePath = drawing.path.map(p => ({ x: p.x - center.x, y: p.y - center.y }));

            initialEnemies.push({
                id: `enemy-${index}`,
                path: drawing.path.map(p => ({ ...p })),
                originalPath: relativePath,
                center: { ...center },
                color: drawing.color,
                speed: 0.5 + Math.random() * 0.5,
                scale: 1.0,
                maxScale: 2.0 + Math.random() * 0.5,
                growthRate: 0.002 + Math.random() * 0.002,
                health: 1
            });
        });
        
        gameStateRef.current.enemies = initialEnemies;
        setEnemiesCount(initialEnemies.length);

        // Initial Sync Push
        if (cohortId && isHost) {
            const updates: any = {};
            initialEnemies.forEach(e => updates[`cohorts/${cohortId}/battle/enemies/${e.id}`] = e);
            initialPlayers.forEach(p => {
                // Don't save the HTMLImageElement, and remove undefined values
                const { avatarImg, ...playerData } = p;
                // Filter out undefined values (Firebase RTDB doesn't allow undefined)
                const cleanPlayerData: any = {};
                Object.entries(playerData).forEach(([key, value]) => {
                    if (value !== undefined) {
                        cleanPlayerData[key] = value;
                    }
                });
                updates[`cohorts/${cohortId}/battle/players/${p.id}`] = cleanPlayerData;
            });
            update(ref(rtdb), updates);
        }
    }

    setGameOver(false);
    setGameWon(false);

    // Start Loop
    requestRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [drawings, members, currentUserId, isHost, cohortId]);


  // Keyboard Input Handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Mouse Input Handling
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    };

    const handleMouseDown = () => {
      mouseDownRef.current = true;
    };

    const handleMouseUp = () => {
      mouseDownRef.current = false;
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Sync my player state to RTDB periodically or on change
  useEffect(() => {
      if (!cohortId) return;
      const syncInterval = setInterval(() => {
          const myPlayer = gameStateRef.current.players.find(p => p.id === currentUserId);
          if (myPlayer) {
              const { avatarImg, ...playerData } = myPlayer;
              // Filter out undefined values (Firebase RTDB doesn't allow undefined)
              const cleanPlayerData: any = {};
              Object.entries(playerData).forEach(([key, value]) => {
                  if (value !== undefined) {
                      cleanPlayerData[key] = value;
                  }
              });
              update(ref(rtdb, `cohorts/${cohortId}/battle/players/${currentUserId}`), cleanPlayerData);
          }
      }, 50); // 20Hz sync

      return () => clearInterval(syncInterval);
  }, [cohortId, currentUserId]);


  const gameLoop = (time: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const width = canvas.width;
    const height = canvas.height;
    const state = gameStateRef.current;
    let healthChanged = false;

    // 1. Update Players (Local Input)
    state.players.forEach(player => {
      if (!player.isAlive) return;

      if (player.id === currentUserId) {
        if (keysRef.current['KeyW'] || keysRef.current['ArrowUp']) player.y = Math.max(player.radius, player.y - player.speed);
        if (keysRef.current['KeyS'] || keysRef.current['ArrowDown']) player.y = Math.min(height - player.radius, player.y + player.speed);
        if (keysRef.current['KeyA'] || keysRef.current['ArrowLeft']) player.x = Math.max(player.radius, player.x - player.speed);
        if (keysRef.current['KeyD'] || keysRef.current['ArrowRight']) player.x = Math.min(width - player.radius, player.x + player.speed);
      
        // Shooting
        if (mouseDownRef.current) {
          if (time - state.lastShotTime > 200) {
            const dx = mouseRef.current.x - player.x;
            const dy = mouseRef.current.y - player.y;
            const mag = Math.sqrt(dx*dx + dy*dy);
            const projectileSpeed = 10;
            const vx = mag > 0 ? (dx / mag) * projectileSpeed : 0;
            const vy = mag > 0 ? (dy / mag) * projectileSpeed : -projectileSpeed;

            const projectile: Projectile = {
              id: `proj-${time}-${currentUserId}`,
              x: player.x,
              y: player.y,
              vx,
              vy,
              radius: 4,
              color: '#FF0055',
              ownerId: player.id
            };
            
            state.projectiles.push(projectile);
            state.lastShotTime = time;
            
            // TODO: Sync projectiles? For now, local only for responsiveness, 
            // but hits need validation.
          }
        }
      } 
      // Remote players are updated via the useEffect hook
    });

    // 2. Update Projectiles
    state.projectiles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
    });
    state.projectiles = state.projectiles.filter(p => 
      p.x > 0 && p.x < width && p.y > 0 && p.y < height
    );

    // 3. Update Enemies (Host Only Logic)
    if (isHost || !cohortId) {
        state.enemies.forEach(enemy => {
        // Target nearest living player
        let nearestPlayer: Player | null = null;
        let minDist = Infinity;

        state.players.forEach(player => {
            if (!player.isAlive) return;
            const dx = player.x - enemy.center.x;
            const dy = player.y - enemy.center.y;
            const dist = dx*dx + dy*dy;
            if (dist < minDist) {
            minDist = dist;
            nearestPlayer = player;
            }
        });

        if (nearestPlayer) {
            const dx = nearestPlayer.x - enemy.center.x;
            const dy = nearestPlayer.y - enemy.center.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0) {
            enemy.center.x += (dx / dist) * enemy.speed;
            enemy.center.y += (dy / dist) * enemy.speed;
            }

            enemy.path = enemy.originalPath.map(p => ({
            x: enemy.center.x + p.x * enemy.scale,
            y: enemy.center.y + p.y * enemy.scale
            }));

            // Collision
            let hit = false;
            if (dist < 100) {
                for (let i = 0; i < enemy.path.length - 1; i++) {
                    if (circleIntersectsSegment(
                        { x: nearestPlayer.x, y: nearestPlayer.y }, 
                        nearestPlayer.radius, 
                        enemy.path[i], 
                        enemy.path[i+1]
                    )) {
                        hit = true;
                        break;
                    }
                }
            }

            if (hit) {
                nearestPlayer.health -= 0.5;
                if (nearestPlayer.health <= 0) {
                    nearestPlayer.health = 0;
                    nearestPlayer.isAlive = false;
                }
                healthChanged = true;
                
                // Host syncs health damage
                if (cohortId) {
                    const { avatarImg, ...pData } = nearestPlayer;
                    // Filter out undefined values (Firebase RTDB doesn't allow undefined)
                    const cleanPlayerData: any = {};
                    Object.entries(pData).forEach(([key, value]) => {
                        if (value !== undefined) {
                            cleanPlayerData[key] = value;
                        }
                    });
                    update(ref(rtdb, `cohorts/${cohortId}/battle/players/${nearestPlayer.id}`), cleanPlayerData);
                }
            }
        }
        });
        
        // Host syncs enemy positions periodically? 
        // Doing it every frame is expensive. 
        // For now, we rely on deterministic update if everyone runs the same logic, 
        // but latency makes them diverge.
        // Let's sync enemies every 100ms if host
        if (cohortId && time % 6 < 1) { // Rough throttle
             const updates: any = {};
             state.enemies.forEach(e => updates[`cohorts/${cohortId}/battle/enemies/${e.id}`] = e);
             update(ref(rtdb), updates);
        }
    }

    // 4. Collision: Projectiles vs Enemies
    // ... (Same logic, but host authoritative for removing enemies?)
    // For responsiveness, clients predict, Host confirms. 
    // Simplification: Local hit detection destroys enemy locally.
    // If Host detects hit, it removes from DB.
    
    for (let pIdx = state.projectiles.length - 1; pIdx >= 0; pIdx--) {
        const p = state.projectiles[pIdx];
        let projectileHit = false;

        for (let eIdx = state.enemies.length - 1; eIdx >= 0; eIdx--) {
            const enemy = state.enemies[eIdx];
            const dx = p.x - enemy.center.x;
            const dy = p.y - enemy.center.y;
            if (dx*dx + dy*dy > 10000) continue;

            let hit = false;
            for (let i = 0; i < enemy.path.length - 1; i++) {
                if (circleIntersectsSegment({ x: p.x, y: p.y }, p.radius + 5, enemy.path[i], enemy.path[i+1])) {
                    hit = true;
                    break;
                }
            }

            if (hit) {
                state.enemies.splice(eIdx, 1);
                projectileHit = true;
                setEnemiesCount(state.enemies.length);
                
                if (isHost && cohortId) {
                    remove(ref(rtdb, `cohorts/${cohortId}/battle/enemies/${enemy.id}`));
                }
                
                break;
            }
        }
        if (projectileHit) state.projectiles.splice(pIdx, 1);
    }

    // 5. Check Game State
    if (healthChanged || time % 10 === 0) {
      const healths: Record<string, number> = {};
      state.players.forEach(p => healths[p.id] = Math.floor(p.health));
      onHealthUpdate?.(healths);
    }

    const activePlayers = state.players.filter(p => p.isAlive);
    if (activePlayers.length === 0 && !gameOver) {
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

    // Enemies
    state.enemies.forEach(enemy => {
      if (enemy.path.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(enemy.path[0].x, enemy.path[0].y);
      for (let i = 1; i < enemy.path.length; i++) ctx.lineTo(enemy.path[i].x, enemy.path[i].y);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(3, 5 * enemy.scale);
      ctx.strokeStyle = enemy.color;
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

    // Players
    state.players.forEach(player => {
      if (!player.isAlive) return;
      const isCurrentUser = player.id === currentUserId;
      
      // Avatar
      ctx.save();
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
      ctx.clip();
      if (player.avatarImg && player.avatarImg.complete) {
        try { ctx.drawImage(player.avatarImg, player.x - player.radius, player.y - player.radius, player.radius * 2, player.radius * 2); } 
        catch (e) { ctx.fillStyle = player.color; ctx.fill(); }
      } else {
        ctx.fillStyle = player.color;
        ctx.fill();
      }
      ctx.restore();

      // Outline
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
      ctx.lineWidth = isCurrentUser ? 3 : 1;
      ctx.strokeStyle = isCurrentUser ? '#00FFFF' : '#FFFFFF';
      if (isCurrentUser) { ctx.shadowBlur = 10; ctx.shadowColor = '#00FFFF'; }
      ctx.stroke();
      ctx.shadowBlur = 0;
      
      // Name
      ctx.fillStyle = '#FFFFFF';
      ctx.font = "10px 'Press Start 2P'";
      ctx.textAlign = 'center';
      ctx.fillText(player.username.substring(0, 10), player.x, player.y + player.radius + 15);

      // Aim Line (Self)
      if (isCurrentUser) {
        ctx.beginPath();
        ctx.moveTo(player.x, player.y);
        ctx.lineTo(mouseRef.current.x, mouseRef.current.y);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // HP Bar
      const hpBarWidth = 40;
      const hpBarY = player.y - player.radius - 10;
      ctx.fillStyle = 'red';
      ctx.fillRect(player.x - hpBarWidth/2, hpBarY, hpBarWidth, 4);
      ctx.fillStyle = '#00FF00';
      ctx.fillRect(player.x - hpBarWidth/2, hpBarY, hpBarWidth * (player.health / 100), 4);
    });

    if (!gameOver && !gameWon) {
      requestRef.current = requestAnimationFrame(gameLoop);
    }
  };

  return (
    <div className="flex-1 relative bg-gray-900 overflow-hidden">
      <canvas ref={canvasRef} className="block w-full h-full cursor-crosshair" />
      
      {/* UI Overlay */}
      {!gameOver && !gameWon && (
        <div className="absolute top-4 left-4 text-neon-cyan font-['Press_Start_2P'] z-50 pointer-events-none">
          <div className="text-xs text-gray-400 mt-2">ENEMIES LEFT: {enemiesCount}</div>
          <div className="text-xs text-gray-500 mt-1">PLAYERS ALIVE: {gameStateRef.current.players.filter(p => p.isAlive).length}</div>
        </div>
      )}

      {/* End Screens */}
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
