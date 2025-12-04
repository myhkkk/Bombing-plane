import React, { useState, useMemo } from 'react';
import { RotateCw, CheckCircle, Crosshair, ArrowRight, Plane as PlaneIcon, Trophy, AlertTriangle, Eye, EyeOff, Lightbulb, Trash2, Hand, X, MousePointer2, Shield } from 'lucide-react';
import Grid from './components/Grid';
import Button from './components/Button';
import {
  createEmptyGrid,
  placePlaneOnGrid,
  coordToLabel,
  checkPlaneValidity
} from './utils';
import {
  PlayerState,
  GamePhase,
  Direction,
  Coordinate,
  TurnLog,
  CellStatus,
  PlanePart,
  Plane
} from './types';
import { PLANES_PER_PLAYER, getPlaneCoords, GRID_SIZE } from './constants';

const initialPlayerState = (id: 1 | 2, name: string): PlayerState => ({
  id,
  name,
  grid: createEmptyGrid(),
  planes: [],
  ghostPlanes: [],
  alivePlanesCount: 0,
  isReady: false,
  hasShotThisTurn: false,
});

type ToolMode = 'ATTACK' | 'DEDUCE';

interface DragState {
  isDragging: boolean;
  planeId: string | null;
  startCoord: Coordinate | null; // Where drag started
  currentCoord: Coordinate | null; // Where mouse is now
  originalDirection: Direction;
  isGhost: boolean; // Tracking if we are dragging a real plane or a ghost
}

function App() {
  // Game State
  const [phase, setPhase] = useState<GamePhase>(GamePhase.SETUP);
  const [activePlayerId, setActivePlayerId] = useState<1 | 2>(1);
  const [p1, setP1] = useState<PlayerState>(initialPlayerState(1, "玩家 1"));
  const [p2, setP2] = useState<PlayerState>(initialPlayerState(2, "玩家 2"));
  const [logs, setLogs] = useState<TurnLog[]>([]);
  const [winner, setWinner] = useState<PlayerState | null>(null);

  // Interaction State
  const [setupDirection, setSetupDirection] = useState<Direction>(Direction.UP);
  const [battleTool, setBattleTool] = useState<ToolMode>('ATTACK');
  const [showMyBoard, setShowMyBoard] = useState(true); // Persists across turns
  const [selectedGhostId, setSelectedGhostId] = useState<string | null>(null);

  // Dragging State
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    planeId: null,
    startCoord: null,
    currentCoord: null,
    originalDirection: Direction.UP,
    isGhost: false
  });

  const activePlayer = activePlayerId === 1 ? p1 : p2;
  const opponent = activePlayerId === 1 ? p2 : p1;

  const setActivePlayerState = (newState: Partial<PlayerState>) => {
    if (activePlayerId === 1) setP1(prev => ({ ...prev, ...newState }));
    else setP2(prev => ({ ...prev, ...newState }));
  };

  const setOpponentState = (newState: Partial<PlayerState>) => {
    if (activePlayerId === 1) setP2(prev => ({ ...prev, ...newState }));
    else setP1(prev => ({ ...prev, ...newState }));
  };

  // --- Helpers ---

  const isSetupValid = () => {
    if (activePlayer.planes.length !== PLANES_PER_PLAYER) return false;
    for (const plane of activePlayer.planes) {
      if (!checkPlaneValidity(plane, activePlayer.planes)) return false;
    }
    return true;
  };

  // --- Logic: Pointer Events (Drag & Click) ---

  const handlePointerDown = (x: number, y: number, e: React.PointerEvent) => {
    e.preventDefault();
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    const isSetup = phase === GamePhase.SETUP;
    const isDeduce = phase === GamePhase.BATTLE && battleTool === 'DEDUCE';
    const isAttack = phase === GamePhase.BATTLE && battleTool === 'ATTACK';

    if (!isSetup && !isDeduce && !isAttack) return;

    let targetPlane: Plane | undefined;
    let isGhost = false;

    if (isSetup) {
      targetPlane = activePlayer.planes.find(p => p.head.x === x && p.head.y === y);
    } else if (isDeduce) {
      targetPlane = activePlayer.ghostPlanes.find(p =>
        p.cells.some(c => c.x === x && c.y === y)
      );
      isGhost = true;
    }

    if (targetPlane) {
      if (isDeduce && targetPlane) {
        setSelectedGhostId(targetPlane.id);
      }
      const isHead = targetPlane.head.x === x && targetPlane.head.y === y;
      if (isHead) {
        setDragState({
          isDragging: true,
          planeId: targetPlane.id,
          startCoord: { x, y },
          currentCoord: { x, y },
          originalDirection: targetPlane.direction,
          isGhost
        });
      }
    } else {
      if (isDeduce) setSelectedGhostId(null);
      setDragState({
        isDragging: false,
        planeId: null,
        startCoord: { x, y },
        currentCoord: { x, y },
        originalDirection: (isDeduce || isSetup) ? setupDirection : Direction.UP,
        isGhost
      });
    }
  };

  const handlePointerMove = (x: number, y: number, e: React.PointerEvent) => {
    e.preventDefault();

    // Robust hit testing for touch/drag
    let targetX = x;
    let targetY = y;

    const target = document.elementFromPoint(e.clientX, e.clientY);
    const cell = target?.closest('[data-grid-x]');
    if (cell) {
      const cx = parseInt(cell.getAttribute('data-grid-x') || '-1');
      const cy = parseInt(cell.getAttribute('data-grid-y') || '-1');
      if (cx >= 0 && cy >= 0) {
        targetX = cx;
        targetY = cy;
      }
    }

    if (dragState.currentCoord?.x !== targetX || dragState.currentCoord?.y !== targetY) {
      setDragState(prev => ({ ...prev, currentCoord: { x: targetX, y: targetY } }));
    }
  };

  const handlePointerUp = (x: number, y: number, e: React.PointerEvent) => {
    e.preventDefault();

    // Robust hit testing for touch/drag drop
    // Default to the last known drag position (currentCoord), 
    // fallback to event coordinates (which might be start coord due to capture) only if needed.
    let targetX = dragState.currentCoord?.x ?? x;
    let targetY = dragState.currentCoord?.y ?? y;

    const target = document.elementFromPoint(e.clientX, e.clientY);
    const cell = target?.closest('[data-grid-x]');
    if (cell) {
      const cx = parseInt(cell.getAttribute('data-grid-x') || '-1');
      const cy = parseInt(cell.getAttribute('data-grid-y') || '-1');
      if (cx >= 0 && cy >= 0) {
        targetX = cx;
        targetY = cy;
      }
    }

    const isSetup = phase === GamePhase.SETUP;
    const isDeduce = phase === GamePhase.BATTLE && battleTool === 'DEDUCE';

    const resetDrag = () => {
      setDragState({
        isDragging: false,
        planeId: null,
        startCoord: null,
        currentCoord: null,
        originalDirection: Direction.UP,
        isGhost: false
      });
    };

    if (dragState.isDragging && dragState.planeId) {
      const isClick = dragState.startCoord?.x === targetX && dragState.startCoord?.y === targetY;
      const movingPlaneId = dragState.planeId;
      const targetList = dragState.isGhost ? activePlayer.ghostPlanes : activePlayer.planes;
      const currentPlane = targetList.find(p => p.id === movingPlaneId);

      if (!currentPlane) { resetDrag(); return; }

      if (isClick) {
        const dirs = [Direction.UP, Direction.RIGHT, Direction.DOWN, Direction.LEFT];
        const nextDir = dirs[(dirs.indexOf(currentPlane.direction) + 1) % 4];
        updatePlane(movingPlaneId, { x: targetX, y: targetY }, nextDir, dragState.isGhost);
      } else {
        updatePlane(movingPlaneId, { x: targetX, y: targetY }, currentPlane.direction, dragState.isGhost);
      }
    }
    else if (!dragState.isDragging && dragState.startCoord?.x === targetX && dragState.startCoord?.y === targetY) {
      if (isSetup) {
        placeNewPlane(targetX, targetY);
      } else if (isDeduce) {
        const clickedPlane = activePlayer.ghostPlanes.find(p => p.cells.some(c => c.x === targetX && c.y === targetY));
        if (!clickedPlane) placeNewGhost(targetX, targetY);
      } else if (phase === GamePhase.BATTLE && battleTool === 'ATTACK') {
        handleAttack(targetX, targetY);
      }
    }
    resetDrag();
  };

  const handlePointerLeave = () => {
    // Critical fix: Do NOT cancel drag if we are in the middle of a drag operation.
    // The pointer capture on the cell will ensure we still get events.
    if (dragState.isDragging) return;
    setDragState(prev => ({ ...prev, isDragging: false, planeId: null }));
  };

  const handlePointerCancel = (e: React.PointerEvent) => {
    // Handle system interruptions (e.g. incoming call, browser gesture)
    setDragState(prev => ({
      ...prev,
      isDragging: false,
      planeId: null,
      startCoord: null,
      currentCoord: null
    }));
  };

  // --- Actions ---

  const updatePlane = (id: string, head: Coordinate, direction: Direction, isGhost: boolean) => {
    const shape = getPlaneCoords(head, direction);
    const newPlane: Plane = {
      id,
      head,
      direction,
      isDestroyed: false,
      cells: shape
    };
    if (isGhost) {
      setActivePlayerState({ ghostPlanes: activePlayer.ghostPlanes.map(p => p.id === id ? newPlane : p) });
    } else {
      setActivePlayerState({ planes: activePlayer.planes.map(p => p.id === id ? newPlane : p) });
    }
  };

  const placeNewPlane = (x: number, y: number) => {
    if (activePlayer.planes.length >= PLANES_PER_PLAYER) return;
    const shape = getPlaneCoords({ x, y }, setupDirection);
    if (checkPlaneValidity({ id: 't', head: { x, y }, direction: setupDirection, isDestroyed: false, cells: shape }, activePlayer.planes)) {
      const newPlane: Plane = {
        id: `p${activePlayerId}-${Date.now()}`,
        head: { x, y },
        direction: setupDirection,
        isDestroyed: false,
        cells: shape
      };
      setActivePlayerState({ planes: [...activePlayer.planes, newPlane] });
    }
  };

  const placeNewGhost = (x: number, y: number) => {
    const shape = getPlaneCoords({ x, y }, setupDirection);
    const newGhost: Plane = {
      id: `ghost-${Date.now()}`,
      head: { x, y },
      direction: setupDirection,
      isDestroyed: false,
      cells: shape
    };
    setActivePlayerState({ ghostPlanes: [...activePlayer.ghostPlanes, newGhost] });
    setSelectedGhostId(newGhost.id);
  };

  const deleteSelectedGhost = () => {
    if (!selectedGhostId) return;
    setActivePlayerState({
      ghostPlanes: activePlayer.ghostPlanes.filter(p => p.id !== selectedGhostId)
    });
    setSelectedGhostId(null);
  };

  const rotateSelectedGhost = () => {
    if (!selectedGhostId) return;
    const plane = activePlayer.ghostPlanes.find(p => p.id === selectedGhostId);
    if (!plane) return;
    const dirs = [Direction.UP, Direction.RIGHT, Direction.DOWN, Direction.LEFT];
    const nextDir = dirs[(dirs.indexOf(plane.direction) + 1) % 4];
    updatePlane(plane.id, plane.head, nextDir, true);
  };

  // --- Setup Helpers ---
  const handleRandomSetup = () => {
    let attempts = 0;
    while (attempts < 100) {
      let tempPlanes: Plane[] = [];
      let success = true;
      for (let i = 0; i < PLANES_PER_PLAYER; i++) {
        let placed = false;
        let innerAttempts = 0;
        while (!placed && innerAttempts < 100) {
          const x = Math.floor(Math.random() * GRID_SIZE);
          const y = Math.floor(Math.random() * GRID_SIZE);
          const dirs = [Direction.UP, Direction.RIGHT, Direction.DOWN, Direction.LEFT];
          const dir = dirs[Math.floor(Math.random() * dirs.length)];
          const shape = getPlaneCoords({ x, y }, dir);
          const candidate: Plane = { id: `p${activePlayerId}-${i}`, head: { x, y }, direction: dir, isDestroyed: false, cells: shape };
          if (checkPlaneValidity(candidate, tempPlanes)) {
            tempPlanes.push(candidate);
            placed = true;
          }
          innerAttempts++;
        }
        if (!placed) success = false;
      }
      if (success) {
        setActivePlayerState({ planes: tempPlanes });
        return;
      }
      attempts++;
    }
  };

  const handleConfirmSetup = () => {
    let finalGrid = createEmptyGrid();
    for (const p of activePlayer.planes) {
      const res = placePlaneOnGrid(finalGrid, p.id, p.head, p.direction);
      finalGrid = res.grid;
    }
    // CRITICAL: Initialize alivePlanesCount here
    setActivePlayerState({
      isReady: true,
      grid: finalGrid,
      alivePlanesCount: activePlayer.planes.length
    });

    if (activePlayerId === 1) {
      setPhase(GamePhase.TRANSITION);
      setTimeout(() => {
        setActivePlayerId(2);
        setPhase(GamePhase.SETUP);
        setSetupDirection(Direction.UP);
      }, 100);
    } else {
      setPhase(GamePhase.TRANSITION);
      setTimeout(() => {
        setActivePlayerId(1);
        setPhase(GamePhase.BATTLE);
      }, 100);
    }
  };

  const handleTransitionComplete = () => {
    setActivePlayerId(prev => prev === 1 ? 2 : 1);
    setP1(prev => ({ ...prev, hasShotThisTurn: false }));
    setP2(prev => ({ ...prev, hasShotThisTurn: false }));
    setPhase(GamePhase.BATTLE);
    setBattleTool('ATTACK');
    setSelectedGhostId(null);
    // Removed setShowMyBoard(true) to allow persistence of user preference
  };

  // --- Battle Logic ---

  const handleAttack = (x: number, y: number) => {
    if (activePlayer.hasShotThisTurn) return;

    // Safety check for opponent plane count, just in case
    if (opponent.alivePlanesCount === 0 && opponent.planes.length > 0) {
      // This scenario should be fixed by handleConfirmSetup logic, but as a safeguard:
      const realCount = opponent.planes.filter(p => !p.isDestroyed).length;
      if (realCount > 0) {
        // Silently correct it if needed, or just warn
        console.warn("Detected anomaly in alivePlanesCount, continuing game logic...");
      }
    }

    const targetCell = opponent.grid[y][x];
    if ([CellStatus.HIT, CellStatus.MISS, CellStatus.DEAD].includes(targetCell.status)) return;

    let newStatus = CellStatus.MISS;
    let resultType: 'MISS' | 'HIT' | 'KILL' = 'MISS';

    if (targetCell.status === CellStatus.PLANE) {
      if (targetCell.part === PlanePart.HEAD) {
        newStatus = CellStatus.DEAD;
        resultType = 'KILL';
      } else {
        newStatus = CellStatus.HIT;
        resultType = 'HIT';
      }
    }

    const newOpponentGrid = opponent.grid.map(row => row.map(c => ({ ...c })));
    newOpponentGrid[y][x].status = newStatus;

    let newOpponentAliveCount = opponent.alivePlanesCount;
    // If it was 0 for some buggy reason, sync it first
    if (newOpponentAliveCount === 0 && opponent.planes.length > 0) {
      newOpponentAliveCount = opponent.planes.filter(p => !p.isDestroyed).length;
    }

    let newOpponentPlanes = [...opponent.planes];

    if (resultType === 'KILL' && targetCell.planeId) {
      const planeIndex = newOpponentPlanes.findIndex(p => p.id === targetCell.planeId);
      if (planeIndex !== -1) {
        newOpponentPlanes[planeIndex] = { ...newOpponentPlanes[planeIndex], isDestroyed: true };
        newOpponentAliveCount--;
      }
    }

    setOpponentState({
      grid: newOpponentGrid,
      alivePlanesCount: newOpponentAliveCount,
      planes: newOpponentPlanes
    });

    setActivePlayerState({ hasShotThisTurn: true });
    setLogs(prev => [{
      player: activePlayer.name,
      coord: coordToLabel(x, y),
      result: resultType,
      turnNumber: logs.length + 1
    }, ...prev]);

    if (newOpponentAliveCount === 0) {
      setWinner(activePlayer);
      setPhase(GamePhase.GAME_OVER);
    }
  };

  // --- UI Helpers ---

  const previewCoords = useMemo(() => {
    if (dragState.isDragging && dragState.currentCoord && dragState.planeId) {
      const list = dragState.isGhost ? activePlayer.ghostPlanes : activePlayer.planes;
      const plane = list.find(p => p.id === dragState.planeId);
      if (!plane) return [];
      const dir = plane.direction;
      const coords = getPlaneCoords(dragState.currentCoord, dir);
      const tempPlane = { ...plane, head: dragState.currentCoord, cells: coords };
      const isValid = checkPlaneValidity(tempPlane, list);
      return coords.map(c => ({ x: c.x, y: c.y, isValid }));
    }

    if (!dragState.isDragging && dragState.currentCoord) {
      const isSetup = phase === GamePhase.SETUP;
      const isDeduce = phase === GamePhase.BATTLE && battleTool === 'DEDUCE';
      if (isSetup || isDeduce) {
        const list = isSetup ? activePlayer.planes : activePlayer.ghostPlanes;
        const hoveringPlane = list.find(p => p.cells.some(c => c.x === dragState.currentCoord!.x && c.y === dragState.currentCoord!.y));
        if (hoveringPlane) return [];
        const dir = setupDirection;
        const coords = getPlaneCoords(dragState.currentCoord, dir);
        const tempPlane = { id: 'temp', head: dragState.currentCoord, direction: dir, isDestroyed: false, cells: coords };
        const isValid = checkPlaneValidity(tempPlane, list);
        return coords.map(c => ({ x: c.x, y: c.y, isValid }));
      }
    }
    return [];
  }, [dragState, phase, battleTool, activePlayer.planes, activePlayer.ghostPlanes, setupDirection]);

  const getInteractivePlanes = () => {
    if (phase === GamePhase.SETUP) {
      return activePlayer.planes.map(p => ({
        plane: p,
        isValid: checkPlaneValidity(p, activePlayer.planes),
        isDragging: dragState.planeId === p.id
      }));
    }
    if (phase === GamePhase.BATTLE && battleTool === 'DEDUCE') {
      return activePlayer.ghostPlanes.map(p => {
        const inBounds = p.cells.every(c => c.x >= 0 && c.x < GRID_SIZE && c.y >= 0 && c.y < GRID_SIZE);
        return {
          plane: p,
          isValid: inBounds,
          isDragging: dragState.planeId === p.id
        };
      });
    }
    return undefined;
  };

  const toggleDirection = () => {
    const dirs = [Direction.UP, Direction.RIGHT, Direction.DOWN, Direction.LEFT];
    setSetupDirection(dirs[(dirs.indexOf(setupDirection) + 1) % 4]);
  };

  const activeThemeClass = activePlayerId === 1
    ? "from-emerald-950 to-slate-950"
    : "from-blue-950 to-slate-950";

  // --- Views ---

  if (phase === GamePhase.GAME_OVER) {
    return (
      <div className={`fixed inset-0 bg-gradient-to-br ${activeThemeClass} text-white flex flex-col items-center justify-center p-4 text-center z-50`}>
        <Trophy className="w-24 h-24 text-yellow-400 mb-6 animate-bounce" />
        <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
          胜利!
        </h1>
        <p className="text-2xl text-slate-300 mb-8">
          {winner?.name} 全歼了敌军舰队。
        </p>
        <div className="mb-8 w-full max-w-md">
          <h3 className="text-slate-400 mb-4 uppercase tracking-widest text-sm font-bold">敌方最终部署 ({opponent.name})</h3>
          <div className="bg-slate-900/50 p-4 rounded-xl backdrop-blur-sm border border-white/10">
            <Grid grid={opponent.grid} revealPlanes={true} disabled={true} />
          </div>
        </div>
        <Button onClick={() => window.location.reload()} size="lg">再来一局</Button>
      </div>
    );
  }

  if (phase === GamePhase.TRANSITION) {
    return (
      <div className={`fixed inset-0 bg-gradient-to-br from-slate-900 to-black flex flex-col items-center justify-center p-4 transition-colors duration-500`}>
        <div className="max-w-md w-full bg-white/5 backdrop-blur-lg border border-white/10 p-8 rounded-2xl shadow-2xl text-center">
          <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-white mb-2">切换玩家</h2>
          <p className="text-slate-400 mb-8">
            请将设备交给 <span className={`font-bold text-xl ${activePlayerId === 1 ? 'text-blue-400' : 'text-emerald-400'}`}>{activePlayerId === 1 ? p2.name : p1.name}</span>
          </p>
          <div className="p-4 bg-black/30 rounded-lg mb-8 border border-white/5">
            <EyeOff className="w-8 h-8 text-slate-500 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">请确保不要偷看对手的屏幕</p>
          </div>
          <Button onClick={handleTransitionComplete} className="w-full text-lg py-4">
            我是 {activePlayerId === 1 ? p2.name : p1.name}, 准备就绪!
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 bg-gradient-to-br ${activeThemeClass} text-slate-100 flex flex-col overflow-hidden transition-colors duration-700`}>

      {/* --- SETUP PHASE --- */}
      {phase === GamePhase.SETUP && (
        <div className="flex flex-col h-full items-center p-4 overflow-y-auto">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-white mb-1 flex items-center justify-center gap-2">
              <Shield className={activePlayerId === 1 ? 'text-emerald-500' : 'text-blue-500'} />
              部署你的空军 ({activePlayer.name})
            </h1>
            <p className="text-slate-400 text-sm">
              请部署 {PLANES_PER_PLAYER} 架飞机。拖动调整位置，点击旋转。
            </p>
          </div>

          <div className="flex flex-col lg:flex-row gap-8 items-center justify-center flex-1 w-full max-w-5xl">
            {/* Main Setup Board */}
            <div className="relative w-full max-w-md aspect-square bg-slate-900/50 p-1 rounded-xl border border-white/10 shadow-2xl">
              <Grid
                grid={activePlayer.grid}
                interactivePlanes={getInteractivePlanes()}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerLeave}
                onPointerCancel={handlePointerCancel}
                previewCoords={previewCoords}
                hiddenPlaneId={dragState.planeId}
              />
            </div>

            {/* Controls */}
            <div className="flex flex-col gap-4 w-full max-w-xs">
              <div className="bg-white/5 p-4 rounded-xl border border-white/10 backdrop-blur-md">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-slate-300 font-bold">当前方向</span>
                  <button onClick={toggleDirection} className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-all">
                    <RotateCw className={`transition-transform duration-300 ${setupDirection === Direction.RIGHT ? 'rotate-90' : setupDirection === Direction.DOWN ? 'rotate-180' : setupDirection === Direction.LEFT ? '-rotate-90' : ''}`} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button onClick={() => setActivePlayerState({ planes: [] })} variant="ghost" size="sm">
                    <Trash2 size={16} /> 重置
                  </Button>
                  <Button onClick={handleRandomSetup} variant="secondary" size="sm">
                    <RotateCw size={16} /> 随机
                  </Button>
                </div>
              </div>

              <Button onClick={handleConfirmSetup} disabled={!isSetupValid()} variant="primary" size="lg" className={`w-full py-4 text-xl shadow-2xl ${isSetupValid() ? 'animate-pulse' : ''}`}>
                确认部署 <CheckCircle size={24} />
              </Button>

              {!isSetupValid() && activePlayer.planes.length > 0 && (
                <div className="bg-red-500/20 text-red-200 text-sm p-3 rounded-lg border border-red-500/30 text-center animate-pulse">
                  ⚠️ 红色区域表示位置冲突或越界
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- BATTLE PHASE (FULLSCREEN) --- */}
      {phase === GamePhase.BATTLE && (
        <div className="relative flex flex-col w-full h-full">

          {/* TOP BAR: Score & Identity */}
          <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-20 pointer-events-none">
            <div className="bg-black/40 backdrop-blur-md p-3 rounded-2xl border border-white/10 flex items-center gap-3 pointer-events-auto shadow-lg">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${activePlayerId === 1 ? 'bg-emerald-600' : 'bg-blue-600'}`}>
                {activePlayerId === 1 ? 'P1' : 'P2'}
              </div>
              <div>
                <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">指挥官</div>
                <div className="text-white font-bold">{activePlayer.name}</div>
              </div>
            </div>

            <div className="bg-black/60 backdrop-blur-md p-3 px-6 rounded-2xl border border-red-500/30 flex flex-col items-center pointer-events-auto shadow-xl">
              <div className="text-xs text-red-400 uppercase font-bold tracking-widest mb-1">敌军剩余</div>
              <div className="text-4xl font-black text-white font-mono leading-none">{opponent.alivePlanesCount}</div>
              <div className="text-xs text-slate-500 mt-1">/ {PLANES_PER_PLAYER} 机群</div>
            </div>
          </div>

          {/* MAIN BATTLEFIELD (Centered) */}
          <div className="flex-1 flex items-center justify-center p-4 sm:p-8 lg:p-12 relative">
            <div className="relative w-full max-w-[min(90vw,65vh)] aspect-square shadow-2xl rounded-sm overflow-hidden border-2 border-white/10 bg-slate-900/80 backdrop-blur-sm z-10">
              <Grid
                grid={opponent.grid}
                interactivePlanes={getInteractivePlanes()}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerLeave}
                hiddenPlaneId={dragState.planeId}
                disabled={battleTool === 'ATTACK' && activePlayer.hasShotThisTurn}
                selectedPlaneId={selectedGhostId}
                previewCoords={previewCoords}
                className="w-full h-full"
              />
              {/* Attack Feedback Overlay */}
              {activePlayer.hasShotThisTurn && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/20 backdrop-blur-[2px] animate-in fade-in duration-300">
                  <div className="bg-black/80 p-6 rounded-2xl border border-white/20 text-center transform scale-110 shadow-2xl">
                    <div className={`text-4xl font-black mb-2 ${logs[0]?.result === 'KILL' ? 'text-red-500 animate-bounce' :
                      logs[0]?.result === 'HIT' ? 'text-orange-400 animate-pulse' : 'text-slate-400'
                      }`}>
                      {logs[0]?.result === 'KILL' ? '击毁! 💥' : logs[0]?.result === 'HIT' ? '击中! 🔥' : '落空 💧'}
                    </div>
                    <div className="text-slate-500 font-mono">{logs[0]?.coord}</div>
                    <Button onClick={() => setPhase(GamePhase.TRANSITION)} size="lg" className="mt-6 w-full">
                      结束回合 <ArrowRight size={20} />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* BOTTOM HUD: Tools */}
          <div className="absolute bottom-8 left-0 right-0 flex justify-center z-30 pointer-events-none">
            <div className="bg-black/60 backdrop-blur-xl border border-white/10 p-2 rounded-2xl flex gap-2 pointer-events-auto shadow-2xl">
              <button
                onClick={() => { setBattleTool('ATTACK'); setSelectedGhostId(null); }}
                className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${battleTool === 'ATTACK' ? 'bg-red-600 text-white shadow-lg scale-105' : 'text-slate-400 hover:bg-white/10'}`}
              >
                <Crosshair size={20} /> 打击模式
              </button>
              <div className="w-px bg-white/10 mx-2"></div>
              <button
                onClick={() => setBattleTool('DEDUCE')}
                className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${battleTool === 'DEDUCE' ? 'bg-yellow-600 text-white shadow-lg scale-105' : 'text-slate-400 hover:bg-white/10'}`}
              >
                <Lightbulb size={20} /> 推演模式
              </button>
            </div>
          </div>

          {/* DEDUCTION TOOLBAR (Floating above Tools) */}
          {battleTool === 'DEDUCE' && selectedGhostId && (
            <div className="absolute bottom-28 left-0 right-0 flex justify-center z-30 pointer-events-none animate-in slide-in-from-bottom-4">
              <div className="bg-slate-800/90 backdrop-blur-md border border-slate-700 p-2 rounded-xl flex items-center gap-2 pointer-events-auto shadow-xl">
                <Button onClick={deleteSelectedGhost} variant="danger" size="sm">
                  <Trash2 size={16} />
                </Button>
                <Button onClick={rotateSelectedGhost} variant="secondary" size="sm">
                  <RotateCw size={16} /> 旋转
                </Button>
                <Button onClick={() => setSelectedGhostId(null)} variant="ghost" size="sm">
                  <X size={16} />
                </Button>
              </div>
            </div>
          )}

          {/* MY BOARD (Collapsible PiP) */}
          <div className={`absolute bottom-4 left-4 z-40 transition-all duration-300 ease-out origin-bottom-left ${showMyBoard ? 'w-[40vmin] max-w-[250px]' : 'w-auto'}`}>
            <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden shadow-2xl">
              <div
                className="flex items-center justify-between p-2 cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() => setShowMyBoard(!showMyBoard)}
              >
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider pl-2 flex items-center gap-2">
                  {showMyBoard ? <Eye size={14} /> : <EyeOff size={14} />}
                  {showMyBoard ? '我方阵地' : '已隐藏'}
                </span>
                {!showMyBoard && <span className="text-xs font-mono text-white px-2">{activePlayer.alivePlanesCount}存活</span>}
              </div>
              {showMyBoard && (
                <div className="p-2 border-t border-white/5">
                  <Grid grid={activePlayer.grid} revealPlanes={true} disabled={true} />
                  <div className="mt-2 text-center">
                    <span className="text-xs text-emerald-400/80 font-mono bg-emerald-950/50 px-2 py-1 rounded">
                      存活: {activePlayer.alivePlanesCount}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Log Ticker (Right Side, Subtle) */}
          <div className="absolute top-24 right-4 z-10 w-48 pointer-events-none opacity-60 hover:opacity-100 transition-opacity">
            <div className="flex flex-col gap-1 items-end">
              {logs.slice(0, 3).map((log, i) => (
                <div key={i} className="text-xs bg-black/40 px-2 py-1 rounded text-slate-300 border border-white/5">
                  <span className={log.player === activePlayer.name ? "text-emerald-400" : "text-blue-400"}>{log.player}</span>
                  <span className="mx-1">at</span>
                  <span className="font-mono text-white">{log.coord}</span>:
                  <span className={`ml-1 font-bold ${log.result === 'KILL' ? 'text-red-500' : log.result === 'HIT' ? 'text-orange-400' : 'text-slate-500'}`}>
                    {log.result}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

export default App;