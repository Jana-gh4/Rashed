import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Droplets, TrendingUp, TrendingDown, Minus, AlertTriangle, Upload, ChevronRight, ChevronLeft } from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import { DemoBadge } from '@/components/DemoBadge';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

export default function Home() {
  const { t, isRtl } = useI18n();
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: api.dashboard.get,
    retry: 1,
  });

  const ChevronDir = isRtl ? ChevronLeft : ChevronRight;

  if (isLoading) {
    return (
      <PageShell>
        <div className="flex items-center justify-center h-screen">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </PageShell>
    );
  }

  const changePercent = data?.changePercentage;
  const TrendIcon = changePercent == null ? Minus : changePercent > 0 ? TrendingUp : TrendingDown;
  const trendColor = changePercent == null ? 'text-gray-400' : changePercent > 5 ? 'text-red-500' : changePercent < -5 ? 'text-green-500' : 'text-amber-500';

  const statusLabel =
    data?.statusVsBaseline === 'above_expected' ? t('home_status_above') :
    data?.statusVsBaseline === 'below_expected' ? t('home_status_below') :
    data?.statusVsBaseline === 'within_expected' ? t('home_status_within') : null;

  const statusColor =
    data?.statusVsBaseline === 'above_expected' ? 'bg-red-50 text-red-700 border-red-200' :
    data?.statusVsBaseline === 'below_expected' ? 'bg-green-50 text-green-700 border-green-200' :
    'bg-blue-50 text-blue-700 border-blue-200';

  const chartData = (data?.recentConsumption ?? []).map((r, i) => ({
    name: i === (data?.recentConsumption?.length ?? 0) - 1 ? (isRtl ? 'الآن' : 'Now') : `${i + 1}`,
    m3: r.consumptionM3,
  }));

  return (
    <PageShell>
      <div className="px-4 pt-6 pb-4 space-y-4" dir={isRtl ? 'rtl' : 'ltr'}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">{t('home_greeting')}</p>
            <h1 className="text-xl font-bold text-gray-900">{user?.name ?? '—'}</h1>
          </div>
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <Droplets size={20} className="text-blue-600" />
          </div>
        </div>

        {/* Active leak alert */}
        {data?.activeAlert && (
          <Link href="/leak-detection">
            <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-xl cursor-pointer">
              <AlertTriangle size={18} className="text-red-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-red-700">{t('home_alert_leak')}</p>
              </div>
              <ChevronDir size={16} className="text-red-400 flex-shrink-0" />
            </div>
          </Link>
        )}

        {/* Main consumption card */}
        {!data?.hasData ? (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
            <Droplets size={40} className="text-blue-200 mx-auto mb-3" />
            <p className="font-semibold text-gray-700">{t('home_no_data')}</p>
            <p className="text-sm text-gray-400 mt-1">{t('home_upload_first')}</p>
            <Link href="/upload">
              <button className="mt-4 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium">{t('home_upload_bill')}</button>
            </Link>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-5 text-white shadow-md">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-blue-200 text-sm">{t('home_consumption_current')}</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-4xl font-bold">{data?.currentConsumptionM3?.toFixed(1) ?? '—'}</span>
                  <span className="text-blue-200 text-lg">{t('home_unit_m3')}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                {user?.isDemoMode && <DemoBadge className="bg-white/20 text-white border-white/30" />}
                {changePercent != null && (
                  <div className={`flex items-center gap-1 ${trendColor} bg-white/20 px-2 py-1 rounded-lg`}>
                    <TrendIcon size={14} />
                    <span className="text-sm font-medium">{Math.abs(changePercent).toFixed(1)}%</span>
                  </div>
                )}
              </div>
            </div>
            {changePercent != null && (
              <p className="text-blue-200 text-xs">{t('home_vs_last')}: {data?.previousConsumptionM3?.toFixed(1)} {t('home_unit_m3')}</p>
            )}
          </div>
        )}

        {/* Status banner */}
        {statusLabel && (
          <div className={`px-4 py-2.5 rounded-xl border text-sm font-medium ${statusColor}`}>
            {statusLabel}
          </div>
        )}

        {/* Mini chart */}
        {chartData.length > 1 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500 mb-3 font-medium">{isRtl ? 'الاستهلاك التاريخي' : 'Historical Consumption'}</p>
            <ResponsiveContainer width="100%" height={80}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="m3" stroke="#2563eb" strokeWidth={2} fill="url(#blueGrad)" dot={false} />
                <Tooltip formatter={(v: number) => [`${v} م³`, '']} contentStyle={{ fontSize: 12 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Quick actions */}
        {data?.hasData && (
          <div className="grid grid-cols-2 gap-3">
            <Link href="/analysis">
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3 cursor-pointer hover:border-blue-200">
                <TrendingUp size={20} className="text-blue-500" />
                <span className="text-sm font-medium text-gray-700">{t('analysis_title')}</span>
              </div>
            </Link>
            <Link href="/forecast">
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3 cursor-pointer hover:border-blue-200">
                <Droplets size={20} className="text-teal-500" />
                <span className="text-sm font-medium text-gray-700">{t('forecast_title')}</span>
              </div>
            </Link>
          </div>
        )}

        {/* Upload CTA */}
        <Link href="/upload">
          <div className="flex items-center gap-3 p-4 bg-white rounded-2xl shadow-sm border border-dashed border-blue-300 cursor-pointer hover:bg-blue-50 transition-colors">
            <Upload size={20} className="text-blue-500" />
            <span className="text-sm font-medium text-blue-600">{t('home_upload_bill')}</span>
            <ChevronDir size={16} className="text-blue-400 ms-auto" />
          </div>
        </Link>
      </div>
    </PageShell>
  );
}
