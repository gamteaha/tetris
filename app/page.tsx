'use client';

import { useState } from 'react';
import styles from './page.module.css';
import { usePawTransition } from './PawProvider';

export default function StartScreen() {
  const [name, setName] = useState('');
  const { navigate } = usePawTransition();

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      navigate(`/game?name=${encodeURIComponent(name.trim())}`);
    } else {
      alert("집사님의 이름을 입력해주세요! 🐾");
    }
  };

  return (
    <main className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>
          <span className={styles.titleIcon}>😸</span>
          냥이 테트리스
        </h1>
        
        <form onSubmit={handleStart} className={styles.form}>
          <div className={styles.inputWrapper}>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="집사님의 이름을 입력해주세요"
              className={styles.input}
              maxLength={15}
              autoFocus
            />
          </div>
          <button type="submit" className={styles.button}>
            게임 시작 🐾
          </button>
        </form>

        <div className={styles.studentInfo}>
          <p>📚 AI코딩을활용한창의적앱개발</p>
          <p>🎓 데이터과학과 | 👤 김태희</p>
        </div>
      </div>
    </main>
  );
}
