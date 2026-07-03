# Plan MVP et roadmap

## Objectif MVP

Livrer une version vendable pour une ecole, un college ou un lycee prive/public, capable de gerer l'administration de base, les paiements, les notes, les bulletins, les utilisateurs et les sauvegardes.

Le MVP ne doit pas tenter de couvrir toute l'universite des le depart. Il doit toutefois garder une structure compatible avec une extension universitaire.

## Phase 0 - Cadrage

- valider la stack ;
- valider les modules MVP ;
- definir les packs commerciaux ;
- definir les roles de depart ;
- definir les modeles de bulletins locaux ;
- choisir le fournisseur de sauvegarde cloud ;
- definir le format d'installation locale.

Livrables :

- architecture validee ;
- schema initial ;
- backlog MVP ;
- maquettes principales.

## Phase 1 - Socle technique

- monorepo ;
- Docker Compose local ;
- Next.js ;
- NestJS ;
- PostgreSQL ;
- Prisma ;
- authentification ;
- roles et permissions ;
- audit log ;
- layout application.

Livrable :

- application locale demarrable avec compte admin.

## Phase 2 - Scolarite de base

- etablissement ;
- annee scolaire ;
- niveaux ;
- classes ;
- matieres ;
- enseignants ;
- eleves ;
- parents ;
- inscriptions et reinscriptions.

Livrable :

- un etablissement peut enregistrer sa structure et ses eleves.

## Phase 3 - Paiements

- frais par classe/niveau ;
- affectation des frais ;
- paiements partiels ;
- recus PDF ;
- situation financiere eleve ;
- rapports journaliers et mensuels.

Livrable :

- la caisse peut encaisser, imprimer et suivre les restes a payer.

## Phase 4 - Notes et bulletins

- periodes ;
- evaluations ;
- saisie notes ;
- moyennes ;
- rangs ;
- appreciations ;
- verrouillage ;
- historique des modifications ;
- generation bulletin PDF ;
- impression en masse.

Livrable :

- un lycee peut produire les bulletins d'une periode.

## Phase 5 - Import Excel

- import eleves ;
- import parents ;
- import classes ;
- import notes ou paiements selon priorite ;
- mapping colonnes ;
- validation ;
- rapport d'erreurs ;
- previsualisation.

Livrable :

- reprise de donnees depuis fichiers Excel/CSV courants.

## Phase 6 - Sauvegarde et restauration

- sauvegarde locale ;
- chiffrement ;
- sauvegarde cloud ;
- historique ;
- sauvegarde manuelle ;
- sauvegarde hebdomadaire ;
- test de restauration ;
- supervision minimale.

Livrable :

- l'etablissement peut etre restaure apres panne.

## Phase 7 - Stabilisation pilote

- tests fonctionnels ;
- tests de permissions ;
- tests de restauration ;
- correction UX ;
- documentation installation ;
- documentation utilisateur ;
- pilote avec un etablissement reel.

Livrable :

- version MVP pilote.

## Roadmap apres MVP

### Version 1.1

- discipline ;
- documents administratifs avances ;
- exports Excel ;
- amelioration tableaux de bord ;
- alertes paiement.

### Version 1.2

- portail enseignant ;
- portail parent ;
- notifications email/SMS ;
- WhatsApp si fournisseur valide ;
- paiement Mobile Money en mode pilote.

### Version 2.0

- RH ;
- comptabilite avancee ;
- gestion personnel ;
- contrats ;
- salaires ;
- fournisseurs.

### Version 3.0

- universite complete ;
- UFR ;
- departements ;
- filieres ;
- semestres ;
- UE/EC ;
- credits ;
- compensation ;
- rattrapage ;
- PV de deliberation.

### Version mobile

- application Flutter pour parents, enseignants, eleves et etudiants ;
- consultation notes ;
- absences ;
- paiements ;
- notifications.

