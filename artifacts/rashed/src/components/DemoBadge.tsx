import { useI18n } from '@/lib/i18n';

export function DemoBadge({ className = '' }: { className?: string }) {
  const { t } = useI18n();
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300 ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
      {t('demo_badge')}
    </span>
  );
}

export function DemoBanner() {
  const { t } = useI18n();
  return (
    <div className="w-full bg-amber-50 border-b border-amber-200 px-4 py-2 text-center">
      <span className="text-xs text-amber-700 font-medium">⚠️ {t('demo_disclaimer')}</span>
    </div>
  );
}
