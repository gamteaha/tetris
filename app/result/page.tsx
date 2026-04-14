'use client';

export const dynamic = 'force-dynamic';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import styles from './page.module.css';
import { usePawTransition } from '../PawProvider';

interface Score {
  id: string;
  name: string;
  totalMs: number;
}

function formatResultTime(totalMs: number) {
  const totalSeconds = Math.floor(totalMs / 1000);
  const ms = Math.floor((totalMs % 1000) / 10); 
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = (totalSeconds % 60).toString().padStart(2, '0');
  const msStr = ms.toString().padStart(2, '0');
  return `${m}:${s}.${msStr}`;
}

function ResultContent() {
  const searchParams = useSearchParams();
  const { navigate } = usePawTransition();
  
  const name = searchParams.get('name') || 'Guest';
  const timeStr = searchParams.get('time') || '0';
  const msStr = searchParams.get('ms') || '0';
  
  const myTotalMs = (Number(timeStr) * 1000) + Number(msStr);
  const [top3, setTop3] = useState<Score[]>([]);
  const [myRecordId, setMyRecordId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    // API에 나의 기록 전송 후 새로운 Top 3 리스트 받기
    fetch('/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, time: timeStr, ms: msStr })
    })
    .then(r => r.json())
    .then(data => {
      if (data && data.success) {
        setTop3(data.top3 || []);
        if (data.newRecord && data.newRecord.id) {
          setMyRecordId(data.newRecord.id);
        }
      }
    })
    .catch(err => console.error("Leaderboard error:", err))
    .finally(() => setIsLoading(false));
  }, [name, timeStr, msStr]);

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className={styles.card}>
      <h1 className={styles.title}>😻 게임 완료! 😻</h1>
      <div className={styles.timeDisplay}>
        {formatResultTime(myTotalMs)}
      </div>

      {isLoading ? (
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}>🐱</div>
          <div className={styles.loadingText}>고양이 서버에 점수 전달 중... 🐾</div>
        </div>
      ) : (
        <div className={styles.medals}>
          {top3.map((score, index) => {
            const isMyRecord = score.id === myRecordId || (!myRecordId && score.name === name && score.totalMs === myTotalMs);
            return (
              <div 
                key={score.id} 
                className={`${styles.medalItem} ${isMyRecord ? styles.highlight : ''}`}
              >
                <span>{medals[index] || '  '} {score.name}</span>
                <span>{formatResultTime(score.totalMs)}</span>
              </div>
            );
          })}
        </div>
      )}

      <button className={styles.btn} onClick={() => navigate('/')}>
        🏠 처음으로
      </button>
    </div>
  );
}

export default function ResultScreen() {
  return (
    <main className={styles.container}>
      <Suspense fallback={<div>Loading...</div>}>
        <ResultContent />
      </Suspense>
    </main>
  );
}
