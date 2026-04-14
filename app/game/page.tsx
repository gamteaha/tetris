'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTetris, BOARD_WIDTH, BOARD_HEIGHT, TetrominoType, PieceState } from './useTetris';
import { drawCatFromBlocks, drawCatMini } from '@/lib/tetris-cats';
import { usePawTransition } from '../PawProvider';
import { CatSoundManager } from '@/lib/cat-sounds';
import styles from './page.module.css';

const CELL_SIZE = 30;

// 파티클 인터페이스
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number; // 0 to 1
  type: 'star' | 'heart';
  color: string;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function GameContent() {
  const searchParams = useSearchParams();
  const playerName = searchParams.get('name') || 'Guest';
  const { navigate } = usePawTransition();

  // 사운드 매니저 초기화
  const soundManager = useRef<CatSoundManager | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  
  // 파티클 관리
  const particles = useRef<Particle[]>([]);
  const requestRef = useRef<number>(0);
  const ghostCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    soundManager.current = new CatSoundManager();
    ghostCanvasRef.current = document.createElement('canvas');
  }, []);

  const triggerParticles = (px: number, py: number) => {
    const colors = ['#FFD700', '#FF69B4', '#FFFFFF', '#FFB1B5'];
    for (let i = 0; i < 6; i++) {
      particles.current.push({
        x: px,
        y: py,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        life: 1.0,
        type: Math.random() > 0.5 ? 'star' : 'heart',
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }
  };

  const {
    board, lockedPieces, piece, nextPieceType, holdPieceType, lines, score, status, elapsedTime, exactTotalMs,
    getDropY, startGame, pauseGame, moveLeft, moveRight, moveDown, rotate, hardDrop, holdPiece
  } = useTetris({
    onLand: () => {
      soundManager.current?.playLand();
      if (piece) {
        const lastBlocks = [];
        for (let r = 0; r < piece.matrix.length; r++) {
          for (let c = 0; c < piece.matrix[r].length; c++) {
            if (piece.matrix[r][c]) lastBlocks.push({x: piece.x + c, y: piece.y + r});
          }
        }
        if (lastBlocks.length > 0) {
          const avgX = (lastBlocks.reduce((sum, b) => sum + b.x, 0) / lastBlocks.length + 0.5) * CELL_SIZE;
          const maxY = (Math.max(...lastBlocks.map(b => b.y)) + 1) * CELL_SIZE;
          triggerParticles(avgX, maxY);
        }
      }
    },
    onClear: () => soundManager.current?.playClear(),
    onComplete: () => soundManager.current?.playComplete()
  });

  const boardRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    startGame();
  }, [startGame]);

  // 키보드 조작
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (status !== 'playing' && status !== 'paused') return;

      switch(e.code) {
        case 'ArrowLeft': e.preventDefault(); moveLeft(); break;
        case 'ArrowRight': e.preventDefault(); moveRight(); break;
        case 'ArrowDown': e.preventDefault(); moveDown(); break;
        case 'ArrowUp': e.preventDefault(); rotate(); break;
        case 'Space': e.preventDefault(); hardDrop(); break;
        case 'KeyC': e.preventDefault(); holdPiece(); break;
        case 'KeyP': e.preventDefault(); pauseGame(); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status, moveLeft, moveRight, moveDown, rotate, hardDrop, holdPiece, pauseGame]);

  useEffect(() => {
    if (status === 'complete') {
      const s = Math.floor(exactTotalMs / 1000);
      const ms = exactTotalMs % 1000;
      navigate(`/result?name=${encodeURIComponent(playerName)}&time=${s}&ms=${ms}`);
    }
  }, [status, exactTotalMs, playerName, navigate]);

  // 통합 렌더링 루프 (애니메이션 포함)
  useEffect(() => {
    const canvas = boardRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. 배경 설정: 하늘색 그라디언트
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, '#87CEEB');
      grad.addColorStop(1, '#B0E2FF');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 2. 체크무늬 격자 깔기
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      const patternSize = 40;
      for (let y = 0; y < canvas.height; y += patternSize) {
        for (let x = 0; x < canvas.width; x += patternSize) {
          if ((Math.floor(x / patternSize) + Math.floor(y / patternSize)) % 2 === 0) {
            ctx.fillRect(x, y, patternSize, patternSize);
          }
        }
      }

      // 3. 아래쪽 초록 언덕 곡선
      ctx.fillStyle = '#78C850';
      ctx.beginPath();
      ctx.moveTo(0, canvas.height);
      ctx.quadraticCurveTo(canvas.width * 0.5, canvas.height - 40, canvas.width, canvas.height);
      ctx.lineTo(canvas.width, canvas.height);
      ctx.fill();

      // 세로 가이드라인
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let c = 1; c < BOARD_WIDTH; c++) {
        ctx.moveTo(c * CELL_SIZE, 0);
        ctx.lineTo(c * CELL_SIZE, BOARD_HEIGHT * CELL_SIZE);
      }
      ctx.stroke();

      // 4. 블록 렌더링 (잠긴 블록)
      lockedPieces.forEach(lp => {
        drawCatFromBlocks(ctx, lp.blocks, lp.type, 1, CELL_SIZE, lp.rotation, 'locked');
      });

      // 5. 고스트 및 액티브 피스
      if (piece) {
        const getBlocks = (p: PieceState, oy?: number) => {
          const actualY = oy !== undefined ? oy : p.y;
          return p.matrix.flatMap((row, r) => 
            row.map((val, c) => val ? { x: p.x + c, y: actualY + r, isHead: p.headPos === `${c},${r}`, isTail: p.tailPos === `${c},${r}` } : null)
          ).filter(Boolean) as any[];
        };

        const ghostY = getDropY(piece, board);
        const ghostBlocks = getBlocks(piece, ghostY);
        
        // 고스트 블록 겹침 현상 해결: 오프스크린 캔버스 재사용
        const gCanvas = ghostCanvasRef.current;
        if (gCanvas) {
          if (gCanvas.width !== canvas.width || gCanvas.height !== canvas.height) {
            gCanvas.width = canvas.width;
            gCanvas.height = canvas.height;
          }
          const gCtx = gCanvas.getContext('2d');
          if (gCtx) {
            gCtx.clearRect(0, 0, gCanvas.width, gCanvas.height);
            drawCatFromBlocks(gCtx, ghostBlocks, piece.type, 1, CELL_SIZE, piece.rotation, 'ghost');
            ctx.save();
            ctx.globalAlpha = 0.25;
            ctx.drawImage(gCanvas, 0, 0);
            ctx.restore();
          }
        }
        
        drawCatFromBlocks(ctx, getBlocks(piece), piece.type, 1, CELL_SIZE, piece.rotation, 'active');
      }

      // 6. 파티클 업데이트 및 드로잉
      particles.current = particles.current.filter(p => p.life > 0);
      particles.current.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.03;
        
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        if (p.type === 'star') {
          ctx.beginPath();
          for (let i = 0; i < 5; i++) {
            ctx.rotate(Math.PI / 2.5);
            ctx.lineTo(0, 0 - (8 * p.life));
            ctx.rotate(Math.PI / 2.5);
            ctx.lineTo(0, 0 - (3 * p.life));
          }
          ctx.fill();
        } else {
          ctx.beginPath();
          const hr = 6 * p.life;
          ctx.moveTo(0, hr / 2);
          ctx.bezierCurveTo(-hr, -hr / 2, -hr / 2, -hr, 0, -hr / 2);
          ctx.bezierCurveTo(hr / 2, -hr, hr, -hr / 2, 0, hr / 2);
          ctx.fill();
        }
        ctx.restore();
      });

      requestRef.current = requestAnimationFrame(render);
    };

    requestRef.current = requestAnimationFrame(render);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [lockedPieces, piece, board, getDropY]);

  const handleMute = () => {
    if (soundManager.current) {
      const muted = soundManager.current.toggleMute();
      setIsMuted(muted);
    }
  };

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <div>🐾 {playerName} 집사님</div>
        <div>⏱ {formatTime(elapsedTime)}</div>
        <div>라인: {lines}/3 🚀</div>
      </header>

      <div className={styles.gameArea}>
        <div className={styles.neonWrapper}>
          <div className={styles.boardContainer}>
            <canvas 
              ref={boardRef} 
              width={BOARD_WIDTH * CELL_SIZE} 
              height={BOARD_HEIGHT * CELL_SIZE} 
              className={styles.canvas} 
            />
            
            {status === 'paused' && <div className={styles.overlay}>⏸ 일시정지</div>}
            {status === 'gameover' && (
              <div className={styles.overlay}>
                😭 게임 오버!
                <button className={`${styles.btn} ${styles.overlaySub}`} onClick={startGame} style={{ marginTop: '1rem', fontSize: '1.2rem' }}>
                  다시 시작
                </button>
              </div>
            )}
            {status === 'complete' && (
              <div className={styles.overlay} style={{ color: '#8b5cf6' }}>
                🎉 미션 완료!
                <div className={styles.overlaySub}>기록: {formatTime(elapsedTime)}</div>
              </div>
            )}
          </div>

          <div className={styles.infoPanel}>
            <MiniBox title="NEXT" type={nextPieceType} />
            <MiniBox title="HOLD (C)" type={holdPieceType} />
            
            <div className={styles.panelBox}>
              <div className={styles.panelTitle}>SCORE</div>
              <div className={styles.scoreValue}>{score}</div>
            </div>
          </div>
        </div>

        <div className={styles.controlsSection}>
          <button className={styles.btn} onClick={handleMute}>
            {isMuted ? '🔇 음소거 해제' : '🔊 소리 끄기'}
          </button>
          <button className={styles.btn} onClick={pauseGame}>
            ⏸ 일시정지 (P)
          </button>
          <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={startGame}>
            🔄 재시작
          </button>
          <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => navigate('/')}>
            🚪 홈으로
          </button>
        </div>
      </div>

    </div>
  );
}

function MiniBox({ title, type }: { title: string, type: TetrominoType | null }) {
  const ref = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    if (type) {
      drawCatMini(ctx, type, canvas);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [type]);

  return (
    <div className={styles.panelBox}>
      <div className={styles.panelTitle}>{title}</div>
      <canvas ref={ref} width={80} height={80} style={{ display: 'block' }} />
    </div>
  );
}

export default function GamePage() {
  return (
    <main className={styles.container}>
      <Suspense fallback={<div>Loading...</div>}>
        <GameContent />
      </Suspense>
    </main>
  );
}
