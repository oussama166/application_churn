# Application Churn - Prédiction de Désabonnement

Application complète de prédiction de désabonnement client avec interface web moderne et API backend. Cette application permet d'analyser les données clients, de prédire les risques de désabonnement et de visualiser les insights via un tableau de bord interactif.

## 📋 Table des Matières

- [Fonctionnalités](#-fonctionnalités)
- [Architecture](#-architecture)
- [Prérequis](#-prérequis)
- [Installation avec Docker](#-installation-avec-docker-recommandé)
- [Installation sans Docker](#-installation-sans-docker)
- [Configuration](#-configuration)
- [Utilisation](#-utilisation)
- [Dépannage](#-dépannage)
- [Structure du Projet](#-structure-du-projet)

## ✨ Fonctionnalités

- **Import de données** : Téléversement de fichiers CSV/Excel (jusqu'à 100k lignes)
- **Prédiction de désabonnement** : Modèle ML XGBoost pour calculer les scores de risque
- **Tableau de bord** : Visualisation des KPIs, distribution des risques, analyse ARPU
- **Analytiques** : Détails des prédictions par client avec filtrage et tri
- **Gestion des données** : Stockage PostgreSQL avec historique des téléversements
- **Interface moderne** : Next.js avec Material-UI v7, entièrement en français

## 🏗️ Architecture

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   Frontend  │──────│   Backend   │──────│  PostgreSQL │
│  (Next.js)  │      │  (FastAPI)  │      │             │
│   Port 3000 │      │   Port 8000 │      │  Port 5433  │
└─────────────┘      └─────────────┘      └─────────────┘
```

- **Frontend** : Next.js 16, React 19, Material-UI v7, Redux Toolkit
- **Backend** : FastAPI, Python 3.11, XGBoost, SQLAlchemy (async)
- **Base de données** : PostgreSQL 16
- **ML Model** : XGBoost pour la prédiction de désabonnement

## 📦 Prérequis

### Pour Docker (Recommandé)
- Docker (version 20.10+)
- Docker Compose (version 2.0+)

### Pour Installation Manuelle
- **Backend** :
  - Python 3.11+
  - pip
  - PostgreSQL 16+
- **Frontend** :
  - Node.js 20+
  - npm ou yarn

## 🐳 Installation avec Docker (Recommandé)

### 1. Cloner le projet

```bash
git clone <repository-url>
cd application_churn
```

### 2. Configuration (Optionnel)

Créez un fichier `.env` à la racine du projet (optionnel, des valeurs par défaut sont fournies) :

```bash
cp .env.example .env
```

Éditez `.env` si nécessaire :

```env
APP_ENV=dev
DEBUG=false
DATABASE_URL=postgresql+asyncpg://postgres:postgres@postgres:5432/churn
ARTIFACTS_DIR=artifacts
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://frontend:3000
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 3. Démarrer avec Docker Compose

**Option 1 : Utiliser le script de démarrage**

```bash
./docker-start.sh
```

**Option 2 : Commande manuelle**

```bash
docker compose up --build
```

Pour démarrer en arrière-plan :

```bash
docker compose up -d --build
```

### 4. Accéder à l'application

Une fois les conteneurs démarrés, accédez à :

- **Frontend** : http://localhost:3000
- **Backend API** : http://localhost:8000
- **Documentation API** : http://localhost:8000/docs
- **pgAdmin** : http://localhost:5050
  - Email : `admin@admin.com`
  - Password : `admin`

### 5. Commandes Docker utiles

```bash
# Voir les logs
docker compose logs -f

# Voir les logs d'un service spécifique
docker compose logs -f backend
docker compose logs -f frontend

# Arrêter les services
docker compose down

# Arrêter et supprimer les volumes (⚠️ supprime les données)
docker compose down -v

# Rebuild un service spécifique
docker compose build frontend
docker compose up -d frontend

# Accéder au shell d'un conteneur
docker compose exec backend bash
docker compose exec frontend sh
docker compose exec postgres psql -U postgres -d churn
```

## 💻 Installation sans Docker

### 1. Prérequis système

#### Backend
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install python3.11 python3-pip postgresql postgresql-contrib

# macOS (avec Homebrew)
brew install python@3.11 postgresql@16

# Arch Linux
sudo pacman -S python python-pip postgresql
```

#### Frontend
```bash
# Installer Node.js 20+ depuis nodejs.org ou via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20
```

### 2. Configuration de la base de données

#### Créer la base de données PostgreSQL

```bash
# Se connecter à PostgreSQL
sudo -u postgres psql

# Créer la base de données et l'utilisateur
CREATE DATABASE churn;
CREATE USER postgres WITH PASSWORD 'postgres';
GRANT ALL PRIVILEGES ON DATABASE churn TO postgres;
\q
```

#### Exécuter les scripts d'initialisation (optionnel)

```bash
cd backend/docker/postgres/init
psql -U postgres -d churn -f 01-create-churn-db.sh
```

### 3. Installation du Backend

```bash
cd backend

# Créer un environnement virtuel
python3.11 -m venv venv

# Activer l'environnement virtuel
# Linux/macOS
source venv/bin/activate
# Windows
venv\Scripts\activate

# Installer les dépendances
pip install --upgrade pip
pip install -r requirements.txt
```

#### Configuration du Backend

Créez un fichier `.env` dans le dossier `backend/` :

```bash
cd backend
cp env.example .env
```

Éditez `.env` :

```env
APP_ENV=dev
DEBUG=false
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/churn
ARTIFACTS_DIR=artifacts
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

#### Vérifier que les artifacts ML sont présents

```bash
ls -la backend/artifacts/
# Doit contenir :
# - churn_preprocessor.joblib
# - churn_xgb.joblib
```

#### Démarrer le Backend

```bash
# Depuis le dossier backend/
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Le backend sera accessible sur http://localhost:8000

### 4. Installation du Frontend

Ouvrez un nouveau terminal :

```bash
cd frontend

# Installer les dépendances
npm install

# Créer un fichier .env.local (optionnel)
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
```

#### Démarrer le Frontend

**Mode développement :**

```bash
npm run dev
```

Le frontend sera accessible sur http://localhost:3000

**Mode production :**

```bash
npm run build
npm start
```

## ⚙️ Configuration

### Variables d'environnement Backend

| Variable | Description | Défaut |
|----------|-------------|--------|
| `APP_ENV` | Environnement (dev/staging/prod) | `dev` |
| `DEBUG` | Mode debug | `false` |
| `DATABASE_URL` | URL de connexion PostgreSQL | `postgresql+asyncpg://postgres:postgres@localhost:5432/churn` |
| `ARTIFACTS_DIR` | Dossier des modèles ML | `artifacts` |
| `CORS_ORIGINS` | Origines autorisées (séparées par virgule) | `http://localhost:3000,http://127.0.0.1:3000` |

### Variables d'environnement Frontend

| Variable | Description | Défaut |
|----------|-------------|--------|
| `NEXT_PUBLIC_API_URL` | URL de l'API backend | `http://localhost:8000` |

### Configuration de la base de données

Pour Docker, la base de données est automatiquement configurée. Pour une installation manuelle, assurez-vous que :

1. PostgreSQL est en cours d'exécution
2. La base de données `churn` existe
3. L'utilisateur `postgres` a les permissions nécessaires
4. Le port 5432 (ou celui configuré) est accessible

## 🚀 Utilisation

### 1. Accéder à l'application

Ouvrez votre navigateur et allez sur http://localhost:3000

### 2. Se connecter

- Utilisez les identifiants configurés dans NextAuth
- Par défaut, l'authentification peut être configurée selon vos besoins

### 3. Importer des données

1. Allez dans **Imports**
2. Téléversez un fichier CSV/Excel
3. Mappez les colonnes aux champs requis
4. Cliquez sur **Lancer l'Analyse**
5. Attendez le traitement (affichage de la progression)

### 4. Visualiser les résultats

- **Dashboard** : Vue d'ensemble des métriques et KPIs
- **Analytiques** : Liste des téléversements et détails par client
- **Filtres** : Recherche par client, téléphone, segment de risque

### 5. Format des données CSV

Le fichier CSV doit contenir les colonnes suivantes (ou équivalents) :

- `customer_id` : Identifiant unique du client
- `phone_number` : Numéro de téléphone
- `snapshot_date` : Date de l'instantané
- `age`, `gender`, `region` : Données démographiques
- `activation_date`, `tenure_months` : Informations de contrat
- `monthly_fee`, `last_bill_amount` : Données de facturation
- `voice_minutes`, `data_gb`, `sms_count` : Données d'utilisation
- ... (voir la liste complète dans l'interface d'import)

### 6. Fichier de test

Pour tester l'application, vous pouvez utiliser le fichier `test_file.csv` fourni à la racine du projet. Ce fichier contient environ 15 000 lignes de données de test avec toutes les colonnes requises.

**Utilisation du fichier de test :**

1. Accédez à la page **Imports** dans l'application
2. Téléversez le fichier `test_file.csv` depuis la racine du projet
3. Le système détectera automatiquement les colonnes et vous proposera le mapping
4. Cliquez sur **Lancer l'Analyse** pour démarrer le traitement
5. Le traitement peut prendre quelques minutes selon la taille du fichier

**Note :** Le fichier `test_file.csv` est conçu pour tester toutes les fonctionnalités de l'application, y compris :
- L'import de fichiers volumineux
- La prédiction de désabonnement
- Le calcul des métriques du dashboard
- L'affichage des analytiques détaillées

## 🔧 Dépannage

### Problèmes Docker

**Les ports sont déjà utilisés :**

```bash
# Vérifier quels processus utilisent les ports
sudo lsof -i :3000
sudo lsof -i :8000
sudo lsof -i :5433

# Modifier les ports dans docker-compose.yml si nécessaire
ports:
  - "3001:3000"  # Changer le port hôte
```

**Les conteneurs ne démarrent pas :**

```bash
# Vérifier les logs
docker compose logs

# Rebuild sans cache
docker compose build --no-cache
docker compose up
```

**Problème de permissions Docker :**

```bash
# Ajouter l'utilisateur au groupe docker
sudo usermod -aG docker $USER
# Déconnexion/reconnexion nécessaire
```

### Problèmes Backend

**Erreur de connexion à la base de données :**

```bash
# Vérifier que PostgreSQL est en cours d'exécution
sudo systemctl status postgresql  # Linux
brew services list | grep postgresql  # macOS

# Tester la connexion
psql -U postgres -d churn -h localhost
```

**Modèles ML non trouvés :**

```bash
# Vérifier que les fichiers existent
ls -la backend/artifacts/
# Doit contenir churn_preprocessor.joblib et churn_xgb.joblib
```

**Erreur CORS :**

Vérifiez que `CORS_ORIGINS` dans `.env` inclut l'URL du frontend :
```env
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

### Problèmes Frontend

**Erreur de connexion à l'API :**

```bash
# Vérifier que NEXT_PUBLIC_API_URL est correct
echo $NEXT_PUBLIC_API_URL

# Vérifier que le backend est accessible
curl http://localhost:8000/api/churn/health
```

**Erreurs de build :**

```bash
# Nettoyer et réinstaller
rm -rf node_modules .next
npm install
npm run build
```

**Erreurs TypeScript :**

```bash
# Vérifier les erreurs
npm run lint

# Corriger automatiquement si possible
npm run lint -- --fix
```

### Problèmes de base de données

**Migration des colonnes timezone :**

Si vous avez des erreurs de timezone, le backend applique automatiquement les migrations au démarrage. Si nécessaire :

```sql
-- Se connecter à PostgreSQL
psql -U postgres -d churn

-- Vérifier le type des colonnes
\d batch_upload
\d churn_score_log

-- Si nécessaire, appliquer manuellement
ALTER TABLE batch_upload 
ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE;

ALTER TABLE churn_score_log 
ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE;
```

## 📁 Structure du Projet

```
application_churn/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── routes/          # Endpoints API
│   │   ├── core/
│   │   │   ├── config.py        # Configuration
│   │   │   └── database.py      # Modèles DB
│   │   ├── models/
│   │   │   └── schemas.py       # Schémas Pydantic
│   │   └── main.py              # Point d'entrée FastAPI
│   ├── artifacts/               # Modèles ML
│   ├── docker/                  # Scripts DB
│   ├── requirements.txt         # Dépendances Python
│   ├── Dockerfile              # Image Docker backend
│   └── .env                     # Variables d'environnement
│
├── frontend/
│   ├── app/
│   │   ├── (auth)/             # Routes d'authentification
│   │   ├── analytics/          # Pages analytiques
│   │   ├── dashboard/          # Tableau de bord
│   │   ├── imports/            # Import de données
│   │   ├── components/         # Composants réutilisables
│   │   ├── store/              # Redux store
│   │   └── layout.tsx          # Layout principal
│   ├── public/                 # Fichiers statiques
│   ├── package.json            # Dépendances Node
│   ├── Dockerfile             # Image Docker frontend
│   └── .env.local              # Variables d'environnement
│
├── docker-compose.yml          # Configuration Docker Compose
├── .env.example               # Template variables d'environnement
├── docker-start.sh            # Script de démarrage rapide
├── test_file.csv              # Fichier de test avec ~15k lignes
└── README.md                  # Ce fichier
```

## 🔐 Sécurité

### Pour la Production

1. **Changer les mots de passe par défaut** :
   - PostgreSQL : Modifier dans `docker-compose.yml` ou `.env`
   - pgAdmin : Modifier dans `docker-compose.yml`

2. **Variables d'environnement** :
   - Ne jamais commiter les fichiers `.env`
   - Utiliser un gestionnaire de secrets (Vault, AWS Secrets Manager, etc.)

3. **CORS** :
   - Limiter `CORS_ORIGINS` aux domaines autorisés uniquement

4. **HTTPS** :
   - Utiliser un reverse proxy (nginx, Traefik) avec SSL/TLS

5. **Base de données** :
   - Utiliser des credentials forts
   - Limiter l'accès réseau
   - Activer les sauvegardes automatiques

## 📊 API Endpoints

### Principaux endpoints

- `GET /api/churn/health` - Santé de l'API
- `GET /api/churn/model-info` - Informations sur le modèle ML
- `POST /api/churn/upload-large` - Téléversement de fichier volumineux
- `GET /api/churn/uploads` - Liste des téléversements
- `GET /api/churn/upload/{id}` - Détails d'un téléversement
- `GET /api/dashboard/metrics` - Métriques du tableau de bord

Documentation complète : http://localhost:8000/docs

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📝 License

[Spécifier votre licence ici]

## 👥 Auteurs

[Vos noms/informations]

## 🙏 Remerciements

- FastAPI pour le framework backend
- Next.js pour le framework frontend
- Material-UI pour les composants UI
- XGBoost pour le modèle de machine learning

---

Pour plus d'informations sur Docker, consultez [README.docker.md](./README.docker.md)
