import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { CheckCircle, AlertCircle, TrendingUp, TrendingDown, Calendar, Droplets, ChevronRight, ChevronLeft } from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import { DemoBadge } from '@/components/DemoBadge';
import { useI18n } from '@/lib/i18n';
import type { UploadResult } from '@/lib/api';

export default function Results() {
  const { t, isRtl } = useI18n();
  const [result, setResult] = useState<UploadResult | null>(null);
  const ChevronDir = isRtl ? ChevronLeft : ChevronRight;

  useEffect(() => {
    const raw = sessionStorage.getItem('uploadResult');
    if (raw) setResult(JSON.parse(raw) as UploadResult);
  }, []);

  if (!result) {
    return (
      <PageShell>
        <div className="flex flex-col items-center justify-center h-screen gap-4 px-6 text-center">
          <AlertCircle size={40} className="text-gray-300" />
          <p className="text-gray-500">{t('error_no_data')}</p>
          <Link href="/upload"><button className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium">{t('nav_upload')}</button></Link>
        </div>
      </PageShell>
    );
  }

  const bill = result.bill;
  const changePercent = bill.currentConsumptionM3 != null && bill.previousConsumptionM3 != null && bill.previousConsumptionM3 > 0
    ? ((bill.currentConsumptionM3 - bill.previousConsumptionM3) / bill.previousConsumptionM3 * 100)
    : null;

  const isIncrease = changePercent != null && changePercent > 0;

  return (
    <PageShell>
      <div className="px-4 pt-6 pb-4 space-y-4" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-gray-900 flex-1">{t('results_title')}</h1>
          {bill.isDemoData && <DemoBadge />}
        </div>

        {/* Extraction status */}
        <div className={`flex items-center gap-2 p-3 rounded-xl text-sm font-medium ${result.valid ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
          {result.valid ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {result.valid ? (isRtl ? 'تم استخراج البيانات بنجاح' : 'Data extracted successfully') : t('results_extraction_error')}
        </div>

        {/* Metrics grid */}
        <div className="grid grid-cols-2 gap-3">
          <MetricCard
            label={t('results_current')}
            value={bill.currentConsumptionM3?.toFixed(1) ?? '—'}
            unit={t('home_unit_m3')}
            color="blue"
          />
          <MetricCard
            label={t('results_previous')}
            value={bill.previousConsumptionM3?.toFixed(1) ?? '—'}
            unit={t('home_unit_m3')}
            color="gray"
          />
          {changePercent != null && (
            <MetricCard
              label={t('results_change')}
              value={`${isIncrease ? '+' : ''}${changePercent.toFixed(1)}%`}
              unit=""
              color={isIncrease ? 'red' : 'green'}
              icon={isIncrease ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            />
          )}
          {bill.billingPeriodDays != null && (
            <MetricCard
              label={t('results_period')}
              value={`${bill.billingPeriodDays}`}
              unit={t('results_days')}
              color="purple"
              icon={<Calendar size={16} />}
            />
          )}
        </div>

        {/* Confidence */}
        {bill.extractionConfidence != null && (
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <p className="text-xs text-gray-500 mb-2">{t('results_confidence')}</p>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${(bill.extractionConfidence * 100).toFixed(0)}%` }} />
              </div>
              <span className="text-sm font-semibold text-gray-700">{(bill.extractionConfidence * 100).toFixed(0)}%</span>
            </div>
          </div>
        )}

        {/* Errors */}
        {result.errors.length > 0 && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
            {result.errors.map((e, i) => (
              <p key={i} className="text-xs text-amber-700">• {e}</p>
            ))}
          </div>
        )}

        {/* CTA */}
        {result.analysis && (
          <Link href="/analysis">
            <button className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors">
              <Droplets size={20} />
              {t('results_view_analysis')}
              <ChevronDir size={18} />
            </button>
          </Link>
        )}

        {bill.isDemoData && (
          <p className="text-xs text-center text-amber-600">⚠️ {t('demo_disclaimer')}</p>
        )}
      </div>
    </PageShell>
  );
}

function MetricCard({ label, value, unit, color, icon }: { label: string; value: string; unit: string; color: string; icon?: React.ReactNode }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-100',
    gray: 'bg-gray-50 border-gray-100',
    red: 'bg-red-50 border-red-100',
    green: 'bg-green-50 border-green-100',
    purple: 'bg-purple-50 border-purple-100',
  };
  const textColors: Record<string, string> = {
    blue: 'text-blue-700',
    gray: 'text-gray-700',
    red: 'text-red-700',
    green: 'text-green-700',
    purple: 'text-purple-700',
  };
  return (
    <div className={`rounded-2xl p-4 border ${colors[color]}`}>
      <p className="text-xs text-gray-500 mb-2">{label}</p>
      <div className={`flex items-end gap-1 ${textColors[color]}`}>
        {icon}
        <span className="text-2xl font-bold">{value}</span>
        {unit && <span className="text-sm mb-0.5">{unit}</span>}
      </div>
    </div>
  );
}
