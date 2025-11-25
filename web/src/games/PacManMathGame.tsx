import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useGameCompletion } from '../hooks/useGameCompletion';

type Direction = 'up' | 'down' | 'left' | 'right';

interface Pellet {
  x: number;
  y: number;
  collected: boolean;
}

interface PowerPellet {
  x: number;
  y: number;
  number: number;
  isCorrect: boolean;
  collected: boolean;
}

interface Ghost {
  x: number;
  y: number;
  direction: Direction;
  color: string;
  name: 'blinky' | 'pinky' | 'inky' | 'clyde';
  vulnerable: boolean;
  eaten: boolean;
  respawnTimer: number;
  scatterTarget: { x: number; y: number };
  moveTimer: number;
}

interface MathProblem {
  equation: string;
  answer: number;
  wrongAnswers: number[];
}

const MATH_PROBLEMS: MathProblem[] = [
  { equation: "5 + _ = 10", answer: 5, wrongAnswers: [3, 7, 9] },
  { equation: "12 - _ = 7", answer: 5, wrongAnswers: [3, 6, 8] },
  { equation: "8 + _ = 15", answer: 7, wrongAnswers: [5, 9, 11] },
  { equation: "20 - _ = 12", answer: 8, wrongAnswers: [6, 10, 14] },
  { equation: "3 × _ = 15", answer: 5, wrongAnswers: [3, 7, 9] },
  { equation: "18 ÷ _ = 6", answer: 3, wrongAnswers: [2, 4, 5] },
];

const MAZE_LAYOUT = [
  "1111111111111111111111111111",
  "1000000000001100000000000001",
  "1011110111101101111011110101",
  "1000000000000000000000000001",
  "1011011110111110111101101101",
  "1000000000100010000000000001",
  "1111011110101010111101111111",
  "0000000000000000000000000000",
  "1111011011111111101101111111",
  "1000000000000000000000000001",
  "1011011110111110111101101101",
  "1000000000100010000000000001",
  "1111011110101010111101111111",
  "0000000000000000000000000000",
  "1111011011111111101101111111",
  "1000000000000000000000000001",
  "1011011110111110111101101101",
  "1000000000100010000000000001",
  "1111011110101010111101111111",
  "0000000000000000000000000000",
  "1111011011111111101101111111",
  "1000000000000000000000000001",
  "1000000000001100000000000001",
  "1111111111111111111111111111",
];

const TILE_SIZE = 16;
const MAZE_WIDTH = MAZE_LAYOUT[0].length;
const MAZE_HEIGHT = MAZE_LAYOUT.length;

// UI heights
const TOP_UI_HEIGHT = 40;
const BOTTOM_UI_HEIGHT = 30;

const findValidPositions = (minX: number, maxX: number, minY: number, maxY: number): {x: number, y: number}[] => {
  const positions: {x: number, y: number}[] = [];
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (MAZE_LAYOUT[y]?.[x] === '0') {
        positions.push({ x, y });
      }
    }
  }
  return positions;
};

export const PacManMathGame = () => {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(90);
  const [currentProblem, setCurrentProblem] = useState<MathProblem>(MATH_PROBLEMS[0]);
  const [isSupercharged, setIsSupercharged] = useState(false);
  
  const gameStateRef = useRef<{
    player: { x: number; y: number; direction: Direction; nextDirection: Direction | null; supercharged: boolean; superchargedTimer: number; mouthAngle: number; invincible: boolean; invincibleTimer: number; moveTimer: number };
    pellets: Pellet[];
    powerPellets: PowerPellet[];
    ghosts: Ghost[];
    keys: { w: boolean; a: boolean; s: boolean; d: boolean };
    score: number;
    lives: number;
    timeRemaining: number;
    active: boolean;
    ghostEatCount: number;
    currentProblem: MathProblem;
    scatterMode: boolean;
    modeTimer: number;
    penaltyMode: boolean;
    penaltyTimer: number;
  } | null>(null);

  const animationIdRef = useRef<number | null>(null);

  const { completeGame } = useGameCompletion({ gameType: 'pacman-math', gameName: 'Pac-Man: Math Blitz' });

  const generatePowerPellets = useCallback((problem: MathProblem): PowerPellet[] => {
    const midX = Math.floor(MAZE_WIDTH / 2);
    const midY = Math.floor(MAZE_HEIGHT / 2);
    
    const quadrants = [
      { minX: 1, maxX: midX - 2, minY: 1, maxY: midY - 2 },
      { minX: midX + 2, maxX: MAZE_WIDTH - 2, minY: 1, maxY: midY - 2 },
      { minX: 1, maxX: midX - 2, minY: midY + 2, maxY: MAZE_HEIGHT - 2 },
      { minX: midX + 2, maxX: MAZE_WIDTH - 2, minY: midY + 2, maxY: MAZE_HEIGHT - 2 },
    ];
    
    const allAnswers = [problem.answer, ...problem.wrongAnswers].sort(() => Math.random() - 0.5);
    const powerPellets: PowerPellet[] = [];
    
    quadrants.forEach((quad, i) => {
      const validPositions = findValidPositions(quad.minX, quad.maxX, quad.minY, quad.maxY);
      if (validPositions.length > 0) {
        const pos = validPositions[Math.floor(Math.random() * validPositions.length)];
        powerPellets.push({
          x: pos.x,
          y: pos.y,
          number: allAnswers[i % allAnswers.length],
          isCorrect: allAnswers[i % allAnswers.length] === problem.answer,
          collected: false,
        });
      }
    });
    
    return powerPellets;
  }, []);

  const startGame = useCallback(() => {
    const problem = MATH_PROBLEMS[Math.floor(Math.random() * MATH_PROBLEMS.length)];
    setCurrentProblem(problem);
    
    const pellets: Pellet[] = [];
    for (let y = 0; y < MAZE_HEIGHT; y++) {
      for (let x = 0; x < MAZE_WIDTH; x++) {
        if (MAZE_LAYOUT[y][x] === '0') {
          pellets.push({ x, y, collected: false });
        }
      }
    }

    const powerPellets = generatePowerPellets(problem);

    const ghosts: Ghost[] = [
      { x: 13, y: 9, direction: 'left', color: '#ff0000', name: 'blinky', vulnerable: false, eaten: false, respawnTimer: 0, scatterTarget: { x: MAZE_WIDTH - 3, y: 0 }, moveTimer: 0 },
      { x: 14, y: 9, direction: 'up', color: '#ffb8ff', name: 'pinky', vulnerable: false, eaten: false, respawnTimer: 0, scatterTarget: { x: 2, y: 0 }, moveTimer: 12 },
      { x: 13, y: 11, direction: 'right', color: '#00ffff', name: 'inky', vulnerable: false, eaten: false, respawnTimer: 0, scatterTarget: { x: MAZE_WIDTH - 1, y: MAZE_HEIGHT - 1 }, moveTimer: 24 },
      { x: 14, y: 11, direction: 'down', color: '#ffb852', name: 'clyde', vulnerable: false, eaten: false, respawnTimer: 0, scatterTarget: { x: 0, y: MAZE_HEIGHT - 1 }, moveTimer: 36 },
    ];

    gameStateRef.current = {
      player: {
        x: 14, y: 17,
        direction: 'left',
        nextDirection: null,
        supercharged: false,
        superchargedTimer: 0,
        mouthAngle: 0,
        invincible: false,
        invincibleTimer: 0,
        moveTimer: 0,
      },
      pellets,
      powerPellets,
      ghosts,
      keys: { w: false, a: false, s: false, d: false },
      score: 0,
      lives: 3,
      timeRemaining: 90,
      active: true,
      ghostEatCount: 0,
      currentProblem: problem,
      scatterMode: true,
      modeTimer: 7 * 60,
      penaltyMode: false,
      penaltyTimer: 0,
    };
    
    setScore(0);
    setLives(3);
    setGameOver(false);
    setTimeRemaining(90);
    setIsSupercharged(false);
    setGameStarted(true);
  }, [generatePowerPellets]);

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

    canvas.width = MAZE_WIDTH * TILE_SIZE;
    canvas.height = MAZE_HEIGHT * TILE_SIZE;
    canvas.tabIndex = 0;
    canvas.style.outline = 'none';

    const gameState = gameStateRef.current;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        e.preventDefault();
      }
      if (key === 'w' || key === 'arrowup') gameState.keys.w = true;
      if (key === 'a' || key === 'arrowleft') gameState.keys.a = true;
      if (key === 's' || key === 'arrowdown') gameState.keys.s = true;
      if (key === 'd' || key === 'arrowright') gameState.keys.d = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'w' || key === 'arrowup') gameState.keys.w = false;
      if (key === 'a' || key === 'arrowleft') gameState.keys.a = false;
      if (key === 's' || key === 'arrowdown') gameState.keys.s = false;
      if (key === 'd' || key === 'arrowright') gameState.keys.d = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Check if a tile is walkable
    const isWalkable = (x: number, y: number): boolean => {
      // Handle wrapping for tunnel rows
      if (y >= 0 && y < MAZE_HEIGHT && (x < 0 || x >= MAZE_WIDTH)) {
        return MAZE_LAYOUT[y][0] === '0' || MAZE_LAYOUT[y][MAZE_WIDTH - 1] === '0';
      }
      if (x < 0 || x >= MAZE_WIDTH || y < 0 || y >= MAZE_HEIGHT) return false;
      return MAZE_LAYOUT[y][x] === '0';
  };

    const getNextTile = (x: number, y: number, dir: Direction): { x: number; y: number } | null => {
      let nx = x, ny = y;
    switch (dir) {
        case 'up': ny--; break;
        case 'down': ny++; break;
        case 'left': nx--; break;
        case 'right': nx++; break;
    }
      // Handle tunnel wrapping - instant teleport
      if (nx < 0) nx = MAZE_WIDTH - 1;
      if (nx >= MAZE_WIDTH) nx = 0;
      
      return isWalkable(nx, ny) ? { x: nx, y: ny } : null;
    };

    const getOpposite = (dir: Direction): Direction => {
      switch (dir) { case 'up': return 'down'; case 'down': return 'up'; case 'left': return 'right'; case 'right': return 'left'; }
    };

    const distance = (x1: number, y1: number, x2: number, y2: number): number => {
      return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  };

    // Get available directions from a tile (excluding reverse)
    const getAvailableDirections = (x: number, y: number, currentDir: Direction): Direction[] => {
      const dirs: Direction[] = ['up', 'left', 'down', 'right'];
      const opposite = getOpposite(currentDir);
      const available: Direction[] = [];
      
      for (const dir of dirs) {
        if (dir === opposite) continue;
        const next = getNextTile(x, y, dir);
        if (next) available.push(dir);
      }
      
      // If no directions available (dead end), allow reverse
      if (available.length === 0) {
        const next = getNextTile(x, y, opposite);
        if (next) available.push(opposite);
      }
      
      return available;
    };

    // Classic Pac-Man ghost AI
    const getGhostTarget = (ghost: Ghost, player: typeof gameState.player, blinky: Ghost): { x: number; y: number } => {
      if (gameState.scatterMode && !player.supercharged) {
        return ghost.scatterTarget;
      }
      
      if (ghost.vulnerable) {
        // Random movement when vulnerable
        return { 
          x: Math.floor(Math.random() * MAZE_WIDTH), 
          y: Math.floor(Math.random() * MAZE_HEIGHT) 
        };
      }

    switch (ghost.name) {
        case 'blinky':
          return { x: player.x, y: player.y };
      
        case 'pinky': {
          let px = player.x, py = player.y;
        switch (player.direction) {
            case 'up': py -= 4; px -= 4; break;
            case 'down': py += 4; break;
            case 'left': px -= 4; break;
            case 'right': px += 4; break;
        }
          return { x: Math.max(0, Math.min(MAZE_WIDTH - 1, px)), y: Math.max(0, Math.min(MAZE_HEIGHT - 1, py)) };
        }
      
        case 'inky': {
          let ix = player.x, iy = player.y;
        switch (player.direction) {
            case 'up': iy -= 2; break;
            case 'down': iy += 2; break;
            case 'left': ix -= 2; break;
            case 'right': ix += 2; break;
        }
          return {
            x: Math.max(0, Math.min(MAZE_WIDTH - 1, ix + (ix - blinky.x))),
            y: Math.max(0, Math.min(MAZE_HEIGHT - 1, iy + (iy - blinky.y)))
          };
        }
      
        case 'clyde': {
          const dist = distance(ghost.x, ghost.y, player.x, player.y);
        if (dist > 8) {
            return { x: player.x, y: player.y };
          }
          return ghost.scatterTarget;
        }
      
      default:
          return { x: player.x, y: player.y };
    }
  };

    const chooseGhostDirection = (ghost: Ghost, target: { x: number; y: number }): Direction => {
      const available = getAvailableDirections(ghost.x, ghost.y, ghost.direction);
      
      if (available.length === 0) {
        return ghost.direction; // Shouldn't happen, but fallback
      }
      
      if (available.length === 1) {
        return available[0];
      }
      
      // Choose direction that gets closest to target
      let bestDir = available[0];
      let bestDist = Infinity;
      
      for (const dir of available) {
        const next = getNextTile(ghost.x, ghost.y, dir);
      if (next) {
          const dist = distance(next.x, next.y, target.x, target.y);
          if (dist < bestDist) {
            bestDist = dist;
            bestDir = dir;
          }
        }
      }
      
      return bestDir;
    };

    const PLAYER_MOVE_DELAY = 12; // Frames between moves (0.5x slower)
    const GHOST_MOVE_DELAY = 15; // 0.5x slower
    const GHOST_VULNERABLE_DELAY = 24; // 0.5x slower
    let lastTime = performance.now();

    const endGame = () => {
      gameState.active = false;
      setGameOver(true);
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
    };

    const drawGhost = (x: number, y: number, color: string, vulnerable: boolean, flashing: boolean, penaltyMode: boolean) => {
      const centerX = x * TILE_SIZE + TILE_SIZE / 2;
      const centerY = y * TILE_SIZE + TILE_SIZE / 2;
      const size = TILE_SIZE - 2;
      const radius = size / 2;
      
      ctx.save();
      ctx.translate(centerX, centerY);

      let bodyColor = color;
      if (vulnerable) {
        bodyColor = flashing ? '#ffffff' : '#0000ff';
      } else if (penaltyMode) {
        // During penalty mode, ghosts are red
        bodyColor = '#ff0000';
      }
      ctx.fillStyle = bodyColor;
      
      // Ghost body
      ctx.beginPath();
      ctx.arc(0, -radius * 0.15, radius * 0.85, Math.PI, 0, false);
      ctx.lineTo(radius * 0.85, radius * 0.45);

      const waves = 3;
      const waveWidth = (radius * 1.7) / (waves * 2);
      for (let i = 0; i <= waves * 2; i++) {
        const wx = radius * 0.85 - (i * waveWidth);
        const wy = radius * 0.45 + (i % 2 === 0 ? 0 : radius * 0.25);
        ctx.lineTo(wx, wy);
      }
      ctx.closePath();
      ctx.fill();
      
      // Eyes
      if (!vulnerable || flashing) {
        const eyeSize = size * 0.2;
        const eyeSpacing = size * 0.22;
        const eyeY = -size * 0.08;
        
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(-eyeSpacing, eyeY, eyeSize * 0.7, eyeSize, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(eyeSpacing, eyeY, eyeSize * 0.7, eyeSize, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#0000cc';
        const pupilSize = eyeSize * 0.45;
        ctx.beginPath();
        ctx.arc(-eyeSpacing + 1, eyeY + 1, pupilSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(eyeSpacing + 1, eyeY + 1, pupilSize, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Scared face
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-radius * 0.4, radius * 0.15);
        for (let i = 0; i < 4; i++) {
          ctx.lineTo(-radius * 0.4 + (i + 0.5) * radius * 0.2, radius * 0.15 + (i % 2 === 0 ? 2 : -2));
        }
        ctx.stroke();
      }
      
      ctx.restore();
    };

    const loop = (time: number) => {
      if (!gameState.active) return;

      const dt = Math.min((time - lastTime) / 16.66, 3);
      lastTime = time;

      const { player, keys } = gameState;

      // Update penalty timer
      if (gameState.penaltyMode) {
        gameState.penaltyTimer -= dt;
        if (gameState.penaltyTimer <= 0) {
          gameState.penaltyMode = false;
          gameState.penaltyTimer = 0;
        }
      }

      // Update scatter/chase mode timer
      if (!player.supercharged) {
        gameState.modeTimer -= dt;
        if (gameState.modeTimer <= 0) {
          gameState.scatterMode = !gameState.scatterMode;
          gameState.modeTimer = gameState.scatterMode ? 7 * 60 : 20 * 60;
        }
      }

      // Handle input - queue next direction
      if (keys.w) player.nextDirection = 'up';
      if (keys.a) player.nextDirection = 'left';
      if (keys.s) player.nextDirection = 'down';
      if (keys.d) player.nextDirection = 'right';

      // Player movement (tile-based)
      player.moveTimer -= dt;
      if (player.moveTimer <= 0) {
        // Try to move in queued direction first
        if (player.nextDirection) {
          const nextTile = getNextTile(player.x, player.y, player.nextDirection);
          if (nextTile) {
          player.direction = player.nextDirection;
            player.x = nextTile.x;
            player.y = nextTile.y;
          player.nextDirection = null;
            player.moveTimer = PLAYER_MOVE_DELAY;
          } else {
            // Try current direction
            const currTile = getNextTile(player.x, player.y, player.direction);
            if (currTile) {
              player.x = currTile.x;
              player.y = currTile.y;
              player.moveTimer = PLAYER_MOVE_DELAY;
            }
          }
      } else {
          // Move in current direction
          const currTile = getNextTile(player.x, player.y, player.direction);
          if (currTile) {
            player.x = currTile.x;
            player.y = currTile.y;
            player.moveTimer = PLAYER_MOVE_DELAY;
          }
          }
        }

      if (player.invincible) {
        player.invincibleTimer -= dt;
        if (player.invincibleTimer <= 0) player.invincible = false;
        }

      player.mouthAngle += 0.15;

      // Update supercharged
      if (player.supercharged) {
        player.superchargedTimer -= dt;
        setIsSupercharged(true);
        gameState.ghosts.forEach(g => { if (!g.eaten) g.vulnerable = true; });
        if (player.superchargedTimer <= 0) {
          player.supercharged = false;
          setIsSupercharged(false);
          gameState.ghosts.forEach(g => { if (!g.eaten) g.vulnerable = false; });
          
          const newProblem = MATH_PROBLEMS[Math.floor(Math.random() * MATH_PROBLEMS.length)];
          gameState.currentProblem = newProblem;
          setCurrentProblem(newProblem);
          gameState.powerPellets = generatePowerPellets(newProblem);
        }
      } else {
        setIsSupercharged(false);
      }

      // Collect pellets
      gameState.pellets.forEach(p => {
        if (!p.collected && player.x === p.x && player.y === p.y) {
          p.collected = true;
          gameState.score += 10;
          setScore(gameState.score);
        }
      });

      // Collect power pellets
      gameState.powerPellets.forEach(p => {
        if (!p.collected && player.x === p.x && player.y === p.y) {
          p.collected = true;
          if (p.isCorrect) {
            gameState.score += 50;
            player.supercharged = true;
            player.superchargedTimer = 8 * 60;
            gameState.ghosts.forEach(g => { 
              if (!g.eaten) {
                g.vulnerable = true;
                g.direction = getOpposite(g.direction);
              }
            });
            gameState.ghostEatCount = 0;
            setScore(gameState.score);
          } else {
            // Wrong pellet - trigger penalty mode
            gameState.penaltyMode = true;
            gameState.penaltyTimer = 3 * 60; // 3 seconds
          }
        }
      });

      // Update ghosts
      const blinky = gameState.ghosts.find(g => g.name === 'blinky')!;
      
      gameState.ghosts.forEach(ghost => {
        if (ghost.eaten) {
          ghost.respawnTimer -= dt;
          if (ghost.respawnTimer <= 0) {
            ghost.eaten = false;
            ghost.x = 13 + (ghost.name === 'pinky' || ghost.name === 'clyde' ? 1 : 0);
            ghost.y = 9 + (ghost.name === 'inky' || ghost.name === 'clyde' ? 2 : 0);
            ghost.vulnerable = false;
            ghost.moveTimer = 0;
          }
          return;
        }

        let moveDelay = ghost.vulnerable ? GHOST_VULNERABLE_DELAY : GHOST_MOVE_DELAY;
        // During penalty mode, ghosts move 1.5x faster (reduce delay by 1/1.5)
        if (gameState.penaltyMode && !ghost.vulnerable) {
          moveDelay = Math.floor(moveDelay / 1.5);
        }
        ghost.moveTimer -= dt;
        
        if (ghost.moveTimer <= 0) {
          const target = getGhostTarget(ghost, player, blinky);
          ghost.direction = chooseGhostDirection(ghost, target);
          
          const next = getNextTile(ghost.x, ghost.y, ghost.direction);
        if (next) {
            ghost.x = next.x;
            ghost.y = next.y;
          }
          ghost.moveTimer = moveDelay;
        }

        // Ghost collision (tile-based)
        if (ghost.x === player.x && ghost.y === player.y) {
          if (player.supercharged && ghost.vulnerable) {
            ghost.eaten = true;
            ghost.respawnTimer = 5 * 60;
            gameState.ghostEatCount++;
            const points = [200, 400, 800, 1600][Math.min(gameState.ghostEatCount - 1, 3)];
            gameState.score += points;
            setScore(gameState.score);
          } else if (!player.supercharged && !player.invincible) {
            gameState.lives--;
            setLives(gameState.lives);
            if (gameState.lives <= 0) {
              endGame();
              return;
            }
            player.x = 14;
            player.y = 17;
            player.direction = 'left';
              player.invincible = true;
            player.invincibleTimer = 2 * 60;
          }
        }
      });

      // Timer
      gameState.timeRemaining -= dt / 60;
      if (gameState.timeRemaining <= 0) {
        gameState.timeRemaining = 0;
        setTimeRemaining(0);
        endGame();
        return;
      }
      setTimeRemaining(Math.ceil(gameState.timeRemaining));
      
      // ============ DRAW ============
      ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw maze walls
      ctx.fillStyle = '#2121de';
      for (let y = 0; y < MAZE_HEIGHT; y++) {
        for (let x = 0; x < MAZE_WIDTH; x++) {
          if (MAZE_LAYOUT[y][x] === '1') {
            ctx.fillRect(x * TILE_SIZE + 1, y * TILE_SIZE + 1, TILE_SIZE - 2, TILE_SIZE - 2);
          }
        }
      }

      // Draw pellets
      ctx.fillStyle = '#ffb897';
      gameState.pellets.forEach(p => {
        if (!p.collected) {
          ctx.beginPath();
          ctx.arc(p.x * TILE_SIZE + TILE_SIZE / 2, p.y * TILE_SIZE + TILE_SIZE / 2, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Draw power pellets
      gameState.powerPellets.forEach(p => {
        if (!p.collected) {
          const px = p.x * TILE_SIZE + TILE_SIZE / 2;
          const py = p.y * TILE_SIZE + TILE_SIZE / 2;
          
          const pulse = 0.8 + Math.sin(time / 150) * 0.2;
          
          ctx.fillStyle = '#ffff00';
          ctx.beginPath();
          ctx.arc(px, py, TILE_SIZE * 0.4 * pulse, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.font = `bold ${TILE_SIZE * 0.65}px "Press Start 2P", monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 2.5;
          ctx.strokeText(p.number.toString(), px, py);
          ctx.fillStyle = '#ffffff';
          ctx.fillText(p.number.toString(), px, py);
        }
      });

      // Draw ghosts
      const flashing = player.supercharged && player.superchargedTimer < 2 * 60 && Math.floor(player.superchargedTimer / 8) % 2 === 0;
      gameState.ghosts.forEach(ghost => {
        if (!ghost.eaten) {
          drawGhost(ghost.x, ghost.y, ghost.color, ghost.vulnerable, flashing, gameState.penaltyMode);
        }
      });

      // Draw player
      const playerFlash = player.invincible && Math.floor(player.invincibleTimer / 4) % 2 === 0;
      if (!playerFlash) {
        const centerX = player.x * TILE_SIZE + TILE_SIZE / 2;
        const centerY = player.y * TILE_SIZE + TILE_SIZE / 2;
        
        ctx.save();
        ctx.translate(centerX, centerY);
        const angle = { 'up': -Math.PI / 2, 'down': Math.PI / 2, 'left': Math.PI, 'right': 0 }[player.direction];
        ctx.rotate(angle);
        ctx.fillStyle = '#ffff00';
        const mouth = Math.abs(Math.sin(player.mouthAngle)) * 0.4 + 0.1;
        ctx.beginPath();
        ctx.arc(0, 0, TILE_SIZE / 2 - 1, mouth, Math.PI * 2 - mouth);
        ctx.lineTo(0, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

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
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameStarted, gameOver, generatePowerPellets]);

  // Start menu
  if (!gameStarted) {
    return (
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-400 hover:text-white">
            <ArrowLeft size={18} />
            <span className="font-['Press_Start_2P'] text-[10px]">EXIT</span>
          </button>
          <h1 className="font-['Press_Start_2P'] text-sm text-neon-yellow">PAC-MAN</h1>
          <div className="w-16"></div>
        </div>

        <div className="border-4 border-space-700 rounded-lg bg-black p-6">
          <div className="flex flex-col items-center justify-center">
            <h1 className="text-2xl text-yellow-400 font-['Press_Start_2P'] mb-3 animate-pulse">PAC-MAN</h1>
            <h2 className="text-xs text-neon-cyan font-['Press_Start_2P'] mb-6">MATH BLITZ</h2>
            
            <div className="bg-gray-900/80 border-2 border-yellow-400 rounded-lg p-4 mb-6 max-w-sm text-left">
              <h3 className="text-[10px] text-neon-yellow font-['Press_Start_2P'] mb-3 text-center">HOW TO PLAY</h3>
              <ul className="text-[9px] text-gray-300 space-y-2">
                <li>▸ Move: <span className="text-neon-green">W A S D</span> or Arrow Keys</li>
                <li>▸ Collect dots for points</li>
                <li>▸ Find the <span className="text-neon-yellow">correct answer</span> pellet</li>
                <li>▸ Correct answer = <span className="text-neon-green">eat ghosts!</span></li>
                <li>▸ Avoid ghosts unless powered up!</li>
              </ul>
            </div>

                <button 
              onClick={startGame}
              className="px-6 py-3 bg-yellow-400 text-black font-['Press_Start_2P'] text-xs rounded hover:bg-yellow-300 hover:scale-105 transition-all"
            >
              START GAME
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Game over
  if (gameOver) {
    return (
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-400 hover:text-white">
            <ArrowLeft size={18} />
            <span className="font-['Press_Start_2P'] text-[10px]">EXIT</span>
          </button>
          <h1 className="font-['Press_Start_2P'] text-sm text-neon-yellow">PAC-MAN</h1>
          <div className="w-16"></div>
        </div>

        <div className="border-4 border-space-700 rounded-lg bg-black p-6">
          <div className="flex flex-col items-center justify-center py-8">
            <h2 className="text-2xl text-neon-pink font-['Press_Start_2P'] mb-4 animate-pulse">GAME OVER</h2>
            <div className="text-lg text-white font-['Press_Start_2P'] mb-6">SCORE: {score.toLocaleString()}</div>
            
            <div className="flex gap-4">
              <button onClick={startGame} className="retro-btn bg-neon-cyan text-black border-neon-cyan hover:bg-white text-xs">
                  RETRY
                </button>
              <button onClick={() => completeGame(score)} className="retro-btn border-neon-pink text-neon-pink hover:bg-neon-pink hover:text-white text-xs">
                  CONTINUE
                </button>
              </div>
            </div>
        </div>
      </div>
    );
  }

  // Active game - custom layout with UI above and below
  return (
    <div className="max-w-2xl mx-auto px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-400 hover:text-white">
          <ArrowLeft size={18} />
          <span className="font-['Press_Start_2P'] text-[10px]">EXIT</span>
        </button>
        <h1 className="font-['Press_Start_2P'] text-sm text-neon-yellow">PAC-MAN</h1>
        <div className="w-16"></div>
      </div>

      {/* Game container */}
      <div className="border-4 border-space-700 rounded-lg bg-black overflow-hidden">
        {/* Top UI bar */}
        <div 
          className="flex justify-between items-center px-4 bg-gray-900 border-b border-space-700"
          style={{ height: TOP_UI_HEIGHT }}
        >
          <div className="font-['Press_Start_2P'] text-white">
            <div className="text-neon-cyan text-[8px]">SCORE</div>
            <div className="text-sm">{score.toLocaleString()}</div>
            </div>
          
          <div className="font-['Press_Start_2P'] text-center flex-1 mx-4">
            <div className="text-gray-400 text-[7px]">{isSupercharged ? 'POWER MODE!' : 'SOLVE:'}</div>
            <div className={`text-xs ${isSupercharged ? 'text-neon-green animate-pulse' : 'text-neon-cyan'}`}>
              {isSupercharged ? currentProblem.equation.replace('_', currentProblem.answer.toString()) : currentProblem.equation}
            </div>
          </div>
          
          <div className="font-['Press_Start_2P'] text-white text-right">
            <div className="text-neon-pink text-[8px]">LIVES</div>
            <div className="text-sm">{lives > 0 ? '♥'.repeat(lives) : '—'}</div>
          </div>
        </div>
        
        {/* Game canvas - exact size, centered */}
        <div className="flex justify-center bg-black">
          <canvas 
            ref={canvasRef} 
            style={{ 
              width: MAZE_WIDTH * TILE_SIZE,
              height: MAZE_HEIGHT * TILE_SIZE,
              imageRendering: 'pixelated'
            }} 
          />
        </div>
        
        {/* Bottom UI bar */}
        <div 
          className="flex justify-center items-center px-4 bg-gray-900 border-t border-space-700"
          style={{ height: BOTTOM_UI_HEIGHT }}
        >
          <div className="font-['Press_Start_2P'] text-white flex items-center gap-3">
            <span className="text-neon-yellow text-[8px]">TIME</span>
            <span className={`text-sm ${timeRemaining <= 10 ? 'text-red-500 animate-pulse' : ''}`}>
              {timeRemaining.toString().padStart(2, '0')}
            </span>
          </div>
        </div>
      </div>

      {/* Controls hint */}
      <div className="mt-4 flex justify-center gap-6 text-gray-500 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="border border-gray-700 px-1.5 py-0.5 rounded bg-space-800 text-[10px] text-white font-['Press_Start_2P']">WASD</span>
          <span>Move</span>
        </div>
      </div>
    </div>
  );
};
