#!/usr/bin/env python3
"""
Script automatique pour corriger les imports legacy dans le CRM (VERSION 2)
Commente TOUS les blocs d'import multilignes legacy
"""

import os
import re
from pathlib import Path
from typing import List, Tuple

def comment_multiline_import(content: str, module_name: str) -> str:
    """

    # Pattern pour détecter un import multiligne
    pattern = rf'from {re.escape(module_name)} import \([^)]*\)'

    def replace_func(match):
        original = match.group(0)
        lines = original.split('\n')
        commented_lines = ['# ' + line if line.strip() and not line.strip().startswith('#') else line
                          for line in lines]
        return '\n'.join(commented_lines)

    return re.sub(pattern, replace_func, content, flags=re.DOTALL)


def fix_file_v2(filepath: Path) -> Tuple[bool, int]:
    """
    Corrige un fichier Python en commentant les imports legacy (multilignes)
    Returns: (was_modified, num_changes)
    """
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            lines = f.readlines()

        original_lines = lines.copy()
        modified = False
        num_changes = 0


        ]

        # Traiter ligne par ligne
        i = 0
        while i < len(lines):
            line = lines[i]

            # Vérifier si c'est un import legacy
            for module in legacy_modules:
                # Import simple (une ligne)
                if f'from {module} import' in line and '(' not in line:
                    if not line.strip().startswith('#'):
                        lines[i] = '# ' + line
                        modified = True
                        num_changes += 1
                    break

                # Import multiligne (avec parenthèses)
                elif f'from {module} import' in line and '(' in line:
                    if not line.strip().startswith('#'):
                        # Commenter cette ligne et toutes jusqu'à la parenthèse fermante
                        lines[i] = '# ' + line
                        num_changes += 1
                        modified = True

                        # Continuer à commenter jusqu'à ')'
                        j = i + 1
                        while j < len(lines):
                            if not lines[j].strip().startswith('#'):
                                lines[j] = '# ' + lines[j]
                                num_changes += 1
                            if ')' in lines[j]:
                                break
                            j += 1
                        i = j  # Sauter les lignes déjà traitées
                    break

            # Commenter les références dans __all__
            if '__all__' in ''.join(lines[max(0, i-5):i+1]):  # Dans un bloc __all__
                legacy_items = [
#
                    '"ClientType"', '"InteractionType"',

                    '"StageFournisseur"', '"TypeFournisseur"',
                    '"InteractionCreate"', '"InteractionUpdate"',
                ]

                for item in legacy_items:
                    if item in line and not line.strip().startswith('#'):
                        lines[i] = '# ' + line
                        modified = True
                        num_changes += 1
                        break

            i += 1

        # Écrire si modifié
        if modified:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.writelines(lines)
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
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        for file in files:
            if file.endswith('.py'):
                python_files.append(Path(root) / file)

    return python_files


def main():
    """Fonction principale"""
    print("🔧 Script de correction des imports legacy V2")
    print("=" * 60)

    backend_root = Path(__file__).parent
    print(f"📁 Racine backend: {backend_root}")

    python_files = find_python_files(backend_root)
    print(f"📄 Fichiers Python trouvés: {len(python_files)}")
    print()

    total_modified = 0
    total_changes = 0
    modified_files = []

    for filepath in python_files:
        relative_path = filepath.relative_to(backend_root)
        was_modified, num_changes = fix_file_v2(filepath)

        if was_modified:
            total_modified += 1
            total_changes += num_changes
            modified_files.append((relative_path, num_changes))
            print(f"✅ {relative_path} ({num_changes} corrections)")

    print()
    print("=" * 60)
    print(f"✅ Fichiers modifiés: {total_modified}/{len(python_files)}")
    print(f"✅ Corrections totales: {total_changes}")

    if modified_files:
        print()
        print("📋 Fichiers corrigés:")
        for filepath, num in sorted(modified_files, key=lambda x: -x[1])[:20]:
            print(f"  • {filepath}: {num} corrections")

    print()
    print("🎯 Nettoyage du cache Python...")
    os.system('find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null')
    print("✅ Cache nettoyé!")

    print()
    print("🚀 Test du backend...")
    result = os.system('source venv/bin/activate && python3 -c "from api import api_router; print(\'✅ SUCCESS\')" 2>&1 | head -5')
    if result == 0:
        print("✅ Backend OK!")
    else:
        print("⚠️ Erreurs restantes (voir ci-dessus)")


if __name__ == "__main__":
    main()
