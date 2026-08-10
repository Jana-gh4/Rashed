import { useQuery } from '@tanstack/react-query';
import { PiggyBank, AlertCircle, Info, Loader2 } from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import { DemoBadge } from '@/components/DemoBadge';
import { useI18n } from '@/lib/i18n';
import { api } from '@/lib/api';

export default function Savings() {
  const { t, isRtl } = useI18n();

  const { data: estimates, isLoading: estimatesLoading } = useQuery({
    queryKey: ['savings'],
    queryFn: api.savings.list,
  });

  // When no savings estimates exist, auto-run a 15% what-if to show projected savings
  const { data: whatIfFallback, isLoading: whatIfLoading } = useQuery({
    queryKey: ['savings-whatif-fallback'],
    queryFn: () => api.savings.whatIf({ reductionPercent: 15 }),
    enabled: !estimatesLoading && (!estimates || estimates.length === 0),
  });

  const isLoading = estimatesLoading || whatIfLoading;

  if (isLoading) return (
    <PageShell>
      <div className="flex items-center justify-center h-screen">
        <Loader2 size={24} className="text-blue-500 animate-spin" />
      </div>
    </PageShell>
  );

  const latest = estimates?.[0];
  const isDemo = latest?.dataClassification === 'synthetic_demo_data';

  // Use saved estimate OR what-if fallback
  const savingM3 = latest?.savingM3 ?? whatIfFallback?.savingM3 ?? null;
  const savingSar = latest?.savingSar ?? whatIfFallback?.savingSar ?? null;
  const tariffVersion = latest?.tariffVersion ?? null;
  const isFallback = !latest && whatIfFallback != null;

  if (savingM3 == null) {
    return (
      <PageShell>
        <div className="px-4 pt-6 pb-4" dir={isRtl ? 'rtl' : 'ltr'}>
          <h1 className="text-xl font-bold text-gray-900 mb-8">{t('savings_title')}</h1>
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <AlertCircle size={40} className="text-gray-200" />
            <p className="text-sm text-gray-500">{t('error_no_data')}</p>
            <p className="text-xs text-gray-400">{isRtl ? 'قم بتحليل فاتورة أولاً للحصول على تقديرات التوفير' : 'Analyze a bill first to get savings estimates'}</p>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="px-4 pt-6 pb-4 space-y-4" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-gray-900 flex-1">{t('savings_title')}</h1>
          {isDemo && <DemoBadge />}
          {isFallback && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
              {isRtl ? 'مُتوقَّع ١٥٪' : '15% Projection'}
            </span>
          )}
        </div>

        {isFallback && (
          <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl">
            <Info size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-700">
              {isRtl
                ? 'هذه تقديرات مبنية على تخفيض ١٥٪ من آخر استهلاك مسجل. تصبح الأرقام دقيقة أكثر مع تحليل المزيد من الفواتير.'
                : 'Projected savings based on a 15% reduction from your latest consumption. Numbers become more accurate as you analyze more bills.'}
            </p>
          </div>
        )}

        {/* Monthly savings */}
        <div className="bg-gradient-to-br from-green-600 to-emerald-600 rounded-2xl p-5 text-white">
          <div className="flex items-center gap-2 mb-3">
            <PiggyBank size={22} />
            <p className="font-semibold">{t('savings_monthly')}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-green-200 text-xs">{t('savings_water_saved')}</p>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-bold">{savingM3.toFixed(1)}</span>
                <span className="text-green-200 text-sm">{t('savings_m3')}</span>
              </div>
            </div>
            <div>
              <p className="text-green-200 text-xs">{t('savings_cost_saved')} *</p>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-bold">{savingSar != null ? savingSar.toFixed(1) : '—'}</span>
                <span className="text-green-200 text-sm">{t('savings_sar')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Annual */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <p className="text-xs text-gray-500 mb-3">{t('savings_annual')}</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-400">{t('savings_water_saved')}</p>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-bold text-gray-900">{(savingM3 * 12).toFixed(0)}</span>
                <span className="text-sm text-gray-500">{t('savings_m3')}</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-400">{t('savings_cost_saved')} *</p>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-bold text-gray-900">{savingSar != null ? (savingSar * 12).toFixed(0) : '—'}</span>
                <span className="text-sm text-gray-500">{t('savings_sar')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tariff note */}
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
          <Info size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs text-amber-700 font-medium">* {t('savings_estimate_note')}</p>
            {tariffVersion && (
              <p className="text-xs text-amber-600 mt-1">{t('savings_tariff_note')} ({tariffVersion})</p>
            )}
          </div>
        </div>

        {isDemo && <p className="text-xs text-center text-amber-600">⚠️ {t('demo_disclaimer')}</p>}
      </div>
    </PageShell>
  );
}
