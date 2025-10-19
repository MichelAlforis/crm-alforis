#!/usr/bin/env python3
"""
Script automatique pour corriger les imports legacy dans le CRM
Commente tous les imports de models/schemas/services legacy
"""

import os
import re
from pathlib import Path
from typing import List, Tuple


def fix_file(filepath: Path) -> Tuple[bool, int]:
    """
    Corrige un fichier Python en commentant les imports legacy
    Returns: (was_modified, num_changes)
    """
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        original_content = content
        num_changes = 0

        # Appliquer tous les patterns
        for pattern, replacement in LEGACY_PATTERNS:
            new_content = re.sub(pattern, replacement, content)
            if new_content != content:
                num_changes += content.count(pattern.replace('\\', ''))
                content = new_content

        # Patterns dans __all__ (seulement si __all__ existe)
        if '__all__' in content:
            for pattern, replacement in ALL_PATTERNS:
                new_content = re.sub(pattern, replacement, content)
                if new_content != content:
                    num_changes += 1
                    content = new_content

        # Si modifié, écrire
        if content != original_content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return True, num_changes

        return False, 0

    except Exception as e:
        print(f"❌ Erreur dans {filepath}: {e}")
        return False, 0


def find_python_files(root_dir: Path, exclude_dirs: List[str] = None) -> List[Path]:
    """Trouve tous les fichiers .py récursivement"""
    if exclude_dirs is None:
        exclude_dirs = ['venv', '.venv', 'venv312', '__pycache__', 'legacy', 'migrations']

    python_files = []
    for root, dirs, files in os.walk(root_dir):
        # Filtrer les dossiers exclus
        dirs[:] = [d for d in dirs if d not in exclude_dirs]

        for file in files:
            if file.endswith('.py'):
                python_files.append(Path(root) / file)

    return python_files


def main():
    """Fonction principale"""
    print("🔧 Script de correction des imports legacy")
    print("=" * 60)

    # Trouver la racine du backend
    backend_root = Path(__file__).parent
    print(f"📁 Racine backend: {backend_root}")

    # Trouver tous les fichiers Python
    python_files = find_python_files(backend_root)
    print(f"📄 Fichiers Python trouvés: {len(python_files)}")
    print()

    # Statistiques
    total_modified = 0
    total_changes = 0
    modified_files = []

    # Traiter chaque fichier
    for filepath in python_files:
        relative_path = filepath.relative_to(backend_root)
        was_modified, num_changes = fix_file(filepath)

        if was_modified:
            total_modified += 1
            total_changes += num_changes
            modified_files.append((relative_path, num_changes))
            print(f"✅ {relative_path} ({num_changes} corrections)")

    # Résumé
    print()
    print("=" * 60)
    print(f"✅ Fichiers modifiés: {total_modified}/{len(python_files)}")
    print(f"✅ Corrections totales: {total_changes}")

    if modified_files:
        print()
        print("📋 Fichiers corrigés:")
        for filepath, num in sorted(modified_files, key=lambda x: -x[1]):
            print(f"  • {filepath}: {num} corrections")

    print()
    print("🎯 Nettoyage du cache Python...")
    os.system('find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null')
    print("✅ Cache nettoyé!")

    print()
    print("🚀 Prêt à tester! Lancez:")
    print("   source venv/bin/activate")
    print("   python3 -c 'from api import api_router; print(\"OK\")'")


if __name__ == "__main__":
    main()
