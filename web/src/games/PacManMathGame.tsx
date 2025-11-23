import React, { useEffect, useRef, useState } from 'react';
import { GameFrame } from '../components/GameFrame';
import { useNavigate } from 'react-router-dom';

type Direction = 'up' | 'down' | 'left' | 'right';

interface Tile {
  x: number;
  y: number;
  isWall: boolean;
}

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
  x: number;              // Grid position
  y: number;              // Grid position
  pixelX: number;         // Pixel position
  pixelY: number;         // Pixel position
  direction: Direction;
  nextDirection: Direction | null;
  color: string;
  name: string;
  vulnerable: boolean;
  eaten: boolean;
  respawnTimer: number;
  directionChangeTimer: number; // Timer to prevent direction changes every frame
}

interface MathProblem {
  equation: string;
  answer: number;
  wrongAnswers: number[];
}

// Math Problems Pool
const MATH_PROBLEMS: MathProblem[] = [
  { equation: "5 + _ = 10", answer: 5, wrongAnswers: [3, 7, 9] },
  { equation: "12 - _ = 7", answer: 5, wrongAnswers: [3, 6, 8] },
  { equation: "8 + _ = 15", answer: 7, wrongAnswers: [5, 9, 11] },
  { equation: "20 - _ = 12", answer: 8, wrongAnswers: [6, 10, 14] },
  { equation: "3 × _ = 15", answer: 5, wrongAnswers: [3, 7, 9] },
  { equation: "18 ÷ _ = 6", answer: 3, wrongAnswers: [2, 4, 5] },
  { equation: "7 + _ = 14", answer: 7, wrongAnswers: [5, 9, 11] },
  { equation: "25 - _ = 18", answer: 7, wrongAnswers: [5, 9, 11] },
  { equation: "4 × _ = 20", answer: 5, wrongAnswers: [3, 6, 8] },
  { equation: "16 ÷ _ = 4", answer: 4, wrongAnswers: [2, 3, 5] },
];

// Simple maze layout (1 = wall, 0 = path, 2 = power pellet spot)
const MAZE_LAYOUT = [
  "1111111111111111111111111111",
  "1000000000110000000000000001",
  "1011110111011011101111011101",
  "1000000000000000000000000001",
  "1011011110111110111101101101",
  "1000000000100010000000000001",
  "1111011110101010111101111111",
  "0000010000000000000010000000",
  "1111011011111111101101101111",
  "1000000000000000000000000001",
  "1011011110111110111101101101",
  "1000000000100010000000000001",
  "1111011110101010111101111111",
  "0000010000000000000010000000",
  "1111011011111111101101101111",
  "1000000000000000000000000001",
  "1011011110111110111101101101",
  "1000000000100010000000000001",
  "1111011110101010111101111111",
  "0000010000000000000010000000",
  "1111011011111111101101101111",
  "1000000000000000000000000001",
  "1000000000110000000000000001",
  "1111111111111111111111111111",
];

const TILE_SIZE = 20;
const MAZE_WIDTH = MAZE_LAYOUT[0].length;
const MAZE_HEIGHT = MAZE_LAYOUT.length;
const CANVAS_WIDTH = MAZE_WIDTH * TILE_SIZE;
const CANVAS_HEIGHT = MAZE_HEIGHT * TILE_SIZE;

export const PacManMathGame = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [currentProblem, setCurrentProblem] = useState<MathProblem>(MATH_PROBLEMS[0]);
  const [isSupercharged, setIsSupercharged] = useState(false);
  
  // Scatter mode targets (corners of our map)
  const SCATTER_TARGETS = {
    blinky: { x: 26, y: 1 },   // Top-right
    pinky: { x: 1, y: 1 },     // Top-left
    inky: { x: 26, y: 22 },    // Bottom-right
    clyde: { x: 1, y: 22 },    // Bottom-left
  };
  
  const gameState = useRef({
    player: {
      x: 12,
      y: 17,
      gridX: 12,
      gridY: 17,
      pixelX: 12 * TILE_SIZE + TILE_SIZE / 2,
      pixelY: 17 * TILE_SIZE + TILE_SIZE / 2,
      direction: 'right' as Direction,
      nextDirection: null as Direction | null,
      supercharged: false,
      superchargedTimer: 0,
      mouthAngle: 0,
      invincible: false,
      invincibleTimer: 0,
      justDied: false,
    },
    pellets: [] as Pellet[],
    powerPellets: [] as PowerPellet[],
    ghosts: [] as Ghost[],
    keys: { w: false, a: false, s: false, d: false },
    score: 0,
    lives: 3,
    timeRemaining: 60,
    active: true,
    ghostEatCount: 0,
    ghostPenalty: false,
    ghostPenaltyTimer: 0,
  });

  const navigate = useNavigate();

  // Find random valid position in a quadrant (checks maze layout directly)
  const findRandomPositionInQuadrant = (
    minX: number, maxX: number,
    minY: number, maxY: number,
    excludePositions: { x: number; y: number }[] = []
  ): { x: number; y: number } | null => {
    const validPositions: { x: number; y: number }[] = [];
    
    for (let y = minY; y <= maxY && y < MAZE_HEIGHT; y++) {
      for (let x = minX; x <= maxX && x < MAZE_WIDTH; x++) {
        // Check if it's a valid path (not a wall)
        if (MAZE_LAYOUT[y] && MAZE_LAYOUT[y][x] === '0') {
          // Check if not in exclude list
          const isExcluded = excludePositions.some(pos => pos.x === x && pos.y === y);
          if (!isExcluded) {
            validPositions.push({ x, y });
          }
        }
      }
    }
    
    if (validPositions.length === 0) return null;
    return validPositions[Math.floor(Math.random() * validPositions.length)];
  };

  const initializeMaze = () => {
    const pellets: Pellet[] = [];
    const powerPellets: PowerPellet[] = [];
    
    // Generate pellets and power pellet spots
    for (let y = 0; y < MAZE_HEIGHT; y++) {
      for (let x = 0; x < MAZE_WIDTH; x++) {
        if (MAZE_LAYOUT[y][x] === '0') {
          // Regular pellet
          pellets.push({ x, y, collected: false });
        } else if (MAZE_LAYOUT[y][x] === '2') {
          // Power pellet spot (we'll place them manually at key locations)
        }
      }
    }
    
    // Place power pellets randomly in each quadrant
    const midX = Math.floor(MAZE_WIDTH / 2);
    const midY = Math.floor(MAZE_HEIGHT / 2);
    
    const quadrants = [
      { minX: 1, maxX: midX - 1, minY: 1, maxY: midY - 1 },      // Top-left
      { minX: midX + 1, maxX: MAZE_WIDTH - 2, minY: 1, maxY: midY - 1 }, // Top-right
      { minX: 1, maxX: midX - 1, minY: midY + 1, maxY: MAZE_HEIGHT - 2 }, // Bottom-left
      { minX: midX + 1, maxX: MAZE_WIDTH - 2, minY: midY + 1, maxY: MAZE_HEIGHT - 2 }, // Bottom-right
    ];
    
    const problem = MATH_PROBLEMS[Math.floor(Math.random() * MATH_PROBLEMS.length)];
    const allAnswers = [problem.answer, ...problem.wrongAnswers].sort(() => Math.random() - 0.5);
    
    const powerPelletSpots: { x: number; y: number }[] = [];
    quadrants.forEach(quad => {
      const spot = findRandomPositionInQuadrant(quad.minX, quad.maxX, quad.minY, quad.maxY, powerPelletSpots);
      if (spot) {
        powerPelletSpots.push(spot);
      }
    });
    
    // Ensure we have 4 spots (fallback to corners if needed)
    while (powerPelletSpots.length < 4) {
      const fallbackSpots = [
        { x: 1, y: 1 }, { x: 26, y: 1 },
        { x: 1, y: 22 }, { x: 26, y: 22 },
      ];
      const fallback = fallbackSpots[powerPelletSpots.length];
      if (!powerPelletSpots.some(p => p.x === fallback.x && p.y === fallback.y)) {
        powerPelletSpots.push(fallback);
      } else {
        break;
      }
    }
    
    powerPelletSpots.forEach((spot, index) => {
      powerPellets.push({
        x: spot.x,
        y: spot.y,
        number: allAnswers[index % allAnswers.length],
        isCorrect: allAnswers[index % allAnswers.length] === problem.answer,
        collected: false,
      });
    });
    
    gameState.current.pellets = pellets;
    gameState.current.powerPellets = powerPellets;
    setCurrentProblem(problem);
  };

  const initializeGhosts = () => {
    const centerX = 13;
    const centerY = 11;
    gameState.current.ghosts = [
      { 
        x: centerX, y: centerY, 
        pixelX: centerX * TILE_SIZE + TILE_SIZE / 2,
        pixelY: centerY * TILE_SIZE + TILE_SIZE / 2,
        direction: 'left', nextDirection: null,
        color: '#ff69b4', name: 'Blinky', // Pink
        vulnerable: false, eaten: false, respawnTimer: 0,
        directionChangeTimer: 0
      },
      { 
        x: centerX + 1, y: centerY,
        pixelX: (centerX + 1) * TILE_SIZE + TILE_SIZE / 2,
        pixelY: centerY * TILE_SIZE + TILE_SIZE / 2,
        direction: 'up', nextDirection: null,
        color: '#ff8c00', name: 'Pinky', // Orange
        vulnerable: false, eaten: false, respawnTimer: 0,
        directionChangeTimer: 0
      },
      { 
        x: centerX, y: centerY + 1,
        pixelX: centerX * TILE_SIZE + TILE_SIZE / 2,
        pixelY: (centerY + 1) * TILE_SIZE + TILE_SIZE / 2,
        direction: 'right', nextDirection: null,
        color: '#00ffff', name: 'Inky', // Cyan
        vulnerable: false, eaten: false, respawnTimer: 0,
        directionChangeTimer: 0
      },
      { 
        x: centerX + 1, y: centerY + 1,
        pixelX: (centerX + 1) * TILE_SIZE + TILE_SIZE / 2,
        pixelY: (centerY + 1) * TILE_SIZE + TILE_SIZE / 2,
        direction: 'down', nextDirection: null,
        color: '#00ff00', name: 'Clyde', // Green
        vulnerable: false, eaten: false, respawnTimer: 0,
        directionChangeTimer: 0
      },
    ];
  };

  const canMove = (x: number, y: number): boolean => {
    if (x < 0 || x >= MAZE_WIDTH || y < 0 || y >= MAZE_HEIGHT) {
      // Wrap around
      return true;
    }
    return MAZE_LAYOUT[y][x] !== '1';
  };

  const getNextDirection = (x: number, y: number, dir: Direction): { x: number; y: number } | null => {
    let nextX = x;
    let nextY = y;
    
    switch (dir) {
      case 'up': nextY--; break;
      case 'down': nextY++; break;
      case 'left': nextX--; break;
      case 'right': nextX++; break;
    }
    
    // Wrap around
    if (nextX < 0) nextX = MAZE_WIDTH - 1;
    if (nextX >= MAZE_WIDTH) nextX = 0;
    
    if (canMove(nextX, nextY)) {
      return { x: nextX, y: nextY };
    }
    return null;
  };

  // Get reverse direction (for no-reverse rule)
  const getReverseDirection = (dir: Direction): Direction => {
    switch (dir) {
      case 'up': return 'down';
      case 'down': return 'up';
      case 'left': return 'right';
      case 'right': return 'left';
    }
  };

  // Check if position is an intersection (has 2+ valid directions, excluding current)
  const isIntersection = (x: number, y: number, currentDir: Direction): boolean => {
    let validDirs = 0;
    const directions: Direction[] = ['up', 'down', 'left', 'right'];
    directions.forEach(dir => {
      if (dir !== currentDir && getNextDirection(x, y, dir) !== null) {
        validDirs++;
      }
    });
    return validDirs >= 1; // At least one alternative direction
  };

  // Get valid directions at a position (excluding reverse)
  const getValidDirections = (x: number, y: number, currentDir: Direction): Direction[] => {
    const directions: Direction[] = ['up', 'down', 'left', 'right'];
    const reverse = getReverseDirection(currentDir);
    return directions.filter(dir => {
      if (dir === reverse) return false; // No reverse
      return getNextDirection(x, y, dir) !== null;
    });
  };

  // Calculate Manhattan distance
  const manhattanDistance = (x1: number, y1: number, x2: number, y2: number): number => {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
  };

  // Get ghost target based on personality (original Pac-Man AI)
  const getGhostTarget = (ghost: Ghost, player: typeof gameState.current.player, blinky?: Ghost): { x: number; y: number } => {
    // Scatter mode (for now, we'll use chase mode, but can add scatter later)
    const scatterMode = false; // Can toggle this for scatter/chase cycles
    
    if (scatterMode) {
      // Return scatter target based on ghost name
      switch (ghost.name) {
        case 'Blinky': return SCATTER_TARGETS.blinky;
        case 'Pinky': return SCATTER_TARGETS.pinky;
        case 'Inky': return SCATTER_TARGETS.inky;
        case 'Clyde': return SCATTER_TARGETS.clyde;
      }
    }

    // Chase mode - individual targeting
    switch (ghost.name) {
      case 'Blinky': // Direct chase
        return { x: player.gridX, y: player.gridY };
      
      case 'Pinky': // 4 tiles ahead
        let aheadX = player.gridX;
        let aheadY = player.gridY;
        switch (player.direction) {
          case 'up': aheadY -= 4; break;
          case 'down': aheadY += 4; break;
          case 'left': aheadX -= 4; break;
          case 'right': aheadX += 4; break;
        }
        // Wrap around
        if (aheadX < 0) aheadX = MAZE_WIDTH - 1;
        if (aheadX >= MAZE_WIDTH) aheadX = 0;
        return { x: aheadX, y: aheadY };
      
      case 'Inky': // Complex: 2 tiles ahead, then double vector from Blinky
        let twoAheadX = player.gridX;
        let twoAheadY = player.gridY;
        switch (player.direction) {
          case 'up': twoAheadY -= 2; break;
          case 'down': twoAheadY += 2; break;
          case 'left': twoAheadX -= 2; break;
          case 'right': twoAheadX += 2; break;
        }
        // Wrap around
        if (twoAheadX < 0) twoAheadX = MAZE_WIDTH - 1;
        if (twoAheadX >= MAZE_WIDTH) twoAheadX = 0;
        
        if (blinky) {
          // Double the vector from Blinky to 2-tiles-ahead point
          const vecX = twoAheadX - blinky.x;
          const vecY = twoAheadY - blinky.y;
          return { x: blinky.x + vecX * 2, y: blinky.y + vecY * 2 };
        }
        return { x: twoAheadX, y: twoAheadY };
      
      case 'Clyde': // Conditional: chase if far, scatter if close
        const dist = manhattanDistance(ghost.x, ghost.y, player.gridX, player.gridY);
        if (dist > 8) {
          return { x: player.gridX, y: player.gridY }; // Chase
        } else {
          return SCATTER_TARGETS.clyde; // Scatter
        }
      
      default:
        return { x: player.gridX, y: player.gridY };
    }
  };

  // Choose best direction with priority system (Up > Left > Down > Right)
  const chooseBestDirection = (
    ghost: Ghost,
    target: { x: number; y: number },
    validDirs: Direction[]
  ): Direction => {
    if (validDirs.length === 0) return ghost.direction;
    if (validDirs.length === 1) return validDirs[0];

    // Calculate distance to target for each direction
    const dirDistances: { dir: Direction; dist: number }[] = [];
    validDirs.forEach(dir => {
      const next = getNextDirection(ghost.x, ghost.y, dir);
      if (next) {
        const dist = manhattanDistance(next.x, next.y, target.x, target.y);
        dirDistances.push({ dir, dist });
      }
    });

    // Find minimum distance
    const minDist = Math.min(...dirDistances.map(d => d.dist));
    const bestDirs = dirDistances.filter(d => d.dist === minDist).map(d => d.dir);

    // Priority: Up > Left > Down > Right
    const priority: Direction[] = ['up', 'left', 'down', 'right'];
    for (const dir of priority) {
      if (bestDirs.includes(dir)) {
        return dir;
      }
    }

    return bestDirs[0]; // Fallback
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

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
      if (key === 'w') gameState.current.keys.w = true;
      if (key === 'a') gameState.current.keys.a = true;
      if (key === 's') gameState.current.keys.s = true;
      if (key === 'd') gameState.current.keys.d = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!isFocused) return;
      const key = e.key.toLowerCase();
      if (key === 'w') gameState.current.keys.w = false;
      if (key === 'a') gameState.current.keys.a = false;
      if (key === 's') gameState.current.keys.s = false;
      if (key === 'd') gameState.current.keys.d = false;
    };

    const handleCanvasClick = () => {
      canvas.focus();
    };

    initializeMaze();
    initializeGhosts();

    canvas.addEventListener('focus', handleFocus);
    canvas.addEventListener('blur', handleBlur);
    canvas.addEventListener('click', handleCanvasClick);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    let animationId: number;
    let lastTime = 0;
    const PLAYER_SPEED = 2; // pixels per frame
    const GHOST_SPEED = 1.5; // pixels per frame (slightly slower than player)

    const loop = (time: number) => {
      const dt = (time - lastTime) / 16.66;
      lastTime = time;

      if (!gameState.current.active) return;

      update(dt, canvas);
      draw(ctx, canvas);
      
      animationId = requestAnimationFrame(loop);
    };

    const update = (dt: number, canvas: HTMLCanvasElement) => {
      const state = gameState.current;
      const { player, keys } = state;

      // Handle player input - queue direction change
      if (keys.w && player.nextDirection !== 'up') player.nextDirection = 'up';
      if (keys.a && player.nextDirection !== 'left') player.nextDirection = 'left';
      if (keys.s && player.nextDirection !== 'down') player.nextDirection = 'down';
      if (keys.d && player.nextDirection !== 'right') player.nextDirection = 'right';

      // Check if at tile center to allow direction change
      const playerAtCenter = Math.abs(player.pixelX - (player.gridX * TILE_SIZE + TILE_SIZE / 2)) < 1 &&
                             Math.abs(player.pixelY - (player.gridY * TILE_SIZE + TILE_SIZE / 2)) < 1;

      // Try to change direction when at center
      if (player.nextDirection && playerAtCenter) {
        const next = getNextDirection(player.gridX, player.gridY, player.nextDirection);
        if (next) {
          player.direction = player.nextDirection;
          player.nextDirection = null;
        }
      }

      // Check for wrap-around first (before movement)
      if (player.gridX === 0 && player.direction === 'left' && player.pixelX <= TILE_SIZE / 2) {
        // Instant teleport to right side
        player.gridX = MAZE_WIDTH - 1;
        player.pixelX = (MAZE_WIDTH - 1) * TILE_SIZE + TILE_SIZE / 2;
      } else if (player.gridX === MAZE_WIDTH - 1 && player.direction === 'right' && player.pixelX >= (MAZE_WIDTH - 1) * TILE_SIZE + TILE_SIZE / 2) {
        // Instant teleport to left side
        player.gridX = 0;
        player.pixelX = TILE_SIZE / 2;
      } else {
        // Normal movement
        const next = getNextDirection(player.gridX, player.gridY, player.direction);
        if (next) {
          const targetPixelX = next.x * TILE_SIZE + TILE_SIZE / 2;
          const targetPixelY = next.y * TILE_SIZE + TILE_SIZE / 2;
          
          const dx = targetPixelX - player.pixelX;
          const dy = targetPixelY - player.pixelY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist > PLAYER_SPEED) {
            player.pixelX += (dx / dist) * PLAYER_SPEED;
            player.pixelY += (dy / dist) * PLAYER_SPEED;
          } else {
            player.pixelX = targetPixelX;
            player.pixelY = targetPixelY;
            player.gridX = next.x;
            player.gridY = next.y;
          }
        }
      }

      // Update invincibility frames
      if (player.invincible) {
        player.invincibleTimer -= dt;
        if (player.invincibleTimer <= 0) {
          player.invincible = false;
        }
      }
      
      // Clear death flash after short time
      if (player.justDied) {
        // Clear after 0.5 seconds
        if (player.invincibleTimer < (3 * 60 - 30)) {
          player.justDied = false;
        }
      }

      // Animate mouth
      player.mouthAngle += 0.2;
      if (player.mouthAngle > Math.PI * 2) player.mouthAngle = 0;

      // Update ghost penalty timer
      if (state.ghostPenalty) {
        state.ghostPenaltyTimer -= dt;
        if (state.ghostPenaltyTimer <= 0) {
          state.ghostPenalty = false;
          state.ghostPenaltyTimer = 0;
        }
      }

      // Update supercharged state
      if (player.supercharged) {
        player.superchargedTimer -= dt;
        setIsSupercharged(true);
        // Keep ghosts vulnerable during power-up
        state.ghosts.forEach(g => {
          if (!g.eaten) g.vulnerable = true;
        });
        if (player.superchargedTimer <= 0) {
          player.supercharged = false;
          setIsSupercharged(false);
          state.ghosts.forEach(g => {
            if (!g.eaten) g.vulnerable = false;
          });
          
          // Generate new problem after power-up expires
          const newProblem = MATH_PROBLEMS[Math.floor(Math.random() * MATH_PROBLEMS.length)];
          setCurrentProblem(newProblem);
          
          // Create 4 new power pellets randomly in quadrants
          const midX = Math.floor(MAZE_WIDTH / 2);
          const midY = Math.floor(MAZE_HEIGHT / 2);
          
          const quadrants = [
            { minX: 1, maxX: midX - 1, minY: 1, maxY: midY - 1 },      // Top-left
            { minX: midX + 1, maxX: MAZE_WIDTH - 2, minY: 1, maxY: midY - 1 }, // Top-right
            { minX: 1, maxX: midX - 1, minY: midY + 1, maxY: MAZE_HEIGHT - 2 }, // Bottom-left
            { minX: midX + 1, maxX: MAZE_WIDTH - 2, minY: midY + 1, maxY: MAZE_HEIGHT - 2 }, // Bottom-right
          ];
          
          const allAnswers = [newProblem.answer, ...newProblem.wrongAnswers].sort(() => Math.random() - 0.5);
          // Ensure we have at least 4 answers
          while (allAnswers.length < 4) {
            allAnswers.push(newProblem.answer + Math.floor(Math.random() * 10) - 5);
          }
          
          const powerPelletSpots: { x: number; y: number }[] = [];
          quadrants.forEach(quad => {
            const spot = findRandomPositionInQuadrant(quad.minX, quad.maxX, quad.minY, quad.maxY, powerPelletSpots);
            if (spot) {
              powerPelletSpots.push(spot);
            }
          });
          
          // Fallback to corners if needed
          while (powerPelletSpots.length < 4) {
            const fallbackSpots = [
              { x: 1, y: 1 }, { x: 26, y: 1 },
              { x: 1, y: 22 }, { x: 26, y: 22 },
            ];
            const fallback = fallbackSpots[powerPelletSpots.length];
            if (!powerPelletSpots.some(p => p.x === fallback.x && p.y === fallback.y)) {
              powerPelletSpots.push(fallback);
            } else {
              break;
            }
          }
          
          state.powerPellets = powerPelletSpots.map((spot, idx) => ({
            x: spot.x,
            y: spot.y,
            number: allAnswers[idx],
            isCorrect: allAnswers[idx] === newProblem.answer,
            collected: false,
          }));
        }
      } else {
        setIsSupercharged(false);
      }

      // Check pellet collection
      state.pellets.forEach(pellet => {
        if (!pellet.collected && player.gridX === pellet.x && player.gridY === pellet.y) {
          pellet.collected = true;
          state.score = Math.floor(state.score + 10);
          setScore(state.score);
        }
      });

      // Check power pellet collection
      state.powerPellets.forEach(pellet => {
        if (!pellet.collected && player.gridX === pellet.x && player.gridY === pellet.y) {
          pellet.collected = true;
          if (pellet.isCorrect) {
            state.score = Math.floor(state.score + 50);
            
            // Cancel penalty before making vulnerable
            if (state.ghostPenalty) {
              state.ghostPenalty = false;
              state.ghostPenaltyTimer = 0;
            }
            
            player.supercharged = true;
            player.superchargedTimer = 8 * 60; // 8 seconds
            state.ghosts.forEach(g => {
              if (!g.eaten) g.vulnerable = true;
            });
            state.ghostEatCount = 0;
            setScore(state.score);
            // Note: New problem will be generated when power-up expires
          } else {
            // Wrong answer - only penalize if ghosts are NOT vulnerable
            if (!player.supercharged) {
              state.ghostPenalty = true;
              state.ghostPenaltyTimer = 3 * 60; // 3 seconds
            }
          }
        }
      });

      // Update ghosts
      const blinky = state.ghosts.find(g => g.name === 'Blinky');
      state.ghosts.forEach(ghost => {
        if (ghost.eaten) {
          ghost.respawnTimer -= dt;
          if (ghost.respawnTimer <= 0) {
            ghost.eaten = false;
            ghost.x = 13;
            ghost.y = 11;
            ghost.pixelX = 13 * TILE_SIZE + TILE_SIZE / 2;
            ghost.pixelY = 11 * TILE_SIZE + TILE_SIZE / 2;
            ghost.vulnerable = false;
          }
          return;
        }

        // Only change direction when at tile center
        const atTileCenter = Math.abs(ghost.pixelX - (ghost.x * TILE_SIZE + TILE_SIZE / 2)) < 1 &&
                            Math.abs(ghost.pixelY - (ghost.y * TILE_SIZE + TILE_SIZE / 2)) < 1;

        if (atTileCenter) {
          // Check if current direction is still valid
          const currentNext = getNextDirection(ghost.x, ghost.y, ghost.direction);
          const canContinue = currentNext !== null;
          
          // Only change direction if:
          // 1. Current direction is blocked, OR
          // 2. We're at an intersection (can turn)
          if (!canContinue || isIntersection(ghost.x, ghost.y, ghost.direction)) {
            // Get valid directions (no reverse)
            const validDirs = getValidDirections(ghost.x, ghost.y, ghost.direction);
            
            if (validDirs.length > 0) {
              let target: { x: number; y: number };
              
              if (player.supercharged) {
                // Vulnerable mode: flee to corner away from player
                ghost.vulnerable = true;
                // Target corner furthest from player
                const corners = [
                  { x: 1, y: 1 },
                  { x: 26, y: 1 },
                  { x: 1, y: 22 },
                  { x: 26, y: 22 },
                ];
                let furthestCorner = corners[0];
                let maxDist = 0;
                corners.forEach(corner => {
                  const dist = manhattanDistance(player.gridX, player.gridY, corner.x, corner.y);
                  if (dist > maxDist) {
                    maxDist = dist;
                    furthestCorner = corner;
                  }
                });
                target = furthestCorner;
              } else {
                // Chase mode: use individual targeting
                ghost.vulnerable = false;
                target = getGhostTarget(ghost, player, blinky);
              }
              
              // Choose best direction using priority system
              const bestDir = chooseBestDirection(ghost, target, validDirs);
              ghost.direction = bestDir;
            } else if (!canContinue) {
              // If stuck and no valid directions, reverse (emergency)
              ghost.direction = getReverseDirection(ghost.direction);
            }
          }
        }

        // Move ghost smoothly (faster when penalized)
        const currentSpeed = state.ghostPenalty ? GHOST_SPEED * 1.25 : GHOST_SPEED;
        const next = getNextDirection(ghost.x, ghost.y, ghost.direction);
        if (next) {
          const targetPixelX = next.x * TILE_SIZE + TILE_SIZE / 2;
          const targetPixelY = next.y * TILE_SIZE + TILE_SIZE / 2;
          
          const dx = targetPixelX - ghost.pixelX;
          const dy = targetPixelY - ghost.pixelY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist > currentSpeed) {
            ghost.pixelX += (dx / dist) * currentSpeed;
            ghost.pixelY += (dy / dist) * currentSpeed;
          } else {
            ghost.pixelX = targetPixelX;
            ghost.pixelY = targetPixelY;
            ghost.x = next.x;
            ghost.y = next.y;
          }
        }

        // Wrap around for ghosts
        if (ghost.x === 0 && ghost.direction === 'left' && ghost.pixelX <= TILE_SIZE / 2) {
          ghost.x = MAZE_WIDTH - 1;
          ghost.pixelX = (MAZE_WIDTH - 1) * TILE_SIZE + TILE_SIZE / 2;
        } else if (ghost.x === MAZE_WIDTH - 1 && ghost.direction === 'right' && ghost.pixelX >= (MAZE_WIDTH - 1) * TILE_SIZE + TILE_SIZE / 2) {
          ghost.x = 0;
          ghost.pixelX = TILE_SIZE / 2;
        }

        // Check collision with player (using grid positions)
        if (ghost.x === player.gridX && ghost.y === player.gridY) {
          if (player.supercharged && ghost.vulnerable) {
            // Eat ghost
            ghost.eaten = true;
            ghost.respawnTimer = 5 * 60; // 5 seconds
            state.ghostEatCount++;
            const points = [500, 1000, 2000, 4000][Math.min(state.ghostEatCount - 1, 3)] || 4000;
            state.score = Math.floor(state.score + points);
            setScore(state.score);
          } else if (!player.supercharged && !player.invincible) {
            // Lose a life
            state.lives--;
            setLives(state.lives);
            player.justDied = true;
            
            if (state.lives <= 0) {
              endGame();
            } else {
              // Reset player position with invincibility frames (2 tiles left of original)
              player.gridX = 12;
              player.gridY = 17;
              player.pixelX = 12 * TILE_SIZE + TILE_SIZE / 2;
              player.pixelY = 17 * TILE_SIZE + TILE_SIZE / 2;
              player.direction = 'right';
              player.nextDirection = null;
              player.invincible = true;
              player.invincibleTimer = 3 * 60; // 3 seconds of invincibility
              // Note: Ghosts are NOT reset - they continue from their current positions
            }
          }
        }
      });

      // Timer
      state.timeRemaining -= dt / 60;
      if (state.timeRemaining <= 0) {
        state.timeRemaining = 0;
        setTimeRemaining(0);
        endGame();
      } else {
        setTimeRemaining(Math.ceil(state.timeRemaining));
      }
    };

    const endGame = () => {
      gameState.current.active = false;
      setGameOver(true);
      cancelAnimationFrame(animationId);
    };

    const draw = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Enable crisp text rendering
      ctx.imageSmoothingEnabled = false;
      
      // Death flash effect
      if (gameState.current.player.justDied) {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      
      ctx.fillStyle = '#050510';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const { player, pellets, powerPellets, ghosts } = gameState.current;
      const state = gameState.current;

      // Draw maze
      ctx.strokeStyle = '#1a1a3a';
      ctx.lineWidth = 2;
      for (let y = 0; y < MAZE_HEIGHT; y++) {
        for (let x = 0; x < MAZE_WIDTH; x++) {
          if (MAZE_LAYOUT[y][x] === '1') {
            ctx.fillStyle = '#1a1a3a';
            ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          }
        }
      }

      // Draw pellets
      ctx.fillStyle = '#00f3ff';
      pellets.forEach(pellet => {
        if (!pellet.collected) {
          ctx.beginPath();
          ctx.arc(
            pellet.x * TILE_SIZE + TILE_SIZE / 2,
            pellet.y * TILE_SIZE + TILE_SIZE / 2,
            2,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }
      });

      // Draw power pellets
      powerPellets.forEach(pellet => {
        if (!pellet.collected) {
          const size = 8;
          // All pellets same color (no hint for correct answer)
          ctx.fillStyle = '#ffff00';
          ctx.beginPath();
          ctx.arc(
            pellet.x * TILE_SIZE + TILE_SIZE / 2,
            pellet.y * TILE_SIZE + TILE_SIZE / 2,
            size,
            0,
            Math.PI * 2
          );
          ctx.fill();
          
          // Draw number with high-res but pixelated font
          ctx.fillStyle = '#000000';
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 3;
          ctx.font = 'bold 16px "Press Start 2P"';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const textX = pellet.x * TILE_SIZE + TILE_SIZE / 2;
          const textY = pellet.y * TILE_SIZE + TILE_SIZE / 2;
          // Draw stroke first for outline (makes text more readable)
          ctx.strokeText(pellet.number.toString(), textX, textY);
          // Then fill for solid text
          ctx.fillText(pellet.number.toString(), textX, textY);
        }
      });

      // Helper function to draw classic Pac-Man ghost shape
      const drawGhost = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string, size: number, showOutline: boolean) => {
        const radius = size / 2;
        const waveHeight = size * 0.2; // Height of wavy bottom
        const waveCount = 3; // Number of waves at bottom
        
        ctx.save();
        ctx.translate(x, y);
        
        // Draw ghost body
        ctx.fillStyle = color;
        ctx.beginPath();
        
        // Top semi-circle (head)
        ctx.arc(0, -radius * 0.2, radius * 0.8, Math.PI, 0, false);
        
        // Right side (straight down)
        ctx.lineTo(radius, radius * 0.4);
        
        // Wavy bottom (classic Pac-Man ghost skirt)
        const waveWidth = (radius * 2) / (waveCount * 2);
        for (let i = 0; i <= waveCount * 2; i++) {
          const waveX = radius - (i * waveWidth);
          const baseY = radius * 0.4;
          const waveY = baseY + (i % 2 === 0 ? 0 : waveHeight);
          ctx.lineTo(waveX, waveY);
        }
        
        // Left side (straight up)
        ctx.lineTo(-radius, radius * 0.4);
        
        // Close path back to top
        ctx.closePath();
        ctx.fill();
        
        // White outline when vulnerable or penalized
        if (showOutline) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        
        // Draw eyes (only if not vulnerable/penalized, or if blue)
        if (!showOutline || color === '#0000ff') {
          const eyeSize = size * 0.18;
          const eyeSpacing = size * 0.3;
          const eyeY = -size * 0.05;
          
          // Left eye (white)
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(-eyeSpacing / 2, eyeY, eyeSize, 0, Math.PI * 2);
          ctx.fill();
          
          // Right eye (white)
          ctx.beginPath();
          ctx.arc(eyeSpacing / 2, eyeY, eyeSize, 0, Math.PI * 2);
          ctx.fill();
          
          // Eye pupils (black)
          ctx.fillStyle = '#000000';
          const pupilSize = eyeSize * 0.6;
          const pupilOffsetX = size * 0.03; // Slight horizontal offset
          const pupilOffsetY = size * 0.02; // Slight vertical offset
          
          // Left pupil
          ctx.beginPath();
          ctx.arc(-eyeSpacing / 2 + pupilOffsetX, eyeY + pupilOffsetY, pupilSize, 0, Math.PI * 2);
          ctx.fill();
          
          // Right pupil
          ctx.beginPath();
          ctx.arc(eyeSpacing / 2 + pupilOffsetX, eyeY + pupilOffsetY, pupilSize, 0, Math.PI * 2);
          ctx.fill();
        }
        
        ctx.restore();
      };

      // Draw ghosts
      ghosts.forEach(ghost => {
        if (ghost.eaten) return;
        
        // Determine ghost color
        let ghostColor = ghost.color;
        let shouldShowOutline = false;
        
        if (state.ghostPenalty && !ghost.vulnerable) {
          // Red when penalized (and not vulnerable)
          const penaltyTimeRemaining = state.ghostPenaltyTimer;
          const shouldFlash = penaltyTimeRemaining <= 1 * 60; // 1 second = 60 frames
          const flashVisible = shouldFlash ? Math.floor(penaltyTimeRemaining / 10) % 2 === 0 : true;
          
          if (flashVisible) {
            ghostColor = '#ff0000'; // Red when penalized
          } else {
            // Flash to white during warning
            ghostColor = '#ffffff';
          }
          shouldShowOutline = true;
        } else if (ghost.vulnerable) {
          // Check if should flash (2 seconds before vulnerable ends)
          const vulnerableTimeRemaining = state.player.superchargedTimer;
          const shouldFlash = vulnerableTimeRemaining <= 2 * 60; // 2 seconds = 120 frames
          const flashVisible = shouldFlash ? Math.floor(vulnerableTimeRemaining / 10) % 2 === 0 : true;
          
          if (flashVisible) {
            ghostColor = '#0000ff'; // Blue when vulnerable
          } else {
            // Flash to white during warning
            ghostColor = '#ffffff';
          }
          shouldShowOutline = true;
        }
        
        // Draw classic ghost shape
        drawGhost(ctx, ghost.pixelX, ghost.pixelY, ghostColor, TILE_SIZE - 4, shouldShowOutline);
      });

      // Draw player (with invincibility flashing)
      const invincibleFlash = player.invincible && Math.floor(player.invincibleTimer / 5) % 2 === 0;
      
      if (!invincibleFlash) {
        ctx.save();
        ctx.translate(player.pixelX, player.pixelY);
        const angle = {
          'up': -Math.PI / 2,
          'down': Math.PI / 2,
          'left': Math.PI,
          'right': 0,
        }[player.direction];
        ctx.rotate(angle);
        
        ctx.fillStyle = player.supercharged ? '#ffff00' : '#ffff00';
        const mouthOpen = Math.abs(Math.sin(player.mouthAngle)) * 0.5;
        ctx.beginPath();
        ctx.arc(0, 0, TILE_SIZE / 2 - 2, mouthOpen, Math.PI * 2 - mouthOpen);
        ctx.lineTo(0, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
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
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <button 
            onClick={() => navigate('/')} 
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <span className="font-pixel text-xs">EXIT GAME</span>
          </button>
          <h1 className="font-pixel text-xl text-neon-yellow shadow-neon">PAC-MAN: MATH BLITZ</h1>
          <div className="w-20"></div>
        </div>

        <div className="relative border-4 border-space-700 rounded-lg bg-black p-1 shadow-[0_0_20px_rgba(0,243,255,0.2)]">
          <div className="aspect-video bg-space-900 relative overflow-hidden">
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-50">
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
                  onClick={() => navigate('/results', { state: { score, game: 'Pac-Man: Math Blitz' } })}
                  className="retro-btn border-neon-pink text-neon-pink hover:bg-neon-pink hover:text-white"
                >
                  CONTINUE
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Game Header */}
      <div className="flex items-center justify-between mb-4">
        <button 
          onClick={() => navigate('/')} 
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <span className="font-pixel text-xs">EXIT GAME</span>
        </button>
        <h1 className="font-pixel text-xl text-neon-yellow shadow-neon">PAC-MAN: MATH BLITZ</h1>
        <div className="w-20"></div>
      </div>

      {/* UI Panel - Top */}
      <div className="border-4 border-space-700 rounded-lg bg-space-800 p-4 mb-4">
        {/* Top Row: Score, Lives, Time */}
        <div className="flex justify-between items-center mb-4">
          <div className="font-pixel text-white">
            <div className="text-neon-cyan text-xs mb-1">SCORE</div>
            <div className="text-xl">{score.toString()}</div>
          </div>
          
          <div className="text-center">
            <div className="text-gray-400 text-xs mb-1 font-pixel">
              {isSupercharged ? 'POWER ACTIVE!' : 'SOLVE TO GET POWER'}
            </div>
            <div className="text-neon-cyan text-2xl font-pixel">
              {isSupercharged 
                ? currentProblem.equation.replace('_', currentProblem.answer.toString())
                : currentProblem.equation}
            </div>
          </div>
          
          <div className="flex gap-6">
            <div className="font-pixel text-white text-right">
              <div className="text-neon-pink text-xs mb-1">LIVES</div>
              <div className="text-xl">{'♥'.repeat(lives)}</div>
            </div>
            <div className="font-pixel text-white text-right">
              <div className="text-neon-yellow text-xs mb-1">TIME</div>
              <div className={`text-xl ${timeRemaining <= 10 ? 'text-red-500 animate-pulse' : ''}`}>
                {timeRemaining.toString().padStart(2, '0')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Game Canvas - Bottom */}
      <div className="relative border-4 border-space-700 rounded-lg bg-black p-1 shadow-[0_0_20px_rgba(0,243,255,0.2)]">
        {/* CRT Scanline Overlay */}
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_2px,3px_100%] opacity-20"></div>
        
        <div className="aspect-video bg-space-900 relative overflow-hidden">
          <canvas 
            ref={canvasRef} 
            className="w-full h-full bg-transparent cursor-none"
            onClick={(e) => e.currentTarget.focus()}
          />
        </div>
      </div>

      {/* Controls Hint */}
      <div className="mt-6 flex justify-center gap-8 text-gray-500 text-sm font-mono uppercase">
        <div className="flex items-center gap-2">
          <span className="border border-gray-700 px-2 py-1 rounded bg-space-800 text-xs text-white font-pixel">WASD</span>
          <span>Move</span>
        </div>
      </div>
    </div>
  );
};

