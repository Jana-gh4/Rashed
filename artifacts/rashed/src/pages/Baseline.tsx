import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Info } from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import { DemoBadge } from '@/components/DemoBadge';
import { useI18n } from '@/lib/i18n';
import { api } from '@/lib/api';

export default function Baseline() {
  const { t, isRtl } = useI18n();
  const { data, isLoading } = useQuery({ queryKey: ['dashboard'], queryFn: api.dashboard.get });
  const { data: analysis } = useQuery({ queryKey: ['analysis-latest'], queryFn: api.dashboard.getLatestAnalysis });

  if (isLoading) return <PageShell><div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div></PageShell>;

  const baseline = data?.baseline;
  const current = analysis?.currentConsumptionM3;
  const isAbove = current != null && baseline != null && current > baseline.max;
  const isBelow = current != null && baseline != null && current < baseline.min;
  const statusLabel = isAbove ? t('baseline_status_above') : isBelow ? t('baseline_status_below') : t('baseline_status_within');
  const statusColor = isAbove ? 'bg-red-50 text-red-700 border-red-200' : isBelow ? 'bg-green-50 text-green-700 border-green-200' : 'bg-green-50 text-green-700 border-green-200';

  const basisLabel = analysis?.baselineBasis === 'household_history_and_profile' ? t('baseline_basis_history') : t('baseline_basis_profile');

  return (
    <PageShell>
      <div className="px-4 pt-6 pb-4 space-y-4" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-gray-900 flex-1">{t('baseline_title')}</h1>
          {analysis?.dataClassification === 'synthetic_demo_data' && <DemoBadge />}
        </div>

        {/* Expected range */}
        {baseline ? (
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-5 text-white">
            <p className="text-blue-200 text-sm mb-2">{t('baseline_expected_range')}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{baseline.min.toFixed(1)}</span>
              <span className="text-blue-200">—</span>
              <span className="text-3xl font-bold">{baseline.max.toFixed(1)}</span>
              <span className="text-blue-200 text-lg">{t('home_unit_m3')}</span>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200 flex items-center gap-3">
            <AlertCircle size={20} className="text-gray-400" />
            <p className="text-sm text-gray-500">{t('error_no_data')}</p>
          </div>
        )}

        {/* Current consumption */}
        {current != null && (
          <div className="bg-white rounded-2xl p-4 border border-gray-100">
            <p className="text-xs text-gray-500 mb-1">{t('baseline_current')}</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-gray-900">{current.toFixed(1)}</span>
              <span className="text-sm text-gray-500">{t('home_unit_m3')}</span>
            </div>
          </div>
        )}

        {/* Status */}
        {baseline && current != null && (
          <div className={`px-4 py-3 rounded-xl border text-sm font-semibold ${statusColor}`}>{statusLabel}</div>
        )}

        {/* Basis */}
        {analysis?.baselineBasis && (
          <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-2">
            <p className="text-xs text-gray-500">{t('baseline_basis')}</p>
            <p className="text-sm text-gray-700 font-medium">{basisLabel}</p>
          </div>
        )}

        {/* GASTAT note */}
        <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-2xl">
          <Info size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-blue-700 leading-relaxed">{t('baseline_gastat_note')}</p>
        </div>

        {/* Data classification */}
        {analysis?.dataClassification === 'synthetic_demo_data' && (
          <p className="text-xs text-center text-amber-600">⚠️ {t('demo_disclaimer')}</p>
        )}
      </div>
    </PageShell>
  );
}
