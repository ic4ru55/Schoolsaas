# Etat actuel et suite du projet

Ce document sert de boussole simple : ce qui existe deja, ce qui ne doit pas etre confondu avec un produit fini, et la prochaine direction.

## Ce qui a ete fait

### 1. Projet separe

Le projet `SchoolSaaS-BF` a ete cree dans un dossier separe de `votepro`.

Chemin :

```text
C:\Users\cedri\Desktop\evote+\SchoolSaaS-BF
```

### 2. Architecture de depart

Le socle technique est en place :

- `apps/web` : interface web Next.js ;
- `apps/api` : API NestJS ;
- `apps/worker` : worker pour les jobs futurs, notamment sauvegardes ;
- `packages/shared` : modules, roles et permissions partages ;
- PostgreSQL avec Prisma ;
- Docker Compose pour PostgreSQL, Redis, API, Web et Worker.

### 3. Base de donnees initiale

Le schema Prisma initial existe et la premiere migration a ete appliquee.

Migration creee :

```text
apps/api/prisma/migrations/20260702223153_init
```

Elle prepare les grandes bases du MVP :

- etablissements ;
- licences ;
- modules actifs ;
- utilisateurs, roles et permissions ;
- annees scolaires ;
- periodes ;
- niveaux ;
- classes ;
- matieres ;
- enseignants ;
- eleves ;
- parents/tuteurs ;
- inscriptions ;
- notes ;
- bulletins ;
- paiements ;
- recus ;
- imports ;
- sauvegardes ;
- journal d'activite.

### 4. API locale

L'API tourne sur :

```text
http://localhost:4000
```

Routes utiles :

- `http://localhost:4000/api` : accueil API ;
- `http://localhost:4000/api/health` : verification que l'API repond ;
- `http://localhost:4000/api/establishments` : liste des etablissements ;
- `http://localhost:4000/docs` : documentation Swagger.

### 5. Interface web

L'interface web tourne sur :

```text
http://localhost:3000
```

Elle contient deja :

- tableau de bord de depart ;
- menu des modules MVP ;
- formulaire de creation d'etablissement ;
- indicateur API connectee/hors ligne ;
- alertes de supervision.

### 6. Verification technique

Les commandes suivantes passent :

```bash
npm run build
npm run lint
```

## Ce qui n'est pas encore fait

Le projet n'est pas encore un produit utilisable par une ecole.

Il manque encore :

- authentification complete ;
- vrais ecrans CRUD pour classes, eleves, parents, enseignants ;
- inscriptions et reinscriptions ;
- paiements reels avec recus PDF ;
- notes et bulletins PDF ;
- import Excel ;
- sauvegarde locale et cloud effective ;
- roles et permissions appliques dans l'API ;
- tests fonctionnels metier ;
- packaging local propre.

## Ou on va maintenant

La suite doit avancer module par module, dans cet ordre.

## Etape 1 - Parametrage etablissement

Objectif : pouvoir creer et configurer correctement une ecole.

A faire :

- finaliser creation/modification etablissement ;
- ajouter logo, cachet, devise, adresse, telephone ;
- creer une annee scolaire active ;
- afficher les modules actifs ;
- preparer les roles par defaut.

Resultat attendu :

- une ecole peut etre creee proprement dans le systeme.

Etat actuel :

- creation etablissement : commencee ;
- modification informations etablissement : ajoutee ;
- creation annee scolaire : ajoutee ;
- activation annee scolaire unique : ajoutee ;
- logo/cachet/signatures : pas encore fait ;
- roles par defaut appliques a la creation d'un nouvel etablissement : ajoute.

## Etape 2 - Structure scolaire

Objectif : creer l'organisation de base de l'ecole.

A faire :

- niveaux ;
- classes ;
- matieres ;
- coefficients ;
- affectation enseignants aux matieres/classes.

Resultat attendu :

- l'etablissement peut avoir ses classes et matieres pretes avant inscription des eleves.

Etat actuel :

- creation niveaux : ajoutee ;
- creation matieres : ajoutee ;
- creation classes pour l'annee active : ajoutee ;
- affectation matiere a classe avec coefficient : ajoutee ;
- affectation enseignants aux matieres/classes : pas encore fait.

## Etape 3 - Eleves et parents

Objectif : enregistrer les eleves et leurs tuteurs.

A faire :

- liste des eleves ;
- creation/modification eleve ;
- parents/tuteurs ;
- liaison eleve-parent ;
- inscription dans une classe pour une annee scolaire ;
- recherche et filtres.

Resultat attendu :

- le secretariat peut gerer les dossiers eleves.

## Etape 4 - Paiements

Objectif : commencer la partie vendable pour les ecoles privees.

A faire :

- frais par classe/niveau ;
- tranches ;
- paiement partiel ;
- reste a payer ;
- recu PDF ;
- rapport journalier caisse.

Resultat attendu :

- le caissier peut encaisser et imprimer un recu.

## Etape 5 - Notes et bulletins

Objectif : produire les bulletins.

A faire :

- periodes ;
- evaluations ;
- saisie notes ;
- moyenne ;
- rang ;
- appreciation ;
- verrouillage ;
- historique modification ;
- bulletin PDF.

Resultat attendu :

- l'etablissement peut imprimer les bulletins d'une classe.

## Etape 6 - Import Excel

Objectif : recuperer les anciennes donnees.

A faire :

- import eleves CSV/Excel ;
- mapping des colonnes ;
- detection doublons ;
- previsualisation ;
- rapport d'erreurs.

Resultat attendu :

- une ecole peut migrer ses anciens fichiers.

## Etape 7 - Sauvegardes

Objectif : securiser les donnees.

A faire :

- dump PostgreSQL local ;
- chiffrement ;
- historique ;
- sauvegarde manuelle ;
- sauvegarde planifiee ;
- stockage cloud plus tard.

Resultat attendu :

- les donnees peuvent etre restaurees apres panne.

## Prochaine action conseillee

La prochaine action concrete est :

```text
Etape 1 : parametrage etablissement + annee scolaire active.
```

Pourquoi :

- c'est la base de tout le reste ;
- les classes, eleves, paiements et notes dependent d'un etablissement et d'une annee scolaire ;
- cela permet d'avoir une application deja coherente avant d'ajouter les gros modules.
