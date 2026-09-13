import React, { useState } from 'react';
import {
  Cloud,
  CloudUpload,
  RotateCcw,
  Trash2,
  Download,
  Clock,
  HardDrive,
  Package,
  Receipt,
  Users,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Smartphone,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { CloudBackupRecord } from '../types';

export const CloudBackupsManager: React.FC = () => {
  const {
    settings,
    updateSettings,
    cloudBackups,
    isBackingUp,
    isRestoring,
    createCloudBackup,
    restoreCloudBackup,
    deleteCloudBackup,
    language,
    t,
    isRTL,
  } = useApp();

  const { currentUser } = useAuth();

  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [backupToRestore, setBackupToRestore] = useState<CloudBackupRecord | null>(null);
  const [backupToDelete, setBackupToDelete] = useState<string | null>(null);

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const handleManualBackup = async () => {
    try {
      await createCloudBackup('MANUAL');
      showNotification(t.backupSuccessMsg, 'success');
    } catch (e: any) {
      showNotification(e?.message || t.error, 'error');
    }
  };

  const handleConfirmRestore = async () => {
    if (!backupToRestore) return;
    try {
      await restoreCloudBackup(backupToRestore);
      setBackupToRestore(null);
      showNotification(t.restoreSuccessMsg, 'success');
    } catch (e: any) {
      showNotification(e?.message || t.error, 'error');
    }
  };

  const handleConfirmDelete = async () => {
    if (!backupToDelete) return;
    try {
      await deleteCloudBackup(backupToDelete);
      setBackupToDelete(null);
    } catch (e: any) {
      showNotification(e?.message || t.error, 'error');
    }
  };

  const handleDownloadSnapshotJSON = (backup: CloudBackupRecord) => {
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `flowapp_snapshot_${backup.createdAt.split('T')[0]}_${backup.type.toLowerCase()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const autoBackupEnabled = settings.autoBackupEnabled !== false;
  const autoBackupInterval = settings.autoBackupIntervalMinutes || 30;

  return (
    <div className="space-y-4 text-xs">
      {/* Feedback Banner */}
      {feedbackMsg && (
        <div
          className={`p-3 rounded-xl border flex items-center justify-between gap-2 font-bold animate-in fade-in zoom-in-95 ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-600 text-emerald-300'
              : 'bg-rose-950/90 border-rose-600 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMsg(null)}
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Hero Action Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 border border-emerald-900/60 rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Cloud className="w-4 h-4" />
              </div>
              <h3 className="font-extrabold text-sm sm:text-base text-white">
                {t.cloudBackupsTitle}
              </h3>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed max-w-xl">
              {t.cloudBackupsSubtitle}
            </p>
          </div>

          <button
            type="button"
            onClick={handleManualBackup}
            disabled={isBackingUp}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-emerald-950 cursor-pointer disabled:opacity-50 transition-all shrink-0"
          >
            {isBackingUp ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <CloudUpload className="w-4 h-4" />
            )}
            <span>{isBackingUp ? t.creatingBackup : t.createManualBackupBtn}</span>
          </button>
        </div>

        {/* Multi-Device Transition Assurance Banner */}
        <div className="bg-slate-950/70 border border-cyan-900/50 rounded-xl p-3 flex items-start gap-2.5 text-cyan-200">
          <Smartphone className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold text-[11px] block">{t.deviceSwitchReady}</span>
            <span className="text-[10px] text-slate-400 block leading-normal">
              {t.deviceSwitchReadyDesc}
            </span>
          </div>
        </div>
      </div>

      {/* Auto Backup Configuration Controls */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="font-bold text-slate-200 text-xs">{t.autoBackupSettings}</span>
          </div>
          <span className="text-[10px] text-slate-400">
            {t.lastBackupLabel}{' '}
            <strong className="text-amber-300 font-mono">
              {settings.lastAutoBackupTimestamp
                ? new Date(settings.lastAutoBackupTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : (language === 'ar' ? 'تلقائي عند أي تحديث' : 'Continuous Active')}
            </strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
          {/* Toggle Switch */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
            <input
              type="checkbox"
              checked={autoBackupEnabled}
              onChange={(e) => updateSettings({ autoBackupEnabled: e.target.checked })}
              className="w-4 h-4 text-emerald-500 rounded focus:ring-0 focus:outline-none accent-emerald-500 cursor-pointer"
            />
            <div>
              <span className="font-bold text-slate-200 block">{t.autoBackupEnabledLabel}</span>
              <span className="text-[10px] text-slate-400 block">
                {language === 'ar' ? 'حفظ لقطة سحابية دورية في Firebase' : 'Periodic cloud snapshot creation'}
              </span>
            </div>
          </label>

          {/* Interval Selector */}
          <div className="flex items-center gap-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
            <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="text-slate-300 font-bold shrink-0">{t.autoBackupIntervalLabel}:</span>
            <select
              value={autoBackupInterval}
              onChange={(e) => updateSettings({ autoBackupIntervalMinutes: Number(e.target.value) })}
              disabled={!autoBackupEnabled}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 font-bold focus:outline-none focus:border-cyan-500 cursor-pointer disabled:opacity-50"
            >
              <option value={15}>{t.min15}</option>
              <option value={30}>{t.min30}</option>
              <option value={60}>{t.hour1}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Snapshots History List */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-slate-200 text-xs">
              {language === 'ar' ? 'النسخ الاحتياطية السحابية المحفوظة' : 'Saved Cloud Backup Snapshots'}
            </span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-400 border border-emerald-800/40">
            {cloudBackups.length} {language === 'ar' ? 'نسخة' : 'snapshots'}
          </span>
        </div>

        {cloudBackups.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <Cloud className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-slate-400 text-xs">{t.noBackupsFound}</p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
            {cloudBackups.map((backup) => {
              const dateStr = new Date(backup.createdAt).toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US', {
                dateStyle: 'medium',
                timeStyle: 'short',
              });

              return (
                <div
                  key={backup.id}
                  className="bg-slate-950/80 border border-slate-800/90 hover:border-slate-700 rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md border ${
                          backup.type === 'AUTO'
                            ? 'bg-amber-950/80 border-amber-600/50 text-amber-300'
                            : 'bg-cyan-950/80 border-cyan-600/50 text-cyan-300'
                        }`}
                      >
                        {backup.type === 'AUTO' ? t.backupTypeAuto : t.backupTypeManual}
                      </span>
                      <span className="font-bold text-white text-xs">{dateStr}</span>
                    </div>

                    {/* Snapshot inventory pills */}
                    <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
                      <span className="flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        <Package className="w-3 h-3 text-emerald-400" />
                        <span>{backup.itemsCount} {t.items}</span>
                      </span>

                      <span className="flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        <Receipt className="w-3 h-3 text-cyan-400" />
                        <span>{backup.transactionsCount} {t.transactions}</span>
                      </span>

                      <span className="flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        <Users className="w-3 h-3 text-amber-400" />
                        <span>{backup.debtsCount} {t.debtsAndLoans}</span>
                      </span>

                      {backup.deviceInfo && (
                        <span className="hidden sm:inline text-slate-500 font-mono text-[9px] truncate max-w-[140px]">
                          {backup.deviceInfo}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex items-center gap-1.5 self-end md:self-center">
                    <button
                      type="button"
                      onClick={() => handleDownloadSnapshotJSON(backup)}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition-colors cursor-pointer"
                      title={t.downloadBackupJSON}
                    >
                      <Download className="w-3.5 h-3.5 text-cyan-400" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setBackupToRestore(backup)}
                      disabled={isRestoring}
                      className="flex items-center gap-1 bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-600/50 hover:border-emerald-500 px-2.5 py-1.5 rounded-lg font-bold transition-colors cursor-pointer text-xs"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{t.restoreBackupBtn}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setBackupToDelete(backup.id)}
                      className="p-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 hover:text-rose-200 rounded-lg border border-rose-800/40 transition-colors cursor-pointer"
                      title={t.deleteBackupBtn}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Restore Confirmation Dialog */}
      {backupToRestore && (
        <div className="p-4 bg-amber-950/90 border border-amber-600 rounded-2xl space-y-3 animate-in fade-in zoom-in-95">
          <div className="flex items-center gap-2 text-amber-200 font-extrabold text-sm">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <span>{t.restoreConfirmTitle}</span>
          </div>
          <p className="text-xs text-amber-200/90 leading-relaxed">
            {t.restoreConfirmDesc}
          </p>
          <div className="flex items-center gap-2 justify-end pt-1">
            <button
              type="button"
              onClick={() => setBackupToRestore(null)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold cursor-pointer"
            >
              {t.cancel}
            </button>
            <button
              type="button"
              onClick={handleConfirmRestore}
              disabled={isRestoring}
              className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-black rounded-lg cursor-pointer flex items-center gap-1.5 shadow-md shadow-amber-950"
            >
              {isRestoring ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
              <span>{isRestoring ? t.restoringBackup : t.confirm}</span>
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {backupToDelete && (
        <div className="p-3 bg-rose-950/90 border border-rose-600 rounded-2xl space-y-2 animate-in fade-in zoom-in-95">
          <div className="flex items-center gap-2 text-rose-200 font-bold text-xs">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{language === 'ar' ? 'هل تريد بالتأكيد حذف هذه اللقطة الاحتياطية؟' : 'Delete this backup snapshot permanently?'}</span>
          </div>
          <div className="flex items-center gap-2 justify-end pt-1">
            <button
              type="button"
              onClick={() => setBackupToDelete(null)}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold cursor-pointer"
            >
              {t.cancel}
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg cursor-pointer"
            >
              {t.confirm}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
