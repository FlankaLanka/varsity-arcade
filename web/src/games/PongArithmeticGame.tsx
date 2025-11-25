import React, { useEffect, useRef, useState } from 'react';
import { GameFrame } from '../components/GameFrame';
import { useNavigate } from 'react-router-dom';

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  number: number;
  isCorrect: boolean;
  alpha: number;
  dissolving: boolean;
}

interface MathProblem {
  equation: string;
  answer: number;
  wrongAnswers: number[];
}

// Generate easy order of operations problems
const generateMathProblem = (): MathProblem => {
  const problems: MathProblem[] = [
    { equation: "2 + 3 × 4", answer: 14, wrongAnswers: [20, 11] }, // 2 + 12 = 14
    { equation: "(5 + 2) × 3", answer: 21, wrongAnswers: [17, 25] }, // 7 × 3 = 21
    { equation: "10 - 2 × 3", answer: 4, wrongAnswers: [24, 7] }, // 10 - 6 = 4
    { equation: "4 × 2 + 5", answer: 13, wrongAnswers: [18, 9] }, // 8 + 5 = 13
    { equation: "(8 - 3) × 2", answer: 10, wrongAnswers: [13, 7] }, // 5 × 2 = 10
    { equation: "6 + 4 ÷ 2", answer: 8, wrongAnswers: [5, 10] }, // 6 + 2 = 8
    { equation: "12 ÷ 3 + 1", answer: 5, wrongAnswers: [7, 3] }, // 4 + 1 = 5
    { equation: "3 × 3 - 2", answer: 7, wrongAnswers: [3, 10] }, // 9 - 2 = 7
    { equation: "(6 + 4) ÷ 2", answer: 5, wrongAnswers: [7, 3] }, // 10 ÷ 2 = 5
    { equation: "5 + 2 × 3", answer: 11, wrongAnswers: [21, 8] }, // 5 + 6 = 11
    { equation: "8 - 2 × 2", answer: 4, wrongAnswers: [12, 6] }, // 8 - 4 = 4
    { equation: "9 ÷ 3 + 4", answer: 7, wrongAnswers: [5, 9] }, // 3 + 4 = 7
  ];
  
  return problems[Math.floor(Math.random() * problems.length)];
};

const PADDLE_WIDTH = 10;
const PADDLE_HEIGHT = 80;
const BALL_RADIUS = 11;
const PADDLE_SPEED = 2;
const BALL_SPEED = 2;
const PADDLE_MARGIN = 20;

export const PongArithmeticGame = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [currentProblem, setCurrentProblem] = useState<MathProblem | null>(null);

  const gameState = useRef({
    playerPaddle: { x: PADDLE_MARGIN, y: 225, width: PADDLE_WIDTH, height: PADDLE_HEIGHT },
    enemyPaddle: { x: 0, y: 225, width: PADDLE_WIDTH, height: PADDLE_HEIGHT },
    balls: [] as Ball[],
    keys: { w: false, s: false },
    score: 0,
    timeRemaining: 60,
    active: true,
    flashTimer: 0,
    flashColor: null as 'red' | 'green' | null,
    currentProblem: null as MathProblem | null,
  });

  const navigate = useNavigate();

  // Reset game state function
  const resetGameState = () => {
    gameState.current = {
      playerPaddle: { x: PADDLE_MARGIN, y: 225, width: PADDLE_WIDTH, height: PADDLE_HEIGHT },
      enemyPaddle: { x: 0, y: 225, width: PADDLE_WIDTH, height: PADDLE_HEIGHT },
      balls: [],
      keys: { w: false, s: false },
      score: 0,
      timeRemaining: 60,
      active: true,
      flashTimer: 0,
      flashColor: null,
      currentProblem: null,
    };
    setScore(0);
    setGameOver(false);
    setTimeRemaining(60);
    setCurrentProblem(null);
  };

  // Spawn initial ball
  const spawnBall = (canvas: HTMLCanvasElement) => {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const angle = (Math.random() - 0.5) * Math.PI * 0.5; // Random angle between -45 and 45 degrees
    const vx = Math.cos(angle) * BALL_SPEED;
    const vy = Math.sin(angle) * BALL_SPEED;
    
    gameState.current.balls = [{
      x: centerX,
      y: centerY,
      vx: vx > 0 ? vx : -vx, // Always start going right
      vy,
      number: 0,
      isCorrect: false,
      alpha: 1,
      dissolving: false,
    }];
    gameState.current.currentProblem = null;
  };

  // Split ball into 3 numbered balls
  const splitBall = (hitBall: Ball) => {
    const problem = generateMathProblem();
    gameState.current.currentProblem = problem;
    setCurrentProblem(problem);

    const allAnswers = [problem.answer, ...problem.wrongAnswers].sort(() => Math.random() - 0.5);
    const newBalls: Ball[] = [];

    // Spawn 3 balls at enemy paddle position, diverging with wider spread
    const spawnX = gameState.current.enemyPaddle.x - BALL_RADIUS;
    const spawnY = hitBall.y;

    // Angles for divergence: spread out more vertically
    // Top ball: up-left, Middle ball: straight left, Bottom ball: down-left
    const angles = [-Math.PI * 0.8, -Math.PI * 0.5, -Math.PI * 0.2];
    
    // Also offset Y positions slightly to prevent clustering
    const yOffsets = [-15, 0, 15];
    
    angles.forEach((angle, index) => {
      const vx = Math.cos(angle) * BALL_SPEED;
      const vy = Math.sin(angle) * BALL_SPEED;
      
      newBalls.push({
        x: spawnX,
        y: spawnY + yOffsets[index],
        vx,
        vy,
        number: allAnswers[index],
        isCorrect: allAnswers[index] === problem.answer,
        alpha: 1,
        dissolving: false,
      });
    });

    gameState.current.balls = newBalls;
  };

  useEffect(() => {
    // Reset game state on mount
    resetGameState();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 800;
    canvas.height = 450;

    // Initialize enemy paddle position
    gameState.current.enemyPaddle.x = canvas.width - PADDLE_MARGIN - PADDLE_WIDTH;

    // Make canvas focusable
    canvas.tabIndex = 0;
    canvas.style.outline = 'none';

    let isFocused = false;
    let animationId: number | null = null;

    const handleFocus = () => {
      isFocused = true;
    };

    const handleBlur = () => {
      isFocused = false;
    };

    // Input handlers - only W and S keys
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'w' || key === 's') {
        // Auto-focus canvas if not focused
        if (!isFocused) {
          canvas.focus();
        }
        if (key === 'w') gameState.current.keys.w = true;
        if (key === 's') gameState.current.keys.s = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'w') gameState.current.keys.w = false;
      if (key === 's') gameState.current.keys.s = false;
    };

    const handleCanvasClick = () => {
      canvas.focus();
    };

    canvas.addEventListener('focus', handleFocus);
    canvas.addEventListener('blur', handleBlur);
    canvas.addEventListener('click', handleCanvasClick);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Initialize game
    spawnBall(canvas);
    
    // Auto-focus canvas on mount
    canvas.focus();

    // Game Loop
    let lastTime = 0;

    const loop = (time: number) => {
      const dt = (time - lastTime) / 16.66; // Normalize to 60fps
      lastTime = time;

      if (!gameState.current.active) return;

      update(dt, canvas);
      draw(ctx, canvas);

      animationId = requestAnimationFrame(loop);
    };

    const update = (dt: number, canvas: HTMLCanvasElement) => {
      const state = gameState.current;

      // Update flash timer
      if (state.flashTimer > 0) {
        state.flashTimer -= dt;
        if (state.flashTimer <= 0) {
          state.flashTimer = 0;
          state.flashColor = null;
        }
      }

      // Player paddle movement
      if (state.keys.w && state.playerPaddle.y > 0) {
        state.playerPaddle.y -= PADDLE_SPEED * dt;
      }
      if (state.keys.s && state.playerPaddle.y + state.playerPaddle.height < canvas.height) {
        state.playerPaddle.y += PADDLE_SPEED * dt;
      }

      // Enemy AI - perfect tracking (find ball moving toward enemy)
      const ballMovingTowardEnemy = state.balls.find(ball => ball.vx > 0 && !ball.dissolving);
      if (ballMovingTowardEnemy) {
        const targetY = ballMovingTowardEnemy.y - state.enemyPaddle.height / 2;
        const diff = targetY - state.enemyPaddle.y;
        const maxMove = PADDLE_SPEED * dt * 1.5; // Faster than player for perfect AI
        
        if (Math.abs(diff) > maxMove) {
          state.enemyPaddle.y += diff > 0 ? maxMove : -maxMove;
        } else {
          state.enemyPaddle.y = targetY;
        }

        // Keep paddle in bounds
        if (state.enemyPaddle.y < 0) state.enemyPaddle.y = 0;
        if (state.enemyPaddle.y + state.enemyPaddle.height > canvas.height) {
          state.enemyPaddle.y = canvas.height - state.enemyPaddle.height;
        }
      }

      // Update balls (iterate backwards to safely remove items)
      for (let i = state.balls.length - 1; i >= 0; i--) {
        const ball = state.balls[i];
        
        // Safety check - ball might be undefined if array was cleared
        if (!ball) continue;
        
        if (ball.dissolving) {
          ball.alpha -= 0.05 * dt;
          if (ball.alpha <= 0) {
            state.balls.splice(i, 1);
            continue;
          }
        }

        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;

        // Top/bottom wall collision
        if (ball.y - BALL_RADIUS <= 0 || ball.y + BALL_RADIUS >= canvas.height) {
          ball.vy = -ball.vy;
          ball.y = Math.max(BALL_RADIUS, Math.min(canvas.height - BALL_RADIUS, ball.y));
        }

        // Player paddle collision (left)
        if (ball.vx < 0 && !ball.dissolving) {
          const paddleLeft = state.playerPaddle.x;
          const paddleRight = state.playerPaddle.x + state.playerPaddle.width;
          const paddleTop = state.playerPaddle.y;
          const paddleBottom = state.playerPaddle.y + state.playerPaddle.height;
          
          // Check if ball is within paddle bounds
          if (ball.x - BALL_RADIUS <= paddleRight && 
              ball.x - BALL_RADIUS >= paddleLeft &&
              ball.y >= paddleTop - BALL_RADIUS &&
              ball.y <= paddleBottom + BALL_RADIUS) {
            
            // Calculate bounce angle based on where ball hits paddle
            const relativeY = (ball.y - (state.playerPaddle.y + state.playerPaddle.height / 2)) / (state.playerPaddle.height / 2);
            const bounceAngle = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, relativeY * Math.PI / 3)); // Max 60 degree angle
            
            // Check if correct or wrong ball BEFORE bouncing
            if (ball.number > 0) { // Numbered ball
              if (ball.isCorrect) {
                // Correct return - destroy all wrong balls instantly
                state.score += 1000;
                setScore(state.score);
                
                // Flash green
                state.flashColor = 'green';
                state.flashTimer = 30; // 0.5 seconds at 60fps
                
                // Remove all wrong balls (keep only correct ball)
                for (let j = state.balls.length - 1; j >= 0; j--) {
                  if (j !== i && !state.balls[j].isCorrect) {
                    state.balls.splice(j, 1);
                  }
                }
                
                // Reset correct ball to regular ball and bounce it back
                ball.number = 0;
                ball.isCorrect = false;
                
                // Clear problem
                state.currentProblem = null;
                setCurrentProblem(null);
              } else {
                // Wrong return - lose points and dissolve (don't bounce)
                state.score = Math.max(0, state.score - 50);
                setScore(state.score);
                
                // Flash red
                state.flashColor = 'red';
                state.flashTimer = 30; // 0.5 seconds at 60fps
                
                ball.dissolving = true;
                continue; // Skip bounce for wrong ball
              }
            }
            
            // Bounce the ball (for correct ball or regular ball)
            ball.vx = Math.abs(Math.cos(bounceAngle) * BALL_SPEED);
            ball.vy = Math.sin(bounceAngle) * BALL_SPEED;
            ball.x = paddleRight + BALL_RADIUS;
          }
        }

        // Enemy paddle collision (right)
        if (ball.vx > 0 && !ball.dissolving) {
          const paddleLeft = state.enemyPaddle.x;
          const paddleRight = state.enemyPaddle.x + state.enemyPaddle.width;
          const paddleTop = state.enemyPaddle.y;
          const paddleBottom = state.enemyPaddle.y + state.enemyPaddle.height;
          
          // Check if ball is within paddle bounds
          if (ball.x + BALL_RADIUS >= paddleLeft && 
              ball.x + BALL_RADIUS <= paddleRight &&
              ball.y >= paddleTop - BALL_RADIUS &&
              ball.y <= paddleBottom + BALL_RADIUS) {
            
            // Calculate bounce angle
            const relativeY = (ball.y - (state.enemyPaddle.y + state.enemyPaddle.height / 2)) / (state.enemyPaddle.height / 2);
            const bounceAngle = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, relativeY * Math.PI / 3));
            
            ball.vx = -Math.abs(Math.cos(bounceAngle) * BALL_SPEED);
            ball.vy = Math.sin(bounceAngle) * BALL_SPEED;
            ball.x = paddleLeft - BALL_RADIUS;

            // If ball has no number, split it
            if (ball.number === 0) {
              const ballToSplit = { ...ball };
              state.balls.splice(i, 1); // Remove original ball
              splitBall(ballToSplit);
              continue;
            }
          }
        }

        // Left wall collision (player missed)
        if (ball.x - BALL_RADIUS <= 0 && !ball.dissolving) {
          if (ball.isCorrect && ball.number > 0) {
            // Player missed correct ball - lose points and flash red
            state.score = Math.max(0, state.score - 50);
            setScore(state.score);
            
            // Flash red
            state.flashColor = 'red';
            state.flashTimer = 30; // 0.5 seconds at 60fps
            
            // Remove all balls and spawn new one
            state.balls = [];
            state.currentProblem = null;
            setCurrentProblem(null);
            setTimeout(() => spawnBall(canvas), 100);
            break; // Break out of loop since we cleared the array
          } else if (ball.number > 0) {
            // Wrong ball hit left wall - just remove it silently, no penalty
            state.balls.splice(i, 1);
            continue;
          } else {
            // Regular ball hit left wall - remove and spawn new one
            state.balls = [];
            state.currentProblem = null;
            setCurrentProblem(null);
            setTimeout(() => spawnBall(canvas), 100);
            break;
          }
        }

        // Right wall collision (shouldn't happen with perfect AI, but handle it)
        if (ball.x + BALL_RADIUS >= canvas.width && !ball.dissolving) {
          ball.vx = -ball.vx;
          ball.x = canvas.width - BALL_RADIUS;
        }
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
    };

    const draw = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Dark background
      ctx.fillStyle = '#050510';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Center dividing line (dashed)
      ctx.strokeStyle = '#333344';
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 10]);
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2, 0);
      ctx.lineTo(canvas.width / 2, canvas.height);
      ctx.stroke();
      ctx.setLineDash([]);

      const state = gameState.current;

      // Draw flash overlay if active
      if (state.flashTimer > 0 && state.flashColor) {
        const alpha = Math.min(0.4, state.flashTimer / 30 * 0.4); // Fade out over time
        ctx.fillStyle = state.flashColor === 'red' ? `rgba(255, 0, 0, ${alpha})` : `rgba(0, 255, 0, ${alpha})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Draw paddles
      ctx.fillStyle = '#00f3ff';
      ctx.fillRect(
        state.playerPaddle.x,
        state.playerPaddle.y,
        state.playerPaddle.width,
        state.playerPaddle.height
      );

      ctx.fillStyle = '#ff00ff';
      ctx.fillRect(
        state.enemyPaddle.x,
        state.enemyPaddle.y,
        state.enemyPaddle.width,
        state.enemyPaddle.height
      );

      // Draw balls
      state.balls.forEach(ball => {
        ctx.save();
        ctx.globalAlpha = ball.alpha;
        
        // Ball circle - all balls same color (white) so player must solve math
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
        ctx.fill();

        // Number on ball
        if (ball.number > 0) {
          ctx.font = 'bold 14px "Press Start 2P"';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          // Draw text with stroke for better contrast
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 3;
          ctx.strokeText(ball.number.toString(), ball.x, ball.y);
          
          // Fill with bright color for high contrast
          ctx.fillStyle = '#00f3ff'; // Neon cyan
          ctx.fillText(ball.number.toString(), ball.x, ball.y);
        }

        ctx.restore();
      });
    };

    const endGame = () => {
      gameState.current.active = false;
      setGameOver(true);
      if (animationId !== null) {
        cancelAnimationFrame(animationId);
      }
    };

    animationId = requestAnimationFrame(loop);

    return () => {
      // Stop game loop
      if (animationId !== null) {
        cancelAnimationFrame(animationId);
      }
      
      // Deactivate game
      gameState.current.active = false;
      
      // Remove event listeners
      canvas.removeEventListener('focus', handleFocus);
      canvas.removeEventListener('blur', handleBlur);
      canvas.removeEventListener('click', handleCanvasClick);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      
      // Reset state
      resetGameState();
    };
  }, []);

  if (gameOver) {
    return (
      <GameFrame
        title="PONG ARITHMETIC"
        score={score}
        lives={0}
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
                onClick={() => navigate('/results', { state: { score, game: 'Pong Arithmetic' } })}
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
    <GameFrame title="PONG ARITHMETIC" score={score} lives={0} timeRemaining={timeRemaining}>
      <canvas ref={canvasRef} className="w-full h-full bg-transparent" />
      
      {/* Math Problem Overlay */}
      {currentProblem && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-space-800/90 border border-neon-cyan px-6 py-3 rounded z-30">
          <span className="text-gray-400 text-xs block text-center font-pixel mb-1">SOLVE:</span>
          <span className="text-neon-cyan text-xl font-pixel">{currentProblem.equation} = ?</span>
        </div>
      )}
    </GameFrame>
  );
};

