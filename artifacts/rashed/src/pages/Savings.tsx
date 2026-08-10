import { useQuery } from '@tanstack/react-query';
import { PiggyBank, AlertCircle, Info } from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import { DemoBadge } from '@/components/DemoBadge';
import { useI18n } from '@/lib/i18n';
import { api } from '@/lib/api';

export default function Savings() {
  const { t, isRtl } = useI18n();
  const { data: estimates, isLoading } = useQuery({ queryKey: ['savings'], queryFn: api.savings.list });

  if (isLoading) return <PageShell><div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div></PageShell>;

  const latest = estimates?.[0];
  const isDemo = latest?.dataClassification === 'synthetic_demo_data';

  return (
    <PageShell>
      <div className="px-4 pt-6 pb-4 space-y-4" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-gray-900 flex-1">{t('savings_title')}</h1>
          {isDemo && <DemoBadge />}
        </div>

        {!latest ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <AlertCircle size={40} className="text-gray-200" />
            <p className="text-sm text-gray-500">{t('error_no_data')}</p>
          </div>
        ) : (
          <>
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
                    <span className="text-2xl font-bold">{latest.savingM3.toFixed(1)}</span>
                    <span className="text-green-200 text-sm">{t('savings_m3')}</span>
                  </div>
                </div>
                <div>
                  <p className="text-green-200 text-xs">{t('savings_cost_saved')} *</p>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-bold">{latest.savingSar.toFixed(1)}</span>
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
                    <span className="text-xl font-bold text-gray-900">{(latest.savingM3 * 12).toFixed(0)}</span>
                    <span className="text-sm text-gray-500">{t('savings_m3')}</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-400">{t('savings_cost_saved')} *</p>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-xl font-bold text-gray-900">{(latest.savingSar * 12).toFixed(0)}</span>
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
                <p className="text-xs text-amber-600 mt-1">{t('savings_tariff_note')} ({latest.tariffVersion})</p>
              </div>
            </div>

            {isDemo && <p className="text-xs text-center text-amber-600">⚠️ {t('demo_disclaimer')}</p>}
          </>
        )}
      </div>
    </PageShell>
  );
}
