import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Sliders, TrendingDown, DollarSign, Info, Loader2 } from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import { DemoBadge } from '@/components/DemoBadge';
import { useI18n } from '@/lib/i18n';
import { api, type WhatIfResult } from '@/lib/api';

export default function WhatIf() {
  const { t, isRtl } = useI18n();
  const [reductionPercent, setReductionPercent] = useState(15);
  const [result, setResult] = useState<WhatIfResult | null>(null);

  const { data: analysis } = useQuery({ queryKey: ['analysis-latest'], queryFn: api.dashboard.getLatestAnalysis });

  const simulate = useMutation({
    mutationFn: () => api.savings.whatIf({ reductionPercent }),
    onSuccess: setResult,
  });

  const isDemo = analysis?.dataClassification === 'synthetic_demo_data';
  const current = result?.currentM3 ?? analysis?.currentConsumptionM3 ?? null;
  const target = result ? result.targetM3 : current != null ? Math.round(current * (1 - reductionPercent / 100) * 10) / 10 : null;

  return (
    <PageShell>
      <div className="px-4 pt-6 pb-4 space-y-4" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-gray-900 flex-1">{t('whatif_title')}</h1>
          {isDemo && <DemoBadge />}
        </div>
        <p className="text-sm text-gray-500">{t('whatif_subtitle')}</p>

        {/* Slider */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">{t('whatif_reduction_slider')}</label>
            <span className="text-2xl font-bold text-blue-600">{reductionPercent}%</span>
          </div>
          <input
            type="range" min={5} max={50} step={5} value={reductionPercent}
            onChange={(e) => { setReductionPercent(Number(e.target.value)); setResult(null); }}
            className="w-full accent-blue-600"
          />
          <div className="flex justify-between text-xs text-gray-400">
            <span>5%</span><span>50%</span>
          </div>
          <button
            onClick={() => simulate.mutate()}
            disabled={simulate.isPending || !analysis?.currentConsumptionM3}
            className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {simulate.isPending ? <Loader2 size={18} className="animate-spin" /> : <Sliders size={18} />}
            {isRtl ? 'تشغيل المحاكاة' : 'Run Simulation'}
          </button>
        </div>

        {/* Before / After comparison */}
        {current != null && (
          <div className="grid grid-cols-2 gap-3">
            {/* Before */}
            <div className="bg-red-50 rounded-2xl p-4 border border-red-100">
              <p className="text-xs text-red-500 font-medium mb-2">{t('whatif_current')}</p>
              <div>
                <p className="text-xs text-gray-500">{t('whatif_consumption')}</p>
                <p className="text-xl font-bold text-gray-900">{current.toFixed(1)} <span className="text-sm font-normal">{t('home_unit_m3')}</span></p>
              </div>
              {result && (
                <div className="mt-2">
                  <p className="text-xs text-gray-500">{t('whatif_cost')} *</p>
                  <p className="text-lg font-bold text-red-700">{result.currentCostSar.toFixed(1)} <span className="text-xs font-normal">{t('savings_sar')}</span></p>
                </div>
              )}
            </div>

            {/* After */}
            <div className="bg-green-50 rounded-2xl p-4 border border-green-100">
              <p className="text-xs text-green-600 font-medium mb-2">{t('whatif_target')}</p>
              <div>
                <p className="text-xs text-gray-500">{t('whatif_consumption')}</p>
                <p className="text-xl font-bold text-gray-900">{target?.toFixed(1) ?? '—'} <span className="text-sm font-normal">{t('home_unit_m3')}</span></p>
              </div>
              {result && (
                <div className="mt-2">
                  <p className="text-xs text-gray-500">{t('whatif_cost')} *</p>
                  <p className="text-lg font-bold text-green-700">{result.targetCostSar.toFixed(1)} <span className="text-xs font-normal">{t('savings_sar')}</span></p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Savings summary */}
        {result && (
          <div className="bg-white rounded-2xl p-5 border border-gray-100 space-y-3">
            <p className="font-semibold text-gray-800">{isRtl ? 'ملخص التوفير' : 'Savings Summary'}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-blue-50 rounded-xl">
                <p className="text-xs text-gray-500">{t('whatif_saving_m3')}</p>
                <p className="text-lg font-bold text-blue-700">{result.savingM3.toFixed(1)} {t('savings_m3')}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-xl">
                <p className="text-xs text-gray-500">{t('whatif_saving_sar')} *</p>
                <p className="text-lg font-bold text-green-700">{result.savingSar.toFixed(1)} {t('savings_sar')}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500">{isRtl ? 'توفير سنوي م³' : 'Annual m³ saving'}</p>
                <p className="text-lg font-bold text-gray-700">{result.annualSavingM3.toFixed(0)} {t('savings_m3')}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500">{isRtl ? 'توفير سنوي ريال*' : 'Annual SAR saving*'}</p>
                <p className="text-lg font-bold text-gray-700">{result.annualSavingSar.toFixed(0)} {t('savings_sar')}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tariff disclaimer */}
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl">
          <Info size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-700">* {t('whatif_tariff_note')}</p>
        </div>

        {isDemo && <p className="text-xs text-center text-amber-600">⚠️ {t('demo_disclaimer')}</p>}
      </div>
    </PageShell>
  );
}
