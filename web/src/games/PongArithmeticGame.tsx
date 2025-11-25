import { useEffect, useRef, useState, useCallback } from 'react';
import { GameFrame } from '../components/GameFrame';
import { useGameCompletion } from '../hooks/useGameCompletion';

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

const PROBLEMS: MathProblem[] = [
  { equation: "2 + 3 × 4", answer: 14, wrongAnswers: [20, 11] },
  { equation: "(5 + 2) × 3", answer: 21, wrongAnswers: [17, 25] },
  { equation: "10 - 2 × 3", answer: 4, wrongAnswers: [24, 7] },
  { equation: "4 × 2 + 5", answer: 13, wrongAnswers: [18, 9] },
  { equation: "(8 - 3) × 2", answer: 10, wrongAnswers: [13, 7] },
  { equation: "6 + 4 ÷ 2", answer: 8, wrongAnswers: [5, 10] },
  { equation: "12 ÷ 3 + 1", answer: 5, wrongAnswers: [7, 3] },
  { equation: "3 × 3 - 2", answer: 7, wrongAnswers: [3, 10] },
];

const PADDLE_WIDTH = 10;
const PADDLE_HEIGHT = 70;
const BALL_RADIUS = 10;
const PADDLE_SPEED = 2;
const BALL_SPEED = 2;
const PADDLE_MARGIN = 18;

export const PongArithmeticGame = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [currentProblem, setCurrentProblem] = useState<MathProblem | null>(null);

  const gameStateRef = useRef<{
    playerPaddle: { x: number; y: number };
    enemyPaddle: { x: number; y: number };
    balls: Ball[];
    keys: { w: boolean; s: boolean };
    score: number;
    timeRemaining: number;
    active: boolean;
    flashTimer: number;
    flashColor: 'red' | 'green' | null;
    currentProblem: MathProblem | null;
  } | null>(null);

  const animationIdRef = useRef<number | null>(null);

  const { completeGame } = useGameCompletion({ gameType: 'pong-arithmetic', gameName: 'Pong Arithmetic' });

  const startGame = useCallback(() => {
    gameStateRef.current = {
      playerPaddle: { x: PADDLE_MARGIN, y: 165 },
      enemyPaddle: { x: 682, y: 165 },
      balls: [{
        x: 350,
        y: 200,
        vx: BALL_SPEED,
        vy: (Math.random() - 0.5) * BALL_SPEED,
        number: 0,
        isCorrect: false,
        alpha: 1,
        dissolving: false,
      }],
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
      const key = e.key.toLowerCase();
      if (key === 'w' || key === 's') {
        if (!isFocused) canvas.focus();
        if (key === 'w') gameState.keys.w = true;
        if (key === 's') gameState.keys.s = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'w') gameState.keys.w = false;
      if (key === 's') gameState.keys.s = false;
    };

    canvas.addEventListener('focus', handleFocus);
    canvas.addEventListener('blur', handleBlur);
    canvas.addEventListener('click', () => canvas.focus());
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const spawnBall = () => {
      gameState.balls = [{
        x: 350,
        y: 200,
        vx: BALL_SPEED,
        vy: (Math.random() - 0.5) * BALL_SPEED,
        number: 0,
        isCorrect: false,
        alpha: 1,
        dissolving: false,
      }];
      gameState.currentProblem = null;
      setCurrentProblem(null);
    };

    const splitBall = (ball: Ball) => {
      const problem = PROBLEMS[Math.floor(Math.random() * PROBLEMS.length)];
      gameState.currentProblem = problem;
      setCurrentProblem(problem);

      const answers = [problem.answer, ...problem.wrongAnswers].sort(() => Math.random() - 0.5);
      const angles = [-Math.PI * 0.75, -Math.PI * 0.5, -Math.PI * 0.25];
      const yOffsets = [-12, 0, 12];
      
      gameState.balls = angles.map((angle, i) => ({
        x: gameState.enemyPaddle.x - BALL_RADIUS,
        y: ball.y + yOffsets[i],
        vx: Math.cos(angle) * BALL_SPEED,
        vy: Math.sin(angle) * BALL_SPEED,
        number: answers[i],
        isCorrect: answers[i] === problem.answer,
        alpha: 1,
        dissolving: false,
      }));
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

      // Flash timer
      if (gameState.flashTimer > 0) {
        gameState.flashTimer -= dt;
        if (gameState.flashTimer <= 0) {
          gameState.flashTimer = 0;
          gameState.flashColor = null;
        }
      }

      // Player paddle
      if (gameState.keys.w && gameState.playerPaddle.y > 0) {
        gameState.playerPaddle.y -= PADDLE_SPEED * dt;
      }
      if (gameState.keys.s && gameState.playerPaddle.y + PADDLE_HEIGHT < canvas.height) {
        gameState.playerPaddle.y += PADDLE_SPEED * dt;
      }

      // Enemy AI
      const targetBall = gameState.balls.find(b => b.vx > 0 && !b.dissolving);
      if (targetBall) {
        const targetY = targetBall.y - PADDLE_HEIGHT / 2;
        const diff = targetY - gameState.enemyPaddle.y;
        const maxMove = PADDLE_SPEED * dt * 1.5;
        
        if (Math.abs(diff) > maxMove) {
          gameState.enemyPaddle.y += diff > 0 ? maxMove : -maxMove;
        } else {
          gameState.enemyPaddle.y = targetY;
        }
        gameState.enemyPaddle.y = Math.max(0, Math.min(canvas.height - PADDLE_HEIGHT, gameState.enemyPaddle.y));
      }

      // Update balls
      for (let i = gameState.balls.length - 1; i >= 0; i--) {
        const ball = gameState.balls[i];
        if (!ball) continue;
        
        if (ball.dissolving) {
          ball.alpha -= 0.05 * dt;
          if (ball.alpha <= 0) {
            gameState.balls.splice(i, 1);
            continue;
          }
        }

        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;

        // Wall bounce
        if (ball.y - BALL_RADIUS <= 0 || ball.y + BALL_RADIUS >= canvas.height) {
          ball.vy = -ball.vy;
          ball.y = Math.max(BALL_RADIUS, Math.min(canvas.height - BALL_RADIUS, ball.y));
        }

        // Player paddle collision
        if (ball.vx < 0 && !ball.dissolving) {
          const px = gameState.playerPaddle.x;
          const py = gameState.playerPaddle.y;
          
          if (ball.x - BALL_RADIUS <= px + PADDLE_WIDTH && 
              ball.x - BALL_RADIUS >= px &&
              ball.y >= py - BALL_RADIUS &&
              ball.y <= py + PADDLE_HEIGHT + BALL_RADIUS) {
            
            const relY = (ball.y - (py + PADDLE_HEIGHT / 2)) / (PADDLE_HEIGHT / 2);
            const angle = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, relY * Math.PI / 3));
            
            if (ball.number > 0) {
              if (ball.isCorrect) {
                gameState.score += 1000;
                setScore(gameState.score);
                gameState.flashColor = 'green';
                gameState.flashTimer = 30;
                
                // Remove wrong balls
                for (let j = gameState.balls.length - 1; j >= 0; j--) {
                  if (j !== i && !gameState.balls[j].isCorrect) {
                    gameState.balls.splice(j, 1);
                    if (j < i) i--;
                  }
                }
                
                ball.number = 0;
                ball.isCorrect = false;
                gameState.currentProblem = null;
                setCurrentProblem(null);
              } else {
                gameState.score = Math.max(0, gameState.score - 50);
                setScore(gameState.score);
                gameState.flashColor = 'red';
                gameState.flashTimer = 30;
                ball.dissolving = true;
                continue;
              }
            }
            
            ball.vx = Math.abs(Math.cos(angle) * BALL_SPEED);
            ball.vy = Math.sin(angle) * BALL_SPEED;
            ball.x = px + PADDLE_WIDTH + BALL_RADIUS;
          }
        }

        // Enemy paddle collision
        if (ball.vx > 0 && !ball.dissolving) {
          const px = gameState.enemyPaddle.x;
          const py = gameState.enemyPaddle.y;
          
          if (ball.x + BALL_RADIUS >= px && 
              ball.x + BALL_RADIUS <= px + PADDLE_WIDTH &&
              ball.y >= py - BALL_RADIUS &&
              ball.y <= py + PADDLE_HEIGHT + BALL_RADIUS) {
            
            const relY = (ball.y - (py + PADDLE_HEIGHT / 2)) / (PADDLE_HEIGHT / 2);
            const angle = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, relY * Math.PI / 3));
            
            ball.vx = -Math.abs(Math.cos(angle) * BALL_SPEED);
            ball.vy = Math.sin(angle) * BALL_SPEED;
            ball.x = px - BALL_RADIUS;

            if (ball.number === 0) {
              const ballToSplit = { ...ball };
              gameState.balls.splice(i, 1);
              splitBall(ballToSplit);
              continue;
            }
          }
        }

        // Left wall (missed)
        if (ball.x - BALL_RADIUS <= 0 && !ball.dissolving) {
          if (ball.isCorrect && ball.number > 0) {
            gameState.score = Math.max(0, gameState.score - 50);
            setScore(gameState.score);
            gameState.flashColor = 'red';
            gameState.flashTimer = 30;
            spawnBall();
            break;
          } else if (ball.number > 0) {
            gameState.balls.splice(i, 1);
            continue;
          } else {
            spawnBall();
            break;
          }
        }

        // Right wall (shouldn't happen)
        if (ball.x + BALL_RADIUS >= canvas.width && !ball.dissolving) {
          ball.vx = -ball.vx;
          ball.x = canvas.width - BALL_RADIUS;
        }
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

      // Draw
      ctx.fillStyle = '#050510';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Center line
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2, 0);
      ctx.lineTo(canvas.width / 2, canvas.height);
      ctx.stroke();
      ctx.setLineDash([]);

      // Flash overlay
      if (gameState.flashTimer > 0 && gameState.flashColor) {
        const alpha = Math.min(0.4, gameState.flashTimer / 30 * 0.4);
        ctx.fillStyle = gameState.flashColor === 'red' ? `rgba(255,0,0,${alpha})` : `rgba(0,255,0,${alpha})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Paddles
      ctx.fillStyle = '#00f3ff';
      ctx.fillRect(gameState.playerPaddle.x, gameState.playerPaddle.y, PADDLE_WIDTH, PADDLE_HEIGHT);
      ctx.fillStyle = '#ff00ff';
      ctx.fillRect(gameState.enemyPaddle.x, gameState.enemyPaddle.y, PADDLE_WIDTH, PADDLE_HEIGHT);

      // Balls
      gameState.balls.forEach(ball => {
        ctx.save();
        ctx.globalAlpha = ball.alpha;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
        ctx.fill();

        if (ball.number > 0) {
          ctx.font = 'bold 12px "Press Start 2P"';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 2;
          ctx.strokeText(ball.number.toString(), ball.x, ball.y);
          ctx.fillStyle = '#00f3ff';
          ctx.fillText(ball.number.toString(), ball.x, ball.y);
        }
        ctx.restore();
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
      <GameFrame title="PONG ARITHMETIC" score={0} lives={0} timeRemaining={60} aspectRatio={16/9}>
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90">
          <h1 className="text-2xl text-neon-cyan font-['Press_Start_2P'] mb-4 animate-pulse">
            PONG
          </h1>
          <h2 className="text-sm text-neon-pink font-['Press_Start_2P'] mb-6">
            ARITHMETIC
          </h2>
          
          <div className="bg-gray-900/80 border-2 border-neon-cyan rounded-lg p-4 mb-6 max-w-sm text-left">
            <h3 className="text-xs text-neon-yellow font-['Press_Start_2P'] mb-3 text-center">
              HOW TO PLAY
            </h3>
            <ul className="text-[10px] text-gray-300 space-y-2">
              <li>▸ Move: <span className="text-neon-green">W</span> (up) / <span className="text-neon-green">S</span> (down)</li>
              <li>▸ Ball splits into <span className="text-neon-yellow">3 numbered balls</span></li>
              <li>▸ Solve the <span className="text-neon-pink">equation</span> shown</li>
              <li>▸ Hit the <span className="text-neon-green">correct answer</span> for points!</li>
              <li>▸ Order of operations: × ÷ before + −</li>
            </ul>
          </div>

          <button 
            onClick={startGame}
            className="px-6 py-3 bg-neon-cyan text-black font-['Press_Start_2P'] text-xs rounded hover:bg-cyan-400 hover:scale-105 transition-all"
          >
            START GAME
          </button>
        </div>
      </GameFrame>
    );
  }

  if (gameOver) {
    return (
      <GameFrame title="PONG ARITHMETIC" score={score} lives={0} timeRemaining={timeRemaining} aspectRatio={16/9}
        overlay={
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
            <h2 className="text-3xl text-neon-pink font-['Press_Start_2P'] mb-4 animate-pulse">GAME OVER</h2>
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
        <canvas ref={canvasRef} className="w-full h-full bg-transparent" />
      </GameFrame>
    );
  }

  return (
    <GameFrame title="PONG ARITHMETIC" score={score} lives={0} timeRemaining={timeRemaining} aspectRatio={16/9}>
      <canvas ref={canvasRef} className="w-full h-full bg-transparent" />
      
      {currentProblem && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-space-800/90 border border-neon-cyan px-4 py-2 rounded z-30">
          <span className="text-gray-400 text-[8px] block text-center font-['Press_Start_2P'] mb-0.5">SOLVE:</span>
          <span className="text-neon-cyan text-base font-['Press_Start_2P']">{currentProblem.equation} = ?</span>
        </div>
      )}
    </GameFrame>
  );
};
