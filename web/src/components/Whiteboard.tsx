import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Eraser, Undo, Redo, Trash2, PenTool, Check, Circle, Square, Triangle } from 'lucide-react';
import { ref, onValue, push, set, remove, serverTimestamp, onDisconnect } from 'firebase/database';
import { rtdb } from '../lib/firebase';
import type { WhiteboardDrawing } from '../types/cohort';
import { throttle } from '../utils/throttle';

interface RemoteCursor {
  x: number;
  y: number;
  username: string;
  color: string;
  timestamp: number;
}

interface WhiteboardProps {
  onVerifySuccess: (drawings: WhiteboardDrawing[]) => void;
  cohortId?: string; // Optional for now to support standalone/mock mode
  currentUser?: {
    id: string;
    username: string;
    color?: string;
  };
}

const COLORS = ['#FFFFFF', '#FF0055', '#00FFFF', '#55FF00', '#FFFF00'];
const BRUSH_SIZES = [2, 4, 8, 12];

type Tool = 'pen' | 'eraser' | 'rect' | 'circle' | 'triangle';

export default function Whiteboard({ onVerifySuccess, cohortId, currentUser }: WhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [drawings, setDrawings] = useState<WhiteboardDrawing[]>([]);
  // Redo stack is local only for now
  const [redoStack, setRedoStack] = useState<WhiteboardDrawing[]>([]);
  
  const [color, setColor] = useState(COLORS[0]);
  const [brushSize, setBrushSize] = useState(BRUSH_SIZES[1]);
  const [activeTool, setActiveTool] = useState<Tool>('pen');
  
  const [isVerifying, setIsVerifying] = useState(false);
  const [remoteCursors, setRemoteCursors] = useState<Record<string, RemoteCursor>>({});
  const lastCursorPosition = useRef<{ x: number; y: number } | null>(null);

  // Realtime Database Sync for drawings
  useEffect(() => {
    if (!cohortId) return;

    const whiteboardRef = ref(rtdb, `cohorts/${cohortId}/whiteboard`);
    
    const unsubscribe = onValue(whiteboardRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Convert object to array
        const loadedDrawings: WhiteboardDrawing[] = Object.values(data);
        // Sort by timestamp
        loadedDrawings.sort((a, b) => a.timestamp - b.timestamp);
        setDrawings(loadedDrawings);
      } else {
        setDrawings([]);
      }
    });

    return () => unsubscribe();
  }, [cohortId]);

  // Listen for remote cursors
  useEffect(() => {
    if (!cohortId || !currentUser) return;

    const cursorsRef = ref(rtdb, `cohorts/${cohortId}/cursors`);
    
    const unsubscribe = onValue(cursorsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Filter out our own cursor and only keep recent ones (within last 2 seconds)
        const now = Date.now();
        const others: Record<string, RemoteCursor> = {};
        
        Object.entries(data).forEach(([userId, cursor]: [string, any]) => {
          if (userId !== currentUser.id && cursor) {
            // Only show cursors that have been updated in the last 2 seconds
            // Handle both number timestamps and server timestamp placeholders
            const cursorTimestamp = typeof cursor.timestamp === 'number' ? cursor.timestamp : now;
            if (cursorTimestamp && (now - cursorTimestamp) < 2000) {
              others[userId] = {
                x: cursor.x || 0,
                y: cursor.y || 0,
                username: cursor.username || 'Unknown',
                color: cursor.color || COLORS[0],
                timestamp: cursorTimestamp
              };
            }
          }
        });
        
        setRemoteCursors(others);
      } else {
        setRemoteCursors({});
      }
    });

    // Cleanup: Remove my cursor when I leave
    const myCursorRef = ref(rtdb, `cohorts/${cohortId}/cursors/${currentUser.id}`);
    onDisconnect(myCursorRef).remove();

    return () => {
      unsubscribe();
      remove(myCursorRef).catch(() => {});
    };
  }, [cohortId, currentUser]);

  // Throttled function to broadcast cursor position
  const broadcastCursor = useCallback(
    throttle((x: number, y: number) => {
      if (!cohortId || !currentUser) return;
      
      // Only broadcast if position changed significantly (avoid unnecessary updates)
      if (lastCursorPosition.current) {
        const dx = Math.abs(x - lastCursorPosition.current.x);
        const dy = Math.abs(y - lastCursorPosition.current.y);
        if (dx < 2 && dy < 2) return; // Skip if movement is less than 2px
      }
      
      lastCursorPosition.current = { x, y };
      
      const myCursorRef = ref(rtdb, `cohorts/${cohortId}/cursors/${currentUser.id}`);
      set(myCursorRef, {
        x,
        y,
        username: currentUser.username,
        color: currentUser.color || COLORS[0],
        timestamp: serverTimestamp()
      }).catch(() => {});
    }, 50), // Update every 50ms
    [cohortId, currentUser]
  );

  // Resize observer to handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        const parent = canvasRef.current.parentElement;
        if (parent) {
          canvasRef.current.width = parent.clientWidth;
          canvasRef.current.height = parent.clientHeight;
          redraw();
        }
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial size

    return () => window.removeEventListener('resize', handleResize);
  }, [drawings]); // Redraw when drawings update

  // Redraw canvas whenever drawings or cursors change
  useEffect(() => {
    redraw();
  }, [drawings, currentPath, remoteCursors]); // Depend on currentPath and remoteCursors

  const redraw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid background
    drawGrid(ctx, canvas.width, canvas.height);

    // Draw all saved drawings
    drawings.forEach(drawing => {
      drawPath(ctx, drawing.path, drawing.color, drawing.brushSize);
    });

    // Draw current path being drawn
    if (currentPath.length > 0) {
      drawPath(ctx, currentPath, activeTool === 'eraser' ? '#000000' : color, brushSize);
    }

    // Draw remote cursors
    Object.values(remoteCursors).forEach(cursor => {
      drawCursor(ctx, cursor);
    });
  };

  const drawCursor = (ctx: CanvasRenderingContext2D, cursor: RemoteCursor) => {
    const { x, y, username, color: cursorColor } = cursor;
    
    // Draw cursor circle
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, 2 * Math.PI);
    ctx.fillStyle = cursorColor;
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw inner dot
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, 2 * Math.PI);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    
    // Draw username label with background
    const labelPadding = 4;
    const labelHeight = 16;
    ctx.font = '12px monospace';
    const textMetrics = ctx.measureText(username);
    const labelWidth = textMetrics.width + labelPadding * 2;
    
    // Draw label background
    ctx.fillStyle = cursorColor;
    ctx.fillRect(x + 12, y - labelHeight - 2, labelWidth, labelHeight);
    
    // Draw label border
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 12, y - labelHeight - 2, labelWidth, labelHeight);
    
    // Draw username text
    ctx.fillStyle = '#FFFFFF';
    ctx.textBaseline = 'middle';
    ctx.fillText(username, x + 12 + labelPadding, y - 2);
  };

  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.strokeStyle = '#1f2937'; // gray-800
    ctx.lineWidth = 1;
    const gridSize = 40;

    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  };

  const drawPath = (ctx: CanvasRenderingContext2D, path: { x: number; y: number }[], strokeColor: string, strokeWidth: number) => {
    if (path.length < 2) return;

    ctx.beginPath();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = strokeWidth;
    ctx.strokeStyle = strokeColor;

    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) {
      ctx.lineTo(path[i].x, path[i].y);
    }
    
    ctx.stroke();
  };

  const generateShape = (type: Tool, start: { x: number, y: number }, end: { x: number, y: number }): { x: number, y: number }[] => {
    const points: { x: number, y: number }[] = [];
    
    if (type === 'rect') {
      points.push({ x: start.x, y: start.y });
      points.push({ x: end.x, y: start.y });
      points.push({ x: end.x, y: end.y });
      points.push({ x: start.x, y: end.y });
      points.push({ x: start.x, y: start.y }); // Close loop
    } else if (type === 'triangle') {
      points.push({ x: start.x + (end.x - start.x) / 2, y: start.y }); // Top center
      points.push({ x: end.x, y: end.y }); // Bottom right
      points.push({ x: start.x, y: end.y }); // Bottom left
      points.push({ x: start.x + (end.x - start.x) / 2, y: start.y }); // Close loop
    } else if (type === 'circle') {
      const radius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
      const segments = 36; // Smooth circle
      for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * 2 * Math.PI;
        points.push({
          x: start.x + radius * Math.cos(theta),
          y: start.y + radius * Math.sin(theta)
        });
      }
    }
    return points;
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (isVerifying) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const coords = getCoordinates(e, canvas);
    setIsDrawing(true);
    setStartPoint(coords);
    setCurrentPath([coords]);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const coords = getCoordinates(e, canvas);
    
    // Always broadcast cursor position (even when not drawing)
    broadcastCursor(coords.x, coords.y);

    if (!isDrawing || isVerifying) return;

    if (activeTool === 'pen' || activeTool === 'eraser') {
      setCurrentPath(prev => [...prev, coords]);
    } else if (startPoint) {
      // Shape preview logic
      const shapePath = generateShape(activeTool, startPoint, coords);
      setCurrentPath(shapePath);
    }
  };

  // Track mouse movement even when not drawing (for cursor display)
  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const coords = getCoordinates(e, canvas);
    broadcastCursor(coords.x, coords.y);
    
    // Also call the draw function for drawing logic
    draw(e);
  };

  // Remove cursor when mouse leaves canvas
  const handleMouseLeave = () => {
    if (!cohortId || !currentUser) return;
    
    const myCursorRef = ref(rtdb, `cohorts/${cohortId}/cursors/${currentUser.id}`);
    remove(myCursorRef).catch(() => {});
    lastCursorPosition.current = null;
    
    // Also call stopDrawing if we were drawing
    stopDrawing();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    setStartPoint(null);

    if (currentPath.length > 1) {
      const newDrawing: WhiteboardDrawing = {
        id: Date.now().toString(), // Temporary ID, will be replaced by push key if synced
        path: currentPath,
        color: activeTool === 'eraser' ? '#111827' : color,
        brushSize: brushSize,
        timestamp: Date.now(),
        type: 'path'
      };
      
      if (cohortId) {
        // Sync to RTDB
        const whiteboardListRef = ref(rtdb, `cohorts/${cohortId}/whiteboard`);
        const newDrawingRef = push(whiteboardListRef);
        set(newDrawingRef, { ...newDrawing, id: newDrawingRef.key });
      } else {
        // Local mode
        setDrawings([...drawings, newDrawing]);
      }
      
      setRedoStack([]); // Clear redo stack
    }
    setCurrentPath([]);
  };

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const handleUndo = () => {
    // Only support local undo for now or last added if we track IDs
    // With RTDB, removing the last item is complex if multiple users draw.
    // Simplest implementation: Remove last item locally if we are in local mode.
    // For synced mode, we'd need to track ownership of strokes.
    
    if (!cohortId) {
      if (drawings.length === 0) return;
      const newDrawings = [...drawings];
      const removed = newDrawings.pop();
      if (removed) {
        setDrawings(newDrawings);
        setRedoStack([...redoStack, removed]);
      }
    } else {
        // TODO: Implement synced undo (remove my last stroke)
        alert("Undo in multiplayer mode not implemented yet");
    }
  };

  const handleRedo = () => {
    if (!cohortId) {
        if (redoStack.length === 0) return;
        const newRedoStack = [...redoStack];
        const restored = newRedoStack.pop();
        if (restored) {
        setDrawings([...drawings, restored]);
        setRedoStack(newRedoStack);
        }
    }
  };

  const handleClear = () => {
    if (window.confirm('Clear whiteboard?')) {
        if (cohortId) {
            const whiteboardRef = ref(rtdb, `cohorts/${cohortId}/whiteboard`);
            remove(whiteboardRef);
        } else {
            setDrawings([]);
            setRedoStack([]);
        }
    }
  };

  const handleVerify = () => {
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      onVerifySuccess(drawings);
    }, 2000);
  };

  return (
    <div className="flex-1 relative bg-gray-900 cursor-crosshair">
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={handleMouseMove}
        onMouseUp={stopDrawing}
        onMouseLeave={handleMouseLeave}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
        className="absolute inset-0 block touch-none"
      />
      
      {/* Loading Overlay */}
      {isVerifying && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-50">
          <div className="text-neon-cyan font-['Press_Start_2P'] text-xl mb-4 animate-pulse">
            VERIFYING SOLUTION...
          </div>
          <div className="w-64 h-2 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-neon-cyan animate-[loading_2s_ease-in-out_infinite]" style={{ width: '100%' }}></div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-gray-800/90 border border-gray-700 rounded-lg p-2 flex items-center gap-4 shadow-xl z-40 backdrop-blur-sm">
        {/* Tools */}
        <div className="flex items-center gap-2 border-r border-gray-700 pr-4">
          <button
            onClick={() => setActiveTool('pen')}
            className={`p-2 rounded hover:bg-gray-700 transition-colors ${activeTool === 'pen' ? 'bg-neon-blue/20 text-neon-blue' : 'text-gray-400'}`}
            title="Pen"
          >
            <PenTool size={20} />
          </button>
          <button
            onClick={() => setActiveTool('eraser')}
            className={`p-2 rounded hover:bg-gray-700 transition-colors ${activeTool === 'eraser' ? 'bg-neon-blue/20 text-neon-blue' : 'text-gray-400'}`}
            title="Eraser"
          >
            <Eraser size={20} />
          </button>
          <button
            onClick={() => setActiveTool('rect')}
            className={`p-2 rounded hover:bg-gray-700 transition-colors ${activeTool === 'rect' ? 'bg-neon-blue/20 text-neon-blue' : 'text-gray-400'}`}
            title="Rectangle"
          >
            <Square size={20} />
          </button>
          <button
            onClick={() => setActiveTool('circle')}
            className={`p-2 rounded hover:bg-gray-700 transition-colors ${activeTool === 'circle' ? 'bg-neon-blue/20 text-neon-blue' : 'text-gray-400'}`}
            title="Circle"
          >
            <Circle size={20} />
          </button>
          <button
            onClick={() => setActiveTool('triangle')}
            className={`p-2 rounded hover:bg-gray-700 transition-colors ${activeTool === 'triangle' ? 'bg-neon-blue/20 text-neon-blue' : 'text-gray-400'}`}
            title="Triangle"
          >
            <Triangle size={20} />
          </button>
        </div>

        {/* Colors */}
        <div className="flex items-center gap-2 border-r border-gray-700 pr-4">
          {COLORS.map(c => (
            <button
              key={c}
              onClick={() => {
                setColor(c);
                if (activeTool === 'eraser') setActiveTool('pen');
              }}
              className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${color === c && activeTool !== 'eraser' ? 'border-white scale-110 shadow-[0_0_8px_currentColor]' : 'border-transparent'}`}
              style={{ backgroundColor: c, color: c }}
            />
          ))}
        </div>

        {/* Brush Size */}
        <div className="flex items-center gap-2 border-r border-gray-700 pr-4">
          {BRUSH_SIZES.map(size => (
            <button
              key={size}
              onClick={() => setBrushSize(size)}
              className={`rounded-full bg-gray-400 hover:bg-white transition-all ${brushSize === size ? 'bg-white shadow-[0_0_8px_white]' : ''}`}
              style={{ width: size + 4, height: size + 4 }}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button onClick={handleUndo} className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded" title="Undo">
            <Undo size={18} />
          </button>
          <button onClick={handleRedo} className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded" title="Redo">
            <Redo size={18} />
          </button>
          <button onClick={handleClear} className="p-2 text-red-500 hover:text-red-400 hover:bg-gray-700 rounded" title="Clear">
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* Verify Button - Bottom Right */}
      <div className="absolute bottom-4 right-4 z-40">
        <button
          onClick={handleVerify}
          disabled={drawings.length === 0 || isVerifying}
          className="w-12 h-12 bg-neon-green hover:bg-neon-green/80 disabled:opacity-50 disabled:cursor-not-allowed text-black rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(41,255,100,0.4)] transition-all hover:scale-110 disabled:hover:scale-100"
          title="Verify Solution"
        >
          <Check size={24} />
        </button>
      </div>

    </div>
  );
}
