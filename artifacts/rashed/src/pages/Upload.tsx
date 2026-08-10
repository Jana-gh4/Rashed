import { useState, useRef } from 'react';
import { useLocation } from 'wouter';
import { Camera, ImagePlus, FileText, X, Upload as UploadIcon, Loader2 } from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import { useI18n } from '@/lib/i18n';
import { api } from '@/lib/api';

type Step = 'select' | 'preview' | 'processing' | 'done';

const PROCESSING_STEPS_AR = [
  'قراءة المستند...',
  'استخراج بيانات الاستهلاك...',
  'التحقق من البيانات...',
  'مقارنة السجل التاريخي...',
  'تحليل الأنماط...',
  'إنشاء التوصيات...',
];
const PROCESSING_STEPS_EN = [
  'Reading document...',
  'Extracting consumption data...',
  'Validating data...',
  'Comparing historical records...',
  'Analyzing patterns...',
  'Generating recommendations...',
];

export default function UploadPage() {
  const { t, isRtl, lang } = useI18n();
  const [, navigate] = useLocation();
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('select');
  const [processingStep, setProcessingStep] = useState(0);
  const [error, setError] = useState('');
  const [isDemo, setIsDemo] = useState(false);

  const STEPS = lang === 'ar' ? PROCESSING_STEPS_AR : PROCESSING_STEPS_EN;

  function pickFile(f: File) {
    if (f.size > 10 * 1024 * 1024) { setError(t('upload_file_too_large')); return; }
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];
    if (!allowed.includes(f.type)) { setError(t('upload_invalid_type')); return; }
    setFile(f);
    setPreview(f.type.startsWith('image/') ? URL.createObjectURL(f) : null);
    setStep('preview');
    setError('');
  }

  async function handleSubmit(demo = false) {
    setIsDemo(demo);
    setStep('processing');
    setProcessingStep(0);

    // Animate processing steps
    const interval = setInterval(() => {
      setProcessingStep((prev) => {
        if (prev < STEPS.length - 1) return prev + 1;
        clearInterval(interval);
        return prev;
      });
    }, 700);

    try {
      const formData = new FormData();

      if (demo) {
        // Fetch the real NWC demo bill from public folder and send it to Gemini
        const base = import.meta.env.BASE_URL ?? '/';
        const demoUrl = `${base}demo-bill.png`.replace('//', '/');
        const response = await fetch(demoUrl);
        if (!response.ok) throw new Error('Could not load demo bill');
        const blob = await response.blob();
        formData.append('file', new File([blob], 'demo-nwc-bill.png', { type: 'image/png' }));
        formData.append('demo', 'true');
      } else {
        formData.append('file', file!);
      }
      formData.append('language', lang);

      const result = await api.bills.upload(formData);
      clearInterval(interval);

      // Store result for results page
      sessionStorage.setItem('uploadResult', JSON.stringify(result));
      navigate('/results');
    } catch (err) {
      clearInterval(interval);
      setError(err instanceof Error ? err.message : t('error_upload_failed'));
      setStep('select');
    }
  }

  return (
    <PageShell hideNav={step === 'processing'}>
      <div className="px-4 pt-6 pb-4 space-y-4" dir={isRtl ? 'rtl' : 'ltr'}>
        {/* Processing overlay */}
        {step === 'processing' && (
          <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center gap-8 px-8">
            <div className="relative">
              <div className="w-24 h-24 rounded-full border-4 border-blue-100 flex items-center justify-center">
                <div className="w-24 h-24 rounded-full border-4 border-blue-600 border-t-transparent absolute top-0 left-0 animate-spin" />
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                  <UploadIcon size={20} className="text-white" />
                </div>
              </div>
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-900 mb-3">{t('processing_title')}</h2>
              <p className="text-blue-600 font-medium animate-pulse">{STEPS[processingStep]}</p>
              {isDemo && <p className="text-xs text-amber-600 mt-2">⚠️ {t('demo_disclaimer')}</p>}
            </div>
            <div className="w-full max-w-xs space-y-2">
              {STEPS.map((s, i) => (
                <div key={s} className={`flex items-center gap-2 text-sm ${i <= processingStep ? 'text-blue-600' : 'text-gray-300'}`}>
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${i < processingStep ? 'bg-green-500' : i === processingStep ? 'bg-blue-600 animate-pulse' : 'bg-gray-200'}`} />
                  {s}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Header */}
        {step !== 'processing' && (
          <>
            <h1 className="text-xl font-bold text-gray-900">{t('upload_title')}</h1>
            <p className="text-sm text-gray-500">{t('upload_instructions')}</p>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
            )}

            {step === 'select' && (
              <div className="space-y-3">
                {/* Camera */}
                <button onClick={() => cameraRef.current?.click()} className="w-full flex items-center gap-4 p-5 bg-white rounded-2xl border border-gray-200 shadow-sm hover:border-blue-300 transition-colors">
                  <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                    <Camera size={22} className="text-blue-600" />
                  </div>
                  <span className="font-semibold text-gray-800">{t('upload_take_photo')}</span>
                </button>
                <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && pickFile(e.target.files[0])} />

                {/* Gallery */}
                <button onClick={() => fileRef.current?.click()} className="w-full flex items-center gap-4 p-5 bg-white rounded-2xl border border-gray-200 shadow-sm hover:border-blue-300 transition-colors">
                  <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
                    <ImagePlus size={22} className="text-purple-600" />
                  </div>
                  <span className="font-semibold text-gray-800">{t('upload_choose_gallery')}</span>
                </button>

                {/* Previous bill — same input, different label */}
                <button onClick={() => fileRef.current?.click()} className="w-full flex items-center gap-4 p-5 bg-white rounded-2xl border border-gray-200 shadow-sm hover:border-blue-300 transition-colors">
                  <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
                    <FileText size={22} className="text-green-600" />
                  </div>
                  <span className="font-semibold text-gray-800">{t('upload_previous_bill')}</span>
                </button>
                <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => e.target.files?.[0] && pickFile(e.target.files[0])} />

                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-gray-400">{t('upload_or_use_demo')}</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                {/* Demo */}
                <button onClick={() => handleSubmit(true)} className="w-full py-4 bg-amber-50 border border-amber-200 text-amber-800 font-semibold rounded-2xl hover:bg-amber-100 transition-colors">
                  🎯 {t('upload_demo_button')}
                </button>
              </div>
            )}

            {step === 'preview' && file && (
              <div className="space-y-4">
                <div className="relative bg-gray-100 rounded-2xl overflow-hidden aspect-video flex items-center justify-center">
                  {preview ? (
                    <img src={preview} alt="preview" className="object-contain w-full h-full" />
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <FileText size={40} className="text-gray-400" />
                      <p className="text-sm text-gray-500">{file.name}</p>
                    </div>
                  )}
                  <button onClick={() => { setFile(null); setPreview(null); setStep('select'); }} className="absolute top-2 end-2 w-8 h-8 bg-white rounded-full shadow flex items-center justify-center">
                    <X size={16} />
                  </button>
                </div>
                <p className="text-xs text-gray-500 text-center">{file.name} — {(file.size / 1024).toFixed(0)} KB</p>
                <button onClick={() => handleSubmit(false)} className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                  <UploadIcon size={20} />
                  {t('upload_submit')}
                </button>
                <button onClick={() => { setFile(null); setPreview(null); setStep('select'); }} className="w-full py-3 text-gray-500 font-medium rounded-2xl border border-gray-200">
                  {t('upload_remove')}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </PageShell>
  );
}
