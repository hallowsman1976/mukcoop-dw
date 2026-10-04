import React, { useState, useRef } from 'react';
import { Member, BankAccount, AccountType } from '../types';
import { StorageService } from '../services/storageService';
import {
  padMemberId,
  formatCitizenId,
  formatAccountNo,
  validateFileSize,
  isValidMemberId,
  isValidAccountNo,
  isValidCitizenId,
} from '../utils/validators';
import {
  IMPORT_TEMPLATE_CSV,
  downloadImportTemplateCsv,
  IMPORT_TEMPLATE_COLUMNS,
} from '../utils/importTemplate';
import confetti from 'canvas-confetti';
import {
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  X,
  FileText,
  Sparkles,
  Users,
  Layers,
  ArrowRight,
  Database,
  Trash2,
  ShieldCheck,
  CreditCard,
  UserCheck,
  Copy,
  Check,
  TableProperties,
} from 'lucide-react';

interface ParsedMemberRow {
  index: number;
  rowNo?: number;
  rawMemberId: string;
  memberId: string;
  citizenId: string;
  fullName: string;
  phone: string;
  accountNo: string;
  rawAccountNo?: string;
  accountType: AccountType;
  initialDeposit: number;
  accruedInterest?: number;
  isValid: boolean;
  isMemberIdValid: boolean;
  isAccountIdValid: boolean;
  isCitizenIdValid: boolean;
  errors: string[];
  isDuplicate: boolean;
}

interface MemberUploadFormProps {
  existingMembers: Member[];
  existingAccounts: BankAccount[];
  onUploadSuccess: (importedMembersCount: number, importedAccountsCount: number) => void;
  onCancel: () => void;
}

export const MemberUploadForm: React.FC<MemberUploadFormProps> = ({
  existingMembers,
  existingAccounts,
  onUploadSuccess,
  onCancel,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [fileSizeStr, setFileSizeStr] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedMemberRow[]>([]);
  const [rawText, setRawText] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [activeInputMethod, setActiveInputMethod] = useState<'file' | 'paste'>('file');

  // Import Options
  const [autoCreateAccount, setAutoCreateAccount] = useState<boolean>(true);
  const [defaultAccountType, setDefaultAccountType] = useState<AccountType>('ออมทรัพย์');
  const [updateExisting, setUpdateExisting] = useState<boolean>(true);
  const [copiedTemplate, setCopiedTemplate] = useState<boolean>(false);
  const [showTemplateGuide, setShowTemplateGuide] = useState<boolean>(true);

  // Parse CSV / Text lines
  const parseContent = (content: string) => {
    const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) {
      setParsedRows([]);
      return;
    }

    const rows: ParsedMemberRow[] = [];

    // Check if first line is a header
    const firstLineLower = lines[0].toLowerCase();
    const splitLine = (l: string) =>
      l.includes('	') ? l.split('	') : l.includes(';') ? l.split(';') : l.split(',');
    const headerCells = splitLine(lines[0]).map((c) => c.replace(/['"]/g, '').trim());
    const colIndex = (name: string) => headerCells.indexOf(name);
    // Header row of the Accounts-sheet template: map columns by name so the order may vary.
    const isTemplateHeader = colIndex('หมายเลขบัญชี') >= 0 && colIndex('รหัสสมาชิก') >= 0;
    const cols = isTemplateHeader
      ? {
          no: colIndex('ลำดับ'),
          accountNo: colIndex('หมายเลขบัญชี'),
          memberId: colIndex('รหัสสมาชิก'),
          citizenId: colIndex('หมายเลขบัตรประชาชน'),
          accountName: colIndex('ชื่อบัญชีเงินฝาก'),
          accountType: colIndex('ประเภทบัญชี'),
          balance: colIndex('ยอดคงเหลือ'),
          accruedInterest: colIndex('ดอกเบี้ยสะสม'),
          contact: colIndex('ข้อมูลติดต่อล่าสุด'),
        }
      : null;

    const startIndex =
      isTemplateHeader ||
      firstLineLower.includes('ลำดับ') ||
      firstLineLower.includes('ยอดคงเหลือ') ||
      firstLineLower.includes('ดอกเบี้ย') ||
      firstLineLower.includes('รหัส') ||
      firstLineLower.includes('member') ||
      firstLineLower.includes('citizen') ||
      firstLineLower.includes('ชื่อ')
        ? 1
        : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const parts = splitLine(line);
      const clean = (v?: string) => (v || '').replace(/['"]/g, '').trim();
      const num = (v?: string) => parseFloat((v || '').replace(/[^0-9.]/g, '')) || 0;

      let rowNo: number | undefined = undefined;
      let rawMId = '';
      let rawCId = '';
      let rawName = '';
      let rawAccNo = '';
      let rawPhone = '';
      let rawAccType = '';
      let rawDeposit = 500;
      let rawAccruedInterest = 0;

      if (cols) {
        const at = (idx: number) => (idx >= 0 ? parts[idx] : '');
        rowNo = cols.no >= 0 ? parseInt(clean(at(cols.no)), 10) || undefined : undefined;
        rawAccNo = clean(at(cols.accountNo));
        rawMId = clean(at(cols.memberId));
        rawCId = clean(at(cols.citizenId)).replace(/[^0-9]/g, '');
        rawName = clean(at(cols.accountName));
        rawAccType = clean(at(cols.accountType));
        rawDeposit = num(at(cols.balance));
        rawAccruedInterest = num(at(cols.accruedInterest));
        rawPhone = clean(at(cols.contact));
      } else if (parts.length >= 8) {
        // Headerless Accounts-sheet order:
        // accountNo, memberId, citizenId, accountName, accountType, balance, accruedInterest, contact
        rawAccNo = clean(parts[0]);
        rawMId = clean(parts[1]);
        rawCId = clean(parts[2]).replace(/[^0-9]/g, '');
        rawName = clean(parts[3]);
        rawAccType = clean(parts[4]);
        rawDeposit = num(parts[5]);
        rawAccruedInterest = num(parts[6]);
        rawPhone = clean(parts[7]);
      } else if (parts.length >= 7) {
        // Format: MemberID, CitizenID, Name, AccountNo, Phone, AccountType, Deposit
        rawMId = (parts[0] || '').replace(/['"]/g, '').trim();
        rawCId = (parts[1] || '').replace(/[^0-9]/g, '').trim();
        rawName = (parts[2] || '').replace(/['"]/g, '').trim();
        rawAccNo = (parts[3] || '').replace(/['"]/g, '').trim();
        rawPhone = (parts[4] || '').replace(/['"]/g, '').trim();
        rawAccType = (parts[5] || '').replace(/['"]/g, '').trim();
        rawDeposit = parseFloat((parts[6] || '').replace(/[^0-9.]/g, '')) || 500;
      } else {
        // Standard Format: MemberID, CitizenID, Name, Phone, AccountType, Deposit
        rawMId = (parts[0] || '').replace(/['"]/g, '').trim();
        rawCId = (parts[1] || '').replace(/[^0-9]/g, '').trim();
        rawName = (parts[2] || '').replace(/['"]/g, '').trim();
        rawPhone = (parts[3] || '').replace(/['"]/g, '').trim();
        rawAccType = (parts[4] || '').replace(/['"]/g, '').trim();
        rawDeposit = parseFloat((parts[5] || '').replace(/[^0-9.]/g, '')) || 500;
      }

      const errors: string[] = [];

      // 1. Rigorous Member ID Validation
      const memberValidation = isValidMemberId(rawMId);
      const isMemberIdValid = memberValidation.valid;
      const paddedMId = memberValidation.padded || padMemberId(rawMId);
      if (!memberValidation.valid && memberValidation.error) {
        errors.push(memberValidation.error);
      }

      // 2. Rigorous Citizen ID Validation
      const isCitizenIdValid = rawCId.length === 13;
      if (!rawCId) {
        errors.push('ไม่ระบุเลขประจำตัวประชาชน');
      } else if (rawCId.length !== 13) {
        errors.push(`เลขประจำตัวประชาชนต้องครบ 13 หลัก (พบ ${rawCId.length} หลัก)`);
      }

      if (!rawName) {
        errors.push('ไม่ระบุชื่อ-นามสกุลสมาชิก');
      }

      const accType: AccountType =
        rawAccType.includes('พิเศษ') || rawAccNo.startsWith('201')
          ? 'ออมทรัพย์พิเศษ'
          : 'ออมทรัพย์';

      // 3. Rigorous Account ID Validation
      const prefix = accType === 'ออมทรัพย์พิเศษ' ? '201-5' : '101-2';
      const fallbackAccNo = `${prefix}-${paddedMId || '00000'}-1`;

      let isAccountIdValid = true;
      let formattedAccNo = fallbackAccNo;

      if (rawAccNo) {
        const accValidation = isValidAccountNo(rawAccNo, paddedMId);
        isAccountIdValid = accValidation.valid;
        formattedAccNo = accValidation.formatted;
        if (!accValidation.valid && accValidation.error) {
          errors.push(accValidation.error);
        }
      } else {
        formattedAccNo = fallbackAccNo;
      }

      // 4. Duplicate Checks (Both Member ID and Account ID)
      const isMemberDupInDb = existingMembers.some((m) => m.memberId === paddedMId);
      const isCitizenDupInDb = existingMembers.some((m) => m.citizenId === rawCId);
      const isAccountDupInDb = existingAccounts.some((a) => a.accountNo === formattedAccNo);

      const isMemberDupInBatch = rows.some((r) => r.memberId === paddedMId);
      const isAccountDupInBatch = rows.some((r) => r.accountNo === formattedAccNo);

      const isDuplicate =
        isMemberDupInDb ||
        isCitizenDupInDb ||
        isMemberDupInBatch ||
        isAccountDupInDb ||
        isAccountDupInBatch;

      if (isMemberDupInBatch) {
        errors.push(`รหัสสมาชิก ${paddedMId} ซ้ำกับรายการอื่นในไฟล์เดียวกัน`);
      }
      if (isAccountDupInBatch) {
        errors.push(`หมายเลขบัญชี ${formattedAccNo} ซ้ำกับรายการอื่นในไฟล์เดียวกัน`);
      }

      rows.push({
        index: i + 1,
        rowNo,
        rawMemberId: rawMId,
        memberId: paddedMId,
        citizenId: rawCId,
        fullName: rawName,
        phone: rawPhone || '089-000-0000',
        accountNo: formattedAccNo,
        rawAccountNo: rawAccNo,
        accountType: accType,
        initialDeposit: rawDeposit,
        accruedInterest: rawAccruedInterest,
        isValid: errors.length === 0,
        isMemberIdValid,
        isAccountIdValid,
        isCitizenIdValid,
        errors,
        isDuplicate,
      });
    }

    setParsedRows(rows);
  };

  // Handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateFileSize(file);
    if (!validation.valid) {
      alert(validation.error || 'ขนาดไฟล์เกิน 5MB');
      return;
    }

    setSelectedFileName(file.name);
    setFileSizeStr(`${(file.size / 1024).toFixed(1)} KB`);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseContent(text);
    };
    reader.readAsText(file, 'UTF-8');
  };

  // Load sample 8-column demo data
  const handleLoadDemoTemplate = () => {
    setRawText(IMPORT_TEMPLATE_CSV);
    setActiveInputMethod('paste');
    setSelectedFileName('import_template_sample.csv');
    setFileSizeStr('1.8 KB');
    parseContent(IMPORT_TEMPLATE_CSV);
  };

  // Download Official 8-column CSV Template (import_template.csv)
  const handleDownloadTemplate = () => {
    downloadImportTemplateCsv('import_template.csv');
  };

  // Copy 8-column template CSV to clipboard
  const handleCopyTemplate = async () => {
    try {
      await navigator.clipboard.writeText(IMPORT_TEMPLATE_CSV);
      setCopiedTemplate(true);
      setTimeout(() => setCopiedTemplate(false), 2500);
    } catch {
      // fallback
    }
  };

  // Perform Final Batch Import: the server re-validates every row and writes the sheet.
  const [importErrors, setImportErrors] = useState<string[]>([]);

  const handleConfirmImport = async () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      setImportErrors(['ไม่พบข้อมูลสมาชิกที่ถูกต้องสำหรับนำเข้า']);
      return;
    }

    setIsProcessing(true);
    setImportErrors([]);

    const rows = validRows.map((r) => {
      const accType = r.accountType || defaultAccountType;
      const prefix = accType === 'ออมทรัพย์พิเศษ' ? '201-5' : '101-2';
      return {
        memberId: r.memberId,
        citizenId: r.citizenId,
        fullName: r.fullName,
        accountName: r.fullName,
        accountNo: r.accountNo || `${prefix}-${r.memberId}-1`,
        accountType: accType,
        balance: r.initialDeposit ?? 0,
        accruedInterest: r.accruedInterest ?? 0,
        contact: r.phone,
      };
    });

    try {
      const result = await StorageService.importMembers(rows, updateExisting);
      if (result.errors.length) setImportErrors(result.errors);
      if (result.addedMembers || result.addedAccounts || result.updatedAccounts) {
        try {
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        } catch {
          // ignore
        }
        if (!result.errors.length) onUploadSuccess(result.addedMembers, result.addedAccounts);
      }
    } catch (err) {
      setImportErrors([err instanceof Error ? err.message : 'นำเข้าข้อมูลไม่สำเร็จ']);
    } finally {
      setIsProcessing(false);
    }
  };

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const errorCount = parsedRows.filter((r) => !r.isValid).length;
  const duplicateCount = parsedRows.filter((r) => r.isDuplicate).length;

  return (
    <div className="max-w-4xl mx-auto my-4 bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
      {/* Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-xs flex items-center justify-center text-indigo-300 border border-white/20">
              <Upload className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold">
                  แบบฟอร์มอัปโหลดนำเข้าข้อมูลสมาชิก (Batch Member Upload)
                </h2>
                <span className="text-[10px] bg-indigo-500/30 text-indigo-300 font-semibold px-2 py-0.5 rounded-full border border-indigo-400/30">
                  CSV / Excel
                </span>
              </div>
              <p className="text-xs text-indigo-200 mt-0.5">
                นำเข้าสมาชิกหลายคนพร้อมกัน เติมเลขศูนย์ 5 หลักให้อัตโนมัติ และสร้างบัญชีเงินฝากเล่มแรกทันที
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-semibold transition-all border border-white/20 shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>ดาวน์โหลดไฟล์ตัวอย่าง (.csv)</span>
          </button>
        </div>
      </div>

      <div className="p-5 sm:p-6 space-y-6">
        {/* Dedicated 8-Column Import Template Reference Card */}
        <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50/70 via-white to-blue-50/50 p-4 sm:p-5 shadow-2xs space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                <TableProperties className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-slate-900">
                    โครงสร้างแม่แบบนำเข้า: ตารางข้อมูลบัญชีเงินฝากเริ่มต้น (ตาม sheet Accounts)
                  </h3>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                    import_template.csv
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  ตารางแม่แบบเรียงคอลัมน์ตาม sheet Accounts สำหรับตั้งต้นฐานข้อมูลสมาชิกและบัญชีเงินฝาก
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
                title="ดาวน์โหลด import_template.csv (โครงสร้างตาม sheet Accounts)"
              >
                <Download className="w-3.5 h-3.5" />
                <span>ดาวน์โหลด import_template.csv</span>
              </button>
              <button
                type="button"
                onClick={handleCopyTemplate}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-300 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                title="คัดลอกรูปแบบแม่แบบ CSV"
              >
                {copiedTemplate ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">คัดลอกแล้ว!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>คัดลอกแม่แบบ CSV</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleLoadDemoTemplate}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                title="ใส่ข้อมูลตัวอย่างลงในแบบฟอร์ม"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>โหลดตัวอย่าง</span>
              </button>
            </div>
          </div>

          {/* 8 Columns Specification Table */}
          <div className="overflow-x-auto rounded-xl border border-indigo-100 bg-white">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="bg-slate-50 border-b border-indigo-100 text-slate-700 font-semibold">
                  <th className="py-2 px-2.5 text-center w-10">คอลัมน์</th>
                  <th className="py-2 px-2.5">ชื่อคอลัมน์ (Headers)</th>
                  <th className="py-2 px-2.5">ตัวอย่างข้อมูล (Sample)</th>
                  <th className="py-2 px-2.5">คำอธิบายและข้อกำหนด</th>
                  <th className="py-2 px-2.5 text-center w-16">ความจำเป็น</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {IMPORT_TEMPLATE_COLUMNS.map((col, idx) => (
                  <tr key={col.key} className="hover:bg-indigo-50/30">
                    <td className="py-1.5 px-2.5 text-center font-mono text-slate-400 font-bold">
                      {idx + 1}
                    </td>
                    <td className="py-1.5 px-2.5 font-bold text-slate-800 font-mono">
                      {col.name}
                    </td>
                    <td className="py-1.5 px-2.5 font-mono text-indigo-700 font-medium">
                      {col.example}
                    </td>
                    <td className="py-1.5 px-2.5 text-slate-600">
                      {col.description}
                    </td>
                    <td className="py-1.5 px-2.5 text-center">
                      {col.required ? (
                        <span className="text-[10px] text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded font-medium border border-rose-200">
                          จำเป็น
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                          ตัวเลือก
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Input Method Selector (Upload File or Direct Paste Text) */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveInputMethod('file')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeInputMethod === 'file'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              อัปโหลดไฟล์ (.csv / .txt)
            </button>
            <button
              type="button"
              onClick={() => setActiveInputMethod('paste')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeInputMethod === 'paste'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              วางข้อความโดยตรง (Direct Paste)
            </button>
          </div>

          <button
            type="button"
            onClick={handleLoadDemoTemplate}
            className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>โหลดตัวอย่างแม่แบบ</span>
          </button>
        </div>

        {/* Option 1: File Drag & Drop Zone */}
        {activeInputMethod === 'file' && (
          <div className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt,.xlsx"
              onChange={handleFileChange}
              className="hidden"
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (file) {
                  const fakeEvent = {
                    target: { files: [file] },
                  } as unknown as React.ChangeEvent<HTMLInputElement>;
                  handleFileChange(fakeEvent);
                }
              }}
              className="border-2 border-dashed border-slate-300 hover:border-indigo-500 hover:bg-indigo-50/20 rounded-2xl p-6 text-center cursor-pointer transition-all group"
            >
              <div className="flex flex-col items-center justify-center gap-2">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 group-hover:bg-indigo-100 text-indigo-600 flex items-center justify-center transition-colors shadow-2xs">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 group-hover:text-indigo-700">
                    คลิกเพื่อเลือกไฟล์ หรือ ลากไฟล์ CSV / Excel มาวางที่นี่
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    รองรับไฟล์ .csv, .txt (UTF-8) ขนาดไม่เกิน 5MB
                  </p>
                </div>
              </div>
            </div>

            {selectedFileName && (
              <div className="p-3 rounded-2xl bg-indigo-50/80 border border-indigo-200 flex items-center justify-between text-xs text-indigo-900">
                <div className="flex items-center gap-2 truncate">
                  <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span className="font-semibold truncate">{selectedFileName}</span>
                  <span className="text-[10px] text-indigo-600 font-mono">({fileSizeStr})</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFileName(null);
                    setParsedRows([]);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="p-1 text-indigo-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Option 2: Paste Content Box */}
        {activeInputMethod === 'paste' && (
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 block">
              วางข้อความ CSV (คอลัมน์: หมายเลขบัญชี, รหัสสมาชิก, หมายเลขบัตรประชาชน, ชื่อบัญชีเงินฝาก, ประเภทบัญชี, ยอดคงเหลือ, ดอกเบี้ยสะสม, ข้อมูลติดต่อล่าสุด):
            </label>
            <textarea
              rows={5}
              placeholder={IMPORT_TEMPLATE_CSV.split('\n').slice(0, 4).join('\n')}
              value={rawText}
              onChange={(e) => {
                setRawText(e.target.value);
                parseContent(e.target.value);
              }}
              className="w-full p-3 text-xs font-mono bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>
        )}

        {/* Import Preferences & Automation Toggles */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-indigo-600" />
            ตัวเลือกและการสร้างบัญชีเงินฝากอัตโนมัติ
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <label className="flex items-start gap-2.5 p-2 rounded-xl bg-white border border-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={autoCreateAccount}
                onChange={(e) => setAutoCreateAccount(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 mt-0.5"
              />
              <div>
                <span className="font-semibold text-slate-800 block">
                  เปิดบัญชีเงินฝากเล่มแรกให้สมาชิกทันที
                </span>
                <span className="text-[11px] text-slate-400">
                  ระบบจะสร้างเลขบัญชีตามประเภทที่ระบุในไฟล์ หรือค่าเริ่มต้น
                </span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 p-2 rounded-xl bg-white border border-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={updateExisting}
                onChange={(e) => setUpdateExisting(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 mt-0.5"
              />
              <div>
                <span className="font-semibold text-slate-800 block">
                  อัปเดตข้อมูลสมาชิกเดิมหากรหัสสมาชิกซ้ำกัน
                </span>
                <span className="text-[11px] text-slate-400">
                  เขียนทับข้อมูลติดต่อและบัญชีเดิมโดยไม่สร้างรหัสซ้ำ
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Parsed Results Overview Bar */}
        {parsedRows.length > 0 && (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-3 text-xs flex-wrap">
                <span className="font-bold text-slate-900">
                  ตรวจพบทั้งหมด {parsedRows.length} รายการ :
                </span>
                <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full font-medium text-[11px] border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" /> ผ่าน {validCount}
                </span>
                {errorCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full font-medium text-[11px] border border-rose-200">
                    <AlertCircle className="w-3.5 h-3.5" /> ไม่ผ่าน {errorCount}
                  </span>
                )}
                {duplicateCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full font-medium text-[11px] border border-amber-200">
                    <AlertTriangle className="w-3.5 h-3.5" /> รหัสซ้ำ {duplicateCount}
                  </span>
                )}
              </div>

              <span className="text-[11px] text-slate-500">
                รหัสสมาชิกจะถูกเติม 0 ให้อัตโนมัติเป็น 5 หลัก (เช่น 130 → 00130)
              </span>
            </div>

            {/* Validation Table: Accounts-sheet column order */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200 max-h-96 overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200 text-slate-600 font-semibold whitespace-nowrap">
                  <tr>
                    <th className="py-2.5 px-3 min-w-[130px]">1. หมายเลขบัญชี</th>
                    <th className="py-2.5 px-3 min-w-[95px]">2. รหัสสมาชิก</th>
                    <th className="py-2.5 px-3 min-w-[140px]">3. เลขบัตรประชาชน</th>
                    <th className="py-2.5 px-3 min-w-[160px]">4. ชื่อบัญชีเงินฝาก</th>
                    <th className="py-2.5 px-3 min-w-[110px]">5. ประเภทบัญชี</th>
                    <th className="py-2.5 px-3 min-w-[110px] text-right">6. ยอดคงเหลือ</th>
                    <th className="py-2.5 px-3 min-w-[110px] text-right">7. ดอกเบี้ยสะสม</th>
                    <th className="py-2.5 px-3 min-w-[120px]">8. ข้อมูลติดต่อล่าสุด</th>
                    <th className="py-2.5 px-3 text-center min-w-[110px]">ผลการตรวจสอบ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parsedRows.map((r, idx) => (
                    <tr
                      key={idx}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        !r.isValid ? 'bg-rose-50/30' : r.isDuplicate ? 'bg-amber-50/20' : ''
                      }`}
                    >
                      {/* 1. หมายเลขบัญชี */}
                      <td className="py-2.5 px-3 font-mono whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded font-semibold ${
                              r.isAccountIdValid
                                ? 'bg-slate-100 border border-slate-200 text-slate-800'
                                : 'bg-rose-50 border border-rose-300 text-rose-800'
                            }`}
                          >
                            {r.accountNo}
                          </span>
                        </div>
                        {r.rawAccountNo && r.rawAccountNo !== r.accountNo && (
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            (จากไฟล์: {r.rawAccountNo})
                          </span>
                        )}
                      </td>

                      {/* 2. รหัสสมาชิก (5 หลัก) */}
                      <td className="py-2.5 px-3 font-mono whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded font-bold ${
                              r.isMemberIdValid
                                ? 'bg-emerald-50 border border-emerald-300 text-emerald-800'
                                : 'bg-rose-50 border border-rose-300 text-rose-800'
                            }`}
                          >
                            {r.memberId || r.rawMemberId || '-'}
                          </span>
                          {r.isMemberIdValid ? (
                            <span className="text-[10px] text-emerald-600 font-medium">✓ 5 หลัก</span>
                          ) : (
                            <span className="text-[10px] text-rose-600 font-semibold">✕ ไม่ถูกต้อง</span>
                          )}
                        </div>
                        {r.rawMemberId !== r.memberId && r.isMemberIdValid && (
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            (เติม 0 จาก: {r.rawMemberId})
                          </span>
                        )}
                      </td>

                      {/* 3. เลขประจำตัวประชาชน (13 หลัก) */}
                      <td className="py-2.5 px-3 font-mono text-slate-700 whitespace-nowrap">
                        {formatCitizenId(r.citizenId, true)}
                      </td>

                      {/* 4. ชื่อบัญชีเงินฝาก */}
                      <td className="py-2.5 px-3 font-medium text-slate-800 min-w-[160px]">
                        <div>{r.fullName}</div>
                      </td>

                      {/* 5. ประเภทบัญชี */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className={`text-[11px] px-2 py-0.5 rounded font-medium ${
                            r.accountType === 'ออมทรัพย์พิเศษ'
                              ? 'bg-teal-100 text-teal-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {r.accountType}
                        </span>
                      </td>

                      {/* 6. ยอดคงเหลือ */}
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600 whitespace-nowrap">
                        ฿{(r.initialDeposit || 0).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>

                      {/* 7. ดอกเบี้ยสะสม */}
                      <td className="py-2.5 px-3 text-right font-mono text-amber-600 font-medium whitespace-nowrap">
                        ฿{(r.accruedInterest || 0).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>

                      {/* 8. ข้อมูลติดต่อล่าสุด */}
                      <td className="py-2.5 px-3 text-slate-600 font-mono whitespace-nowrap">
                        {r.phone || '-'}
                      </td>

                      {/* 9. ผลการตรวจสอบ */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {r.isValid ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-semibold border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> ถูกต้อง
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 text-[11px] text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full font-semibold border border-rose-200"
                            title={r.errors.join(', ')}
                          >
                            <AlertCircle className="w-3.5 h-3.5 text-rose-600" /> {r.errors[0]}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Actions Bar */}
        {importErrors.length > 0 && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 space-y-1 max-h-40 overflow-y-auto">
            <div className="font-semibold">เซิร์ฟเวอร์ปฏิเสธบางแถว ({importErrors.length})</div>
            {importErrors.map((m, i) => (
              <div key={i}>{m}</div>
            ))}
          </div>
        )}

        <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            ยกเลิก
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              disabled={validCount === 0 || isProcessing}
              onClick={handleConfirmImport}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-semibold text-xs transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>กำลังบันทึกข้อมูลสมาชิก...</span>
                </>
              ) : (
                <>
                  <Database className="w-4 h-4" />
                  <span>ยืนยันนำเข้า {validCount} สมาชิก</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
