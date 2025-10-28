#!/usr/bin/env python3
"""
Script pour ajouter import { logger } from '@/lib/logger'
aux fichiers qui utilisent logger.* mais n'ont pas l'import
"""

import os
import re
from pathlib import Path

def has_logger_usage(content):
    """Vérifie si le fichier utilise logger.*"""
    return bool(re.search(r'\blogger\.(log|error|warn|info|table|group|time)', content))

def has_logger_import(content):
    """Vérifie si le fichier importe déjà logger"""
    return bool(re.search(r"from ['\"]@/lib/logger['\"]", content))

def add_logger_import(content):
    """Ajoute l'import logger au bon endroit"""
    lines = content.split('\n')

    # Trouver la position d'insertion
    insert_pos = 0
    has_use_client = False

    for i, line in enumerate(lines):
        # Après 'use client' / 'use server'
        if line.strip() in ["'use client'", '"use client"', "'use server'", '"use server"']:
            insert_pos = i + 1
            has_use_client = True
            break
        # Ou après le dernier import
        elif line.strip().startswith('import '):
            insert_pos = i + 1

    # Si 'use client' trouvé, ajouter ligne vide avant import
    if has_use_client and insert_pos < len(lines) and lines[insert_pos].strip() != '':
        lines.insert(insert_pos, '')
        insert_pos += 1

    # Ajouter l'import
    lines.insert(insert_pos, "import { logger } from '@/lib/logger'")

    return '\n'.join(lines)

def process_file(filepath):
    """Traite un fichier"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        if has_logger_usage(content) and not has_logger_import(content):
            new_content = add_logger_import(content)

            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)

            return True
        return False
    except Exception as e:
        print(f"❌ Erreur sur {filepath}: {e}")
        return False

def main():
    frontend_dir = Path(__file__).parent.parent / 'crm-frontend'

    print("🔍 Recherche des fichiers utilisant logger sans import...")

    patterns = ['**/*.ts', '**/*.tsx']
    exclude_dirs = {'node_modules', '.next', 'playwright-report', 'dist', 'build'}
    exclude_files = {'logger.ts'}

    files_to_fix = []

    for pattern in patterns:
        for filepath in frontend_dir.glob(pattern):
            # Exclure certains dossiers
            if any(ex in filepath.parts for ex in exclude_dirs):
                continue

            # Exclure certains fichiers
            if filepath.name in exclude_files:
                continue

            if filepath.is_file():
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        content = f.read()

                    if has_logger_usage(content) and not has_logger_import(content):
                        files_to_fix.append(filepath)
                except Exception:
                    pass

    if not files_to_fix:
        print("✅ Tous les fichiers ont déjà l'import logger")
        return

    print(f"📝 {len(files_to_fix)} fichiers à corriger\n")

    fixed = 0
    for filepath in files_to_fix:
        rel_path = filepath.relative_to(frontend_dir.parent)
        if process_file(filepath):
            print(f"✅ {rel_path}")
            fixed += 1
        else:
            print(f"⏭️  {rel_path}")

    print(f"\n✅ {fixed}/{len(files_to_fix)} fichiers corrigés")

if __name__ == '__main__':
    main()
