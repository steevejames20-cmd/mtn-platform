# Docker – Guide pour l'équipe (Groupe 12)

**Projet :** plateforme d'abonnement MTN – Docker & DevOps (ENSPD, département GIT)
**Responsables Docker :** Baling Baling Charles, Bessawa Steeve
**Objet :** expliquer comment l'application NetConnect (React + Express + Prisma) est conteneurisée, et comment chaque rôle s'y branche.

---

## 1. Vue d'ensemble

| Service | Dossier | Image de base | Rôle | Port |
|---|---|---|---|---|
| `frontend` | `client/` | Node 20.18 (build) puis Nginx 1.27.2 non-root | Sert le site React et relaie `/api` vers le backend | **8080 (seul port publié)** |
| `backend` | `server/` | Node 20.18 alpine | API Express + Prisma | 4000 (interne) |
| `db` | – | PostgreSQL 16.4 alpine | Base de données, volume `pgdata` | 5432 (interne) |

```
Navigateur --8080--> frontend (Nginx) --/api--> backend (Express :4000) --> db (PostgreSQL)
                      réseau frontnet           réseaux frontnet + backnet    réseau backnet
```

Les noms de services Compose (`frontend`, `backend`, `db`) restent ceux du cahier des charges, même si les dossiers s'appellent `client/` et `server/`.

---

## 2. Démarrage avec Docker (3 commandes)

Prérequis : Docker Desktop (Windows) ou Docker Engine + plugin Compose (Linux), et Git.

```bash
git clone <url-du-depot> && cd mtn-platform
cp .env.example .env          # PowerShell : Copy-Item .env.example .env
docker compose up --build
```

Avant de lancer, **ouvrir `.env` et changer** `POSTGRES_PASSWORD`, `JWT_SECRET` et `ADMIN_PASSWORD`.
Générer un secret JWT : `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

Puis ouvrir **http://localhost:8080** (administration : http://localhost:8080/admin, avec `ADMIN_EMAIL` et `ADMIN_PASSWORD` du `.env`).

Au premier démarrage, le backend crée les tables (`prisma db push`), le compte administrateur et les données de démonstration (12 forfaits, 28 souscriptions). Aux démarrages suivants, rien n'est réécrit.

Arrêt : `Ctrl+C` puis `docker compose down` (les données restent). `docker compose down -v` **supprime** les données.

> Le premier `--build` télécharge les images de base et les moteurs Prisma (plusieurs dizaines de Mo). À faire une fois, en Wi-Fi ; les builds suivants utilisent le cache.

---

## 3. Développement sans conteneur pour l'API et le site

Utile pour modifier le code avec rechargement automatique. Seule la base tourne dans Docker.

```bash
npm run install:all                 # dépendances racine, server et client
cp .env.example .env                # (une fois) identifiants de la base
cp server/.env.example server/.env  # (une fois) configuration de l'API
npm run db:up                       # démarre PostgreSQL, exposé sur 127.0.0.1:5432
npm run setup                       # crée les tables et les données de démonstration
npm run dev                         # API sur :4000, site sur http://localhost:5173
```

Sous Windows, `Lancer le site.bat` enchaîne ces étapes. Arrêter la base : `npm run db:down`.

Le mot de passe de `DATABASE_URL` dans `server/.env` doit être le même que `POSTGRES_PASSWORD` du `.env` racine.

---

## 4. Structure du dépôt

```
mtn-platform/
|-- client/                  # React + Vite
|   |-- Dockerfile, .dockerignore
|   |-- nginx.conf           # site + proxy /api et /health vers le backend
|   `-- src/ ...
|-- server/                  # Express + Prisma
|   |-- Dockerfile, .dockerignore
|   |-- docker-entrypoint.sh # db push, seed, puis démarrage de l'API
|   |-- prisma/schema.prisma, seed.js
|   |-- src/ ...
|   `-- tests/api.test.js
|-- docker-compose.yml       # production / cloud : 3 services
|-- docker-compose.dev.yml   # ajoute l'accès local à PostgreSQL (npm run db:up)
|-- .env.example             # modèle de configuration, sans secret
|-- .gitignore, .gitattributes
|-- Lancer le site.bat       # lanceur Windows (développement)
|-- README.md                # description fonctionnelle de l'application
`-- DOCKER.md                # ce document
```

À ajouter par le Responsable CI/CD : `.github/workflows/ci-cd.yml`.

---

## 5. Variables d'environnement (`.env` à la racine)

| Variable | Rôle | Obligatoire |
|---|---|---|
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Identifiants de la base. Le mot de passe est inséré dans une URL : lettres et chiffres uniquement | Oui |
| `JWT_SECRET` | Secret de signature des jetons (admin et historique) | Oui |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Compte administrateur créé au premier démarrage | Oui |
| `ADMIN_NAME` | Nom affiché de l'administrateur | Non (`Administrateur`) |
| `FRONTEND_PORT` | Port publié sur la machine | Non (`8080`) |
| `REGISTRY`, `IMAGE_TAG` | Nom des images : `${REGISTRY}/mtn-backend:${IMAGE_TAG}` | Non (`local`, `dev`) |

Si une variable obligatoire manque, Compose s'arrête avec un message qui la nomme.
Changer `ADMIN_PASSWORD` après le premier démarrage ne modifie pas le compte existant (le seed ne réécrit pas un administrateur déjà présent).

---

## 6. Ce qui a changé dans le code pour l'aligner avec Docker

| Changement | Pourquoi |
|---|---|
| `server/prisma/schema.prisma` : `sqlite` devient `postgresql` | Le cahier des charges impose PostgreSQL conteneurisé ; un fichier SQLite ne convient pas à un conteneur sans état |
| `mode: 'insensitive'` ajouté aux recherches (`plans.js`, `history.js`, `admin.js`) | SQLite ignorait la casse, PostgreSQL non : sans cela, chercher « classique » ne trouverait plus « Forfait Classique » |
| Route `GET /health` dans `server/src/app.js` | Sonde Docker : 200 si l'API et la base répondent, 503 sinon (`/api/health` existe toujours) |
| `app.set('trust proxy', 1)` | Derrière Nginx, les limiteurs de débit doivent lire la vraie IP du client, sinon tous les utilisateurs partagent le même compteur |
| `prisma` passe de `devDependencies` à `dependencies` | Le conteneur exécute `prisma db push` au démarrage |
| Tests : schéma PostgreSQL `test` au lieu du fichier `test.db` | Les tests n'effacent jamais les données du schéma `public` |
| `client/dist`, `*.db` et le PDF de test retirés du dépôt | Fichiers générés : le build les recrée. Ils sont dans `.gitignore` |
| Anciens dossiers `backend/`, `frontend/`, `db/` supprimés | Remplacés par `server/` et `client/` ; le schéma est créé par Prisma |

---

## 7. Ce que chaque rôle doit faire

### Responsable CI/CD

À chaque push sur la branche principale :

1. **Tester** (nécessite PostgreSQL, fourni par un service du workflow) :
   ```yaml
   services:
     postgres:
       image: postgres:16.4-alpine
       env:
         POSTGRES_USER: mtn_user
         POSTGRES_PASSWORD: ci_password
         POSTGRES_DB: mtn_subscriptions
       ports: ["5432:5432"]
       options: >-
         --health-cmd "pg_isready -U mtn_user" --health-interval 5s
         --health-timeout 5s --health-retries 10
   steps:
     - uses: actions/checkout@v4
     - uses: actions/setup-node@v4
       with: { node-version: 20 }
     - run: cd server && npm ci && npx prisma generate && npm test
       env:
         DATABASE_URL: postgresql://mtn_user:ci_password@localhost:5432/mtn_subscriptions?schema=public
   ```
2. **Construire et publier** deux images vers GHCR : `server/` vers `ghcr.io/<org>/mtn-backend:<tag>` et `client/` vers `ghcr.io/<org>/mtn-frontend:<tag>`, en `linux/amd64,linux/arm64`.
3. **Déployer** par SSH : `docker compose pull && docker compose up -d --no-build`.

Secrets GitHub (jamais dans le dépôt) : accès au registre, hôte, utilisateur et clé SSH. Sur le serveur, `REGISTRY`, `IMAGE_TAG` et tous les secrets sont définis dans le `.env` du serveur.

### Responsable Cloud

- Le serveur a besoin de Docker + Compose, de `docker-compose.yml`, de son propre `.env` (vrais mots de passe forts) et d'un accès au registre (`docker login ghcr.io`).
- **Ouvrir uniquement le port 8080** (ou 80/443 derrière un reverse proxy HTTPS). Jamais 4000 ni 5432.
- Serveur ARM (par exemple les instances Ampere d'Oracle Cloud Always Free) : il faut des images `arm64`, donc une CI multi-architecture.
- Mémoire : les limites cumulées sont d'environ 700 Mo (db 256, backend 384, frontend 64). Prévoir au moins 1 Go de RAM libre.
- Sauvegarde : `docker compose exec db pg_dump -U <POSTGRES_USER> <POSTGRES_DB> > sauvegarde.sql`.
- Données de démonstration : créées au premier démarrage ; pour une base vide, supprimer les forfaits et souscriptions depuis l'administration.

### Responsable Qualité

- Tests automatiques : base lancée (`npm run db:up`), puis `npm test` à la racine (suites d'intégration de l'API, dont `/health` et la recherche).
- Recette manuelle : checklist de la section 9.
- Rapport : les choix techniques sont en section 8.

### Équipe applicative (client / server)

- L'application tourne telle quelle dans les conteneurs. Les appels du site utilisent des URLs relatives (`/api/...`) : à conserver.
- Toute modification de `schema.prisma` : tester avec `npm run setup`. Au démarrage, le conteneur applique le schéma avec `prisma db push`, qui refuse les changements destructifs.
- Ne pas commiter `.env`, `server/.env`, `client/dist`, ni de fichiers `.db`.

---

## 8. Choix techniques (pour le rapport)

| Exigence | Réponse |
|---|---|
| Versions figées, pas de `latest` | `node:20.18.0-alpine3.20`, `nginx-unprivileged:1.27.2-alpine`, `postgres:16.4-alpine`, dépendances npm figées par les `package-lock.json` |
| Sobriété des données | Images alpine, builds multi-stage, cache npm BuildKit, `.dockerignore`, compression gzip et cache long des fichiers `/assets` dans Nginx |
| Non-root | `USER node` (backend), image Nginx « unprivileged » (port 8080), PostgreSQL non-root par défaut |
| Aucun secret dans le dépôt ni les images | Variables `${...}` dans Compose, `.env` ignoré par Git, variables obligatoires vérifiées par Compose |
| Persistance | Volume nommé `pgdata` |
| Healthchecks | `pg_isready` (db), `/health` (backend, vérifie aussi la base), page d'accueil (frontend) ; `depends_on: service_healthy` impose l'ordre db, backend, frontend |
| Ports limités | Seul `8080` est publié |
| Ressources limitées | `deploy.resources.limits` sur chaque service |
| Arrêt propre | `init: true` (le processus principal reçoit les signaux) |
| Une seule commande | `docker compose up --build` |
| Fuseau horaire | `TZ=Africa/Douala` sur le backend : les « jours » du tableau de bord et des filtres suivent l'heure du Cameroun |

---

## 9. Checklist de recette

| Critère | Comment vérifier | Fait |
|---|---|---|
| Démarrage sur PC vierge | `cp .env.example .env`, mots de passe changés, `docker compose up --build` sans erreur | [ ] |
| Services en bonne santé | `docker compose ps` : db, backend, frontend `healthy` | [ ] |
| Accès local | http://localhost:8080 affiche le catalogue | [ ] |
| Parcours complet | Choisir un forfait, souscrire, payer (simulation), reçu PDF, historique | [ ] |
| Administration | http://localhost:8080/admin avec le compte du `.env` | [ ] |
| Sonde de santé | `curl http://localhost:8080/health` renvoie `{"status":"ok","database":"up"}` | [ ] |
| Persistance | Souscrire, `docker compose down`, `docker compose up`, l'historique est toujours là | [ ] |
| Aucun secret dans le dépôt | `git ls-files` ne contient aucun `.env` ; relire `git diff` avant push | [ ] |
| Déploiement cloud | `curl http://<ip>:8080/health` sur le serveur | [ ] |
| Même image PC / cloud | Voir l'encadré ci-dessous | [ ] |
| Pipeline | Un push déclenche tests, build, publication, déploiement | [ ] |

**Prouver que c'est la même image.** Deux builds séparés donnent des identifiants différents. Il faut : (1) la CI construit et publie ; (2) le PC et le serveur **téléchargent** (`docker compose pull`) ; (3) comparer le digest : `docker image inspect <image> --format '{{index .RepoDigests 0}}'`. Les deux machines doivent afficher le même `sha256:...`. Entre x86 et ARM, `.Id` diffère par architecture ; le digest du manifeste multi-architecture reste identique.

---

## 10. Commandes utiles

```bash
docker compose ps                         # état et santé
docker compose logs -f backend            # logs d'un service
docker compose up -d --build              # arrière-plan
docker compose down                       # arrêt (données conservées)
docker compose down -v                    # arrêt + suppression des données
docker compose exec db psql -U <POSTGRES_USER> -d <POSTGRES_DB>
docker image ls                           # taille des images
npm run db:up / db:down                   # base seule pour le développement
```

## 11. Dépannage

| Symptôme | Cause probable | Solution |
|---|---|---|
| `required variable ... is missing` | `.env` absent ou incomplet | `cp .env.example .env` et vérifier les variables |
| `port is already allocated` (8080) | Port déjà utilisé | Changer `FRONTEND_PORT` dans `.env` |
| Backend `unhealthy` ou qui redémarre | Base pas prête, mauvais identifiants, ou schéma refusé | `docker compose logs db backend` |
| `Authentication failed` (Prisma) | Mot de passe changé après la création du volume, ou caractères spéciaux dans l'URL | `docker compose down -v` puis relancer ; mot de passe alphanumérique |
| Backend tué faute de mémoire (`Killed`, code 137) | Limite de 384 Mo trop basse sur la machine | Augmenter `memory` du backend dans `docker-compose.yml` |
| `exec ./docker-entrypoint.sh: no such file` | Fins de ligne Windows dans le script | Déjà corrigé dans le Dockerfile ; sinon `git config core.autocrlf input` et recloner |
| Échec du build au téléchargement des moteurs Prisma | Réseau qui bloque `binaries.prisma.sh` | Utiliser un autre réseau pour le premier build |
| Site chargé mais « API hors ligne » ou erreurs 502 | Backend arrêté | `docker compose ps`, puis logs du backend |
| Modification de `schema.prisma` sans effet | Le conteneur utilise l'ancienne image | `docker compose up --build` |
| Tests : `Can't reach database server` | Base non démarrée | `npm run db:up` |

## 12. Règles Git

- Ne **jamais** commiter `.env` ni `server/.env`.
- Commiter les `package-lock.json` (racine, `server/`, `client/`).
- Relire `git diff` avant chaque push pour vérifier qu'aucun secret n'apparaît.
- Toute modification des Dockerfiles ou de Compose : prévenir les Responsables Docker.
