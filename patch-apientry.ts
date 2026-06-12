import * as fs from 'fs';

const filePath = 'src/app/(app)/financial/FinancialClient.tsx';
let code = fs.readFileSync(filePath, 'utf8');

code = code.replace(
\`type ApiEntry = {
  _id: string;
  date: string;
  hour: string;
  type: string;
  name?: string;
  detail?: string;
  amount: number;
};\`,
\`type ApiEntry = {
  _id: string;
  date: string;
  hour: string;
  type: string;
  name?: string;
  detail?: string;
  amount: number;
  supplierId?: string;
};\`);

fs.writeFileSync(filePath, code);
