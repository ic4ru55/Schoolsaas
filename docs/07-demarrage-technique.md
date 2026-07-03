# Demarrage technique

## Prerequis

- Node.js 20 ou plus
- npm 10 ou plus
- Docker Desktop, pour PostgreSQL et le demarrage local complet

## Installation

```bash
npm install
cp .env.example .env
npm run db:generate
```

Si `npm install` reste bloque sur Windows, relancer sans scripts puis regenerer Prisma :

```bash
npm install --ignore-scripts --no-audit --no-fund
npm run db:generate
```

## Base de donnees locale

Docker Desktop doit etre demarre avant cette etape.

```bash
docker compose up -d db redis
npm run db:migrate
```

Les scripts Prisma doivent etre lances depuis la racine du projet. Ils utilisent le fichier `.env` situe a la racine.

## Demarrage en developpement

Dans trois terminaux :

```bash
npm run dev:api
npm run dev:web
npm run dev:worker
```

Si `npm run dev:api` affiche `EADDRINUSE: address already in use :::4000`, cela veut dire que l'API est deja lancee. Il ne faut pas lancer une deuxieme API sur le meme port. Fermer l'ancien terminal API, ou arreter le processus qui occupe le port `4000`, puis relancer.

Adresses locales :

- Web : http://localhost:3000
- API : http://localhost:4000/api
- Sante API : http://localhost:4000/api/health
- Swagger : http://localhost:4000/docs
- PostgreSQL : localhost:5434

## Verification

```bash
npm run build
npm run lint
```

## Demarrage Docker complet

```bash
docker compose up --build
```

Adresses Docker :

- Web : http://localhost:3002
- API : http://localhost:4000/api
