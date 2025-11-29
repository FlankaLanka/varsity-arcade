import { useRef, useEffect, useState } from 'react';
import { ref, onValue, set, remove, update } from 'firebase/database';
import { rtdb } from '../lib/firebase';
import type { WhiteboardDrawing, CohortMember } from '../types/cohort';
import { circleIntersectsSegment, getPathCenter, type Point } from '../utils/geometry';
import { X } from 'lucide-react';

interface WhiteboardBattleProps {
  drawings: WhiteboardDrawing[];
  onBattleEnd: (victory?: boolean) => void;
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
  //console.log('[WhiteboardBattle] Mounted with drawings:', drawings.length, 'members:', members.length);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | null>(null);
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const mouseRef = useRef<{ x: number, y: number }>({ x: 0, y: 0 });
  const mouseDownRef = useRef(false);
  
  // Game State
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [enemiesCount, setEnemiesCount] = useState(0);
  const [isHost, setIsHost] = useState(false); // Host handles enemy logic
  const [gameInitialized, setGameInitialized] = useState(false); // Track if game has been initialized
  
  // Camera state (follows current player)
  const cameraX = useRef(0);
  const cameraY = useRef(0);
  
  // Refs for mutable game state
  const gameStateRef = useRef({
    players: [] as Player[],
    enemies: [] as Enemy[],
    projectiles: [] as Projectile[],
    lastShotTime: 0,
  });

  // Projectile sync throttling (so other clients see bullets move)
  const lastProjectileSyncRef = useRef(0);
  const PROJECTILE_SYNC_INTERVAL = 100; // ms

  // Enemy sync throttling + snapshot tracking
  const lastEnemySyncRef = useRef(0);
  const ENEMY_SYNC_INTERVAL = 120; // ms (~8 FPS sync to RTDB)
  const enemySnapshotReadyRef = useRef(false);

  // Prevent duplicate victory announcements
  const victoryAnnouncedRef = useRef(false);
  const gameOverRef = useRef(false);
  const gameWonRef = useRef(false);
  const gameInitializedRef = useRef(false);

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
    if (!cohortId) {
      setIsHost(true);
      enemySnapshotReadyRef.current = true;
      gameInitializedRef.current = true;
      setGameInitialized(true);
      return;
    }

    enemySnapshotReadyRef.current = false;

    // Determine Host (currently first member alphabetically)
    const sortedMembers = [...members].sort((a, b) => a.userId.localeCompare(b.userId));
    const hostId = sortedMembers[0]?.userId;
    const amIHost = currentUserId === hostId;
    setIsHost(amIHost);

    const playersRef = ref(rtdb, `cohorts/${cohortId}/battle/players`);
    const unsubscribePlayers = onValue(playersRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) return;

      const remotePlayers = Object.values(data) as Player[];
      gameStateRef.current.players.forEach((localP) => {
        const remoteP = remotePlayers.find((rp) => rp.id === localP.id);
        if (!remoteP) return;

        if (localP.id !== currentUserId) {
          localP.x = remoteP.x;
          localP.y = remoteP.y;
        }
        localP.health = remoteP.health;
        localP.isAlive = remoteP.isAlive;
      });

      remotePlayers.forEach((rp) => {
        if (!gameStateRef.current.players.find((p) => p.id === rp.id)) {
          let avatarImg: HTMLImageElement | undefined;
          if (rp.avatarUrl) {
            avatarImg = new Image();
            avatarImg.src = rp.avatarUrl;
          }
          gameStateRef.current.players.push({ ...rp, avatarImg });
        }
      });
    });

    const enemiesRef = ref(rtdb, `cohorts/${cohortId}/battle/enemies`);
    const unsubscribeEnemies = onValue(enemiesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        enemySnapshotReadyRef.current = true;
        const remoteEnemies = Object.values(data) as Enemy[];
        const remoteIds = new Set(remoteEnemies.map(e => e.id));
        const localEnemies = gameStateRef.current.enemies;
        
        // Smart merge: Remove enemies that no longer exist in Firebase (killed by others)
        const survivingLocal = localEnemies.filter(e => remoteIds.has(e.id));
        
        // Add new enemies from Firebase (ones we don't have locally)
        remoteEnemies.forEach(remoteEnemy => {
          const existsLocally = survivingLocal.find(e => e.id === remoteEnemy.id);
          if (!existsLocally) {
            // New enemy from Firebase - add it with full data
            survivingLocal.push({
              ...remoteEnemy,
              path: remoteEnemy.path ?? [],
              originalPath: remoteEnemy.originalPath ?? [],
            });
          }
          // If it exists locally, keep local position for smooth movement
        });
        
        gameStateRef.current.enemies = survivingLocal;
        setEnemiesCount(survivingLocal.length);
      } else if (enemySnapshotReadyRef.current) {
        gameStateRef.current.enemies = [];
        setEnemiesCount(0);
      }
      gameInitializedRef.current = true;
      setGameInitialized(true);
    });

    const battleGameStateRef = ref(rtdb, `cohorts/${cohortId}/battle/gameState`);
    const unsubscribeGameState = onValue(battleGameStateRef, (snapshot) => {
      const battleGameState = snapshot.val();
      if (!battleGameState) return;
      if (battleGameState.gameOver !== undefined) {
        gameOverRef.current = battleGameState.gameOver;
        setGameOver(battleGameState.gameOver);
        if (battleGameState.gameOver) {
          victoryAnnouncedRef.current = true;
        }
      }
      if (battleGameState.gameWon !== undefined) {
        gameWonRef.current = battleGameState.gameWon;
        setGameWon(battleGameState.gameWon);
        if (battleGameState.gameWon) {
          victoryAnnouncedRef.current = true;
        }
      }
    });

    const projectilesRef = ref(rtdb, `cohorts/${cohortId}/battle/projectiles`);
    const unsubscribeProjectiles = onValue(projectilesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const remoteProjectiles = Object.entries(data).map(([id, proj]: [string, any]) => ({
          id,
          x: proj.x,
          y: proj.y,
          vx: proj.vx,
          vy: proj.vy,
          radius: proj.radius || 4,
          color: proj.color || '#FF0055',
          ownerId: proj.ownerId,
        })) as Projectile[];

        const ourProjectileIds = new Set(
          gameStateRef.current.projectiles.filter((p) => p.ownerId === currentUserId).map((p) => p.id)
        );

        gameStateRef.current.projectiles = gameStateRef.current.projectiles.filter((p) => {
          if (p.ownerId === currentUserId && ourProjectileIds.has(p.id)) {
            return true;
          }
          return remoteProjectiles.some((rp) => rp.id === p.id);
        });

        remoteProjectiles.forEach((rp) => {
          if (rp.ownerId !== currentUserId && !gameStateRef.current.projectiles.find((p) => p.id === rp.id)) {
            gameStateRef.current.projectiles.push(rp);
          }
        });
      } else {
        gameStateRef.current.projectiles = gameStateRef.current.projectiles.filter(
          (p) => p.ownerId === currentUserId
        );
      }
    });

    return () => {
      unsubscribePlayers();
      unsubscribeEnemies();
      unsubscribeGameState();
      unsubscribeProjectiles();
    };
  }, [cohortId, currentUserId, members]);

  // Fallback victory detection: if enemies list is empty but host never broadcasted
  useEffect(() => {
    if (!cohortId) return;
    if (!enemySnapshotReadyRef.current) return;
    if (!gameInitialized || gameOver || gameWon) return;
    if (enemiesCount > 0 || victoryAnnouncedRef.current) return;

    victoryAnnouncedRef.current = true;
    gameWonRef.current = true;
    setGameWon(true);
    set(ref(rtdb, `cohorts/${cohortId}/battle/gameState`), {
      gameOver: false,
      gameWon: true,
    }).catch(() => {});
  }, [cohortId, enemiesCount, gameInitialized, gameOver, gameWon]);


  // Initialize Game - Any user can initialize, we check Firebase to avoid duplicates
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const initializeGame = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
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

      gameStateRef.current.players = initialPlayers;
      victoryAnnouncedRef.current = false;
      gameOverRef.current = false;
      gameWonRef.current = false;
      enemySnapshotReadyRef.current = false;
      
      // Initialize camera to center on current player
      const currentPlayer = initialPlayers.find(p => p.id === currentUserId);
      if (currentPlayer && canvasRef.current) {
        cameraX.current = currentPlayer.x - canvasRef.current.width / 2;
        cameraY.current = currentPlayer.y - canvasRef.current.height / 2;
      }
      
      // Create enemies from drawings
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
      
      console.log('[WhiteboardBattle] Spawning enemies:', initialEnemies.length, 'from drawings:', drawings.length);
      
      gameStateRef.current.enemies = initialEnemies;
      setEnemiesCount(initialEnemies.length);

      // Sync enemies and players to Firebase
      if (cohortId) {
        // Build the complete enemies and players objects to replace existing ones
        const enemiesObject: Record<string, Enemy> = {};
        initialEnemies.forEach(e => {
          enemiesObject[e.id] = e;
        });
        
        const playersObject: Record<string, any> = {};
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
          playersObject[p.id] = cleanPlayerData;
        });
        
        // Use set to completely replace the enemies and players nodes
        set(ref(rtdb, `cohorts/${cohortId}/battle/enemies`), enemiesObject).catch(err => 
          console.error('Failed to sync enemies:', err)
        );
        set(ref(rtdb, `cohorts/${cohortId}/battle/players`), playersObject).catch(err => 
          console.error('Failed to sync players:', err)
        );
      }

      setGameOver(false);
      setGameWon(false);
      
      // Reset game state in RTDB when game restarts
      if (cohortId) {
        set(ref(rtdb, `cohorts/${cohortId}/battle/gameState`), {
          gameOver: false,
          gameWon: false
        }).catch(() => {});
        
        // Clear any leftover projectiles (any user can do this now)
        remove(ref(rtdb, `cohorts/${cohortId}/battle/projectiles`)).catch(() => {});
      }
      
      // Clear local projectile state
      gameStateRef.current.projectiles = [];

      // Mark as initialized - this allows defeat/victory detection in the game loop
      // Must be set BEFORE starting the loop to handle immediate player death
      gameInitializedRef.current = true;
      setGameInitialized(true);

      // Start Loop
      requestRef.current = requestAnimationFrame(gameLoop);
    };

    initializeGame();

    return () => {
      if (requestRef.current !== null) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [drawings, members, currentUserId, cohortId]);


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
        // Infinite canvas - no boundaries
        if (keysRef.current['KeyW'] || keysRef.current['ArrowUp']) player.y -= player.speed;
        if (keysRef.current['KeyS'] || keysRef.current['ArrowDown']) player.y += player.speed;
        if (keysRef.current['KeyA'] || keysRef.current['ArrowLeft']) player.x -= player.speed;
        if (keysRef.current['KeyD'] || keysRef.current['ArrowRight']) player.x += player.speed;
        
        // Update camera to follow player (centered on canvas)
        cameraX.current = player.x - width / 2;
        cameraY.current = player.y - height / 2;

        // Shooting
      if (mouseDownRef.current) {
          if (time - state.lastShotTime > 200) {
            // Convert mouse screen coordinates to world coordinates
            const worldMouseX = mouseRef.current.x + cameraX.current;
            const worldMouseY = mouseRef.current.y + cameraY.current;
            const dx = worldMouseX - player.x;
            const dy = worldMouseY - player.y;
          const mag = Math.sqrt(dx*dx + dy*dy);
          const projectileSpeed = 10;
          const vx = mag > 0 ? (dx / mag) * projectileSpeed : 0;
            const vy = mag > 0 ? (dy / mag) * projectileSpeed : -projectileSpeed;

          const projectileId = `proj-${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${currentUserId}`;
          const projectile: Projectile = {
              id: projectileId,
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
            
            // Sync bullet to RTDB (initial position and direction)
            if (cohortId) {
              const bulletData = {
                x: player.x,
                y: player.y,
                vx,
                vy,
                radius: 4,
                color: '#FF0055',
                ownerId: player.id,
                createdAt: Date.now()
              };
              set(ref(rtdb, `cohorts/${cohortId}/battle/projectiles/${projectileId}`), bulletData)
                .catch((err) => console.error("Failed to sync bullet:", err));
            }
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

    if (cohortId && time - lastProjectileSyncRef.current >= PROJECTILE_SYNC_INTERVAL) {
      const ourProjectiles = state.projectiles.filter((p) => p.ownerId === currentUserId);
      const updates: Record<string, any> = {};
      ourProjectiles.forEach((p) => {
        updates[`cohorts/${cohortId}/battle/projectiles/${p.id}`] = {
          x: p.x,
          y: p.y,
          vx: p.vx,
          vy: p.vy,
          radius: p.radius,
          color: p.color,
          ownerId: p.ownerId,
          updatedAt: Date.now(),
        };
      });
      if (Object.keys(updates).length > 0) {
        update(ref(rtdb), updates).catch((err) => console.error('Failed to sync projectile positions:', err));
      }
      lastProjectileSyncRef.current = time;
    }

    // Remove only our own projectiles that travel too far (Firebase cleanup handles others)
    const maxDistance = Math.max(width, height) * 2;
    const currentPlayer = state.players.find(p => p.id === currentUserId);
    if (currentPlayer) {
      state.projectiles = state.projectiles.filter(p => {
        if (p.ownerId !== currentUserId) {
          return true;
        }
        const dx = p.x - currentPlayer.x;
        const dy = p.y - currentPlayer.y;
        const withinRange = Math.sqrt(dx * dx + dy * dy) < maxDistance;
        if (!withinRange && cohortId) {
          remove(ref(rtdb, `cohorts/${cohortId}/battle/projectiles/${p.id}`)).catch(() => {});
        }
        return withinRange;
      });
    }

    // 3. Update Enemies (all users update locally, host syncs to Firebase)
    // This ensures smooth local gameplay even if host hasn't synced yet
    state.enemies.forEach(enemy => {
      let nearestPlayer: Player | null = null;
      let minDist = Infinity;

      state.players.forEach(player => {
        if (!player.isAlive) return;
        const dx = player.x - enemy.center.x;
        const dy = player.y - enemy.center.y;
        const dist = dx * dx + dy * dy;
        if (dist < minDist) {
          minDist = dist;
          nearestPlayer = player;
        }
      });

      if (nearestPlayer) {
        const targetPlayer = nearestPlayer as Player;
        const dx = targetPlayer.x - enemy.center.x;
        const dy = targetPlayer.y - enemy.center.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
          enemy.center.x += (dx / dist) * enemy.speed;
          enemy.center.y += (dy / dist) * enemy.speed;
        }

        enemy.path = enemy.originalPath.map(p => ({
          x: enemy.center.x + p.x * enemy.scale,
          y: enemy.center.y + p.y * enemy.scale
        }));

        let hit = false;
        if (dist < 100) {
          for (let i = 0; i < enemy.path.length - 1; i++) {
            if (circleIntersectsSegment(
              { x: targetPlayer.x, y: targetPlayer.y },
              targetPlayer.radius,
              enemy.path[i],
              enemy.path[i + 1]
            )) {
              hit = true;
              break;
            }
          }
        }

        if (hit) {
          targetPlayer.health -= 0.5;
          if (targetPlayer.health <= 0) {
            targetPlayer.health = 0;
            targetPlayer.isAlive = false;
          }
          healthChanged = true;

          // Any user can sync player health updates
          if (cohortId) {
            const { avatarImg, ...pData } = targetPlayer;
            const cleanPlayerData: any = {};
            Object.entries(pData).forEach(([key, value]) => {
              if (value !== undefined) {
                cleanPlayerData[key] = value;
              }
            });
            update(ref(rtdb, `cohorts/${cohortId}/battle/players/${targetPlayer.id}`), cleanPlayerData);
          }
        }
      }
    });

    // Only host syncs enemy positions to Firebase (to prevent conflicts)
    if (cohortId && isHost && time - lastEnemySyncRef.current >= ENEMY_SYNC_INTERVAL) {
      if (state.enemies.length === 0) {
        set(ref(rtdb, `cohorts/${cohortId}/battle/enemies`), null).catch((err) =>
          console.error('Failed to sync empty enemy state:', err)
        );
      } else {
        const enemyPayload: Record<string, Enemy> = {};
        state.enemies.forEach((enemy) => {
          enemyPayload[enemy.id] = {
            ...enemy,
            path: enemy.path.map((p) => ({ ...p })),
            originalPath: enemy.originalPath.map((p) => ({ ...p })),
          };
        });
        set(ref(rtdb, `cohorts/${cohortId}/battle/enemies`), enemyPayload).catch((err) =>
          console.error('Failed to sync enemies:', err)
        );
      }
      lastEnemySyncRef.current = time;
    }

    setEnemiesCount(state.enemies.length);

    // 4. Collision: Projectiles vs Enemies (all users process locally, anyone can remove enemies)
    {
      for (let pIdx = state.projectiles.length - 1; pIdx >= 0; pIdx--) {
        const p = state.projectiles[pIdx];
        let projectileHit = false;

        for (let eIdx = state.enemies.length - 1; eIdx >= 0; eIdx--) {
          const enemy = state.enemies[eIdx];
          const dx = p.x - enemy.center.x;
          const dy = p.y - enemy.center.y;
          if (dx * dx + dy * dy > 10000) continue;

          let hit = false;
          for (let i = 0; i < enemy.path.length - 1; i++) {
            if (circleIntersectsSegment({ x: p.x, y: p.y }, p.radius + 5, enemy.path[i], enemy.path[i + 1])) {
              hit = true;
              break;
            }
          }

          if (hit) {
            state.enemies.splice(eIdx, 1);
            projectileHit = true;

            const newCount = state.enemies.length;
            setEnemiesCount(newCount);

            // Any user can remove enemy from Firebase when hit
            if (cohortId) {
              remove(ref(rtdb, `cohorts/${cohortId}/battle/enemies/${enemy.id}`)).catch((err) => {
                console.error('Failed to remove enemy from RTDB:', err);
              });
            }

            break;
          }
        }
        if (projectileHit) {
          const removedProjectile = state.projectiles[pIdx];
          state.projectiles.splice(pIdx, 1);

          if (cohortId && removedProjectile) {
            remove(ref(rtdb, `cohorts/${cohortId}/battle/projectiles/${removedProjectile.id}`)).catch(() => {});
          }
        }
      }
    }

    // 5. Check Game State
    if (healthChanged || time % 10 === 0) {
      const healths: Record<string, number> = {};
      state.players.forEach(p => healths[p.id] = Math.floor(p.health));
      onHealthUpdate?.(healths);
    }

    // Any user can determine victory/defeat and sync to RTDB
    // This ensures the game ends properly regardless of who is host
    // Use gameInitializedRef to avoid stale closure issues in the game loop
    if (gameInitializedRef.current && !gameOverRef.current && !gameWonRef.current) {
      const activePlayers = state.players.filter(p => p.isAlive);
      
      // Check defeat first
      if (activePlayers.length === 0) {
        gameOverRef.current = true;
        setGameOver(true);
        // Sync to RTDB
        if (cohortId) {
          set(ref(rtdb, `cohorts/${cohortId}/battle/gameState`), {
            gameOver: true,
            gameWon: false
          }).catch(() => {});
        }
        // Continue to render this frame, then loop will stop naturally
      }
      
      // Check victory - use state.enemies.length directly and ensure it's accurate
      // Also update enemiesCount to match
      const currentEnemyCount = state.enemies.length;
      setEnemiesCount(currentEnemyCount); // Keep UI in sync with actual enemy count
      
      if (currentEnemyCount === 0 && !victoryAnnouncedRef.current && activePlayers.length > 0) {
        victoryAnnouncedRef.current = true;
        gameWonRef.current = true;
        setGameWon(true);
        // Sync to RTDB
        if (cohortId) {
          set(ref(rtdb, `cohorts/${cohortId}/battle/gameState`), {
            gameOver: false,
            gameWon: true
          }).catch(() => {});
        }
        // Continue to render this frame, then loop will stop naturally
      }
    }

    // 6. Render
    ctx.clearRect(0, 0, width, height);

    // Apply camera transform
    ctx.save();
    ctx.translate(-cameraX.current, -cameraY.current);

    // Infinite Grid
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 1;
    const gridSize = 40;
    const startX = Math.floor(cameraX.current / gridSize) * gridSize;
    const endX = startX + width + gridSize;
    const startY = Math.floor(cameraY.current / gridSize) * gridSize;
    const endY = startY + height + gridSize;
    
    for(let x = startX; x <= endX; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
      ctx.stroke();
    }
    for(let y = startY; y <= endY; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
      ctx.stroke();
    }

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
        // Convert mouse screen coordinates to world coordinates
        const worldMouseX = mouseRef.current.x + cameraX.current;
        const worldMouseY = mouseRef.current.y + cameraY.current;
      ctx.beginPath();
        ctx.moveTo(player.x, player.y);
        ctx.lineTo(worldMouseX, worldMouseY);
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
    
    // Restore camera transform
    ctx.restore();

    if (!gameOverRef.current && !gameWonRef.current) {
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

      {/* Manual Exit Button */}
      <div className="absolute bottom-4 right-4 z-50">
        <button
          onClick={() => {
            if (window.confirm('Exit the battle and return everyone to the whiteboard?')) {
              onBattleEnd();
            }
          }}
          className="w-12 h-12 bg-gray-800/90 hover:bg-gray-700 border border-gray-600 text-white rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110"
          title="Exit Battle"
        >
          <X size={22} />
        </button>
      </div>

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
            onClick={() => onBattleEnd(gameWon)}
            className="px-6 py-3 bg-neon-cyan hover:bg-neon-cyan/80 text-black font-bold rounded font-['Press_Start_2P'] transition-all"
          >
            RETURN TO WHITEBOARD
          </button>
        </div>
      )}
    </div>
  );
}
