'use client';
import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { CatSoundManager } from '@/lib/cat-sounds';
import styles from './paw.module.css';

const PawContext = createContext({
  navigate: (url: string) => {}
});

export const usePawTransition = () => useContext(PawContext);

export default function PawProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<'idle' | 'in' | 'out'>('idle');
  const router = useRouter();
  const pathname = usePathname();
  const soundManager = useRef<CatSoundManager | null>(null);

  useEffect(() => {
    soundManager.current = new CatSoundManager();
  }, []);

  const navigate = (url: string) => {
    if (phase !== 'idle') return;

    soundManager.current?.playTurn(); // 페이지 전환 시 turn.mp3 재생
    setPhase('in');
    
    // 큰 발바닥이 찍히고 화면을 덮는 데 걸리는 시간 (600ms) 후에 라우팅
    setTimeout(() => {
      router.push(url);
    }, 600);
  };

  useEffect(() => {
    if (phase === 'in') {
      setPhase('out');
      setTimeout(() => {
        setPhase('idle');
      }, 500);
    }
  }, [pathname]);

  return (
    <PawContext.Provider value={{ navigate }}>
      {children}
      {phase !== 'idle' && (
        <div className={`${styles.overlay} ${phase === 'in' ? styles.fadeIn : styles.fadeOut}`}>
          <div className={styles.pawWrapper}>
            <div className={styles.pawMain}>
              <div className={styles.toe}></div>
              <div className={styles.toe}></div>
              <div className={styles.toe}></div>
              <div className={styles.toe}></div>
              <div className={styles.centerPad}></div>
            </div>
          </div>
        </div>
      )}



    </PawContext.Provider>
  );
}

