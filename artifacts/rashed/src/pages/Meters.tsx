import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Gauge, Plus, CheckCircle, XCircle, X } from 'lucide-react';
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

// ── Add Meter Dialog ─────────────────────────────────────────────────────────
interface AddMeterDialogProps {
  onClose: () => void;
  onAdded: () => void;
  t: (k: string) => string;
  isRtl: boolean;
}

function AddMeterDialog({ onClose, onAdded, t, isRtl }: AddMeterDialogProps) {
  const [meterId, setMeterId] = useState('');
  const [meterType, setMeterType] = useState<'main' | 'garden' | 'pool' | 'other'>('main');
  const [label, setLabel] = useState('');
  const [error, setError] = useState('');

  const add = useMutation({
    mutationFn: () => api.meters.create({ meterId: meterId.trim(), meterType, label: label.trim() || null, isActive: true, dataClassification: 'user_data' }),
    onSuccess: () => { onAdded(); onClose(); },
    onError: (e: Error) => setError(e.message),
  });

  const TYPES = [
    { value: 'main', label: t('meters_main') },
    { value: 'garden', label: t('meters_garden') },
    { value: 'pool', label: t('meters_pool') },
    { value: 'other', label: t('meters_other') },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end" onClick={onClose}>
      <div
        className="w-full max-w-md mx-auto bg-white rounded-t-3xl p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        <div className="flex items-center justify-between">
          <p className="font-bold text-gray-900 text-lg">{t('meters_add')}</p>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100">
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        {/* Meter ID */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">
            {isRtl ? 'رقم العداد' : 'Meter ID'} <span className="text-red-500">*</span>
          </label>
          <input
            value={meterId}
            onChange={(e) => setMeterId(e.target.value)}
            placeholder={isRtl ? 'مثال: NWC-123456' : 'e.g. NWC-123456'}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Type */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-2">
            {isRtl ? 'نوع العداد' : 'Meter Type'}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {TYPES.map((tp) => (
              <button
                key={tp.value}
                onClick={() => setMeterType(tp.value)}
                className={`py-2.5 px-3 rounded-xl text-sm font-medium border transition-colors ${meterType === tp.value ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300'}`}
              >
                {tp.label}
              </button>
            ))}
          </div>
        </div>

        {/* Label (optional) */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">
            {isRtl ? 'الاسم (اختياري)' : 'Label (optional)'}
          </label>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={isRtl ? 'مثال: عداد الحديقة' : 'e.g. Garden meter'}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <button
          onClick={() => add.mutate()}
          disabled={!meterId.trim() || add.isPending}
          className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl disabled:opacity-60 hover:bg-blue-700 transition-colors"
        >
          {add.isPending ? (isRtl ? 'جارٍ الإضافة...' : 'Adding...') : (isRtl ? 'إضافة العداد' : 'Add Meter')}
        </button>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function MetersPage() {
  const { t, isRtl } = useI18n();
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);

  const { data: meters, isLoading } = useQuery({
    queryKey: ['meters'],
    queryFn: api.meters.list,
  });

  if (isLoading) return (
    <PageShell>
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    </PageShell>
  );

  return (
    <PageShell>
      <div className="px-4 pt-6 pb-4 space-y-4" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">{t('meters_title')}</h1>
          <button
            onClick={() => setShowAdd(true)}
            className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow hover:bg-blue-700 transition-colors"
          >
            <Plus size={18} className="text-white" />
          </button>
        </div>

        {(!meters || meters.length === 0) ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <Gauge size={40} className="text-gray-200" />
            <p className="text-gray-500 text-sm">{t('meters_no_meters')}</p>
            <button
              onClick={() => setShowAdd(true)}
              className="mt-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
            >
              {t('meters_add')}
            </button>
          </div>
        ) : (
          meters.map((meter) => (
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
          ))
        )}
      </div>

      {showAdd && (
        <AddMeterDialog
          t={t}
          isRtl={isRtl}
          onClose={() => setShowAdd(false)}
          onAdded={() => qc.invalidateQueries({ queryKey: ['meters'] })}
        />
      )}
    </PageShell>
  );
}
