# Docker – Guide pour l'équipe (Groupe 12)

**Projet :** plateforme d'abonnement MTN – Docker & DevOps (ENSPD, département GIT)
**Rôle concerné :** Responsable Docker (Baling Baling Charles, Bessawa Steeve)
**Objet de ce document :** expliquer ce qui est fait côté Docker et comment chaque rôle s'y branche.

---

## 1. Ce qui est livré

| Élément | Fichier | Statut |
|---|---|---|
| Dockerfile backend (multi-stage, non-root) | `backend/Dockerfile` | Prêt |
| Dockerfile frontend (Nginx non-root + reverse proxy) | `frontend/Dockerfile`, `frontend/nginx.conf` | Prêt |
| Orchestration (3 services, volume, healthchecks, limites) | `docker-compose.yml` | Prêt |
| Modèle de configuration sans secret | `.env.example` | Prêt |
| Schéma SQL + données d'exemple (chargés au 1er démarrage) | `db/init/01-schema.sql` | Prêt |
| Application de test (MVP : forfaits, souscription, historique, health) | `backend/`, `frontend/public/` | Prête (remplaçable) |

**Ce qui a été vérifié :** les 7 tests du backend passent ; l'API fonctionne contre un vrai PostgreSQL 16 avec notre schéma ; l'interface fonctionne dans un navigateur (mobile) ; `docker compose config` valide le Compose.
**À valider au premier lancement sur un PC avec Docker :** `docker compose up --build` complet (build des images, `nginx.conf`, healthchecks). Si quelque chose échoue, prévenir le Responsable Docker avec la sortie de `docker compose logs`.

---

## 2. Démarrage en 3 commandes

Prérequis : Docker Desktop (Windows) ou Docker Engine + plugin Compose (Linux), et Git.

```bash
git clone <url-du-depot> && cd mtn-platform
cp .env.example .env          # Windows PowerShell : Copy-Item .env.example .env
docker compose up --build
```

Puis ouvrir **http://localhost:8080**. Pour arrêter : `Ctrl+C` puis `docker compose down`.

> Si vous oubliez `cp .env.example .env`, Compose s'arrête avec le message « Copier .env.example vers .env ». C'est voulu : aucun secret n'est écrit dans le code.

**Économie de data MTN :** le premier `--build` télécharge quelques dizaines à ~200 Mo (estimation) d'images de base (Node, Nginx, PostgreSQL en alpine). Faites-le une fois en Wi-Fi ; les lancements suivants utilisent le cache et ne téléchargent presque rien.

---

## 3. Structure du dépôt

```
mtn-platform/
├── backend/                 # Node.js / Express (port 3000)
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── package.json + package-lock.json   # le lockfile DOIT être commité
│   ├── app.js, server.js
│   └── tests/               # tests lancés par `npm test`
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf           # sert le site + proxy /api et /health vers le backend
│   ├── .dockerignore
│   └── public/              # index.html, style.css, app.js
├── db/init/01-schema.sql    # exécuté UNIQUEMENT à la création du volume
├── docker-compose.yml
├── .env.example             # modèle ; le vrai .env n'est jamais commité
├── .gitignore
└── DOCKER.md                # ce document
```

Dossier à ajouter par le Responsable CI/CD : `.github/workflows/ci-cd.yml`.

---

## 4. Architecture et réseau

| Service | Image | Port interne | Exposé à l'extérieur ? | Réseau(x) |
|---|---|---|---|---|
| `frontend` | Nginx 1.27.2 (non-root) | 8080 | **Oui : `8080`** | `frontnet` |
| `backend` | Node 20.18.0 alpine | 3000 | Non | `frontnet`, `backnet` |
| `db` | PostgreSQL 16.4 alpine | 5432 | Non | `backnet` |

Le navigateur parle uniquement à Nginx. Nginx relaie `/api/*` et `/health` au backend. La base n'est joignable que par le backend. **Un seul port est à ouvrir côté serveur : 8080.**

Volume : `pgdata` (données PostgreSQL). `docker compose down` conserve les données ; `docker compose down -v` les **supprime**.

Ressources plafonnées (offres gratuites) : db 256 Mo, backend 256 Mo, frontend 64 Mo, soit environ 576 Mo au total.

---

## 5. Variables d'environnement

Définies dans `.env` (copie de `.env.example`).

| Variable | Rôle | Défaut dans `.env.example` |
|---|---|---|
| `POSTGRES_USER` | Utilisateur de la base | `mtn_user` |
| `POSTGRES_PASSWORD` | Mot de passe de la base | `changez_moi` → **à changer** |
| `POSTGRES_DB` | Nom de la base | `mtn_subscriptions` |
| `NODE_ENV` | Mode du backend | `production` |
| `FRONTEND_PORT` | Port publié sur l'hôte | `8080` |
| `REGISTRY` | Préfixe du registre d'images | `local` |
| `IMAGE_TAG` | Version des images | `dev` |

Les images sont nommées `${REGISTRY}/mtn-backend:${IMAGE_TAG}` et `${REGISTRY}/mtn-frontend:${IMAGE_TAG}`. Exemple pour GHCR : `REGISTRY=ghcr.io/<organisation>` et `IMAGE_TAG=<sha-ou-version>`.

---

## 6. Contrat applicatif (si vous remplacez l'application de test)

L'application fournie est un MVP de test. Si le groupe a sa propre application, elle fonctionne avec nos Dockerfiles à condition de respecter ceci :

**Backend**
- Écoute sur le port **3000** et démarre avec `node server.js` (sinon modifier le `CMD` du Dockerfile).
- Lit la connexion à la base dans `DATABASE_URL` et le port dans `PORT`. Aucun secret en dur.
- `GET /health` répond **200** quand tout va bien, **503** si la base est injoignable.
- Routes sous `/api/` : `GET /api/plans`, `POST /api/subscriptions` (`{ "phone", "plan_id" }`), `GET /api/subscriptions/:phone`.
- `package-lock.json` commité (le build utilise `npm ci`), et un script `npm test`.

**Frontend**
- Fichiers statiques dans `frontend/public/`.
- Appels à l'API en **URL relatives** (`/api/...`, jamais `http://localhost:3000`), sinon cela casse sur le cloud.

**Base de données**
- Le schéma vit dans `db/init/*.sql`. Ces scripts ne s'exécutent qu'à la **première** création du volume. Après une modification : `docker compose down -v && docker compose up --build`.

---

## 7. Ce que chaque rôle doit faire de ce travail

### Chef de projet
- Valider avec le groupe le planning (3 ou 6 semaines, voir section 8 du cahier des charges).
- Suivre la checklist de la section 9 ci-dessous.

### Responsable CI/CD
Le pipeline GitHub Actions doit, à chaque push sur la branche principale :

1. **Tester** : `cd backend && npm ci && npm test` (aucune base nécessaire, les tests utilisent une base simulée).
2. **Construire et publier** les deux images vers GHCR (ou Docker Hub), avec `docker/build-push-action` :
   - `backend/` → `ghcr.io/<org>/mtn-backend:<tag>`
   - `frontend/` → `ghcr.io/<org>/mtn-frontend:<tag>`
   - Plateformes : `linux/amd64,linux/arm64` (voir la section Cloud).
3. **Déployer** par SSH sur le serveur : `docker compose pull && docker compose up -d --no-build`.

À prévoir :
- **Secrets GitHub** (jamais dans le dépôt) : accès au registre, hôte SSH, utilisateur SSH, clé privée SSH.
- Sur le serveur, `REGISTRY` et `IMAGE_TAG` sont dans le `.env` du serveur, mis à jour à chaque déploiement.
- Le workflow se place dans `.github/workflows/ci-cd.yml`.

### Responsable Cloud
- Le serveur n'a besoin que de Docker + plugin Compose, du `docker-compose.yml`, de son propre `.env` (avec un **vrai mot de passe fort**) et d'un accès au registre (`docker login ghcr.io`).
- **Ouvrir uniquement le port 8080** (ou 80/443 si vous placez un reverse proxy HTTPS devant). Ne jamais ouvrir 3000 ni 5432.
- **Architecture du serveur :** si l'offre gratuite est en ARM (c'est le cas des instances Ampere d'Oracle Cloud Always Free), il faut des images `arm64`. Les images de base que nous utilisons (Node, Nginx, PostgreSQL) existent en `amd64` et `arm64` ; la CI doit donc publier en multi-architecture.
- Mémoire : prévoir au moins ~600 Mo disponibles pour la stack.
- Sauvegarde éventuelle de la base : `docker compose exec db pg_dump -U <POSTGRES_USER> <POSTGRES_DB> > sauvegarde.sql`.

### Responsable Qualité
- **Tests automatiques :** `cd backend && npm test` (7 tests : validation des numéros, health 200/503, forfaits, souscription, historique, erreurs).
- **Recette manuelle (critères du cahier des charges, section 11)** : voir la checklist ci-dessous.
- **Documentation et rapport :** ce document donne la matière pour la partie Docker (choix techniques en section 8).

---

## 8. Choix techniques (pour le rapport)

| Exigence du cahier des charges | Réponse |
|---|---|
| Versions figées, pas de `latest` | `node:20.18.0-alpine3.20`, `nginx-unprivileged:1.27.2-alpine`, `postgres:16.4-alpine`, dépendances npm figées par `package-lock.json` |
| Sobriété data | Images alpine, build multi-stage, cache npm BuildKit, `.dockerignore` |
| Utilisateur non-root | `USER node` (backend), image Nginx « unprivileged » (port 8080), PostgreSQL non-root par défaut |
| Aucun secret dans le dépôt / les images | Variables `${...}` dans Compose, `.env` dans `.gitignore`, `.env.example` sans valeur réelle |
| Persistance | Volume nommé `pgdata` |
| Healthchecks (BF8) | `pg_isready` (db), `/health` (backend), page d'accueil (frontend) ; `depends_on: service_healthy` impose l'ordre de démarrage |
| Ports limités | Seul `8080` est publié |
| Ressources limitées | `deploy.resources.limits` sur chaque service |
| Une commande (BF2) | `docker compose up --build` |

---

## 9. Checklist de recette (critères d'acceptation)

| Critère | Comment vérifier | Fait |
|---|---|---|
| Démarrage sur PC vierge | `cp .env.example .env && docker compose up --build` sans erreur | ☐ |
| Accès local sur le port 8080 | Ouvrir http://localhost:8080 | ☐ |
| Consultation / souscription / historique | Utiliser l'interface (numéro ex. `670123456`) | ☐ |
| Health check | `curl http://localhost:8080/health` → `{"status":"ok","database":"up"}` | ☐ |
| Persistance | Souscrire, `docker compose down`, `docker compose up`, l'historique est toujours là | ☐ |
| Aucun secret dans le dépôt | `git ls-files \| grep -i "^\.env$"` ne renvoie rien ; relire le diff avant push | ☐ |
| Déploiement cloud | Même URL de test sur le serveur : `curl http://<ip>:8080/health` | ☐ |
| Même image PC / cloud | Voir l'encadré ci-dessous | ☐ |
| Mêmes réponses PC / cloud | Comparer `curl .../api/plans` sur les deux | ☐ |
| Push → build, test, publication, déploiement | Pousser un commit et suivre l'onglet Actions | ☐ |

**Prouver que c'est la même image (important).** Deux builds séparés (un sur le PC, un sur le serveur) donnent des identifiants **différents**, même avec le même code. Pour que ce soit la même image :
1. La CI construit et publie l'image dans le registre.
2. Le PC **et** le serveur la **téléchargent** (`docker compose pull`) au lieu de la reconstruire.
3. Comparer le *digest* : `docker image inspect <image> --format '{{index .RepoDigests 0}}'`. Les deux machines doivent afficher le même `sha256:...`.

Si le PC est en x86 et le serveur en ARM, l'image locale (`.Id`) diffère forcément par architecture ; c'est le digest du manifeste multi-architecture qui reste identique.

---

## 10. Commandes utiles

```bash
docker compose ps                       # état et santé des services
docker compose logs -f backend          # suivre les logs d'un service
docker compose up -d --build            # lancer en arrière-plan
docker compose down                     # arrêter (données conservées)
docker compose down -v                  # arrêter ET supprimer les données
docker compose exec db psql -U mtn_user -d mtn_subscriptions   # ouvrir la base
docker image ls                         # taille des images
docker buildx build --platform linux/amd64,linux/arm64 -t <image> backend   # multi-architecture
```

## 11. Dépannage

| Symptôme | Cause probable | Solution |
|---|---|---|
| `required variable POSTGRES_... is missing` | `.env` absent | `cp .env.example .env` |
| `port is already allocated` (8080) | Port déjà utilisé | Changer `FRONTEND_PORT` dans `.env` |
| Backend « unhealthy » | Base pas prête ou mauvais identifiants | `docker compose logs db backend` ; vérifier `.env` |
| Mot de passe changé mais la base refuse | Le volume garde l'ancien mot de passe | `docker compose down -v` puis relancer (supprime les données) |
| Schéma SQL modifié, sans effet | Scripts `db/init` exécutés seulement à la création du volume | `docker compose down -v` puis relancer |
| `npm ci` échoue au build | `package-lock.json` absent ou désynchronisé | Le régénérer (`npm install`) et le commiter |
| L'interface charge mais « API hors ligne » | Le frontend appelle une URL absolue, ou le backend est arrêté | Utiliser des URLs relatives ; `docker compose ps` |
| Téléchargements lents / forfait épuisé | Images non en cache | Télécharger en Wi-Fi ; ne pas faire `docker system prune -a` inutilement |

## 12. Règles Git

- Ne **jamais** commiter `.env` (déjà dans `.gitignore`).
- Commiter `package-lock.json`.
- Avant chaque push : relire `git diff` pour vérifier qu'aucun secret n'apparaît.
- Toute modification des Dockerfiles ou du Compose : prévenir le Responsable Docker.
