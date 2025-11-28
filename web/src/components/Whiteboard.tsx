import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Eraser, Undo, Redo, Trash2, PenTool, Check, Circle, Square, Triangle, Move } from 'lucide-react';
import { ref, onValue, push, set, remove, update, serverTimestamp, onDisconnect, get } from 'firebase/database';
import { rtdb } from '../lib/firebase';
import type { WhiteboardDrawing, CohortProblem, AIChatMessage } from '../types/cohort';
import { throttle } from '../utils/throttle';
import { verifySolution } from '../services/aiTutor';
import { getUserColor } from '../utils/formatters';

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
  onSnapshotRequest?: (captureSnapshot: () => Promise<string | null>) => void;
  currentProblem?: CohortProblem | null;
  chatMessages?: AIChatMessage[];
  onVerificationMessage?: (message: string, solved: boolean) => void;
}

const COLORS = ['#FFFFFF', '#FF0055', '#00FFFF', '#55FF00', '#FFFF00'];
const BRUSH_SIZES = [2, 4, 8, 12];

type Tool = 'pen' | 'eraser' | 'rect' | 'circle' | 'triangle';

export default function Whiteboard({ onVerifySuccess, cohortId, currentUser, onSnapshotRequest, currentProblem, chatMessages = [], onVerificationMessage }: WhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [drawings, setDrawings] = useState<WhiteboardDrawing[]>([]);
  // Redo stack stores drawings that were undone (for redo)
  const [redoStack, setRedoStack] = useState<WhiteboardDrawing[]>([]);
  // Track the last drawing ID created by current user (for undo)
  const lastUserDrawingIdRef = useRef<string | null>(null);
  
  const [color, setColor] = useState(COLORS[0]);
  const [brushSize, setBrushSize] = useState(BRUSH_SIZES[1]);
  const [activeTool, setActiveTool] = useState<Tool>('pen');
  
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);
  const [verificationSolved, setVerificationSolved] = useState<boolean | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [remoteCursors, setRemoteCursors] = useState<Record<string, RemoteCursor>>({});
  const lastCursorPosition = useRef<{ x: number; y: number } | null>(null);
  const [verifyingUserId, setVerifyingUserId] = useState<string | null>(null);
  const [verifyingUsername, setVerifyingUsername] = useState<string | null>(null);
  
  // Refs to avoid stale closures in Firebase listeners
  const drawingsRef = useRef<WhiteboardDrawing[]>([]);
  const onVerifySuccessRef = useRef(onVerifySuccess);
  
  // Keep refs updated
  useEffect(() => {
    drawingsRef.current = drawings;
  }, [drawings]);
  
  useEffect(() => {
    onVerifySuccessRef.current = onVerifySuccess;
  }, [onVerifySuccess]);
  
  // Camera/Viewport state for infinite canvas (use refs for instant updates)
  const cameraX = useRef(0);
  const cameraY = useRef(0);
  const [, setCameraUpdate] = useState(0); // Force re-render trigger
  const isPanning = useRef(false);
  const [isPanningState, setIsPanningState] = useState(false); // State for effect dependency
  const panStart = useRef<{ x: number; y: number } | null>(null);

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
                color: cursor.color || getUserColor(userId),
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

  // Listen for verification state from Firebase
  useEffect(() => {
    if (!cohortId || !currentUser) return;

    const verificationRef = ref(rtdb, `cohorts/${cohortId}/verification`);
    let currentVerifyingUserId: string | null = null;
    
    const unsubscribe = onValue(verificationRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Someone is verifying
        currentVerifyingUserId = data.userId || null;
        setIsVerifying(true);
        setVerifyingUserId(currentVerifyingUserId);
        setVerifyingUsername(data.username || 'Someone');
        
        // If countdown is set, use it; otherwise use message
        if (data.countdown !== undefined && data.countdown !== null) {
          setCountdown(data.countdown);
          setVerificationMessage('GET READY!');
          setVerificationSolved(null); // Reset solved status during countdown
          
          // If countdown reaches 0, start battle (all clients will see this)
          if (data.countdown === 0 || data.countdown < 1) {
            // Small delay to ensure all clients see the final countdown
            setTimeout(() => {
              const currentDrawings = drawingsRef.current;
              console.log('[Whiteboard] Starting battle with drawings:', currentDrawings.length);
              setIsVerifying(false);
              setCountdown(null);
              setVerificationMessage(null);
              setVerificationSolved(null);
              onVerifySuccessRef.current(currentDrawings);
            }, 100);
          }
        } else {
          setCountdown(null);
          setVerificationMessage(data.message || 'Checking your work...');
          setVerificationSolved(data.solved !== undefined ? data.solved : null);
        }
      } else {
        // Verification state cleared - reset everything
        currentVerifyingUserId = null;
        setIsVerifying(false);
        setVerifyingUserId(null);
        setVerifyingUsername(null);
        setVerificationMessage(null);
        setVerificationSolved(null);
        setCountdown(null);
      }
    });

    // Cleanup: If I'm verifying and I disconnect, clear the verification state
    onDisconnect(verificationRef).remove();

    return () => {
      unsubscribe();
      // If I was verifying, clear it when component unmounts
      if (currentVerifyingUserId === currentUser.id) {
        remove(verificationRef).catch(() => {});
      }
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
  // Note: Camera changes trigger redraw directly in handleMouseMove for instant updates
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
    
    // Save context and apply camera transform
    ctx.save();
    ctx.translate(-cameraX.current, -cameraY.current);
    
    // Draw grid background (infinite)
    drawGrid(ctx, canvas.width, canvas.height);

    // Draw all saved drawings (in world space)
    drawings.forEach(drawing => {
      drawPath(ctx, drawing.path, drawing.color, drawing.brushSize);
    });

    // Draw current path being drawn (in world space)
    if (currentPath.length > 0) {
      drawPath(ctx, currentPath, activeTool === 'eraser' ? '#000000' : color, brushSize);
    }

    // Draw remote cursors (in world space)
    Object.values(remoteCursors).forEach(cursor => {
      drawCursor(ctx, cursor);
    });
    
    // Restore context
    ctx.restore();
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
    const labelOffsetX = 12;
    const labelOffsetY = -labelHeight - 2;
    ctx.font = '12px monospace';
    const textMetrics = ctx.measureText(username);
    const labelWidth = textMetrics.width + labelPadding * 2;
    
    // Calculate label position
    const labelX = x + labelOffsetX;
    const labelY = y + labelOffsetY;
    
    // Draw label background
    ctx.fillStyle = cursorColor;
    ctx.fillRect(labelX, labelY, labelWidth, labelHeight);
    
    // Draw label border
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.strokeRect(labelX, labelY, labelWidth, labelHeight);
    
    // Draw username text - vertically centered in the label
    ctx.fillStyle = '#FFFFFF';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    // Center text vertically: labelY + labelHeight/2
    ctx.fillText(username, labelX + labelPadding, labelY + labelHeight / 2);
  };

  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.strokeStyle = '#1f2937'; // gray-800
    ctx.lineWidth = 1;
    const gridSize = 40;

    // Calculate visible grid bounds in world space
    // Since we're already inside the camera transform, we work in world coordinates
    const worldLeft = cameraX.current;
    const worldRight = cameraX.current + width;
    const worldTop = cameraY.current;
    const worldBottom = cameraY.current + height;
    
    // Add padding to ensure no gaps when panning
    const padding = gridSize * 3;
    const startX = Math.floor((worldLeft - padding) / gridSize) * gridSize;
    const endX = Math.ceil((worldRight + padding) / gridSize) * gridSize;
    const startY = Math.floor((worldTop - padding) / gridSize) * gridSize;
    const endY = Math.ceil((worldBottom + padding) / gridSize) * gridSize;

    // Draw vertical lines (in world space - no need to convert to screen)
    for (let x = startX; x <= endX; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
      ctx.stroke();
    }

    // Draw horizontal lines (in world space - no need to convert to screen)
    for (let y = startY; y <= endY; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
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
    
    // Don't handle panning here - global handlers take care of it
    // This allows panning to continue even when mouse leaves canvas
    
    const coords = getCoordinates(e, canvas);
    broadcastCursor(coords.x, coords.y);
    
    // Also call the draw function for drawing logic
    draw(e);
  };
  
  // Handle middle mouse button for panning
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1) { // Middle mouse button
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      isPanning.current = true;
      setIsPanningState(true); // Update state to trigger effect
      panStart.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    } else {
      // Regular drawing
      startDrawing(e);
    }
  };
  
  const handleMouseUp = (e: React.MouseEvent) => {
    if (e.button === 1) { // Middle mouse button
      isPanning.current = false;
      setIsPanningState(false); // Update state to trigger effect cleanup
      panStart.current = null;
    } else {
      stopDrawing();
    }
  };
  
  // Global mouse handlers for panning (allows panning outside canvas)
  useEffect(() => {
    if (!isPanningState) return; // Only set up listeners when panning
    
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isPanning.current || !panStart.current) return;
      
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;
      
      const deltaX = currentX - panStart.current.x;
      const deltaY = currentY - panStart.current.y;
      
      // Update camera position instantly using refs
      cameraX.current -= deltaX;
      cameraY.current -= deltaY;
      
      // Trigger re-render for grid update
      setCameraUpdate(prev => prev + 1);
      
      // Redraw immediately
      redraw();
      
      panStart.current = { x: currentX, y: currentY };
    };
    
    const handleGlobalMouseUp = (e: MouseEvent) => {
      if (e.button === 1) { // Middle mouse button
        isPanning.current = false;
        setIsPanningState(false);
        panStart.current = null;
      }
    };
    
    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isPanningState]); // Re-run when panning state changes
  
  // Prevent context menu on middle mouse
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      if (e.button === 1) {
        e.preventDefault();
      }
    };
    
    window.addEventListener('contextmenu', handleContextMenu);
    return () => window.removeEventListener('contextmenu', handleContextMenu);
  }, []);
  
  const handleRecenter = () => {
    cameraX.current = 0;
    cameraY.current = 0;
    setCameraUpdate(prev => prev + 1);
    redraw();
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
        type: 'path',
        userId: currentUser?.id // Track who created this drawing
      };
      
      if (cohortId) {
        // Sync to RTDB
        const whiteboardListRef = ref(rtdb, `cohorts/${cohortId}/whiteboard`);
        const newDrawingRef = push(whiteboardListRef);
        const drawingWithId = { ...newDrawing, id: newDrawingRef.key || newDrawing.id };
        set(newDrawingRef, drawingWithId);
        // Track the last drawing ID created by this user
        if (newDrawingRef.key) {
          lastUserDrawingIdRef.current = newDrawingRef.key;
        }
      } else {
        // Local mode
        setDrawings([...drawings, newDrawing]);
        lastUserDrawingIdRef.current = newDrawing.id;
      }
      
      setRedoStack([]); // Clear redo stack when new drawing is created
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

    // Convert screen coordinates to world coordinates
    const screenX = clientX - rect.left;
    const screenY = clientY - rect.top;

    return {
      x: screenX + cameraX.current,
      y: screenY + cameraY.current
    };
  };

  const handleUndo = async () => {
    if (!cohortId) {
      // Local mode
      if (drawings.length === 0) return;
      const newDrawings = [...drawings];
      const removed = newDrawings.pop();
      if (removed) {
        setDrawings(newDrawings);
        setRedoStack([...redoStack, removed]);
        lastUserDrawingIdRef.current = newDrawings.length > 0 
          ? newDrawings[newDrawings.length - 1]?.id || null
          : null;
      }
    } else {
      // Multiplayer mode - remove last drawing by current user
      if (!currentUser?.id) return;
      
      // Find the last drawing created by the current user
      const myDrawings = drawings.filter(d => d.userId === currentUser.id);
      if (myDrawings.length === 0) return;
      
      // Get the most recent drawing by this user
      const lastMyDrawing = myDrawings[myDrawings.length - 1];
      
      // Remove from Firebase
      const drawingRef = ref(rtdb, `cohorts/${cohortId}/whiteboard/${lastMyDrawing.id}`);
      await remove(drawingRef);
      
      // Update local state
      const newDrawings = drawings.filter(d => d.id !== lastMyDrawing.id);
      setDrawings(newDrawings);
      setRedoStack([...redoStack, lastMyDrawing]);
      
      // Update last user drawing ID
      const remainingMyDrawings = newDrawings.filter(d => d.userId === currentUser.id);
      lastUserDrawingIdRef.current = remainingMyDrawings.length > 0
        ? remainingMyDrawings[remainingMyDrawings.length - 1]?.id || null
        : null;
    }
  };

  const handleRedo = async () => {
    if (redoStack.length === 0) return;
    
    if (!cohortId) {
      // Local mode
      const newRedoStack = [...redoStack];
      const restored = newRedoStack.pop();
      if (restored) {
        setDrawings([...drawings, restored]);
        setRedoStack(newRedoStack);
        lastUserDrawingIdRef.current = restored.id;
      }
    } else {
      // Multiplayer mode - restore last undone drawing
      if (!currentUser?.id) return;
      
      const newRedoStack = [...redoStack];
      const restored = newRedoStack.pop();
      if (!restored) return;
      
      // Only redo if the restored drawing belongs to current user
      if (restored.userId !== currentUser.id) {
        // Put it back on the stack
        setRedoStack([...newRedoStack, restored]);
        return;
      }
      
      // Restore to Firebase
      const whiteboardListRef = ref(rtdb, `cohorts/${cohortId}/whiteboard`);
      const restoredDrawingRef = ref(rtdb, `cohorts/${cohortId}/whiteboard/${restored.id}`);
      await set(restoredDrawingRef, restored);
      
      // Update local state
      setDrawings([...drawings, restored]);
      setRedoStack(newRedoStack);
      lastUserDrawingIdRef.current = restored.id;
    }
  };

  const handleClear = () => {
    if (window.confirm('Clear whiteboard?')) {
        if (cohortId) {
            const whiteboardRef = ref(rtdb, `cohorts/${cohortId}/whiteboard`);
            remove(whiteboardRef);
        } else {
          setDrawings([]);
        }
        setRedoStack([]);
        lastUserDrawingIdRef.current = null;
    }
  };

  // Fetch chat messages from Firebase for verification
  const fetchChatMessages = async (): Promise<AIChatMessage[]> => {
    if (!cohortId) return chatMessages;
    
    return new Promise((resolve) => {
      const chatRef = ref(rtdb, `cohorts/${cohortId}/chat/messages`);
      onValue(chatRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const messages: AIChatMessage[] = Object.entries(data).map(([id, msg]: [string, any]) => ({
            id,
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
            userId: msg.userId,
            username: msg.username,
          }));
          messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
          resolve(messages);
        } else {
          resolve([]);
        }
      }, { onlyOnce: true });
    });
  };

  const startCountdown = useCallback(async () => {
    if (!cohortId) {
      // Fallback for non-cohort mode
      setCountdown(3);
      const countdownInterval = setInterval(() => {
        setCountdown(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(countdownInterval);
            setIsVerifying(false);
            setCountdown(null);
            onVerifySuccess(drawings);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
      return;
    }

    // Sync countdown to Firebase so all users see it
    // Don't set countdown locally - let Firebase listener handle it
    const verificationRef = ref(rtdb, `cohorts/${cohortId}/verification`);
    
    // Update Firebase with countdown state (this will trigger listeners on all clients)
    await update(verificationRef, {
      countdown: 3,
      message: 'GET READY!'
    });
    
    // Use a local interval to update Firebase countdown
    // All clients will see the updates through the Firebase listener
    let currentCount = 3;
    const countdownInterval = setInterval(async () => {
      currentCount -= 1;
      
      if (currentCount <= 0) {
        clearInterval(countdownInterval);
        // Set countdown to 0 so all clients see it, then clear after a brief moment
        await update(verificationRef, {
          countdown: 0,
          message: 'GET READY!'
        });
        // Clear verification state after all clients have seen countdown 0
        setTimeout(async () => {
          await remove(verificationRef);
        }, 200);
      } else {
        // Update Firebase with current countdown (all clients will see this)
        await update(verificationRef, {
          countdown: currentCount,
          message: 'GET READY!'
        });
      }
    }, 1000);
  }, [drawings, onVerifySuccess, cohortId]);

  // Capture whiteboard snapshot as base64 image
  const captureSnapshot = useCallback(async (): Promise<string | null> => {
    if (drawings.length === 0) {
      return null;
    }

    // Create a temporary canvas to render the whiteboard content with bounding box
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return null;

    // Calculate bounding box of all drawings
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    drawings.forEach(drawing => {
      drawing.path.forEach(point => {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
      });
    });

    // Add padding
    const padding = 50;
    const width = maxX - minX + padding * 2;
    const height = maxY - minY + padding * 2;

    // Set canvas size (limit to reasonable size for API)
    const maxSize = 2048;
    const scale = Math.min(1, maxSize / Math.max(width, height));
    tempCanvas.width = width * scale;
    tempCanvas.height = height * scale;

    // Draw white background
    tempCtx.fillStyle = '#111827'; // gray-900
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    // Draw grid
    tempCtx.strokeStyle = '#1f2937'; // gray-800
    tempCtx.lineWidth = 1;
    const gridSize = 40 * scale;
    for (let x = 0; x < tempCanvas.width; x += gridSize) {
      tempCtx.beginPath();
      tempCtx.moveTo(x, 0);
      tempCtx.lineTo(x, tempCanvas.height);
      tempCtx.stroke();
    }
    for (let y = 0; y < tempCanvas.height; y += gridSize) {
      tempCtx.beginPath();
      tempCtx.moveTo(0, y);
      tempCtx.lineTo(tempCanvas.width, y);
      tempCtx.stroke();
    }

    // Draw all drawings (adjusted for bounding box and scale)
    drawings.forEach(drawing => {
      if (drawing.path.length < 2) return;
      
      tempCtx.beginPath();
      tempCtx.lineCap = 'round';
      tempCtx.lineJoin = 'round';
      tempCtx.lineWidth = drawing.brushSize * scale;
      tempCtx.strokeStyle = drawing.color;

      const adjustedPath = drawing.path.map(p => ({
        x: (p.x - minX + padding) * scale,
        y: (p.y - minY + padding) * scale
      }));

      tempCtx.moveTo(adjustedPath[0].x, adjustedPath[0].y);
      for (let i = 1; i < adjustedPath.length; i++) {
        tempCtx.lineTo(adjustedPath[i].x, adjustedPath[i].y);
      }
      tempCtx.stroke();
    });

    // Convert to base64
    return tempCanvas.toDataURL('image/png');
  }, [drawings]);

  // Expose snapshot function to parent
  useEffect(() => {
    if (onSnapshotRequest) {
      onSnapshotRequest(captureSnapshot);
    }
  }, [captureSnapshot, onSnapshotRequest]);

  const handleVerify = async () => {
    if (!cohortId || !currentUser) return;
    
    // Check if someone else is already verifying (double-check with Firebase)
    const verificationRef = ref(rtdb, `cohorts/${cohortId}/verification`);
    const snapshot = await get(verificationRef);
    const existingVerification = snapshot.val();
    
    if (existingVerification && existingVerification.userId !== currentUser.id) {
      // Someone else is already verifying
      return;
    }
    
    // Try to set verification state (this acts as a lock)
    try {
      await set(verificationRef, {
        userId: currentUser.id,
        username: currentUser.username,
        message: 'Checking your work...',
        timestamp: Date.now()
      });
    } catch (error) {
      // Failed to acquire lock, someone else might have started
      console.error('Failed to start verification:', error);
      return;
    }

    if (!currentProblem) {
      // No problem set, just start battle immediately (fallback)
      await update(verificationRef, {
        message: 'Starting battle...'
      });
      
      setTimeout(async () => {
        await remove(verificationRef);
        onVerifySuccess(drawings);
      }, 2000);
      return;
    }

    try {
      // Fetch current chat messages from Firebase
      const messages = await fetchChatMessages();
      
      // Update message in Firebase
      await update(verificationRef, {
        message: 'Checking your work...'
      });
      
      // First try to verify via chat history
      let result = await verifySolution(currentProblem, messages, null);

      // If AI needs whiteboard to verify, capture and send it
      if (result.needsWhiteboard && drawings.length > 0) {
        await update(verificationRef, {
          message: 'Checking your whiteboard work...'
        });
        const whiteboardImage = await captureSnapshot();
        result = await verifySolution(currentProblem, messages, whiteboardImage);
      }

      // Update with result message and solved status
      await update(verificationRef, {
        message: result.message,
        solved: result.solved
      });
      
      // Notify parent of verification message (to display in chat)
      if (onVerificationMessage) {
        onVerificationMessage(result.message, result.solved);
      }

      if (result.solved) {
        // Start countdown after showing success message
        // Keep verification state active during countdown
        setTimeout(async () => {
          await startCountdown();
        }, 2000);
      }
      // If not solved, keep the message displayed until user acknowledges it
      // (no auto-dismiss - user must click button)
    } catch (error) {
      console.error('Verification error:', error);
      await update(verificationRef, {
        message: 'Error verifying solution. Please try again.',
        solved: false
      });
      // Don't auto-dismiss errors - user must acknowledge
    }
  };

  return (
    <div className="flex-1 relative bg-gray-900 cursor-crosshair">
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={(e) => {
          // Don't stop panning on mouse leave - let global handlers manage it
          // Only handle cursor cleanup if not panning
          if (!isPanning.current) {
            handleMouseLeave();
          }
        }}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
        className="absolute inset-0 block touch-none"
      />
      
      {/* Loading Overlay */}
      {isVerifying && (
        <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-50">
          {countdown !== null ? (
            // Countdown display
            <div className="flex flex-col items-center">
              <div className="text-neon-green font-['Press_Start_2P'] text-2xl mb-6 animate-pulse">
                GET READY!
              </div>
              <div 
                className="text-9xl font-['Press_Start_2P'] text-neon-cyan animate-bounce"
                style={{ 
                  textShadow: '0 0 20px #00FFFF, 0 0 40px #00FFFF, 0 0 60px #00FFFF',
                  animation: 'pulse 0.5s ease-in-out'
                }}
              >
                {countdown}
              </div>
              <div className="mt-6 text-gray-400 font-['Press_Start_2P'] text-sm">
                BATTLE STARTING...
              </div>
            </div>
          ) : verificationMessage ? (
            // Verification message display
            <div className="flex flex-col items-center max-w-lg px-6 text-center">
              {verifyingUsername && verifyingUserId !== currentUser?.id && (
                <div className="text-neon-yellow font-['Press_Start_2P'] text-sm mb-2">
                  {verifyingUsername} is verifying...
                </div>
              )}
              {verificationSolved === true ? (
                <>
                  <div className="text-6xl mb-4">🎉</div>
                  <div className="text-neon-green font-['Press_Start_2P'] text-xl mb-4">
                    SOLVED!
                  </div>
                </>
              ) : verificationSolved === false ? (
                <>
                  {verificationMessage && (
                    verificationMessage.toLowerCase().includes('whiteboard') || 
                    verificationMessage.toLowerCase().includes('show your work') ||
                    verificationMessage.toLowerCase().includes('need to see') ||
                    verificationMessage.toLowerCase().includes('insufficient')
                  ) ? (
                    <>
                      <div className="text-6xl mb-4">📝</div>
                      <div className="text-orange-400 font-['Press_Start_2P'] text-xl mb-4">
                        NEEDS MORE WORK
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-6xl mb-4">❌</div>
                      <div className="text-red-500 font-['Press_Start_2P'] text-xl mb-4">
                        INCORRECT
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="text-neon-cyan font-['Press_Start_2P'] text-lg mb-4 animate-pulse">
                  {verifyingUserId === currentUser?.id ? 'CHECKING...' : 'AI IS VERIFYING...'}
                </div>
              )}
              <p className="text-white text-lg leading-relaxed mb-6">
                {verificationMessage}
              </p>
              {(verificationSolved === false || (verificationMessage && verificationMessage.includes('Error'))) && (
                <button
                  onClick={async () => {
                    if (!cohortId) return;
                    const verificationRef = ref(rtdb, `cohorts/${cohortId}/verification`);
                    await remove(verificationRef);
                  }}
                  className="px-6 py-3 bg-neon-cyan hover:bg-neon-cyan/80 text-black font-bold rounded font-['Press_Start_2P'] transition-all text-sm"
                >
                  ACKNOWLEDGE
                </button>
              )}
            </div>
          ) : (
            // Default loading state
            <>
              <div className="text-neon-cyan font-['Press_Start_2P'] text-xl mb-4 animate-pulse">
                {verifyingUserId === currentUser?.id ? 'VERIFYING SOLUTION...' : verifyingUsername ? `${verifyingUsername} IS VERIFYING...` : 'VERIFYING SOLUTION...'}
              </div>
              <div className="w-64 h-2 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-neon-cyan animate-[loading_2s_ease-in-out_infinite]" style={{ width: '100%' }}></div>
              </div>
            </>
          )}
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
          <button 
            onClick={handleUndo} 
            disabled={cohortId 
              ? !currentUser?.id || drawings.filter(d => d.userId === currentUser.id).length === 0
              : drawings.length === 0
            }
            className={`p-2 rounded transition-colors ${
              (cohortId 
                ? !currentUser?.id || drawings.filter(d => d.userId === currentUser.id).length === 0
                : drawings.length === 0
              )
                ? 'text-gray-600 cursor-not-allowed' 
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
            title="Undo"
          >
            <Undo size={18} />
          </button>
          <button 
            onClick={handleRedo} 
            disabled={redoStack.length === 0}
            className={`p-2 rounded transition-colors ${
              redoStack.length === 0
                ? 'text-gray-600 cursor-not-allowed'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
            title="Redo"
          >
            <Redo size={18} />
          </button>
          <button onClick={handleClear} className="p-2 text-red-500 hover:text-red-400 hover:bg-gray-700 rounded" title="Clear">
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* Action Buttons - Bottom Right */}
      <div className="absolute bottom-4 right-4 z-40 flex flex-col gap-3">
        <button
          onClick={handleRecenter}
          className="w-12 h-12 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110"
          title="Recenter Canvas"
        >
          <Move size={20} />
        </button>
        <button
          onClick={handleVerify}
          disabled={drawings.length === 0 || isVerifying}
          className="w-12 h-12 bg-neon-green hover:bg-neon-green/80 disabled:opacity-50 disabled:cursor-not-allowed text-black rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(41,255,100,0.4)] transition-all hover:scale-110 disabled:hover:scale-100"
          title={isVerifying && verifyingUserId !== currentUser?.id ? `${verifyingUsername} is verifying...` : "Verify Solution"}
        >
          <Check size={24} />
        </button>
      </div>

    </div>
  );
}
