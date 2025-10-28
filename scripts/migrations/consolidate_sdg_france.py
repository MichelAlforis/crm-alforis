#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Consolidation de toutes les données SDG françaises
Objectif: Créer une base maximale avec toutes les infos disponibles pour le CRM
"""

import pandas as pd
import os
from pathlib import Path

# Chemin de base
BASE_DIR = Path(__file__).parent.parent

def clean_phone(phone):
    """Nettoie les numéros de téléphone"""
    if pd.isna(phone) or phone == '':
        return ''
    phone = str(phone).strip()
    # Retirer les espaces, points, tirets
    phone = phone.replace(' ', '').replace('.', '').replace('-', '')
    # Ajouter +33 si commence par 0
    if phone.startswith('0') and len(phone) == 10:
        phone = '+33' + phone[1:]
    return phone

def clean_email(email):
    """Nettoie les emails"""
    if pd.isna(email) or email == '':
        return ''
    email = str(email).strip().lower()
    return email if '@' in email else ''

def clean_aum(aum):
    """Nettoie les valeurs AUM"""
    if pd.isna(aum) or aum == '':
        return None
    try:
        return float(aum)
    except:
        return None

def main():
    print("📊 Consolidation des SDG françaises\n")

    # Fichiers à analyser
    files = {
        'categorized': BASE_DIR / 'SDG_677_CATEGORIZED.csv',
        'v4_complet': BASE_DIR / '_archives_sdg' / 'SDG_677_FINAL_V4_COMPLET.csv',
        'v3_complet': BASE_DIR / '_archives_sdg' / 'SDG_677_FINAL_V3_COMPLET.csv',
        'final_avec_aum': BASE_DIR / 'data' / 'csv_archives' / 'SDG_677_FINAL_COMPLETE_WITH_AUM.csv',
    }

    # Lire tous les fichiers
    dataframes = {}
    for name, filepath in files.items():
        if filepath.exists():
            print(f"✓ Lecture de {filepath.name}")
            df = pd.read_csv(filepath)
            dataframes[name] = df
            print(f"  → {len(df)} lignes, colonnes: {', '.join(df.columns[:10])}")
        else:
            print(f"✗ Fichier non trouvé: {filepath.name}")

    print(f"\n📁 {len(dataframes)} fichiers chargés\n")

    # Utiliser SDG_677_CATEGORIZED comme base (le plus complet)
    if 'categorized' not in dataframes:
        print("❌ Fichier SDG_677_CATEGORIZED.csv introuvable")
        return

    df_base = dataframes['categorized'].copy()
    print(f"📋 Base de départ: {len(df_base)} organisations\n")

    # Créer le dictionnaire pour enrichissement
    # Clé = nom normalisé, valeur = dict avec toutes les infos disponibles
    enrichment_data = {}

    # Parcourir les autres fichiers pour enrichir
    for name, df in dataframes.items():
        if name == 'categorized':
            continue

        print(f"🔍 Enrichissement depuis {name}...")
        for _, row in df.iterrows():
            org_name = str(row.get('name', '')).strip()
            if not org_name or org_name == '':
                continue

            key = org_name.upper()
            if key not in enrichment_data:
                enrichment_data[key] = {}

            # Enrichir avec les données disponibles
            for col in ['email', 'phone', 'website', 'address', 'city', 'postal_code',
                       'aum', 'aum_date', 'tier', 'priority', 'aum_source']:
                if col in df.columns:
                    val = row.get(col)
                    if pd.notna(val) and val != '':
                        # Garder la valeur la plus complète
                        if col not in enrichment_data[key] or pd.isna(enrichment_data[key].get(col)):
                            enrichment_data[key][col] = val

    print(f"  → {len(enrichment_data)} organisations dans le dictionnaire d'enrichissement\n")

    # Enrichir la base avec les données manquantes
    print("🔧 Enrichissement de la base...\n")
    enriched_count = 0

    for idx, row in df_base.iterrows():
        org_name = str(row['name']).strip()
        key = org_name.upper()

        if key in enrichment_data:
            enrichment = enrichment_data[key]
            modified = False

            for col, val in enrichment.items():
                # Si la colonne existe dans df_base et est vide, enrichir
                if col in df_base.columns:
                    if pd.isna(df_base.at[idx, col]) or df_base.at[idx, col] == '':
                        df_base.at[idx, col] = val
                        modified = True
                # Sinon créer la colonne
                elif col not in df_base.columns:
                    if col not in df_base.columns:
                        df_base[col] = None
                    df_base.at[idx, col] = val
                    modified = True

            if modified:
                enriched_count += 1

    print(f"✓ {enriched_count} organisations enrichies\n")

    # Nettoyage des données
    print("🧹 Nettoyage des données...\n")

    if 'phone' in df_base.columns:
        df_base['phone'] = df_base['phone'].apply(clean_phone)

    if 'email' in df_base.columns:
        df_base['email'] = df_base['email'].apply(clean_email)

    if 'aum' in df_base.columns:
        df_base['aum'] = df_base['aum'].apply(clean_aum)

    # Créer le CSV final pour import CRM
    print("📄 Création du CSV final pour import CRM...\n")

    # Colonnes requises pour le CRM
    crm_columns = {
        'name': 'name',
        'email': 'email',
        'phone': 'phone',
        'website': 'website',
        'address': 'address',
        'city': 'city',
        'country': 'country',
        'country_code': 'country_code',
        'aum': 'aum',
        'aum_date': 'aum_date',
        'category': 'category',
        'type': 'type',
        'notes': 'notes',
    }

    df_final = pd.DataFrame()
    for crm_col, source_col in crm_columns.items():
        if source_col in df_base.columns:
            df_final[crm_col] = df_base[source_col]
        else:
            df_final[crm_col] = ''

    # S'assurer que country est bien "France" et country_code "FR"
    df_final['country'] = 'France'
    df_final['country_code'] = 'FR'

    # Statistiques finales
    print("📊 STATISTIQUES FINALES:")
    print(f"  • Total organisations: {len(df_final)}")
    print(f"  • Avec email: {df_final['email'].notna().sum()} ({df_final['email'].notna().sum()/len(df_final)*100:.1f}%)")
    print(f"  • Avec téléphone: {df_final['phone'].notna().sum()} ({df_final['phone'].notna().sum()/len(df_final)*100:.1f}%)")
    print(f"  • Avec site web: {df_final['website'].notna().sum()} ({df_final['website'].notna().sum()/len(df_final)*100:.1f}%)")
    print(f"  • Avec adresse: {df_final['address'].notna().sum()} ({df_final['address'].notna().sum()/len(df_final)*100:.1f}%)")
    print(f"  • Avec AUM: {df_final['aum'].notna().sum()} ({df_final['aum'].notna().sum()/len(df_final)*100:.1f}%)")

    # Sauvegarder
    output_file = BASE_DIR / 'SDG_FRANCE_677_CONSOLIDATED_FOR_CRM.csv'
    df_final.to_csv(output_file, index=False, encoding='utf-8-sig')

    print(f"\n✅ Fichier créé: {output_file.name}")
    print(f"   → {len(df_final)} organisations prêtes pour import CRM")

if __name__ == '__main__':
    main()
