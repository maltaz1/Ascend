#!/usr/bin/env python3
"""Remove notebook-holes de forma segura: substitui <div className="notebook-holes" ...><span/><span/><span/></div> por nada
em todos os arquivos .tsx, mantendo a linha intacta."""
import re, glob

pattern = re.compile(r'<div className="notebook-holes"[^>]*>\s*(<span/>\s*){3}\s*</div>\s*')

for path in glob.glob('client/src/pages/*.tsx'):
    src = open(path).read()
    new, n = pattern.subn('', src)
    if n:
        open(path, 'w').write(new)
        print(f'{path}: {n} holes removidos')
