const CONFIG = {
  ativo:       { cor: 'bg-green-100 text-green-800',  label: 'Ativo' },
  licenca:     { cor: 'bg-yellow-100 text-yellow-800', label: 'Licença' },
  baixado:     { cor: 'bg-red-100 text-red-800',       label: 'Baixado' },
  dispensado:  { cor: 'bg-gray-100 text-gray-600',     label: 'Dispensado' },
  cabo:        { cor: 'bg-blue-100 text-blue-800',     label: 'Cabo' },
  atirador:    { cor: 'bg-gray-100 text-gray-700',     label: 'Atirador' },
};

export function Badge({ value }) {
  const { cor, label } = CONFIG[value] ?? { cor: 'bg-gray-100 text-gray-700', label: value };
  return (
    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${cor}`}>
      {label}
    </span>
  );
}
