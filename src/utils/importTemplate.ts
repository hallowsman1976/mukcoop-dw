/**
 * Utilities and constants for the 8-column initial savings accounts import template.
 * ตารางข้อมูลบัญชีเงินฝากเริ่มต้น (8 คอลัมน์):
 * 1. ลำดับ
 * 2. หมายเลขบัญชี
 * 3. รหัสสมาชิก
 * 4. หมายเลขบัตรประชาชน
 * 5. ชื่อบัญชีเงินฝาก
 * 6. ข้อมูลติดต่อล่าสุด
 * 7. ยอดคงเหลือ
 * 8. ดอกเบี้ยสะสม
 */

export const IMPORT_TEMPLATE_8COL_HEADERS = [
  'ลำดับ',
  'หมายเลขบัญชี',
  'รหัสสมาชิก',
  'หมายเลขบัตรประชาชน',
  'ชื่อบัญชีเงินฝาก',
  'ข้อมูลติดต่อล่าสุด',
  'ยอดคงเหลือ',
  'ดอกเบี้ยสะสม',
] as const;

export interface TemplateColumnDef {
  key: string;
  name: string;
  example: string;
  description: string;
  required: boolean;
}

export const IMPORT_TEMPLATE_COLUMNS: TemplateColumnDef[] = [
  {
    key: 'no',
    name: 'ลำดับ',
    example: '1',
    description: 'ลำดับรายการ (เช่น 1, 2, 3...)',
    required: true,
  },
  {
    key: 'accountNo',
    name: 'หมายเลขบัญชี',
    example: '101-2-00128-1',
    description: 'เลขบัญชีเงินฝาก 10 หลัก (101-2-xxxxx-x ออมทรัพย์ หรือ 201-5-xxxxx-x ออมทรัพย์พิเศษ)',
    required: true,
  },
  {
    key: 'memberId',
    name: 'รหัสสมาชิก',
    example: '00128',
    description: 'รหัสสมาชิก 5 หลัก (หากระบุสั้นกว่า 5 หลัก ระบบจะเติม 0 ข้างหน้าให้อัตโนมัติ)',
    required: true,
  },
  {
    key: 'citizenId',
    name: 'หมายเลขบัตรประชาชน',
    example: '1100200345670',
    description: 'เลขประจำตัวประชาชน 13 หลักของผู้เปิดบัญชี',
    required: true,
  },
  {
    key: 'accountName',
    name: 'ชื่อบัญชีเงินฝาก',
    example: 'นายสมชาย ใจดี',
    description: 'ชื่อบัญชีเงินฝาก หรือชื่อ-นามสกุลสมาชิกเจ้าของบัญชี',
    required: true,
  },
  {
    key: 'contact',
    name: 'ข้อมูลติดต่อล่าสุด',
    example: '089-123-4567',
    description: 'เบอร์โทรศัพท์ติดต่อ หรือ LINE ID สำหรับการแจ้งเตือน',
    required: false,
  },
  {
    key: 'balance',
    name: 'ยอดคงเหลือ',
    example: '148500.00',
    description: 'ยอดเงินฝากคงเหลือเริ่มต้นในบัญชี (บาท)',
    required: true,
  },
  {
    key: 'accruedInterest',
    name: 'ดอกเบี้ยสะสม',
    example: '1250.75',
    description: 'ยอดดอกเบี้ยสะสมรอจ่ายถึงปัจจุบัน (บาท)',
    required: false,
  },
];

export const IMPORT_TEMPLATE_8COL_CSV =
  `ลำดับ,หมายเลขบัญชี,รหัสสมาชิก,หมายเลขบัตรประชาชน,ชื่อบัญชีเงินฝาก,ข้อมูลติดต่อล่าสุด,ยอดคงเหลือ,ดอกเบี้ยสะสม
1,101-2-00128-1,00128,1100200345670,นายสมชาย ใจดี,089-123-4567,148500.00,1250.75
2,201-5-00128-2,00128,1100200345670,นายสมชาย ใจดี (เงินฝากพิเศษเพื่อการศึกษา),089-123-4567,320000.00,4800.00
3,101-2-00405-1,00405,1200100456789,นางสาววิภาภรณ์ รัตนโชติ,081-987-6543,85200.50,742.30
4,201-5-00405-2,00405,1200100456789,นางสาววิภาภรณ์ รัตนโชติ (ออมทรัพย์พิเศษ),081-987-6543,210000.00,3150.00
5,101-2-01024-1,01024,3100500987654,นายชาญชัย มั่งคั่งเจริญ,086-555-8899,550000.00,6850.25`;

/**
 * Direct browser trigger to download the CSV template with UTF-8 BOM
 * so Excel opens it with Thai characters rendered flawlessly.
 */
export function downloadImportTemplateCsv(filename: string = 'import_template.csv'): void {
  const contentWithBom = '\uFEFF' + IMPORT_TEMPLATE_8COL_CSV;
  const blob = new Blob([contentWithBom], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
