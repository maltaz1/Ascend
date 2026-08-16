#!/usr/bin/env python3
"""Restaura linhas removidas pelo sed usando o conteúdo original do git,
mas sem a parte notebook-holes."""
import subprocess, re

def git_show(commit, path):
    return subprocess.run(['git', 'show', f'{commit}:{path}'], capture_output=True, text=True, cwd='/home/ubuntu/Ascend').stdout.splitlines()

def find_hole_line(orig_lines, anchor):
    for i, l in enumerate(orig_lines):
        if anchor in l and 'notebook-holes' in l:
            return i, l
    return None, None

def remove_holes(line):
    return re.sub(r'<div className="notebook-holes"[^>]*>\s*(<span/>\s*){3}\s*</div>\s*', '', line)

fixes = [
    # (path, anchor_text, expected_in_workaround)
    ("client/src/pages/Academy.tsx", 'Catálogo de Exercícios', None),
    ("client/src/pages/Academy.tsx", 'Fichas de Treino', None),
]

for path, anchor, _ in fixes:
    orig = git_show('HEAD~1', path) if False else git_show('7d18206', path)
    work = open(f'/home/ubuntu/Ascend/{path}').readlines()
    i, hole_line = find_hole_line(orig, anchor)
    if i is None:
        print(f'{path}: anchor "{anchor}" não achado no original (talvez já ok)')
        continue
    clean = remove_holes(hole_line)
    # localizar a linha no working que contém o texto após os holes (anchor)
    restored = False
    for j, wl in enumerate(work):
        if anchor in wl:
            # inserir a linha limpa antes
            work.insert(j, clean)
            restored = True
            break
    if restored:
        open(f'/home/ubuntu/Ascend/{path}', 'w').writelines(work)
        print(f'{path}: linha restaurada (âncora "{anchor}")')
    else:
        print(f'{path}: âncora "{anchor}" não achada no working!')
