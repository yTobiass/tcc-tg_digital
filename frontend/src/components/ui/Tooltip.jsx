/**
 * Tooltip simples baseado em CSS hover.
 * position: 'top' | 'bottom' | 'right'
 */
export function Tooltip({ children, text, position = 'top' }) {
  const pos =
    position === 'bottom' ? 'top-full left-1/2 -translate-x-1/2 mt-1.5' :
    position === 'right'  ? 'left-full top-1/2 -translate-y-1/2 ml-1.5' :
                            'bottom-full left-1/2 -translate-x-1/2 mb-1.5';
  return (
    <span className="relative inline-flex group/tip">
      {children}
      <span className={`pointer-events-none absolute z-50 w-max max-w-[220px] px-2 py-1
        text-xs text-white bg-gray-800 rounded shadow-lg leading-snug text-center
        opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150 ${pos}`}>
        {text}
      </span>
    </span>
  );
}

/** Ícone ⓘ com tooltip embutido — use inline em labels. */
export function InfoTooltip({ text, position }) {
  return (
    <Tooltip text={text} position={position}>
      <span className="ml-1 inline-flex items-center justify-center cursor-help text-gray-400 hover:text-gray-500 select-none">
        ⓘ
      </span>
    </Tooltip>
  );
}
