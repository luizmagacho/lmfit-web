import sys

with open("src/app/(app)/financial/FinancialClient.tsx", "r") as f:
    code = f.read()

code = code.replace(
"""type ApiEntry = {
  _id: string;
  date: string;
  hour: string;
  type: string;
  name?: string;
  detail?: string;
  amount: number;
};""",
"""type ApiEntry = {
  _id: string;
  date: string;
  hour: string;
  type: string;
  name?: string;
  detail?: string;
  amount: number;
  supplierId?: string;
};""")

with open("src/app/(app)/financial/FinancialClient.tsx", "w") as f:
    f.write(code)
