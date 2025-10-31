#!/usr/bin/env python3
"""
Script pour appliquer automatiquement les corrections dark mode
à partir du rapport d'audit JSON de ChatGPT.

Usage:
    python3 apply_dark_mode.py [--dry-run] [--status ABSENT|PARTIAL|ALL]
"""

import json
import sys
import os
from pathlib import Path
from typing import List, Dict, Any

def load_audit_report(json_path: str) -> Dict[str, Any]:
    """Charge le rapport d'audit JSON."""
    with open(json_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def apply_fixes_to_file(file_path: Path, fixes: List[Dict[str, Any]], dry_run: bool = False) -> int:
    """
    Applique les corrections à un fichier.

    Args:
        file_path: Chemin du fichier
        fixes: Liste des corrections (sorted par lineNumber desc)
        dry_run: Si True, n'écrit pas les modifications

    Returns:
        Nombre de corrections appliquées
    """
    if not file_path.exists():
        print(f"  ⚠️  Fichier non trouvé: {file_path}")
        return 0

    # Lire le contenu
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
    except Exception as e:
        print(f"  ❌ Erreur lecture {file_path}: {e}")
        return 0

    # Trier les corrections par ligne (descendant) pour éviter décalage indices
    sorted_fixes = sorted(fixes, key=lambda x: x['lineNumber'], reverse=True)

    applied_count = 0
    for fix in sorted_fixes:
        line_num = fix['lineNumber']
        original = fix['original']
        updated = fix['updated']

        # Line numbers are 1-indexed
        if line_num < 1 or line_num > len(lines):
            print(f"  ⚠️  Ligne {line_num} hors limites")
            continue

        idx = line_num - 1
        current_line = lines[idx]

        # Vérifier que la ligne correspond (trim pour comparaison)
        if current_line.rstrip() == original.rstrip():
            # Remplacer la ligne
            lines[idx] = updated + '\n' if not updated.endswith('\n') else updated
            applied_count += 1
        else:
            # La ligne a peut-être déjà été modifiée ou format différent
            # On essaie de trouver le pattern original et le remplacer
            if fix['original'].strip() in current_line:
                # Extraire l'indentation
                indent = len(current_line) - len(current_line.lstrip())
                new_line = ' ' * indent + fix['updated'].strip() + '\n'
                lines[idx] = new_line
                applied_count += 1
            else:
                print(f"  ⚠️  L{line_num}: Ligne différente, skip")

    # Écrire les modifications
    if applied_count > 0 and not dry_run:
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.writelines(lines)
        except Exception as e:
            print(f"  ❌ Erreur écriture {file_path}: {e}")
            return 0

    return applied_count

def main():
    """Main function."""
    # Parse args
    dry_run = '--dry-run' in sys.argv

    # Filter status (ABSENT, PARTIAL, ALL)
    status_filter = 'ALL'
    if '--status' in sys.argv:
        idx = sys.argv.index('--status')
        if idx + 1 < len(sys.argv):
            status_filter = sys.argv[idx + 1].upper()

    # Paths
    script_dir = Path(__file__).parent
    json_path = script_dir / 'dark_audit_full.json'
    frontend_root = script_dir.parent

    # Load audit report
    print(f"📂 Chargement: {json_path}")
    audit = load_audit_report(str(json_path))

    stats = audit['stats']
    files_data = audit['result']

    print(f"\n📊 Statistiques audit:")
    print(f"   Total: {stats['total']} fichiers")
    print(f"   ✅ OK (dark complet): {stats['OK']}")
    print(f"   ⚠️  PARTIAL: {stats['PARTIAL']}")
    print(f"   ❌ ABSENT: {stats['ABSENT']}")

    # Filter files
    if status_filter == 'ABSENT':
        files_to_fix = [f for f in files_data if f['status'] == 'ABSENT']
    elif status_filter == 'PARTIAL':
        files_to_fix = [f for f in files_data if f['status'] == 'PARTIAL']
    else:  # ALL
        files_to_fix = [f for f in files_data if f['status'] in ['ABSENT', 'PARTIAL']]

    print(f"\n🎯 Filtre: {status_filter}")
    print(f"   Fichiers à corriger: {len(files_to_fix)}")

    if dry_run:
        print(f"\n⚠️  MODE DRY-RUN (aucune modification)\n")
    else:
        print(f"\n✍️  MODIFICATION DES FICHIERS\n")

    # Apply fixes
    total_fixes = 0
    total_files_modified = 0

    for file_data in files_to_fix:
        file_rel_path = file_data['file']
        fixes = file_data.get('flagged', [])

        if not fixes:
            continue

        file_path = frontend_root / file_rel_path

        print(f"📝 {file_rel_path} ({len(fixes)} corrections)")

        applied = apply_fixes_to_file(file_path, fixes, dry_run)

        if applied > 0:
            total_fixes += applied
            total_files_modified += 1
            print(f"   ✅ {applied}/{len(fixes)} corrections appliquées")
        else:
            print(f"   ⚠️  Aucune correction appliquée")

    print(f"\n{'='*60}")
    print(f"🎉 RÉSUMÉ:")
    print(f"   Fichiers modifiés: {total_files_modified}/{len(files_to_fix)}")
    print(f"   Corrections appliquées: {total_fixes}")

    if dry_run:
        print(f"\n💡 Relancez sans --dry-run pour appliquer les modifications")

if __name__ == '__main__':
    main()
