/**
 * Import template for the initial savings accounts table.
 * Columns follow the "Accounts" sheet order (gas/Db.js). interestRate and
 * lastUpdated are filled in by the server, so they are not part of the file.
 *
 *   accountNo, memberId, citizenId, accountName, accountType, balance, accruedInterest, contact
 */

export const IMPORT_TEMPLATE_HEADERS = [
  'หมายเลขบัญชี',
  'รหัสสมาชิก',
  'หมายเลขบัตรประชาชน',
  'ชื่อบัญชีเงินฝาก',
  'ประเภทบัญชี',
  'ยอดคงเหลือ',
  'ดอกเบี้ยสะสม',
  'ข้อมูลติดต่อล่าสุด',
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
    key: 'accountNo',
    name: 'หมายเลขบัญชี',
    example: '11-00128-0',
    description: 'เลขบัญชีเงินฝาก 8 หลักรูปแบบ 00-00000-0 (11-xxxxx-x ออมทรัพย์ หรือ 15-xxxxx-x ออมทรัพย์พิเศษ)',
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
    key: 'accountType',
    name: 'ประเภทบัญชี',
    example: 'ออมทรัพย์',
    description: 'ออมทรัพย์ หรือ ออมทรัพย์พิเศษ (หากเว้นว่าง ระบบดูจากรหัสหน้าเลขบัญชี 15)',
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
  {
    key: 'contact',
    name: 'ข้อมูลติดต่อล่าสุด',
    example: '089-123-4567',
    description: 'เบอร์โทรศัพท์ติดต่อ หรือ LINE ID สำหรับการแจ้งเตือน',
    required: false,
  },
];

export const IMPORT_TEMPLATE_CSV =
  `${IMPORT_TEMPLATE_HEADERS.join(',')}
11-00128-0,00128,1100200345670,นายสมชาย ใจดี,ออมทรัพย์,148500.00,1250.75,089-123-4567
15-00129-0,00128,1100200345670,นายสมชาย ใจดี (เงินฝากพิเศษเพื่อการศึกษา),ออมทรัพย์พิเศษ,320000.00,4800.00,089-123-4567
11-00405-0,00405,1200100456789,นางสาววิภาภรณ์ รัตนโชติ,ออมทรัพย์,85200.50,742.30,081-987-6543
15-00406-0,00405,1200100456789,นางสาววิภาภรณ์ รัตนโชติ (ออมทรัพย์พิเศษ),ออมทรัพย์พิเศษ,210000.00,3150.00,081-987-6543
11-01024-0,01024,3100500987654,นายชาญชัย มั่งคั่งเจริญ,ออมทรัพย์,550000.00,6850.25,086-555-8899`;

/**
 * Direct browser trigger to download the CSV template with UTF-8 BOM
 * so Excel opens it with Thai characters rendered flawlessly.
 */
export function downloadImportTemplateCsv(filename: string = 'import_template.csv'): void {
  const contentWithBom = '\uFEFF' + IMPORT_TEMPLATE_CSV;
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
