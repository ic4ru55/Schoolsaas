# Architecture technique recommandee

## Stack recommandee

### Frontend

Next.js, React et TypeScript.

Raisons :

- interface moderne et responsive ;
- ecosysteme mature ;
- bonne separation entre pages, composants et appels API ;
- reutilisable plus tard pour un portail parent/enseignant ;
- bon support des tableaux, filtres, formulaires et dashboards.

### Backend

NestJS avec TypeScript.

Raisons :

- architecture modulaire claire ;
- injection de dependances ;
- guards, interceptors, pipes et validation adaptes a la securite ;
- facilite a organiser les modules metier ;
- bon support des jobs, API REST, WebSocket plus tard et tests.

### Base de donnees

PostgreSQL.

Raisons :

- fiable pour les donnees critiques ;
- contraintes relationnelles solides ;
- transactions ;
- indexes ;
- vues et rapports ;
- bonne compatibilite avec `pg_dump` pour sauvegarde/restauration.

### ORM

Prisma.

Raisons :

- migrations lisibles ;
- typage TypeScript ;
- productivite pour un MVP ;
- bonne integration NestJS.

### Installation locale

Docker Compose pour le MVP :

- `web` : interface Next.js ;
- `api` : backend NestJS ;
- `db` : PostgreSQL ;
- `worker` : jobs de sauvegarde, imports et generation lourde ;
- `storage` optionnel : stockage local des documents et backups.

Plus tard, un installeur Windows pourra automatiser Docker Desktop, les variables d'environnement, le lancement du service et les raccourcis.

### Sauvegarde cloud

Sauvegarde en deux niveaux :

1. Sauvegarde locale : dump PostgreSQL compresse et chiffre sur le serveur local.
2. Sauvegarde cloud : envoi du fichier chiffre vers un stockage S3 compatible.

Fournisseurs possibles :

- S3 compatible chez un hebergeur africain ou europeen ;
- Supabase Storage ;
- MinIO sur serveur prive ;
- AWS S3 si le cout est accepte.

Le fichier doit etre chiffre avant l'envoi. La plateforme centrale ne doit pas avoir acces aux donnees sensibles en clair.

### PDF

Generation cote serveur depuis des templates HTML/CSS :

- bulletins ;
- recus ;
- certificats ;
- listes de classe ;
- releves ;
- attestations.

Moteur recommande : Playwright/Chromium cote serveur pour imprimer des pages HTML en PDF. Cela donne un rendu proche de ce que l'utilisateur voit et facilite la personnalisation.

## Architecture logique

```text
Utilisateurs LAN
    |
    v
Application Web Next.js
    |
    v
API NestJS locale
    |
    +--> PostgreSQL local
    +--> Stockage local documents/backups
    +--> Worker jobs/import/PDF/sauvegarde
    |
    v
Plateforme centrale, seulement quand internet existe
    |
    +--> licences
    +--> modules actifs
    +--> statut backups
    +--> alertes techniques
    +--> stockage cloud backups chiffres
```

## Architecture des applications

Structure proposee pour le futur code :

```text
SchoolSaaS-BF/
  apps/
    web/                 # Next.js
    api/                 # NestJS
    worker/              # jobs planifies et lourds
  packages/
    shared/              # types communs, constantes, permissions
    pdf-templates/       # templates bulletins, recus, attestations
  infra/
    docker/
    scripts/
    backups/
  docs/
```

## Mode local et mode cloud

Le local reste la source principale des donnees de l'etablissement.

Le cloud sert a :

- verifier la licence ;
- recuperer les modules actifs ;
- envoyer les sauvegardes chiffrees ;
- remonter les alertes techniques ;
- faciliter la restauration.

Il ne faut pas commencer par une synchronisation bidirectionnelle complete. C'est plus risque et plus long. Le MVP doit d'abord faire de la sauvegarde/restauration robuste.

## Strategie multi-etablissement

Pour le MVP local :

- une installation = un etablissement principal ;
- toutes les tables metier portent quand meme `establishment_id` pour preparer le futur multi-site ;
- la plateforme centrale gere les etablissements abonnes.

Pour une version cloud future :

- isolation par `tenant_id` ;
- politiques d'acces strictes ;
- sauvegarde par tenant ;
- option possible : base separee par gros client.

