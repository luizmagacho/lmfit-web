import sys

with open("src/app/(app)/purchases/PurchaseEditorClient.tsx", "r") as f:
    code = f.read()

code = code.replace(
    'function linesToLocal(lines: any[], nextKey: () => string): LocalLine[] {',
    '// eslint-disable-next-line @typescript-eslint/no-explicit-any\nfunction linesToLocal(lines: any[], nextKey: () => string): LocalLine[] {'
)

code = code.replace(
    'function parseLinesPayload(rows: LocalLine[]): any[] {',
    '// eslint-disable-next-line @typescript-eslint/no-explicit-any\nfunction parseLinesPayload(rows: LocalLine[]): any[] {'
)

code = code.replace(
    '  const out: any[] = [];',
    '  // eslint-disable-next-line @typescript-eslint/no-explicit-any\n  const out: any[] = [];'
)

code = code.replace(
    '    const line: any = {',
    '    // eslint-disable-next-line @typescript-eslint/no-explicit-any\n    const line: any = {'
)

code = code.replace(
    '      const items = extractListItems(data) as any[];',
    '      // eslint-disable-next-line @typescript-eslint/no-explicit-any\n      const items = extractListItems(data) as any[];'
)

with open("src/app/(app)/purchases/PurchaseEditorClient.tsx", "w") as f:
    f.write(code)
