# SchoolSaaS BF

Projet de plateforme hybride de gestion scolaire et universitaire adaptee au Burkina Faso et a l'Afrique de l'Ouest.

Ce dossier est volontairement separe du projet `votepro`.

## Objectif

Construire une solution professionnelle capable de remplacer les fichiers Excel, cahiers papier, anciens logiciels locaux et bases Access dans les etablissements scolaires, instituts, centres de formation et universites.

La solution doit fonctionner en local dans l'etablissement, rester utilisable sans connexion internet permanente, puis sauvegarder les donnees chiffrees vers le cloud de facon controlee.

## Documents de cadrage

- [Analyse projet](docs/01-analyse-projet.md)
- [Architecture technique](docs/02-architecture-technique.md)
- [Modules fonctionnels](docs/03-modules-fonctionnels.md)
- [Schema global base de donnees](docs/04-schema-base-donnees.md)
- [Plan MVP et roadmap](docs/05-plan-mvp-roadmap.md)
- [Securite, risques et exploitation](docs/06-securite-risques-exploitation.md)
- [Demarrage technique](docs/07-demarrage-technique.md)
- [Etat actuel et suite](docs/08-etat-actuel-et-suite.md)

## Choix recommande

- Frontend : Next.js, React, TypeScript
- Backend : NestJS, TypeScript
- Base locale : PostgreSQL
- ORM : Prisma
- Installation locale : Docker Compose, puis installeur Windows plus tard
- Jobs planifies : worker NestJS + BullMQ/Redis ou scheduler PostgreSQL au MVP
- PDF : generation cote serveur avec templates HTML imprimes en PDF
- Sauvegarde cloud : fichiers `pg_dump` compresses, chiffres, envoyes vers stockage S3 compatible
- Mobile plus tard : Flutter

## Principe d'architecture

Chaque etablissement dispose d'une installation locale autonome :

- application web accessible sur le reseau local ;
- API locale ;
- base PostgreSQL locale ;
- sauvegardes locales et cloud chiffrees ;
- licence et modules synchronises avec une plateforme centrale quand internet est disponible.

La plateforme centrale ne doit recevoir au minimum que les informations de supervision : licence, modules actifs, date de derniere sauvegarde, alertes techniques. Les donnees sensibles restent chiffrees avant tout envoi cloud.
