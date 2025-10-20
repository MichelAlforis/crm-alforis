#!/usr/bin/env python3
"""
Script pour corriger automatiquement datetime.now(UTC) → datetime.now(UTC)
Correction SonarQube CRITICAL issue (49 occurrences)
"""

import re
import os
from pathlib import Path

def fix_datetime_utcnow(file_path):
    """Remplace datetime.now(UTC) par datetime.now(UTC) dans un fichier."""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    # Vérifier si from datetime import UTC existe déjà
    has_utc_import = re.search(r'from datetime import.*\bUTC\b', content)

    # Remplacer datetime.now(UTC) par datetime.now(UTC)
    content = re.sub(
        r'datetime\.utcnow\(\)',
        'datetime.now(UTC)',
        content
    )

    # Ajouter import UTC si nécessaire et si des changements ont été faits
    if content != original_content and not has_utc_import:
        # Trouver la ligne d'import datetime
        import_match = re.search(r'^(from datetime import [^\n]+)', content, re.MULTILINE)
        if import_match:
            old_import = import_match.group(1)
            if 'UTC' not in old_import:
                new_import = old_import.rstrip(')')
                if new_import.endswith('('):
                    new_import += 'UTC)'
                elif ')' in old_import:
                    new_import = old_import.replace(')', ', UTC)')
                else:
                    new_import = old_import + ', UTC'
                content = content.replace(old_import, new_import)

    # Écrire seulement si modifié
    if content != original_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

def main():
    """Parcourir tous les fichiers Python et corriger datetime.now(UTC)."""
    root = Path('.')
    fixed_count = 0

    # Exclure les venv et migrations
    exclude_dirs = {'.venv', 'venv', '__pycache__', '.git', 'node_modules'}

    for py_file in root.rglob('*.py'):
        # Exclure certains répertoires
        if any(exclude_dir in py_file.parts for exclude_dir in exclude_dirs):
            continue

        try:
            if fix_datetime_utcnow(py_file):
                print(f"✅ Fixed: {py_file}")
                fixed_count += 1
        except Exception as e:
            print(f"❌ Error in {py_file}: {e}")

    print(f"\n🎉 Total files fixed: {fixed_count}")

if __name__ == '__main__':
    main()
