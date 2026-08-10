import { useQuery } from '@tanstack/react-query';
import { HelpCircle, AlertCircle } from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import { DemoBadge } from '@/components/DemoBadge';
import { useI18n } from '@/lib/i18n';
import { api } from '@/lib/api';

export default function WhyIncrease() {
  const { t, isRtl } = useI18n();
  const { data: analysis, isLoading } = useQuery({ queryKey: ['analysis-latest'], queryFn: api.dashboard.getLatestAnalysis });

  if (isLoading) return <PageShell><div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div></PageShell>;

  const causes = analysis?.possibleCauses as { reason: string; confidence: number }[] | null;
  const isDemo = analysis?.dataClassification === 'synthetic_demo_data';

  const recommendations = [
    { icon: '🔧', text: t('why_check_pipes') },
    { icon: '🏠', text: t('why_reduce_appliances') },
    { icon: '🌿', text: t('why_check_irrigation') },
  ];

  return (
    <PageShell>
      <div className="px-4 pt-6 pb-4 space-y-4" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-gray-900 flex-1">{t('why_title')}</h1>
          {isDemo && <DemoBadge />}
        </div>

        {/* AI summary */}
        {analysis?.whyIncreasedSummary && (
          <div className="bg-white rounded-2xl p-4 border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <HelpCircle size={18} className="text-blue-500" />
              <p className="font-semibold text-gray-800">{t('analysis_smart_summary')}</p>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">{analysis.whyIncreasedSummary}</p>
          </div>
        )}

        {/* Causes */}
        {causes && causes.length > 0 ? (
          <div className="bg-white rounded-2xl p-4 border border-gray-100">
            <p className="font-semibold text-gray-800 mb-2">{t('why_causes')}</p>
            <p className="text-xs text-gray-400 mb-4">⚠️ {t('why_inference_note')}</p>
            <div className="space-y-4">
              {causes.map((c, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-700 font-medium">{c.reason}</p>
                    <span className="text-xs text-gray-400">{Math.round(c.confidence * 100)}%</span>
                  </div>
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map((d) => (
                      <div key={d} className={`flex-1 h-1.5 rounded-full ${d <= Math.round(c.confidence * 5) ? 'bg-blue-500' : 'bg-gray-200'}`} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : !isLoading && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <AlertCircle size={36} className="text-gray-200" />
            <p className="text-sm text-gray-400">{t('error_no_data')}</p>
          </div>
        )}

        {/* Recommendations */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <p className="font-semibold text-gray-800 mb-3">{t('why_recommendations')}</p>
          <div className="space-y-3">
            {recommendations.map((r, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                <span className="text-xl flex-shrink-0">{r.icon}</span>
                <p className="text-sm text-gray-700">{r.text}</p>
              </div>
            ))}
          </div>
        </div>

        {isDemo && <p className="text-xs text-center text-amber-600">⚠️ {t('demo_disclaimer')}</p>}
      </div>
    </PageShell>
  );
}
