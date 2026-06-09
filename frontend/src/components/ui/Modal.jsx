import { useEffect } from 'react';
import styles from './Modal.module.scss';

const LARGURA_MAP = {
  'max-w-sm':  styles['dialog--sm'],
  'max-w-md':  styles['dialog--md'],
  'max-w-lg':  styles['dialog--md'],
  'max-w-xl':  styles['dialog--lg'],
  'max-w-2xl': styles['dialog--xl'],
};

export function Modal({ aberto, onFechar, titulo, children, largura = 'max-w-lg' }) {
  useEffect(() => {
    if (!aberto) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [aberto]);

  if (!aberto) return null;

  const sizeClass = LARGURA_MAP[largura] ?? styles['dialog--md'];

  return (
    <div className={styles.overlay}>
      <div className={styles.backdrop} onClick={onFechar} />
      <div className={`${styles.dialog} ${sizeClass}`}>
        <div className={styles.header}>
          <h2 className={styles.title}>{titulo}</h2>
          <button
            onClick={onFechar}
            className={styles.closeBtn}
            aria-label="Fechar"
          >
            ×
          </button>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
}
