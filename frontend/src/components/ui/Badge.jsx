import styles from './Badge.module.scss';

const CONFIG = {
  ativo:       { cls: styles.ativo,      label: 'Ativo' },
  licenca:     { cls: styles.licenca,    label: 'Licença' },
  baixado:     { cls: styles.baixado,    label: 'Baixado' },
  dispensado:  { cls: styles.dispensado, label: 'Dispensado' },
  cabo:        { cls: styles.cabo,       label: 'Cabo' },
  atirador:    { cls: styles.atirador,   label: 'Atirador' },
};

export function Badge({ value }) {
  const { cls, label } = CONFIG[value] ?? { cls: styles.atirador, label: value };
  return (
    <span className={`${styles.badge} ${cls}`}>
      {label}
    </span>
  );
}
