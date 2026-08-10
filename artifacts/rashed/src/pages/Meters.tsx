import { useQuery } from '@tanstack/react-query';
import { Gauge, Plus, CheckCircle, XCircle } from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import { DemoBadge } from '@/components/DemoBadge';
import { useI18n } from '@/lib/i18n';
import { api, type Meter } from '@/lib/api';

function meterTypeLabel(type: Meter['meterType'], t: (k: string) => string) {
  const map: Record<string, string> = {
    main: t('meters_main'),
    garden: t('meters_garden'),
    pool: t('meters_pool'),
    other: t('meters_other'),
  };
  return map[type] ?? type;
}

export default function MetersPage() {
  const { t, isRtl } = useI18n();
  const { data: meters, isLoading } = useQuery({ queryKey: ['meters'], queryFn: api.meters.list });

  if (isLoading) return <PageShell><div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div></PageShell>;

  return (
    <PageShell>
      <div className="px-4 pt-6 pb-4 space-y-4" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">{t('meters_title')}</h1>
          <button className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow">
            <Plus size={18} className="text-white" />
          </button>
        </div>

        {(!meters || meters.length === 0) && (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <Gauge size={40} className="text-gray-200" />
            <p className="text-gray-500 text-sm">{t('meters_no_meters')}</p>
          </div>
        )}

        {meters?.map((meter) => (
          <div key={meter.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900">{meter.label ?? meterTypeLabel(meter.meterType, t)}</p>
                  {meter.dataClassification === 'synthetic_demo_data' && <DemoBadge />}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{meter.meterId}</p>
              </div>
              <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${meter.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {meter.isActive ? <CheckCircle size={12} /> : <XCircle size={12} />}
                {meter.isActive ? t('meters_active') : t('meters_inactive')}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-50">
              <div>
                <p className="text-xs text-gray-400">{t('meters_last_reading')}</p>
                <p className="text-sm font-semibold text-gray-800 mt-0.5">
                  {meter.lastReadingValue != null ? `${meter.lastReadingValue} ${t('home_unit_m3')}` : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">{t('meters_last_date')}</p>
                <p className="text-sm font-semibold text-gray-800 mt-0.5">
                  {meter.lastReadingDate ? new Date(meter.lastReadingDate).toLocaleDateString('ar-SA') : '—'}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
