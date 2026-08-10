import { useQuery } from '@tanstack/react-query';
import { TrendingUp, AlertCircle, Info } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { PageShell } from '@/components/PageShell';
import { DemoBadge } from '@/components/DemoBadge';
import { useI18n } from '@/lib/i18n';
import { api } from '@/lib/api';

export default function Forecast() {
  const { t, isRtl } = useI18n();
  const { data: dashboard, isLoading } = useQuery({ queryKey: ['dashboard'], queryFn: api.dashboard.get });

  if (isLoading) return <PageShell><div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div></PageShell>;

  const forecast = dashboard?.latestForecast;
  const current = dashboard?.currentConsumptionM3;
  const isDemo = forecast?.dataClassification === 'synthetic_demo_data';

  // Build forecast chart data
  const chartData = [
    ...(dashboard?.recentConsumption?.slice(-4) ?? []).map((r, i) => ({
      name: `M${i - 3}`,
      m3: r.consumptionM3,
      type: 'historical',
    })),
    ...(forecast ? [
      { name: isRtl ? 'المتوقع' : 'Proj.', m3: forecast.projectedM3, type: 'forecast' },
    ] : []),
  ];

  return (
    <PageShell>
      <div className="px-4 pt-6 pb-4 space-y-4" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-gray-900 flex-1">{t('forecast_title')}</h1>
          {isDemo && <DemoBadge />}
        </div>

        {!forecast ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <AlertCircle size={40} className="text-gray-200" />
            <p className="text-sm text-gray-500">{t('error_no_data')}</p>
          </div>
        ) : (
          <>
            {/* Projected month-end card */}
            <div className="bg-gradient-to-br from-teal-600 to-blue-600 rounded-2xl p-5 text-white">
              <p className="text-teal-200 text-sm mb-1">{t('forecast_projected')}</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold">{forecast.projectedM3.toFixed(1)}</span>
                <span className="text-teal-200 text-lg">{t('home_unit_m3')}</span>
              </div>
              {forecast.projectedMinM3 != null && forecast.projectedMaxM3 != null && (
                <p className="text-teal-200 text-xs mt-2">{t('forecast_range')}: {forecast.projectedMinM3.toFixed(1)} – {forecast.projectedMaxM3.toFixed(1)} {t('home_unit_m3')}</p>
              )}
            </div>

            {/* Current */}
            {current != null && (
              <div className="bg-white rounded-xl p-4 border border-gray-100 flex items-center justify-between">
                <p className="text-sm text-gray-500">{t('forecast_current')}</p>
                <span className="font-bold text-gray-900">{current.toFixed(1)} {t('home_unit_m3')}</span>
              </div>
            )}

            {/* Chart */}
            {chartData.length > 0 && (
              <div className="bg-white rounded-2xl p-4 border border-gray-100">
                <ResponsiveContainer width="100%" height={120}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="tealGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0d9488" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v: number) => [`${v} ${t('home_unit_m3')}`, '']} contentStyle={{ fontSize: 11 }} />
                    <Area type="monotone" dataKey="m3" stroke="#0d9488" strokeWidth={2} fill="url(#tealGrad)" dot={{ r: 3 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Confidence note */}
            {forecast.confidenceNote && (
              <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                <Info size={15} className="text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-700">{forecast.confidenceNote}</p>
              </div>
            )}

            {isDemo && <p className="text-xs text-center text-amber-600">⚠️ {t('demo_disclaimer')}</p>}
          </>
        )}
      </div>
    </PageShell>
  );
}
