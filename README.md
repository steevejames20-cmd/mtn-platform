# NetConnect — Plateforme de souscription aux forfaits Internet

Application web full-stack (projet académique) permettant de consulter, comparer et souscrire à des forfaits Internet mobile, avec un **paiement Mobile Money entièrement simulé**, un historique utilisateur et un espace administrateur.

> ⚠️ **Simulation de paiement – Environnement de test.** Aucune API MTN / Orange réelle n'est appelée, aucun code PIN n'est demandé et aucun argent n'est débité.

## Stack technique

| Couche | Technologies |
| --- | --- |
| Frontend | React 18 + Vite 6, React Router 6, CSS moderne (sans framework), icônes lucide-react, reçus PDF avec jsPDF |
| Backend | Node.js + Express 4, validation zod, helmet, express-rate-limit |
| Base de données | SQLite via Prisma ORM 6 (fichier `server/prisma/dev.db`) |
| Authentification | JWT (admin : 8 h ; historique utilisateur : 30 min), mots de passe hachés bcrypt |

## Prérequis

- Node.js **18 ou plus** (testé avec Node 24)
- npm

## Installation et lancement

Depuis le dossier `forfaits-internet/` :

```bash
npm run install:all
```

Créez le fichier d'environnement du serveur (puis changez `JWT_SECRET`) :

```bash
cp server/.env.example server/.env
```

Créez la base SQLite et insérez les données de démonstration :

```bash
npm run setup
```

Lancez l'API (port 4000) et le site (port 5173) en même temps :

```bash
npm run dev
```

Ouvrez ensuite **http://localhost:5173**.

Le serveur Vite redirige automatiquement `/api` vers `http://localhost:4000`.

### Autres commandes

| Commande | Effet |
| --- | --- |
| `npm test` | Tests d'intégration de l'API (base de test séparée `prisma/test.db`) |
| `npm run build` | Build de production du frontend (`client/dist`) |
| `npm --prefix server run db:seed` | Réinsère les données de démo si les tables sont vides |
| `npm --prefix server run db:reset` | ⚠️ Vide **toute** la base de développement puis la ré-alimente |

## Comptes et données de démonstration

**Administrateur** (créé par le seed, modifiable dans `server/.env`) :

- URL : http://localhost:5173/admin
- E-mail : `admin@netconnect.cm`
- Mot de passe : `Admin@2026`

**Données** : 12 forfaits (dont 1 désactivé) et 28 souscriptions réparties sur les 7 derniers jours.

**Numéros de test** avec un historique existant : `677123456`, `699876543`, `655443322`, `690112233`, `694123456`…

## Parcours utilisateur

1. **Accueil** → bouton « Découvrir les forfaits ».
2. **Catalogue** (`/forfaits`) : recherche, filtres prix / volume / durée, forfaits populaires, tri par prix croissant ou décroissant et par volume. Le filtrage est fait **côté base de données** et l'état est conservé dans l'URL.
3. **Souscription** (`/souscrire/:id`) : saisie et validation du numéro (9 chiffres commençant par 6, `+237` accepté), récapitulatif.
4. **Paiement simulé** (`/paiement/:id`) : choix MTN Mobile Money ou Orange Money, numéro payeur, montant automatique, puis « Simuler le paiement ». La fenêtre de simulation propose trois issues :
   - **Confirmer** → transaction réussie, forfait activé ;
   - **Simuler un échec** → transaction échouée (solde insuffisant) ;
   - **Annuler** → transaction annulée.

   Un numéro payeur **se terminant par `0000`** échoue aussi automatiquement. Après un échec ou une annulation, l'utilisateur peut réessayer.
5. **Confirmation** (`/confirmation/:référence`) : récapitulatif complet, **téléchargement du reçu PDF** et impression.
6. **Historique** (`/historique`) : l'utilisateur saisit son numéro, reçoit un **code à 6 chiffres affiché à l'écran (SMS simulé)**, puis consulte uniquement ses propres transactions (réussies, échouées, annulées). Il dispose de filtres par date, opérateur et statut, d'une recherche, du détail de chaque transaction et des reçus PDF.

## Espace administrateur

- **Tableau de bord** : nombre de forfaits et de forfaits actifs, souscriptions, transactions réussies, échouées et annulées, chiffre d'affaires simulé, revenus sur 7 jours, répartition par opérateur, top des forfaits, dernières souscriptions.
- **Forfaits** : ajout, modification, suppression (avec confirmation), activation ou désactivation, recherche. Les volumes se saisissent en Mo ou Go et les durées en heures ou jours.
- **Souscriptions** : recherche (numéro, forfait, référence), filtres statut / opérateur / dates, pagination, et page de détail avec toutes les tentatives de paiement et leurs reçus.
- **Messages** : messages envoyés depuis le formulaire de contact.

## Base de données

Schéma : `server/prisma/schema.prisma`

| Table | Rôle |
| --- | --- |
| `Admin` | Comptes administrateurs (mot de passe haché bcrypt) |
| `Plan` | Forfaits (prix FCFA, volume en Mo, durée en heures, statut, popularité) |
| `Subscription` | Souscription d'un numéro à un forfait → `Plan` (relation optionnelle). Les caractéristiques du forfait sont copiées pour que l'historique reste exact si le forfait est modifié ou supprimé. |
| `Transaction` | Chaque tentative de paiement simulée → `Subscription` (référence unique `SIM-AAAAMMJJ-XXXXXXXXXX`, opérateur, statut, motif d'échec) |
| `VerificationCode` | Codes fictifs (hachés, expirant après 5 min, 5 essais max) pour l'accès à l'historique |
| `ContactMessage` | Messages du formulaire de contact |

## Sécurité

- Routes `/api/admin/*` protégées par JWT ; les pages admin redirigent vers la connexion si l'utilisateur n'est pas authentifié.
- Le jeton d'historique est limité à un numéro : l'API ne renvoie jamais les transactions d'un autre numéro, et ce jeton ne donne pas accès à l'administration.
- Validation des données côté client **et** serveur (zod), requêtes paramétrées via Prisma (pas d'injection SQL).
- Limitation du nombre de tentatives (connexion admin, codes de vérification, contact), en-têtes de sécurité via helmet, CORS restreint.
- Secrets dans `server/.env` (non versionné). Aucune donnée bancaire n'est stockée.
- Les identifiants de souscription (cuid) et les références de transaction sont aléatoires et non devinables ; ce sont eux qui donnent accès aux pages de paiement et de reçu.

## Tests

`npm test` exécute 6 suites d'intégration (`server/tests/api.test.js`) :

- catalogue (filtres, tri, recherche, forfaits inactifs masqués) ;
- validation du numéro ;
- parcours complet : paiement échoué, annulé, échec via `0000`, réussi, double paiement refusé ;
- historique (code fictif, cloisonnement par numéro) ;
- authentification admin et CRUD des forfaits ;
- souscriptions admin (filtres, détail) et formulaire de contact.

## Arborescence

```
forfaits-internet/
├── package.json              # scripts globaux (install:all, setup, dev, test)
├── server/
│   ├── prisma/
│   │   ├── schema.prisma     # modèle de données
│   │   └── seed.js           # données de démonstration
│   ├── src/
│   │   ├── app.js            # configuration Express
│   │   ├── index.js          # démarrage du serveur
│   │   ├── lib/              # prisma, auth JWT, validation, erreurs, filtres
│   │   └── routes/           # plans, subscriptions, payments, history, contact, admin
│   └── tests/api.test.js
└── client/
    ├── index.html
    ├── vite.config.js        # proxy /api -> :4000
    └── src/
        ├── App.jsx           # routes
        ├── styles.css        # identité visuelle et responsive
        ├── lib/              # client API, formatage, reçu PDF
        ├── context/          # authentification admin, notifications
        ├── components/       # Layout, PlanCard, UI (modale, badges…), illustration
        └── pages/            # pages publiques + pages/admin
```

## Personnalisation

Le nom **NetConnect** et le logo ovale « NC » sont une identité générique inspirée de la maquette (jaune et noir). Pour les changer, modifiez le composant `Logo` (`client/src/components/ui.jsx`), le `<title>` de `client/index.html` et `client/public/favicon.svg`.
