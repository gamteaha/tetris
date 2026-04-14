/**
 * 고양이 테트리스 블록 (테트로미노) Canvas 드로잉: 둥글둥글한 외곽선 + 튀어나온 귀/꼬리 상태별 제어
 */

const STROKE_COLOR = "#222222";
const STROKE_WIDTH = 3;

export const COLORS: Record<string, {body: string, detail?: string}> = {
  I: { body: "#FF9966", detail: "#CC6633" },
  O: { body: "#FFCC44" },
  T: { body: "#CC88FF" },
  S: { body: "#FFFFFF", detail: "#66DD88" },
  Z: { body: "#333333", detail: "#FFCC00" },
  J: { body: "#FFFFFF", detail: "#FF9966" },
  L: { body: "#AAAACC" }
};

export interface Block {
  x: number;
  y: number;
  isHead?: boolean;
  isTail?: boolean;
}

export type PieceRenderState = 'active' | 'ghost' | 'locked' | 'mini';

function drawRoundedUnion(
  ctx: CanvasRenderingContext2D,
  blocks: Block[],
  cellSize: number,
  color: string,
  inflate: number,
  radius: number
) {
  ctx.fillStyle = color;
  const r = radius + inflate;
  const extra = inflate;

  blocks.forEach(b => {
    const x = b.x * cellSize - extra;
    const y = b.y * cellSize - extra;
    const w = cellSize + extra * 2;
    ctx.beginPath();
    ctx.roundRect(x, y, w, w, Math.max(0, r));
    ctx.fill();
  });

  blocks.forEach(b => {
    const x = b.x * cellSize - extra;
    const y = b.y * cellSize - extra;
    const w = cellSize + extra * 2;
    
    const hasBottom = blocks.some(ob => ob.x === b.x && ob.y === b.y + 1);
    const hasRight = blocks.some(ob => ob.x === b.x + 1 && ob.y === b.y);
    const hasBottomRight = blocks.some(ob => ob.x === b.x + 1 && ob.y === b.y + 1);
    
    if (hasBottom) {
      ctx.fillRect(x, b.y * cellSize + cellSize - r, w, r * 2);
    }
    if (hasRight) {
      ctx.fillRect(b.x * cellSize + cellSize - r, y, r * 2, w);
    }
    if (hasBottom && hasRight && hasBottomRight) {
      ctx.fillRect(b.x * cellSize + cellSize - r, b.y * cellSize + cellSize - r, r * 2, r * 2);
    }
  });
}

function drawEarsAndTail(
  ctx: CanvasRenderingContext2D,
  blocks: Block[],
  cellSize: number,
  rotation: number,
  state: PieceRenderState
) {
  const head = blocks.find(b => b.isHead);
  const tail = blocks.find(b => b.isTail);

  // 귀 그리기 로직
  // 어느 상태에서든 머리(얼굴)가 있고 회전에 따라 귀를 그립니다.
  const showEars = true; 
  
  if (head && showEars) {
    const cx = head.x * cellSize + cellSize / 2;
    const cy = head.y * cellSize + cellSize / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation * Math.PI / 2);
    
    const curR = cellSize * 0.45;
    const earHeight = cellSize * 0.35;
    
    ctx.beginPath();
    ctx.moveTo(-curR, -cellSize * 0.4);
    ctx.lineTo(-curR * 0.6, -cellSize * 0.4 - earHeight);
    ctx.lineTo(-curR * 0.2, -cellSize * 0.4);
    
    ctx.moveTo(curR * 0.2, -cellSize * 0.4);
    ctx.lineTo(curR * 0.6, -cellSize * 0.4 - earHeight);
    ctx.lineTo(curR, -cellSize * 0.4);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // 꼬리 그리기 로직
  // 가이드(ghost)와 내려온 블록(locked)은 꼬리 숨김. 내려오는 블록(active)과 미리보기(mini)에서만 꼬리 강조
  const showTail = (state === 'active' || state === 'mini');

  if (tail && showTail) {
    const tx = tail.x * cellSize + cellSize / 2;
    const ty = tail.y * cellSize + cellSize / 2;
    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(rotation * Math.PI / 2);
    
    // 내려오는 블럭은 꼬리를 더 강조
    const tWidth = state === 'active' ? cellSize * 1.0 : cellSize * 0.8;
    const tThick = state === 'active' ? cellSize * 0.3 : cellSize * 0.25;
    
    ctx.beginPath();
    ctx.roundRect(cellSize * 0.2, -tThick, tWidth, tThick * 2, tThick);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

export function drawCatFromBlocks(
  ctx: CanvasRenderingContext2D,
  blocks: Block[],
  type: string,
  alpha: number,
  cellSize: number,
  rotation: number = 0,
  state: PieceRenderState = 'active'
) {
  if (!blocks || blocks.length === 0) return;

  const baseRadius = cellSize * 0.3;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Layer 1: 테두리 외곽선
  ctx.lineWidth = STROKE_WIDTH * 2.5; 
  ctx.strokeStyle = STROKE_COLOR;
  ctx.fillStyle = STROKE_COLOR;
  drawEarsAndTail(ctx, blocks, cellSize, rotation, state);
  drawRoundedUnion(ctx, blocks, cellSize, STROKE_COLOR, STROKE_WIDTH, baseRadius);

  // Layer 2: 내부 몸통 채우기
  ctx.lineWidth = 0;
  ctx.strokeStyle = "transparent";
  ctx.fillStyle = COLORS[type].body;
  drawEarsAndTail(ctx, blocks, cellSize, rotation, state);
  drawRoundedUnion(ctx, blocks, cellSize, COLORS[type].body, 0, baseRadius);

  // 무늬 장식
  if (type === 'J') {
    ctx.fillStyle = COLORS.J.detail!;
    blocks.forEach((b, i) => {
      // 대충 몸통 어딘가에 무늬 찍어주기
      if (i === 1) {
        ctx.beginPath(); ctx.arc(b.x*cellSize + cellSize*0.5, b.y*cellSize + cellSize*0.5, cellSize*0.4, 0, Math.PI*2); ctx.fill();
      }
      if (i === 2) {
        ctx.fillStyle = "#333333";
        ctx.beginPath(); ctx.arc(b.x*cellSize + cellSize*0.3, b.y*cellSize + cellSize*0.7, cellSize*0.3, 0, Math.PI*2); ctx.fill();
      }
    });
  }

  if (type === 'I') {
    ctx.strokeStyle = COLORS.I.detail!;
    ctx.lineWidth = 3;
    blocks.forEach(b => {
      if (!b.isHead && (!b.isTail || state !== 'locked')) {
        ctx.beginPath();
        ctx.moveTo(b.x*cellSize + cellSize*0.3, b.y*cellSize + cellSize*0.2);
        ctx.lineTo(b.x*cellSize + cellSize*0.3, b.y*cellSize + cellSize*0.8);
        ctx.moveTo(b.x*cellSize + cellSize*0.7, b.y*cellSize + cellSize*0.2);
        ctx.lineTo(b.x*cellSize + cellSize*0.7, b.y*cellSize + cellSize*0.8);
        ctx.stroke();
      }
    });
  }

  // 얼굴 그리기
  const head = blocks.find(b => b.isHead);
  if (head) {
    const cx = head.x * cellSize + cellSize / 2;
    const cy = head.y * cellSize + cellSize / 2;
    const r = cellSize * 0.4;
    
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation * Math.PI / 2);

    let eyeC = STROKE_COLOR;
    if (type === 'S') eyeC = COLORS.S.detail!;
    if (type === 'Z') eyeC = COLORS.Z.detail!;
    
    ctx.fillStyle = eyeC;
    ctx.lineWidth = 2;
    ctx.strokeStyle = STROKE_COLOR;
    ctx.beginPath();
    
    // 가이드는 자는 눈, 떨어질 땐 뜬 눈, 잠겼을 땐 평범한 눈
    if (type === 'O') {
      ctx.moveTo(-r*0.6, -r*0.1); ctx.lineTo(-r*0.2, -r*0.1);
      ctx.moveTo(r*0.6, -r*0.1); ctx.lineTo(r*0.2, -r*0.1);
      ctx.stroke();
    } else {
      if (state === 'ghost') {
        // 가이드는 살짝 감은 눈 처리
        ctx.moveTo(-r*0.5, -r*0.1); ctx.lineTo(-r*0.2, -r*0.1);
        ctx.moveTo(r*0.5, -r*0.1); ctx.lineTo(r*0.2, -r*0.1);
        ctx.stroke();
      } else {
        ctx.arc(-r*0.4, -r*0.1, r*0.15, 0, Math.PI*2);
        ctx.arc(r*0.4, -r*0.1, r*0.15, 0, Math.PI*2);
        ctx.fill();
      }
    }

    ctx.fillStyle = "#FF7777";
    ctx.beginPath();
    ctx.arc(0, r*0.2, r*0.12, 0, Math.PI*2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-r*0.8, r*0.1); ctx.lineTo(-r*0.4, r*0.2);
    ctx.moveTo(r*0.8, r*0.1); ctx.lineTo(r*0.4, r*0.2);
    ctx.stroke();
    
    ctx.restore();

    // 젤리 발바닥
    ctx.fillStyle = "#FFAABB";
    const bottomBlocks = blocks.filter(b => !blocks.some(ob => ob.x === b.x && ob.y === b.y + 1));
    bottomBlocks.forEach(b => {
      // 꼬리 블록이고 state가 locked가 아닐 때는(꼬리가 있으므로) 발바닥 스킵 
      const skipJelly = b.isTail && state !== 'locked';
      if (!b.isHead && !skipJelly) {
        ctx.beginPath();
        ctx.arc(b.x*cellSize + cellSize*0.3, b.y*cellSize + cellSize - 6, 3, 0, Math.PI*2);
        ctx.arc(b.x*cellSize + cellSize*0.5, b.y*cellSize + cellSize - 5, 4, 0, Math.PI*2);
        ctx.arc(b.x*cellSize + cellSize*0.7, b.y*cellSize + cellSize - 6, 3, 0, Math.PI*2);
        ctx.fill();
      }
    });

  }

  ctx.restore();
}

export function drawCatMini(ctx: CanvasRenderingContext2D, type: string, canvasEl: HTMLCanvasElement) {
  ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
  
  const MATRIX: Record<string, {m: number[][], h: string, t: string}> = {
    I: { m: [[1,1,1,1]], h: "0,0", t: "3,0" },
    J: { m: [[0,0,1],[1,1,1]], h: "2,0", t: "0,1" },
    L: { m: [[1,0,0],[1,1,1]], h: "0,0", t: "2,1" },
    O: { m: [[1,1],[1,1]], h: "0,0", t: "1,1" },
    S: { m: [[0,1,1],[1,1,0]], h: "2,0", t: "0,1" },
    T: { m: [[0,1,0],[1,1,1]], h: "1,0", t: "1,1" },
    Z: { m: [[1,1,0],[0,1,1]], h: "0,0", t: "2,1" }
  };

  const info = MATRIX[type];
  if (!info) return;

  const bSize = 16;
  const blocks: Block[] = [];
  
  const rows = info.m.length;
  const cols = info.m[0].length;
  const offsetX = (canvasEl.width - cols * bSize) / 2;
  const offsetY = (canvasEl.height - rows * bSize) / 2;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (info.m[r][c]) {
        blocks.push({
          x: c, 
          y: r,
          isHead: info.h === `${c},${r}`,
          isTail: info.t === `${c},${r}`
        });
      }
    }
  }

  ctx.save();
  ctx.translate(offsetX, offsetY);
  // 미니 박스에서는 상태를 'mini'로 줘서 꼬리를 그립니다.
  drawCatFromBlocks(ctx, blocks, type, 1, bSize, 0, 'mini');
  ctx.restore();
}
