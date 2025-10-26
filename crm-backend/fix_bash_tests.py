#!/usr/bin/env python3
"""
Script pour corriger automatiquement [ dans les tests bash → [[
Correction SonarQube issue (21 occurrences)
"""

import re
from pathlib import Path


def fix_bash_test(file_path):
    """Remplace [ par [[ dans les conditions bash."""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    # Pattern pour détecter les tests bash avec [ ]
    # Remplace if [ ... ] par if [[ ... ]]
    content = re.sub(
        r'\bif\s+\[\s+([^\]]+?)\s+\]',
        r'if [[ \1 ]]',
        content
    )

    # Remplace elif [ ... ] par elif [[ ... ]]
    content = re.sub(
        r'\belif\s+\[\s+([^\]]+?)\s+\]',
        r'elif [[ \1 ]]',
        content
    )

    # Remplace while [ ... ] par while [[ ... ]]
    content = re.sub(
        r'\bwhile\s+\[\s+([^\]]+?)\s+\]',
        r'while [[ \1 ]]',
        content
    )

    # Écrire seulement si modifié
    if content != original_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

def main():
    """Parcourir tous les fichiers bash et corriger les tests."""
    root = Path('.')
    fixed_count = 0

    exclude_dirs = {'.venv', 'venv', '__pycache__', '.git', 'node_modules'}

    for sh_file in root.rglob('*.sh'):
        if any(exclude_dir in sh_file.parts for exclude_dir in exclude_dirs):
            continue

        try:
            if fix_bash_test(sh_file):
                print(f"✅ Fixed: {sh_file}")
                fixed_count += 1
        except Exception as e:
            print(f"❌ Error in {sh_file}: {e}")

    print(f"\n🎉 Total files fixed: {fixed_count}")

if __name__ == '__main__':
    main()
