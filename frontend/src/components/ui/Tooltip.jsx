import styles from './Tooltip.module.scss';

export function Tooltip({ children, text, position = 'top' }) {
  const posClass =
    position === 'bottom' ? styles['tip--bottom'] :
    position === 'right'  ? styles['tip--right']  :
                            styles['tip--top'];
  return (
    <span className={styles.wrapper}>
      {children}
      <span className={`${styles.tip} ${posClass}`}>{text}</span>
    </span>
  );
}

export function InfoTooltip({ text, position }) {
  return (
    <Tooltip text={text} position={position}>
      <span className={styles.icon}>ⓘ</span>
    </Tooltip>
  );
}
