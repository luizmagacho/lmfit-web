import sys

with open("src/components/AppShell.tsx", "r") as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if 'href: "/products"' in line:
        new_lines.append(line)
        new_lines.append('  { href: "/materials", key: "nav.materials", icon: Layers },\n')
    else:
        new_lines.append(line)

with open("src/components/AppShell.tsx", "w") as f:
    f.writelines(new_lines)
