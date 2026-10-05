import React, { useState } from 'react';
import { BankTemplateConfig, BankType, CrossingType, FeedDirection, User } from '../types';
import { StorageService } from '../utils/storage';
import { InteractiveChequeCanvas, EditableFieldKey } from './InteractiveChequeCanvas';
import { AddTemplateModal } from './AddTemplateModal';
import { ActualSizeChequeModal } from './ActualSizeChequeModal';
import { PrinterFeedGuide, FEED_DIRECTION_LABELS } from './PrinterFeedGuide';
import {
  Sliders,
  Check,
  RotateCcw,
  Maximize2,
  Minimize2,
  Move,
  Plus,
  Trash2,
  Image as ImageIcon,
  Upload,
  Eye,
  Users,
} from 'lucide-react';

interface SettingsViewProps {
  currentUser: User;
  onRefreshData: () => void;
  initialBank?: BankType;
  onNavigateToWrite?: () => void;
  onOpenUserManagement?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentUser,
  onRefreshData,
  initialBank,
  onNavigateToWrite,
  onOpenUserManagement,
}) => {
  // Templates state
  const [templates, setTemplates] = useState<Record<BankType, BankTemplateConfig>>(StorageService.getTemplates());
  const [selectedBank, setSelectedBank] = useState<BankType>(initialBank || 'KTB');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Sync initialBank if changed
  React.useEffect(() => {
    if (initialBank && templates[initialBank]) {
      setSelectedBank(initialBank);
    }
  }, [initialBank]);

  // Interactive mouse drag, 1:1 actual size, and enlarged editor states
  const [selectedField, setSelectedField] = useState<EditableFieldKey | null>('payee');
  const [isEnlargedEditorOpen, setIsEnlargedEditorOpen] = useState(false);
  const [isCreateTemplateOpen, setIsCreateTemplateOpen] = useState(false);
  const [isActualSizeOpen, setIsActualSizeOpen] = useState(false);

  // In-app confirmation modal state (No window.confirm)
  const [confirmAction, setConfirmAction] = useState<{
    type: 'RESET' | 'DELETE_TEMPLATE' | 'SAVE';
    templateCode?: string;
    name?: string;
  } | null>(null);

  // Bank template editing
  const currentBankConfig = templates[selectedBank] || Object.values(templates)[0];

  // Upload custom scanned cheque photo as background
  const handleUploadChequeImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('กรุณาเลือกไฟล์รูปภาพเช็คจริง (PNG, JPG, หรือ WEBP)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const updated: BankTemplateConfig = {
        ...currentBankConfig,
        customBgImageUrl: dataUrl,
      };
      StorageService.saveTemplate(updated, currentUser);
      setTemplates((prev) => ({
        ...prev,
        [selectedBank]: updated,
      }));
      setSaveSuccessMsg(`อัปโหลดรูปภาพเช็คจริงสำหรับ "${currentBankConfig.bankNameThai}" สำเร็จแล้ว!`);
      setTimeout(() => setSaveSuccessMsg(null), 3500);
      onRefreshData();
    };
    reader.readAsDataURL(file);
  };

  const handleClearChequeImage = () => {
    const updated: BankTemplateConfig = {
      ...currentBankConfig,
      customBgImageUrl: undefined,
    };
    StorageService.saveTemplate(updated, currentUser);
    setTemplates((prev) => ({
      ...prev,
      [selectedBank]: updated,
    }));
    setSaveSuccessMsg(`ลบรูปภาพเช็คจริงของ "${currentBankConfig.bankNameThai}" เรียบร้อยแล้ว`);
    setTimeout(() => setSaveSuccessMsg(null), 3000);
    onRefreshData();
  };

  const handleUpdateTemplateField = (
    field: EditableFieldKey,
    subField: 'x' | 'y' | 'fontSizePt' | 'letterSpacingMm',
    value: number
  ) => {
    if (field === 'crossing') {
      const updated: BankTemplateConfig = {
        ...currentBankConfig,
        crossing: {
          x: subField === 'x' ? value : currentBankConfig.crossing?.x || 45,
          y: subField === 'y' ? value : currentBankConfig.crossing?.y || 8,
          typeDefault: currentBankConfig.crossing?.typeDefault || 'NONE',
        },
      };
      setTemplates({ ...templates, [selectedBank]: updated });
      return;
    }

    if (field === 'strikeBearer') {
      const updated: BankTemplateConfig = {
        ...currentBankConfig,
        strikeBearer: {
          x: subField === 'x' ? value : currentBankConfig.strikeBearer?.x || 214,
          y: subField === 'y' ? value : currentBankConfig.strikeBearer?.y || 27.5,
          widthMm: currentBankConfig.strikeBearer?.widthMm || 16,
          enabledDefault: currentBankConfig.strikeBearer?.enabledDefault ?? true,
        },
      };
      setTemplates({ ...templates, [selectedBank]: updated });
      return;
    }

    const updated: BankTemplateConfig = {
      ...currentBankConfig,
      fields: {
        ...currentBankConfig.fields,
        [field]: {
          ...(currentBankConfig.fields as any)[field],
          [subField]: value,
        },
      },
    };

    setTemplates({
      ...templates,
      [selectedBank]: updated,
    });
  };

  const handleUpdateFieldPosition = (field: EditableFieldKey, x: number, y: number) => {
    if (field === 'crossing') {
      const updated: BankTemplateConfig = {
        ...currentBankConfig,
        crossing: {
          x,
          y,
          typeDefault: currentBankConfig.crossing?.typeDefault || 'NONE',
        },
      };
      setTemplates({ ...templates, [selectedBank]: updated });
      return;
    }

    if (field === 'strikeBearer') {
      const updated: BankTemplateConfig = {
        ...currentBankConfig,
        strikeBearer: {
          x,
          y,
          widthMm: currentBankConfig.strikeBearer?.widthMm || 16,
          enabledDefault: currentBankConfig.strikeBearer?.enabledDefault ?? true,
        },
      };
      setTemplates({ ...templates, [selectedBank]: updated });
      return;
    }

    const updated: BankTemplateConfig = {
      ...currentBankConfig,
      fields: {
        ...currentBankConfig.fields,
        [field]: {
          ...(currentBankConfig.fields as any)[field],
          x,
          y,
        },
      },
    };

    setTemplates({
      ...templates,
      [selectedBank]: updated,
    });
  };

  const handleUpdateCrossing = (x: number, y: number, typeDefault?: CrossingType) => {
    const updated: BankTemplateConfig = {
      ...currentBankConfig,
      crossing: {
        x,
        y,
        typeDefault: typeDefault ?? currentBankConfig.crossing?.typeDefault ?? 'NONE',
      },
    };
    setTemplates({
      ...templates,
      [selectedBank]: updated,
    });
  };

  const handleUpdateStrikeBearer = (x: number, y: number, widthMm: number, enabledDefault?: boolean) => {
    const updated: BankTemplateConfig = {
      ...currentBankConfig,
      strikeBearer: {
        x,
        y,
        widthMm,
        enabledDefault: enabledDefault ?? currentBankConfig.strikeBearer?.enabledDefault ?? true,
      },
    };
    setTemplates({
      ...templates,
      [selectedBank]: updated,
    });
  };

  const handleToggleHideDate = (hide: boolean) => {
    const updated: BankTemplateConfig = {
      ...currentBankConfig,
      hideDateDefault: hide,
      fields: {
        ...currentBankConfig.fields,
        date: {
          ...currentBankConfig.fields.date,
          enabled: !hide,
        },
      },
    };
    setTemplates({
      ...templates,
      [selectedBank]: updated,
    });
  };

  const handleUpdateFeedDirection = (direction: FeedDirection) => {
    const updated: BankTemplateConfig = {
      ...currentBankConfig,
      feedDirection: direction,
    };
    StorageService.saveTemplate(updated, currentUser);
    setTemplates({
      ...templates,
      [selectedBank]: updated,
    });
    const label = FEED_DIRECTION_LABELS[direction]?.label || direction;
    setSaveSuccessMsg(`บันทึกทิศทางการป้อนเช็คเป็น "${label}" สำเร็จแล้ว`);
    setTimeout(() => setSaveSuccessMsg(null), 3500);
    onRefreshData();
  };

  const handleToggleFieldEnabled = (field: 'payee2' | 'amountNumber2' | 'amountNumber3', enabled: boolean) => {
    const existing = (currentBankConfig.fields as any)[field] || { x: 100, y: 30, fontSizePt: 11 };
    const updated: BankTemplateConfig = {
      ...currentBankConfig,
      fields: {
        ...currentBankConfig.fields,
        [field]: {
          ...existing,
          enabled,
        },
      },
    };
    setTemplates({
      ...templates,
      [selectedBank]: updated,
    });
  };

  const handleUpdateFontSize = (field: EditableFieldKey, fontSizePt: number) => {
    if (field === 'crossing' || field === 'strikeBearer') return;
    const updated: BankTemplateConfig = {
      ...currentBankConfig,
      fields: {
        ...currentBankConfig.fields,
        [field]: {
          ...(currentBankConfig.fields as any)[field],
          fontSizePt,
        },
      },
    };

    setTemplates({
      ...templates,
      [selectedBank]: updated,
    });
  };

  const handleSaveCurrentTemplate = () => {
    setConfirmAction({
      type: 'SAVE',
      name: currentBankConfig.bankNameThai,
    });
  };

  const executeSaveCurrentTemplate = () => {
    StorageService.saveTemplate(currentBankConfig, currentUser);
    setSaveSuccessMsg(`บันทึกการตั้งค่าพิกัดแม่แบบเช็ค "${currentBankConfig.bankNameThai}" สำเร็จเรียบร้อย`);
    setTimeout(() => setSaveSuccessMsg(null), 3000);
    setConfirmAction(null);
    onRefreshData();
  };

  const handleResetBankTemplate = () => {
    setConfirmAction({
      type: 'RESET',
      name: currentBankConfig.bankNameThai,
    });
  };

  const executeResetBankTemplate = () => {
    StorageService.resetBankTemplateToDefault(selectedBank, currentUser);
    const updated = StorageService.getTemplates();
    setTemplates(updated);
    setSaveSuccessMsg(`คืนค่าพิกัดเริ่มต้นสำหรับ ${currentBankConfig.bankNameThai} เรียบร้อยแล้ว`);
    setTimeout(() => setSaveSuccessMsg(null), 3000);
    setConfirmAction(null);
    onRefreshData();
  };

  const handleDeleteTemplate = (code: string) => {
    const tpl = templates[code];
    if (!tpl) return;
    setConfirmAction({
      type: 'DELETE_TEMPLATE',
      templateCode: code,
      name: tpl.bankNameThai,
    });
  };

  const executeDeleteTemplate = (code: string) => {
    StorageService.deleteTemplate(code, currentUser);
    const updated = StorageService.getTemplates();
    setTemplates(updated);
    const remainingKeys = Object.keys(updated);
    if (selectedBank === code && remainingKeys.length > 0) {
      setSelectedBank(remainingKeys[0]);
    }
    setSaveSuccessMsg(`ลบแม่แบบเช็คเรียบร้อยแล้ว`);
    setTimeout(() => setSaveSuccessMsg(null), 3000);
    setConfirmAction(null);
    onRefreshData();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border-2 border-red-200 rounded-2xl p-6 shadow-sm">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2">
            <Sliders className="w-6 h-6 text-red-700" />
            <span>ตั้งค่าตำแหน่งพิมพ์เช็ค (Cheque Templates)</span>
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-600 mt-1">
            ปรับจูนพิกัดตัวหนังสือบนเช็คของแต่ละธนาคาร (กรุงไทย, ธ.ก.ส., ออมสิน) ให้ตรงกับเครื่องพิมพ์ของคุณอย่างแม่นยำ
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {onOpenUserManagement && (
            <button
              type="button"
              onClick={onOpenUserManagement}
              className="h-11 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 border-2 border-slate-300 rounded-xl text-sm font-bold shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Users className="w-4 h-4 text-red-700" />
              <span>👥 จัดการ/เพิ่มสมาชิกในระบบ</span>
            </button>
          )}

          {onNavigateToWrite && (
            <button
              type="button"
              onClick={onNavigateToWrite}
              className="h-11 px-4 bg-red-700 hover:bg-red-800 text-white rounded-xl text-sm font-bold shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              <span>✍️ กลับไปเขียนเช็คด่วน</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsCreateTemplateOpen(true)}
            className="h-11 px-4 bg-white hover:bg-slate-100 text-slate-800 border-2 border-slate-300 rounded-xl text-sm font-bold shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-red-700" />
            <span>+ เพิ่มแม่แบบธนาคาร</span>
          </button>
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="p-4 bg-emerald-50 border-2 border-emerald-500 text-emerald-900 rounded-xl text-sm font-bold flex items-center gap-2.5 shadow-sm animate-in fade-in">
          <Check className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Bank Selector Bar */}
      <div className="p-4 bg-white border-2 border-slate-200 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold text-slate-700">เลือกสมุดเช็คธนาคารที่ต้องการปรับพิกัด:</span>
          <div className="flex flex-wrap items-center gap-2">
            {Object.values(templates).map((tpl) => {
              const isSel = selectedBank === tpl.bankType;
              return (
                <div key={tpl.bankType} className="inline-flex items-center group">
                  <button
                    type="button"
                    onClick={() => setSelectedBank(tpl.bankType)}
                    className={`px-4 py-2 text-sm font-bold rounded-xl border-2 transition-all cursor-pointer flex items-center gap-2 ${
                      isSel
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-emerald-300'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: tpl.bankColor || '#0ea5e9' }}
                    />
                    <span>{tpl.bankType} — {tpl.bankNameThai}</span>
                    {tpl.isCustom && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                        isSel ? 'bg-amber-400 text-slate-950' : 'bg-amber-100 text-amber-800'
                      }`}>
                        กำหนดเอง
                      </span>
                    )}
                  </button>

                  {tpl.isCustom && (
                    <button
                      type="button"
                      onClick={() => handleDeleteTemplate(tpl.bankType)}
                      title={`ลบแม่แบบ ${tpl.bankNameThai}`}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg ml-0.5 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetBankTemplate}
            className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
            title="คืนค่าพิกัดเริ่มต้นมาตรฐานของธนาคารนี้"
          >
            <RotateCcw className="w-4 h-4 text-slate-500" />
            <span>คืนค่ามาตรฐาน {selectedBank}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsEnlargedEditorOpen(true)}
            className="px-4 py-2 bg-sky-700 hover:bg-sky-600 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Maximize2 className="w-4 h-4" />
            <span>เปิดแท่นปรับแบบเต็มจอ</span>
          </button>

          <button
            type="button"
            onClick={handleSaveCurrentTemplate}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>บันทึกพิกัด {selectedBank}</span>
          </button>
        </div>
      </div>

      {/* 1. Large Live Cheque Canvas Workbench */}
      <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div
            onClick={() => setIsActualSizeOpen(true)}
            className="cursor-pointer group"
            title="คลิกเพื่อเปิดดูป็อปอัปขนาดจริง 100% 1:1 (Actual Physical Scale)"
          >
            <h2 className="text-base font-bold text-slate-900 group-hover:text-red-700 transition-colors flex items-center gap-2">
              <span>จำลองตำแหน่งตัวอย่างแบบเรียลไทม์ ({currentBankConfig.widthMm} × {currentBankConfig.heightMm} มม.):</span>
              <span className="text-xs px-2.5 py-1 font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-lg">
                {currentBankConfig.bankNameThai}
              </span>
              <span className="text-xs text-red-600 font-bold group-hover:underline flex items-center gap-1">
                <Maximize2 className="w-3.5 h-3.5" />
                <span>คลิกขยับและดูขนาดจริง 1:1</span>
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              🖱️ คลิกค้างที่ตัวหนังสือบนเช็คเพื่อลากปรับตำแหน่งได้โดยตรง หรือกดเปิดหน้าต่างขนาดจริง 100% เพื่อขยับทาบกับเช็คกระดาษจริง
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* View Actual 1:1 Size Button */}
            <button
              type="button"
              onClick={() => setIsActualSizeOpen(true)}
              className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 ring-2 ring-red-300"
              title="เปิดดูป็อปอัปขนาดจริง 100% 1:1 สามารถขยับตำแหน่งและทาบกระดาษเช็คจริงได้"
            >
              <Maximize2 className="w-4 h-4" />
              <span>🔍 ขยับและดูขนาดจริง 1:1</span>
            </button>

            {/* Upload Scanned Cheque Image Button */}
            <label
              className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-300 text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              title="ใส่รูปถ่ายหรือภาพสแกนเช็คจริงเป็นพื้นหลังอ้างอิง"
            >
              <Upload className="w-4 h-4 text-red-700" />
              <span>📷 {currentBankConfig.customBgImageUrl ? 'เปลี่ยนรูปเช็คจริง' : 'ใส่รูปเช็คจริง'}</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleUploadChequeImage}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Large Interactive Canvas */}
        <InteractiveChequeCanvas
          config={currentBankConfig}
          selectedField={selectedField}
          onSelectField={setSelectedField}
          onUpdateFieldPosition={handleUpdateFieldPosition}
          onUpdateFontSize={handleUpdateFontSize}
          isEnlarged={true}
          showCrosshairsDefault={true}
          onOpenActualSize={() => setIsActualSizeOpen(true)}
          onUploadImage={handleUploadChequeImage}
          onClearImage={handleClearChequeImage}
        />
      </div>

      {/* 2. Coordinate & Font Size Cards */}
      <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-3">
          พิกัดตัวเลขและการจัดวางฟอนต์ (Coordinates & Font Settings)
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 text-xs">
          {/* 1. Date */}
          <div
            onClick={() => setSelectedField('date')}
            className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
              selectedField === 'date'
                ? 'border-emerald-500 bg-emerald-50/50 shadow-sm'
                : 'border-slate-200 bg-slate-50 hover:bg-white'
            }`}
          >
            <div className="font-bold text-slate-900 text-sm mb-2 flex items-center justify-between">
              <span>1. วันที่ (Date)</span>
              {selectedField === 'date' && <span className="text-[10px] text-emerald-700 font-bold">กำลังเลือก</span>}
            </div>

            {/* Toggle hide date */}
            <div className="mb-2.5 p-2 bg-white rounded-lg border border-slate-200">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-red-800 text-[11px] select-none">
                <input
                  type="checkbox"
                  checked={Boolean(currentBankConfig.hideDateDefault)}
                  onChange={(e) => handleToggleHideDate(e.target.checked)}
                  className="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-slate-300"
                />
                <span>ซ่อนวันที่บนเช็ค (ไม่พิมพ์วันที่)</span>
              </label>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                {currentBankConfig.hideDateDefault ? '✓ เปิดซ่อนวันที่: จะไม่ถูกพิมพ์ลงบนเช็ค' : 'แสดงวันที่ตามปกติ'}
              </span>
            </div>

            <div className="space-y-2">
              <div>
                <label className="text-slate-600 font-semibold block mb-0.5">X (มม. จากซ้าย):</label>
                <input
                  type="number"
                  step="0.5"
                  value={currentBankConfig.fields.date.x}
                  onFocus={() => setSelectedField('date')}
                  onChange={(e) => handleUpdateTemplateField('date', 'x', parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 tabular-nums"
                />
              </div>
              <div>
                <label className="text-slate-600 font-semibold block mb-0.5">Y (มม. จากบน):</label>
                <input
                  type="number"
                  step="0.5"
                  value={currentBankConfig.fields.date.y}
                  onFocus={() => setSelectedField('date')}
                  onChange={(e) => handleUpdateTemplateField('date', 'y', parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 tabular-nums"
                />
              </div>
              <div>
                <label className="text-slate-600 font-semibold block mb-0.5">ขนาด Font (pt):</label>
                <input
                  type="number"
                  step="0.5"
                  value={currentBankConfig.fields.date.fontSizePt}
                  onFocus={() => setSelectedField('date')}
                  onChange={(e) => handleUpdateTemplateField('date', 'fontSizePt', parseFloat(e.target.value) || 12)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 tabular-nums"
                />
              </div>
            </div>
          </div>

          {/* 2. Payee (จุดที่ 1) */}
          <div
            onClick={() => setSelectedField('payee')}
            className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
              selectedField === 'payee'
                ? 'border-emerald-500 bg-emerald-50/50 shadow-sm'
                : 'border-slate-200 bg-slate-50 hover:bg-white'
            }`}
          >
            <div className="font-bold text-slate-900 text-sm mb-3 flex items-center justify-between">
              <span>2. สั่งจ่าย จุดที่ 1 (Payee 1)</span>
              {selectedField === 'payee' && <span className="text-[10px] text-emerald-700 font-bold">กำลังเลือก</span>}
            </div>
            <div className="space-y-2">
              <div>
                <label className="text-slate-600 font-semibold block mb-0.5">X (มม.):</label>
                <input
                  type="number"
                  step="0.5"
                  value={currentBankConfig.fields.payee.x}
                  onFocus={() => setSelectedField('payee')}
                  onChange={(e) => handleUpdateTemplateField('payee', 'x', parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 tabular-nums"
                />
              </div>
              <div>
                <label className="text-slate-600 font-semibold block mb-0.5">Y (มม.):</label>
                <input
                  type="number"
                  step="0.5"
                  value={currentBankConfig.fields.payee.y}
                  onFocus={() => setSelectedField('payee')}
                  onChange={(e) => handleUpdateTemplateField('payee', 'y', parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 tabular-nums"
                />
              </div>
              <div>
                <label className="text-slate-600 font-semibold block mb-0.5">ขนาด Font (pt):</label>
                <input
                  type="number"
                  step="0.5"
                  value={currentBankConfig.fields.payee.fontSizePt}
                  onFocus={() => setSelectedField('payee')}
                  onChange={(e) => handleUpdateTemplateField('payee', 'fontSizePt', parseFloat(e.target.value) || 12)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 tabular-nums"
                />
              </div>
            </div>
          </div>

          {/* 3. Payee 2 (จุดที่ 2 - ปรับแยกกันได้) */}
          <div
            onClick={() => setSelectedField('payee2')}
            className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
              selectedField === 'payee2'
                ? 'border-blue-500 bg-blue-50/50 shadow-sm'
                : 'border-slate-200 bg-slate-50 hover:bg-white'
            }`}
          >
            <div className="font-bold text-slate-900 text-sm mb-2 flex items-center justify-between">
              <span>3. สั่งจ่าย จุดที่ 2 (Payee 2)</span>
              {selectedField === 'payee2' && <span className="text-[10px] text-blue-700 font-bold">กำลังเลือก</span>}
            </div>

            <div className="mb-2 p-1.5 bg-white rounded-lg border border-slate-200">
              <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-700 text-[11px] select-none">
                <input
                  type="checkbox"
                  checked={currentBankConfig.fields.payee2?.enabled !== false}
                  onChange={(e) => handleToggleFieldEnabled('payee2', e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                />
                <span>เปิดพิมพ์ชื่อสั่งจ่ายจุดที่ 2</span>
              </label>
            </div>

            <div className="space-y-2">
              <div>
                <label className="text-slate-600 font-semibold block mb-0.5">X (มม.):</label>
                <input
                  type="number"
                  step="0.5"
                  value={currentBankConfig.fields.payee2?.x ?? currentBankConfig.fields.payee.x}
                  onFocus={() => setSelectedField('payee2')}
                  onChange={(e) => handleUpdateTemplateField('payee2', 'x', parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 tabular-nums"
                />
              </div>
              <div>
                <label className="text-slate-600 font-semibold block mb-0.5">Y (มม.):</label>
                <input
                  type="number"
                  step="0.5"
                  value={currentBankConfig.fields.payee2?.y ?? Math.max(5, currentBankConfig.fields.payee.y - 8)}
                  onFocus={() => setSelectedField('payee2')}
                  onChange={(e) => handleUpdateTemplateField('payee2', 'y', parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 tabular-nums"
                />
              </div>
              <div>
                <label className="text-slate-600 font-semibold block mb-0.5">ขนาด Font (pt):</label>
                <input
                  type="number"
                  step="0.5"
                  value={currentBankConfig.fields.payee2?.fontSizePt ?? 11}
                  onFocus={() => setSelectedField('payee2')}
                  onChange={(e) => handleUpdateTemplateField('payee2', 'fontSizePt', parseFloat(e.target.value) || 11)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 tabular-nums"
                />
              </div>
            </div>
          </div>

          {/* 4. Amount Text */}
          <div
            onClick={() => setSelectedField('amountText')}
            className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
              selectedField === 'amountText'
                ? 'border-emerald-500 bg-emerald-50/50 shadow-sm'
                : 'border-slate-200 bg-slate-50 hover:bg-white'
            }`}
          >
            <div className="font-bold text-slate-900 text-sm mb-3 flex items-center justify-between">
              <span>4. ตัวอักษร (Baht Text)</span>
              {selectedField === 'amountText' && <span className="text-[10px] text-emerald-700 font-bold">กำลังเลือก</span>}
            </div>
            <div className="space-y-2">
              <div>
                <label className="text-slate-600 font-semibold block mb-0.5">X (มม.):</label>
                <input
                  type="number"
                  step="0.5"
                  value={currentBankConfig.fields.amountText.x}
                  onFocus={() => setSelectedField('amountText')}
                  onChange={(e) => handleUpdateTemplateField('amountText', 'x', parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 tabular-nums"
                />
              </div>
              <div>
                <label className="text-slate-600 font-semibold block mb-0.5">Y (มม.):</label>
                <input
                  type="number"
                  step="0.5"
                  value={currentBankConfig.fields.amountText.y}
                  onFocus={() => setSelectedField('amountText')}
                  onChange={(e) => handleUpdateTemplateField('amountText', 'y', parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 tabular-nums"
                />
              </div>
              <div>
                <label className="text-slate-600 font-semibold block mb-0.5">ขนาด Font (pt):</label>
                <input
                  type="number"
                  step="0.5"
                  value={currentBankConfig.fields.amountText.fontSizePt}
                  onFocus={() => setSelectedField('amountText')}
                  onChange={(e) => handleUpdateTemplateField('amountText', 'fontSizePt', parseFloat(e.target.value) || 12)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 tabular-nums"
                />
              </div>
            </div>
          </div>

          {/* 5. Amount Number (จุดที่ 1) */}
          <div
            onClick={() => setSelectedField('amountNumber')}
            className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
              selectedField === 'amountNumber'
                ? 'border-emerald-500 bg-emerald-50/50 shadow-sm'
                : 'border-slate-200 bg-slate-50 hover:bg-white'
            }`}
          >
            <div className="font-bold text-slate-900 text-sm mb-3 flex items-center justify-between">
              <span>5. ตัวเลข จุดที่ 1 (Amount 1)</span>
              {selectedField === 'amountNumber' && <span className="text-[10px] text-emerald-700 font-bold">กำลังเลือก</span>}
            </div>
            <div className="space-y-2">
              <div>
                <label className="text-slate-600 font-semibold block mb-0.5">X (มม.):</label>
                <input
                  type="number"
                  step="0.5"
                  value={currentBankConfig.fields.amountNumber.x}
                  onFocus={() => setSelectedField('amountNumber')}
                  onChange={(e) => handleUpdateTemplateField('amountNumber', 'x', parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 tabular-nums"
                />
              </div>
              <div>
                <label className="text-slate-600 font-semibold block mb-0.5">Y (มม.):</label>
                <input
                  type="number"
                  step="0.5"
                  value={currentBankConfig.fields.amountNumber.y}
                  onFocus={() => setSelectedField('amountNumber')}
                  onChange={(e) => handleUpdateTemplateField('amountNumber', 'y', parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 tabular-nums"
                />
              </div>
              <div>
                <label className="text-slate-600 font-semibold block mb-0.5">ขนาด Font (pt):</label>
                <input
                  type="number"
                  step="0.5"
                  value={currentBankConfig.fields.amountNumber.fontSizePt}
                  onFocus={() => setSelectedField('amountNumber')}
                  onChange={(e) => handleUpdateTemplateField('amountNumber', 'fontSizePt', parseFloat(e.target.value) || 12)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 tabular-nums"
                />
              </div>
            </div>
          </div>

          {/* 6. Amount Number 2 (จุดที่ 2 - ปรับแยกกันได้) */}
          <div
            onClick={() => setSelectedField('amountNumber2')}
            className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
              selectedField === 'amountNumber2'
                ? 'border-emerald-600 bg-emerald-50/50 shadow-sm'
                : 'border-slate-200 bg-slate-50 hover:bg-white'
            }`}
          >
            <div className="font-bold text-slate-900 text-sm mb-2 flex items-center justify-between">
              <span>6. ตัวเลข จุดที่ 2 (Amount 2)</span>
              {selectedField === 'amountNumber2' && <span className="text-[10px] text-emerald-700 font-bold">กำลังเลือก</span>}
            </div>

            <div className="mb-2 p-1.5 bg-white rounded-lg border border-slate-200">
              <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-700 text-[11px] select-none">
                <input
                  type="checkbox"
                  checked={currentBankConfig.fields.amountNumber2?.enabled !== false}
                  onChange={(e) => handleToggleFieldEnabled('amountNumber2', e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                />
                <span>เปิดพิมพ์จำนวนเงินจุดที่ 2</span>
              </label>
            </div>

            <div className="space-y-2">
              <div>
                <label className="text-slate-600 font-semibold block mb-0.5">X (มม.):</label>
                <input
                  type="number"
                  step="0.5"
                  value={currentBankConfig.fields.amountNumber2?.x ?? currentBankConfig.fields.amountNumber.x}
                  onFocus={() => setSelectedField('amountNumber2')}
                  onChange={(e) => handleUpdateTemplateField('amountNumber2', 'x', parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 tabular-nums"
                />
              </div>
              <div>
                <label className="text-slate-600 font-semibold block mb-0.5">Y (มม.):</label>
                <input
                  type="number"
                  step="0.5"
                  value={currentBankConfig.fields.amountNumber2?.y ?? Math.max(5, currentBankConfig.fields.amountNumber.y - 20)}
                  onFocus={() => setSelectedField('amountNumber2')}
                  onChange={(e) => handleUpdateTemplateField('amountNumber2', 'y', parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 tabular-nums"
                />
              </div>
              <div>
                <label className="text-slate-600 font-semibold block mb-0.5">ขนาด Font (pt):</label>
                <input
                  type="number"
                  step="0.5"
                  value={currentBankConfig.fields.amountNumber2?.fontSizePt ?? 10}
                  onFocus={() => setSelectedField('amountNumber2')}
                  onChange={(e) => handleUpdateTemplateField('amountNumber2', 'fontSizePt', parseFloat(e.target.value) || 10)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 tabular-nums"
                />
              </div>
            </div>
          </div>

          {/* 7. Amount Number 3 (จุดที่ 3 - ปรับแยกกันได้) */}
          <div
            onClick={() => setSelectedField('amountNumber3')}
            className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
              selectedField === 'amountNumber3'
                ? 'border-purple-600 bg-purple-50/50 shadow-sm'
                : 'border-slate-200 bg-slate-50 hover:bg-white'
            }`}
          >
            <div className="font-bold text-slate-900 text-sm mb-2 flex items-center justify-between">
              <span>7. ตัวเลข จุดที่ 3 (Amount 3)</span>
              {selectedField === 'amountNumber3' && <span className="text-[10px] text-purple-700 font-bold">กำลังเลือก</span>}
            </div>

            <div className="mb-2 p-1.5 bg-white rounded-lg border border-slate-200">
              <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-700 text-[11px] select-none">
                <input
                  type="checkbox"
                  checked={currentBankConfig.fields.amountNumber3?.enabled !== false}
                  onChange={(e) => handleToggleFieldEnabled('amountNumber3', e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-purple-600 focus:ring-purple-500 border-slate-300"
                />
                <span>เปิดพิมพ์จำนวนเงินจุดที่ 3</span>
              </label>
            </div>

            <div className="space-y-2">
              <div>
                <label className="text-slate-600 font-semibold block mb-0.5">X (มม.):</label>
                <input
                  type="number"
                  step="0.5"
                  value={currentBankConfig.fields.amountNumber3?.x ?? currentBankConfig.fields.amountNumber.x}
                  onFocus={() => setSelectedField('amountNumber3')}
                  onChange={(e) => handleUpdateTemplateField('amountNumber3', 'x', parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 tabular-nums"
                />
              </div>
              <div>
                <label className="text-slate-600 font-semibold block mb-0.5">Y (มม.):</label>
                <input
                  type="number"
                  step="0.5"
                  value={currentBankConfig.fields.amountNumber3?.y ?? Math.min(currentBankConfig.heightMm - 10, currentBankConfig.fields.amountNumber.y + 25)}
                  onFocus={() => setSelectedField('amountNumber3')}
                  onChange={(e) => handleUpdateTemplateField('amountNumber3', 'y', parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 tabular-nums"
                />
              </div>
              <div>
                <label className="text-slate-600 font-semibold block mb-0.5">ขนาด Font (pt):</label>
                <input
                  type="number"
                  step="0.5"
                  value={currentBankConfig.fields.amountNumber3?.fontSizePt ?? 10}
                  onFocus={() => setSelectedField('amountNumber3')}
                  onChange={(e) => handleUpdateTemplateField('amountNumber3', 'fontSizePt', parseFloat(e.target.value) || 10)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 tabular-nums"
                />
              </div>
            </div>
          </div>

          {/* 8. การขีดคร่อมเช็ค (Cheque Crossing) */}
          <div
            onClick={() => setSelectedField('crossing')}
            className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
              selectedField === 'crossing'
                ? 'border-red-500 bg-red-50/50 shadow-sm'
                : 'border-slate-200 bg-slate-50 hover:bg-white'
            }`}
          >
            <div className="font-bold text-slate-900 text-sm mb-3 flex items-center justify-between">
              <span>8. การขีดคร่อม (Crossing)</span>
              {selectedField === 'crossing' && <span className="text-[10px] text-red-700 font-bold">กำลังเลือก</span>}
            </div>
            <div className="space-y-2">
              <div>
                <label className="text-slate-600 font-semibold block mb-0.5">X (มม. จากซ้าย):</label>
                <input
                  type="number"
                  step="0.5"
                  value={currentBankConfig.crossing?.x ?? 45}
                  onFocus={() => setSelectedField('crossing')}
                  onChange={(e) =>
                    handleUpdateCrossing(parseFloat(e.target.value) || 0, currentBankConfig.crossing?.y ?? 8)
                  }
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 tabular-nums"
                />
              </div>
              <div>
                <label className="text-slate-600 font-semibold block mb-0.5">Y (มม. จากบน):</label>
                <input
                  type="number"
                  step="0.5"
                  value={currentBankConfig.crossing?.y ?? 8}
                  onFocus={() => setSelectedField('crossing')}
                  onChange={(e) =>
                    handleUpdateCrossing(currentBankConfig.crossing?.x ?? 45, parseFloat(e.target.value) || 0)
                  }
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 tabular-nums"
                />
              </div>
              <div>
                <label className="text-slate-600 font-semibold block mb-0.5">รูปแบบขีดคร่อมเริ่มต้น:</label>
                <select
                  value={currentBankConfig.crossing?.typeDefault || 'NONE'}
                  onChange={(e) =>
                    handleUpdateCrossing(
                      currentBankConfig.crossing?.x ?? 45,
                      currentBankConfig.crossing?.y ?? 8,
                      e.target.value as CrossingType
                    )
                  }
                  className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-medium text-xs cursor-pointer"
                >
                  <option value="NONE">ไม่ขีดคร่อม (NONE)</option>
                  <option value="AC_PAYEE">// A/C PAYEE ONLY // (เข้าบัญชีผู้รับ)</option>
                  <option value="AND_CO">// & CO. // (เข้าบัญชีทั่วไป)</option>
                </select>
              </div>
            </div>
          </div>

          {/* 9. ขีดฆ่า "หรือผู้ถือ" (Strike-through Or Bearer) */}
          <div
            onClick={() => setSelectedField('strikeBearer')}
            className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
              selectedField === 'strikeBearer'
                ? 'border-red-500 bg-red-50/50 shadow-sm'
                : 'border-slate-200 bg-slate-50 hover:bg-white'
            }`}
          >
            <div className="font-bold text-slate-900 text-sm mb-3 flex items-center justify-between">
              <span>9. ขีดฆ่า "หรือผู้ถือ"</span>
              {selectedField === 'strikeBearer' && <span className="text-[10px] text-red-700 font-bold">กำลังเลือก</span>}
            </div>
            <div className="space-y-2">
              <div>
                <label className="text-slate-600 font-semibold block mb-0.5">X (มม. จากซ้าย):</label>
                <input
                  type="number"
                  step="0.5"
                  value={currentBankConfig.strikeBearer?.x ?? 214}
                  onFocus={() => setSelectedField('strikeBearer')}
                  onChange={(e) =>
                    handleUpdateStrikeBearer(
                      parseFloat(e.target.value) || 0,
                      currentBankConfig.strikeBearer?.y ?? 27.5,
                      currentBankConfig.strikeBearer?.widthMm ?? 16
                    )
                  }
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 tabular-nums"
                />
              </div>
              <div>
                <label className="text-slate-600 font-semibold block mb-0.5">Y (มม. จากบน):</label>
                <input
                  type="number"
                  step="0.5"
                  value={currentBankConfig.strikeBearer?.y ?? 27.5}
                  onFocus={() => setSelectedField('strikeBearer')}
                  onChange={(e) =>
                    handleUpdateStrikeBearer(
                      currentBankConfig.strikeBearer?.x ?? 214,
                      parseFloat(e.target.value) || 0,
                      currentBankConfig.strikeBearer?.widthMm ?? 16
                    )
                  }
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 tabular-nums"
                />
              </div>
              <div>
                <label className="text-slate-600 font-semibold block mb-0.5">ความยาวเส้น (มม.):</label>
                <input
                  type="number"
                  step="0.5"
                  value={currentBankConfig.strikeBearer?.widthMm ?? 16}
                  onFocus={() => setSelectedField('strikeBearer')}
                  onChange={(e) =>
                    handleUpdateStrikeBearer(
                      currentBankConfig.strikeBearer?.x ?? 214,
                      currentBankConfig.strikeBearer?.y ?? 27.5,
                      parseFloat(e.target.value) || 16
                    )
                  }
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 tabular-nums"
                />
              </div>
            </div>
          </div>

          {/* 10. รูปภาพสแกนเช็คจริง (Scanned Cheque Background) */}
          <div className="p-4 rounded-xl border-2 border-slate-200 bg-slate-50 hover:bg-white transition-all space-y-2.5">
            <div className="font-bold text-slate-900 text-sm flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-red-700" />
                <span>10. รูปภาพเช็คจริง</span>
              </span>
              {currentBankConfig.customBgImageUrl ? (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                  มีรูปภาพแล้ว
                </span>
              ) : (
                <span className="text-[10px] bg-slate-200 text-slate-600 font-bold px-2 py-0.5 rounded-full">
                  ยังไม่ได้ใส่
                </span>
              )}
            </div>
            
            <p className="text-[11px] text-slate-500 leading-relaxed">
              อัปโหลดรูปถ่ายหรือสแกนเช็คจริง เพื่อแสดงเป็นพื้นหลังช่วยเทียบตำแหน่งตัวหนังสือให้ตรงช่องแบบ 100%
            </p>

            <div className="pt-1 flex flex-col gap-2">
              <label className="w-full py-2 bg-red-700 hover:bg-red-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>{currentBankConfig.customBgImageUrl ? 'เปลี่ยนรูปภาพเช็คจริง' : 'อัปโหลดภาพเช็คจริง'}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleUploadChequeImage}
                  className="hidden"
                />
              </label>

              {currentBankConfig.customBgImageUrl && (
                <button
                  type="button"
                  onClick={handleClearChequeImage}
                  className="w-full py-1.5 bg-white hover:bg-red-50 text-red-700 border border-red-300 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>ลบรูปภาพเช็คออก</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={handleSaveCurrentTemplate}
            className="h-11 px-6 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold shadow-md transition-colors cursor-pointer flex items-center gap-2"
          >
            <Check className="w-5 h-5" />
            <span>บันทึกการตั้งค่าพิกัด {selectedBank}</span>
          </button>
        </div>
      </div>

      {/* 3. Printer Feed Direction & Feeding Guide (ทิศทางการป้อนเช็คเข้าเครื่องพิมพ์) */}
      <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              ทิศทางการป้อนเช็คเข้าเครื่องพิมพ์ (Printer Feed Direction)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              กำหนดทิศทางที่เครื่องพิมพ์ของหน่วยงานดึงกระดาษเช็คเข้าไป เพื่อให้ข้อความพิมพ์ออกมาถูกทิศทาง 100%
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {[
              { key: 'LANDSCAPE_NORMAL', label: '↔ แนวนอนปกติ (0°)', desc: 'สอดซ้าย/ต้นขั้วเข้าก่อน' },
              { key: 'LANDSCAPE_FLIPPED', label: '🔄 แนวนอนกลับด้าน (180°)', desc: 'สอดขวา/ยอดเงินเข้าก่อน' },
              { key: 'PORTRAIT_TOP', label: '⬆ แนวตั้ง (90°)', desc: 'สอดขอบบนเข้าก่อน' },
              { key: 'PORTRAIT_BOTTOM', label: '⬇ แนวตั้ง (270°)', desc: 'สอดขอบล่างเข้าก่อน' },
            ].map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => handleUpdateFeedDirection(opt.key as FeedDirection)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer text-left ${
                  (currentBankConfig.feedDirection || 'LANDSCAPE_NORMAL') === opt.key
                    ? 'bg-red-700 text-white border-red-700 shadow-sm ring-2 ring-red-300'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300'
                }`}
              >
                <div>{opt.label}</div>
                <div className="text-[10px] font-normal opacity-85">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <PrinterFeedGuide
          bankType={selectedBank}
          direction={currentBankConfig.feedDirection || 'LANDSCAPE_NORMAL'}
          onChangeDirection={handleUpdateFeedDirection}
        />
      </div>

      {/* ADD / CREATE CUSTOM CHEQUE TEMPLATE MODAL */}
      {isCreateTemplateOpen && (
        <AddTemplateModal
          isOpen={isCreateTemplateOpen}
          onClose={() => setIsCreateTemplateOpen(false)}
          currentUser={currentUser}
          onSuccess={(newCode) => {
            const updated = StorageService.getTemplates();
            setTemplates(updated);
            setSelectedBank(newCode);
            setSaveSuccessMsg(`สร้างแม่แบบเช็ค "${newCode}" สำเร็จแล้ว สามารถปรับพิกัดต่อได้ทันที`);
            setTimeout(() => setSaveSuccessMsg(null), 3500);
            onRefreshData();
          }}
        />
      )}

      {/* ENLARGED FULLSCREEN POPUP MODAL FOR DRAG & DROP ADJUSTMENT */}
      {isEnlargedEditorOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/85 backdrop-blur-md flex flex-col animate-in fade-in duration-200">
          {/* Header */}
          <div className="px-5 py-3.5 bg-slate-900 border-b border-slate-800 text-white flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3">
              <span className="p-2 bg-emerald-600 rounded-xl text-white shadow-xs">
                <Move className="w-5 h-5" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white">
                    ปรับตำแหน่งพิกัดและขนาดตัวอักษรด้วยเมาส์ (Full Screen Cheque Editor)
                  </h2>
                  <span className="px-2.5 py-0.5 text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-md">
                    {currentBankConfig.bankNameThai} ({currentBankConfig.widthMm} × {currentBankConfig.heightMm} มม.)
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  🖱️ คลิกค้างที่ตัวหนังสือบนเช็คเพื่อลากปรับตำแหน่ง หรือใช้ปุ่มลูกศรเพื่อปรับละเอียดทีละ 0.5 มม.
                </p>
              </div>
            </div>

            {/* Bank Switch Tabs in Popup */}
            <div className="flex items-center gap-1.5 bg-slate-800/90 p-1 rounded-xl border border-slate-700">
              {Object.values(templates).map((tpl) => (
                <button
                  key={tpl.bankType}
                  type="button"
                  onClick={() => setSelectedBank(tpl.bankType)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    selectedBank === tpl.bankType
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  {tpl.bankType} ({tpl.bankNameThai})
                </button>
              ))}
            </div>

            {/* Actions: Save, Close */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSaveCurrentTemplate}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>บันทึกพิกัด {selectedBank}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsEnlargedEditorOpen(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                title="ปิดหน้าต่างขยาย"
              >
                <Minimize2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Scrollable Center Canvas Area */}
          <div className="flex-1 overflow-auto p-4 sm:p-8 flex items-center justify-center bg-slate-950/70">
            <InteractiveChequeCanvas
              config={currentBankConfig}
              selectedField={selectedField}
              onSelectField={setSelectedField}
              onUpdateFieldPosition={handleUpdateFieldPosition}
              onUpdateFontSize={handleUpdateFontSize}
              isEnlarged={true}
              showCrosshairsDefault={true}
              onOpenActualSize={() => setIsActualSizeOpen(true)}
              onUploadImage={handleUploadChequeImage}
              onClearImage={handleClearChequeImage}
            />
          </div>

          {/* Footer info bar */}
          <div className="px-5 py-3 bg-slate-900 border-t border-slate-800 text-slate-300 text-xs flex flex-wrap items-center justify-between gap-3 shrink-0">
            <span>💡 <strong>คำแนะนำ:</strong> คลิกค้างที่กล่องข้อความบนเช็คแล้วลากไปยังตำแหน่งที่ต้องการ หรือใช้ปุ่มลูกศรเพื่อปรับทีละ 0.5 มม.</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsActualSizeOpen(true)}
                className="px-3.5 py-1.5 bg-red-700 hover:bg-red-800 text-white rounded-lg font-bold shadow-xs cursor-pointer transition-colors flex items-center gap-1.5"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>ดูขนาดจริง 1:1</span>
              </button>
              <button
                type="button"
                onClick={() => setIsEnlargedEditorOpen(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold shadow-xs cursor-pointer transition-colors border border-slate-700"
              >
                ปิดหน้าต่างขยาย
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1:1 ACTUAL PHYSICAL SCALE MODAL POPUP (241 × 90 มม. ขนาดเท่าของจริง 100%) */}
      <ActualSizeChequeModal
        isOpen={isActualSizeOpen}
        onClose={() => setIsActualSizeOpen(false)}
        config={currentBankConfig}
        currentUser={currentUser}
        onUpdateFieldPosition={handleUpdateFieldPosition}
        onUpdateFontSize={handleUpdateFontSize}
        onSaveConfig={(updated) => {
          StorageService.saveTemplate(updated, currentUser);
          setTemplates((prev) => ({ ...prev, [selectedBank]: updated }));
          setSaveSuccessMsg(`บันทึกพิกัดและขนาดตัวอักษรของ ${updated.bankNameThai} จากหน้าจอขนาดจริง 100% สำเร็จแล้ว`);
          setTimeout(() => setSaveSuccessMsg(null), 3500);
          onRefreshData();
        }}
      />

      {/* In-app Confirmation Modal for Save, Reset, or Delete Template */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 border-2 border-red-200">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-2.5">
              {confirmAction.type === 'SAVE'
                ? 'ยืนยันการบันทึกการตั้งค่าพิกัด'
                : confirmAction.type === 'RESET'
                ? 'ยืนยันการคืนค่าพิกัดเริ่มต้น'
                : 'ยืนยันการลบแม่แบบธนาคาร'}
            </h3>

            <p className="text-xs text-slate-600">
              {confirmAction.type === 'SAVE'
                ? `คุณต้องการบันทึกตำแหน่งพิกัดและขนาดตัวอักษรของแม่แบบเช็ค "${confirmAction.name || selectedBank}" ใช่หรือไม่?`
                : confirmAction.type === 'RESET'
                ? `คุณต้องการคืนค่าพิกัดเริ่มต้นมาตรฐานของ ${confirmAction.name || selectedBank} ใช่หรือไม่? การตั้งค่าพิกัดที่เคยปรับแต่งจะถูกรีเซ็ตกลับเป็นค่าโรงงาน`
                : `คุณต้องการลบแม่แบบเช็ค "${confirmAction.name}" (${confirmAction.templateCode}) ออกจากระบบอย่างถาวร ใช่หรือไม่?`}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirmAction.type === 'SAVE') {
                    executeSaveCurrentTemplate();
                  } else if (confirmAction.type === 'RESET') {
                    executeResetBankTemplate();
                  } else if (confirmAction.type === 'DELETE_TEMPLATE' && confirmAction.templateCode) {
                    executeDeleteTemplate(confirmAction.templateCode);
                  }
                }}
                className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                {confirmAction.type === 'SAVE' ? 'บันทึกพิกัดทันที' : 'ยืนยันการดำเนินการ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
