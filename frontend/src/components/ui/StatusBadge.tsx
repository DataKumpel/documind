/**
 * Status badge component for document processing states.
 */

const statusConfig: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  pending: {
    label: 'Ausstehend',
    color: 'text-status-pending',
    bg: 'bg-status-pending/10 border-status-pending/20',
    dot: 'bg-status-pending',
  },
  processing: {
    label: 'Verarbeitung',
    color: 'text-status-processing',
    bg: 'bg-status-processing/10 border-status-processing/20',
    dot: 'bg-status-processing',
  },
  completed: {
    label: 'Abgeschlossen',
    color: 'text-status-completed',
    bg: 'bg-status-completed/10 border-status-completed/20',
    dot: 'bg-status-completed',
  },
  failed: {
    label: 'Fehlgeschlagen',
    color: 'text-status-failed',
    bg: 'bg-status-failed/10 border-status-failed/20',
    dot: 'bg-status-failed',
  },
}

export default function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? statusConfig.pending

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.bg} ${config.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot} ${status === 'processing' ? 'animate-pulse-slow' : ''}`} />
      {config.label}
    </span>
  )
}
