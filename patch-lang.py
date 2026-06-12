import sys

with open("src/context/LanguageContext.tsx", "r") as f:
    code = f.read()

code = code.replace(
    '      "nav.products": { "pt-BR": "Produtos", "en": "Products" },',
    '      "nav.products": { "pt-BR": "Produtos", "en": "Products" },\n      "nav.materials": { "pt-BR": "Insumos", "en": "Materials" },'
)

with open("src/context/LanguageContext.tsx", "w") as f:
    f.write(code)
