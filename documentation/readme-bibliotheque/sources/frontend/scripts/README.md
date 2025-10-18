# Scripts de développement

Ce dossier contient des scripts utilitaires pour faciliter le développement.

## 🚀 dev-clean.sh (Mac/Linux)

Script de démarrage propre qui :
- ✅ Vérifie et libère automatiquement le port 3010
- ✅ Arrête les processus existants (gracieusement puis forcé si nécessaire)
- ✅ Nettoie le cache Next.js (.next et node_modules/.cache)
- ✅ Supprime les fichiers .DS_Store
- ✅ Vérifie les dépendances npm
- ✅ Démarre le serveur avec gestion propre de Ctrl+C

### Usage

```bash
# Option 1 : Via npm script (recommandé)
npm run dev:clean

# Option 2 : Direct
bash scripts/dev-clean.sh

# Option 3 : Avec un port personnalisé
PORT=3000 bash scripts/dev-clean.sh
```

## 🪟 dev-clean.ps1 (Windows)

Version PowerShell pour Windows avec les mêmes fonctionnalités.

### Usage

```powershell
# Via npm script
npm run dev:clean:win

# Ou direct
powershell -ExecutionPolicy Bypass -File scripts/dev-clean.ps1

# Avec un port personnalisé
$env:PORT=3000; npm run dev:clean:win
```

## 🔧 Commandes utiles

```bash
# Démarrage normal
npm run dev

# Démarrage avec nettoyage complet (Mac/Linux)
npm run dev:clean

# Démarrage avec nettoyage complet (Windows)
npm run dev:clean:win

# Tuer uniquement le processus sur le port 3010
npm run kill-port

# Build production
npm run build

# Démarrer en production
npm run start
```

## ⚠️ Troubleshooting

### Erreur "EADDRINUSE"

Si vous obtenez cette erreur :
```
Error: listen EADDRINUSE: address already in use :::3010
```

**Solution rapide :**
```bash
npm run kill-port
# Puis
npm run dev
```

**Ou utilisez le script de nettoyage :**
```bash
npm run dev:clean
```

### Le script ne s'exécute pas (Mac/Linux)

Si vous avez une erreur de permission :
```bash
chmod +x scripts/dev-clean.sh
```

### Le script PowerShell est bloqué (Windows)

Si vous avez une erreur "Execution Policy" :
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Ou utilisez directement :
```powershell
powershell -ExecutionPolicy Bypass -File scripts/dev-clean.ps1
```

## 📝 Notes

- Le port par défaut est **3010**
- Modifiable via la variable d'environnement `PORT`
- Les scripts détectent automatiquement Docker vs local
- Le nettoyage du cache peut prendre quelques secondes
- Le script gère proprement l'arrêt avec Ctrl+C

## 🎯 Fonctionnalités

### Arrêt gracieux
1. Essaie d'abord `kill` (SIGTERM)
2. Attend 2 secondes
3. Force avec `kill -9` (SIGKILL) si nécessaire

### Nettoyage
- `.next/` (build cache Next.js)
- `node_modules/.cache/` (cache npm/yarn)
- `**/.DS_Store` (fichiers macOS)

### Vérifications
- Port disponible
- Dépendances installées
- Environnement (Docker/Local)
