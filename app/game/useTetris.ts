import { useState, useEffect, useCallback, useRef } from 'react';

export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;

export type TetrominoType = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z';

export const PIECES_CONFIG: Record<TetrominoType, {matrix: number[][], h: string, t: string}> = {
  I: { matrix: [[1,1,1,1]], h: "0,0", t: "3,0" },
  J: { matrix: [[0,0,1],[1,1,1]], h: "2,0", t: "0,1" },
  L: { matrix: [[1,0,0],[1,1,1]], h: "0,0", t: "2,1" },
  O: { matrix: [[1,1],[1,1]], h: "0,0", t: "1,1" },
  S: { matrix: [[0,1,1],[1,1,0]], h: "2,0", t: "0,1" },
  T: { matrix: [[0,1,0],[1,1,1]], h: "1,0", t: "1,1" },
  Z: { matrix: [[1,1,0],[0,1,1]], h: "0,0", t: "2,1" },
};

export interface LockedPiece {
  id: string;
  type: TetrominoType;
  rotation: number; // 회전값 유지
  blocks: {x: number, y: number, isHead: boolean, isTail: boolean}[];
}

export interface PieceState {
  id: string;
  type: TetrominoType;
  x: number;
  y: number;
  rotation: number; 
  matrix: number[][]; 
  headPos: string; 
  tailPos: string;
}

export function rotateMatrix(matrix: number[][]): number[][] {
  const rows = matrix.length;
  const cols = matrix[0].length;
  const newMatrix = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      newMatrix[c][rows - 1 - r] = matrix[r][c];
    }
  }
  return newMatrix;
}

export function getRotatedPos(pos: string, rows: number, cols: number): string {
  const [c, r] = pos.split(',').map(Number);
  const newC = rows - 1 - r;
  const newR = c;
  return `${newC},${newR}`;
}

function getRandomType(): TetrominoType {
  const types: TetrominoType[] = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
  return types[Math.floor(Math.random() * types.length)];
}

function createId() {
  return Math.random().toString(36).substr(2, 9);
}

function createPiece(type: TetrominoType): PieceState {
  const conf = PIECES_CONFIG[type];
  return {
    id: createId(),
    type,
    x: Math.floor((BOARD_WIDTH - conf.matrix[0].length) / 2),
    y: 0,
    rotation: 0,
    matrix: conf.matrix,
    headPos: conf.h,
    tailPos: conf.t
  };
}

export function useTetris(options: {
  onLand?: () => void,
  onClear?: () => void,
  onComplete?: () => void
} = {}) {
  const [lockedPieces, setLockedPieces] = useState<LockedPiece[]>([]);

  const board = Array.from({ length: BOARD_HEIGHT }, () => new Array(BOARD_WIDTH).fill(null));
  lockedPieces.forEach(lp => {
    lp.blocks.forEach(b => {
      if (b.y >= 0 && b.y < BOARD_HEIGHT) {
        board[b.y][b.x] = lp.type;
      }
    });
  });

  const [piece, setPiece] = useState<PieceState | null>(null);
  const [nextPieceType, setNextPieceType] = useState<TetrominoType>('I');
  const [holdPieceType, setHoldPieceType] = useState<TetrominoType | null>(null);
  const [hasHeld, setHasHeld] = useState(false);
  
  const [lines, setLines] = useState(0);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState<'idle' | 'playing' | 'paused' | 'gameover' | 'complete'>('idle');
  const [elapsedTime, setElapsedTime] = useState(0); // in seconds
  const [exactTotalMs, setExactTotalMs] = useState(0); // in ms
  const elapsedMsRef = useRef(0);
  const lastTickRef = useRef(Date.now());

  const getDropY = useCallback((p: PieceState, b: string[][]) => {
    let dy = p.y;
    while (!checkCollision(p, b, p.x, dy + 1)) {
      dy++;
    }
    return dy;
  }, []);

  const startGame = useCallback(() => {
    setLockedPieces([]);
    setPiece(createPiece(getRandomType()));
    setNextPieceType(getRandomType());
    setHoldPieceType(null);
    setHasHeld(false);
    setLines(0);
    setScore(0);
    setElapsedTime(0);
    setExactTotalMs(0);
    elapsedMsRef.current = 0;
    setStatus('playing');
  }, []);

  const pauseGame = useCallback(() => {
    setStatus(prev => prev === 'playing' ? 'paused' : prev === 'paused' ? 'playing' : prev);
  }, []);

  const checkCollision = (p: PieceState, b: string[][], nx: number, ny: number) => {
    for (let r = 0; r < p.matrix.length; r++) {
      for (let c = 0; c < p.matrix[r].length; c++) {
        if (p.matrix[r][c] !== 0) {
          const vx = nx + c;
          const vy = ny + r;
          if (vx < 0 || vx >= BOARD_WIDTH || vy >= BOARD_HEIGHT || (vy >= 0 && b[vy][vx] !== null)) {
            return true;
          }
        }
      }
    }
    return false;
  };

  const lockPiece = useCallback((pToLock: PieceState) => {
    let gameOverCheck = false;
    const newBlocks: {x: number, y: number, isHead: boolean, isTail: boolean}[] = [];

    for (let r = 0; r < pToLock.matrix.length; r++) {
      for (let c = 0; c < pToLock.matrix[r].length; c++) {
        if (pToLock.matrix[r][c] !== 0) {
          const vy = pToLock.y + r;
          const vx = pToLock.x + c;
          if (vy < 0) {
            gameOverCheck = true;
          }
          newBlocks.push({
            x: vx,
            y: vy,
            isHead: pToLock.headPos === `${c},${r}`,
            isTail: pToLock.tailPos === `${c},${r}`
          });
        }
      }
    }

    if (gameOverCheck) {
      setStatus('gameover');
      return;
    }

    options.onLand?.(); // 착지 사운드 및 효과

    let updatedLocked = [...lockedPieces, {
      id: pToLock.id,
      type: pToLock.type,
      rotation: pToLock.rotation,
      blocks: newBlocks
    }];

    let cleared = 0;
    for (let r = 0; r < BOARD_HEIGHT; r++) {
      let blocksInRow = 0;
      updatedLocked.forEach(lp => {
        blocksInRow += lp.blocks.filter(b => b.y === r).length;
      });

      if (blocksInRow === BOARD_WIDTH) {
        cleared++;
        updatedLocked = updatedLocked.map(lp => {
          return {
            ...lp,
            blocks: lp.blocks
                      .filter(b => b.y !== r)
                      .map(b => b.y < r ? { ...b, y: b.y + 1 } : b)
          };
        }).filter(lp => lp.blocks.length > 0);
      }
    }

    setLockedPieces(updatedLocked);
    const totalLines = lines + cleared;
    setLines(totalLines);
    setScore(prev => prev + (cleared * 100));
    
    if (totalLines >= 3) {
      setStatus('complete');
      options.onComplete?.(); // 완료 시에는 완료 사운드만 재생
      return;
    } else if (cleared > 0) {
      options.onClear?.(); // 아직 완료되지 않았을 때만 클리어 사운드 재생
    }

    const nextP = createPiece(nextPieceType);
    const tempBoard = Array.from({ length: BOARD_HEIGHT }, () => new Array(BOARD_WIDTH).fill(null));
    updatedLocked.forEach(lp => {
      lp.blocks.forEach(b => {
        if (b.y >= 0 && b.y < BOARD_HEIGHT) tempBoard[b.y][b.x] = lp.type;
      });
    });

    if (checkCollision(nextP, tempBoard, nextP.x, nextP.y)) {
      setStatus('gameover');
    } else {
      setPiece(nextP);
      setNextPieceType(getRandomType());
      setHasHeld(false);
    }
  }, [lockedPieces, nextPieceType, lines]);

  const moveLeft = useCallback(() => {
    if (!piece || status !== 'playing') return;
    if (!checkCollision(piece, board, piece.x - 1, piece.y)) setPiece({ ...piece, x: piece.x - 1 });
  }, [piece, board, status]);

  const moveRight = useCallback(() => {
    if (!piece || status !== 'playing') return;
    if (!checkCollision(piece, board, piece.x + 1, piece.y)) setPiece({ ...piece, x: piece.x + 1 });
  }, [piece, board, status]);

  const moveDown = useCallback(() => {
    if (!piece || status !== 'playing') return;
    if (!checkCollision(piece, board, piece.x, piece.y + 1)) {
      setPiece({ ...piece, y: piece.y + 1 });
    } else {
      lockPiece(piece);
    }
  }, [piece, board, status, lockPiece]);

  const rotate = useCallback(() => {
    if (!piece || status !== 'playing') return;
    const newMatrix = rotateMatrix(piece.matrix);
    const newHead = getRotatedPos(piece.headPos, piece.matrix.length, piece.matrix[0].length);
    const newTail = getRotatedPos(piece.tailPos, piece.matrix.length, piece.matrix[0].length);
    
    const newPiece = { 
      ...piece, 
      matrix: newMatrix, 
      rotation: (piece.rotation + 1) % 4,
      headPos: newHead,
      tailPos: newTail
    };
    
    if (!checkCollision(newPiece, board, piece.x, piece.y)) {
      setPiece(newPiece);
    } else if (!checkCollision(newPiece, board, piece.x - 1, piece.y)) {
      newPiece.x -= 1; setPiece(newPiece);
    } else if (!checkCollision(newPiece, board, piece.x + 1, piece.y)) {
      newPiece.x += 1; setPiece(newPiece);
    }
  }, [piece, board, status]);

  const hardDrop = useCallback(() => {
    if (!piece || status !== 'playing') return;
    const targetY = getDropY(piece, board);
    const droppedPiece = { ...piece, y: targetY };
    setPiece(null);
    setScore(prev => prev + ((targetY - piece.y) * 2));
    lockPiece(droppedPiece);
  }, [piece, board, status, lockPiece, getDropY]);

  const holdPiece = useCallback(() => {
    if (!piece || status !== 'playing' || hasHeld) return;
    if (holdPieceType === null) {
      setHoldPieceType(piece.type);
      setPiece(createPiece(nextPieceType));
      setNextPieceType(getRandomType());
    } else {
      const tempType = holdPieceType;
      setHoldPieceType(piece.type);
      setPiece(createPiece(tempType));
    }
    setHasHeld(true);
  }, [piece, holdPieceType, nextPieceType, status, hasHeld]);

  const moveDownRef = useRef(moveDown);
  useEffect(() => { moveDownRef.current = moveDown; }, [moveDown]);

  useEffect(() => {
    if (status !== 'playing') return;
    const dropTimer = setInterval(() => moveDownRef.current(), 800);
    return () => clearInterval(dropTimer);
  }, [status]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (status === 'playing') {
      lastTickRef.current = Date.now();
      timer = setInterval(() => {
        const now = Date.now();
        elapsedMsRef.current += now - lastTickRef.current;
        lastTickRef.current = now;
        
        setElapsedTime(Math.floor(elapsedMsRef.current / 1000));
        setExactTotalMs(elapsedMsRef.current);
      }, 50);
    }
    return () => clearInterval(timer);
  }, [status]);

  return {
    board, lockedPieces, piece, nextPieceType, holdPieceType, lines, score, status, elapsedTime, exactTotalMs,
    getDropY, startGame, pauseGame, moveLeft, moveRight, moveDown, rotate, hardDrop, holdPiece
  };
}
