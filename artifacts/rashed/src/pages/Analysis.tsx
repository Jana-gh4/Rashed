import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { TrendingUp, TrendingDown, Brain, AlertCircle, ChevronRight, ChevronLeft } from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import { DemoBadge } from '@/components/DemoBadge';
import { useI18n } from '@/lib/i18n';
import { api } from '@/lib/api';

export default function Analysis() {
  const { t, isRtl } = useI18n();
  const ChevronDir = isRtl ? ChevronLeft : ChevronRight;

  const { data: analysis, isLoading, error } = useQuery({
    queryKey: ['analysis-latest'],
    queryFn: api.dashboard.getLatestAnalysis,
  });

  if (isLoading) return <PageShell><div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div></PageShell>;

  if (error || !analysis) return (
    <PageShell>
      <div className="flex flex-col items-center justify-center h-screen gap-4 px-6 text-center">
        <AlertCircle size={40} className="text-gray-300" />
        <p className="text-gray-500">{t('error_no_data')}</p>
        <Link href="/upload"><button className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium">{t('nav_upload')}</button></Link>
      </div>
    </PageShell>
  );

  const changePercent = analysis.changePercentage;
  const isIncrease = changePercent != null && changePercent > 0;
  const TrendIcon = changePercent == null ? TrendingUp : isIncrease ? TrendingUp : TrendingDown;

  return (
    <PageShell>
      <div className="px-4 pt-6 pb-4 space-y-4" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-gray-900 flex-1">{t('analysis_title')}</h1>
          {analysis.dataClassification === 'synthetic_demo_data' && <DemoBadge />}
        </div>

        {/* Change headline */}
        {changePercent != null && (
          <div className={`rounded-2xl p-5 ${isIncrease ? 'bg-red-600' : 'bg-green-600'} text-white`}>
            <p className="text-sm opacity-80 mb-1">{t('analysis_change_headline')}</p>
            <div className="flex items-center gap-2">
              <TrendIcon size={28} />
              <span className="text-4xl font-bold">{isIncrease ? '+' : ''}{changePercent.toFixed(1)}%</span>
            </div>
            <p className="text-sm opacity-80 mt-2">
              {analysis.currentConsumptionM3?.toFixed(1)} → {analysis.previousConsumptionM3?.toFixed(1)} {t('home_unit_m3')}
            </p>
          </div>
        )}

        {/* Smart analysis */}
        {analysis.smartAnalysisSummary && (
          <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <Brain size={18} className="text-blue-500" />
              <p className="font-semibold text-gray-800">{t('analysis_smart_summary')}</p>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">{analysis.smartAnalysisSummary}</p>
          </div>
        )}

        {/* Possible causes */}
        {analysis.possibleCauses && Array.isArray(analysis.possibleCauses) && analysis.possibleCauses.length > 0 && (
          <div className="bg-white rounded-2xl p-4 border border-gray-100">
            <p className="font-semibold text-gray-800 mb-3">{t('analysis_possible_causes')}</p>
            <p className="text-xs text-gray-400 mb-3">⚠️ {t('analysis_cause_inference')}</p>
            <div className="space-y-3">
              {(analysis.possibleCauses as { reason: string; confidence: number }[]).map((c, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="flex gap-0.5 mt-1 flex-shrink-0">
                    {[1,2,3,4,5].map((d) => (
                      <div key={d} className={`w-2 h-2 rounded-full ${d <= Math.round(c.confidence * 5) ? 'bg-blue-500' : 'bg-gray-200'}`} />
                    ))}
                  </div>
                  <p className="text-sm text-gray-700">{c.reason}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navigation links */}
        <div className="space-y-2">
          {[
            { href: '/baseline', label: t('baseline_title') },
            { href: '/leak-detection', label: t('leak_title') },
            { href: '/why-increase', label: t('why_title') },
          ].map(({ href, label }) => (
            <Link key={href} href={href}>
              <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 cursor-pointer hover:border-blue-200">
                <span className="text-sm font-medium text-gray-700">{label}</span>
                <ChevronDir size={16} className="text-gray-400" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
