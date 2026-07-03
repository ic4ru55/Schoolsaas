# Analyse du projet

## Vision

SchoolSaaS BF est une plateforme de gestion scolaire et universitaire hybride. Elle doit servir aussi bien une ecole primaire, un college, un lycee, un institut, un centre de formation ou une universite.

Le produit doit etre pense pour les realites locales :

- connexion internet parfois absente ou instable ;
- paiement des frais par tranches ;
- besoin fort de documents imprimables ;
- gestion des classes, niveaux, series, filieres, UFR, UE et EC ;
- enseignants permanents et vacataires ;
- secretariats et comptables pas toujours tres avances en informatique ;
- reprise de donnees depuis Excel, CSV, Access ou anciens logiciels ;
- besoin de tracabilite sur les notes, paiements et actions sensibles.

## Nature du produit

Le produit n'est pas une simple application mobile. Le coeur doit etre une application web locale, installee sur un serveur ou ordinateur principal dans l'etablissement.

Les utilisateurs internes se connectent depuis le reseau local :

- direction ;
- secretariat ;
- comptabilite ;
- scolarite ;
- enseignants ;
- surveillance ;
- RH.

Des portails parent, enseignant, eleve/etudiant et mobile pourront etre ajoutes apres le MVP.

## Contraintes structurantes

- Fonctionnement local prioritaire.
- Sauvegarde cloud hebdomadaire chiffree.
- Restauration simple apres panne.
- Separation stricte des donnees par etablissement.
- Permissions fines par role.
- Historique des actions sensibles.
- Documents PDF imprimables.
- Import de donnees anciennes.
- Architecture modulaire par pack commercial.

## Produit cible

Le produit doit etre vendable comme un SaaS hybride :

- installation locale chez l'etablissement ;
- abonnement gere par une plateforme centrale ;
- activation/desactivation de modules selon le pack ;
- supervision technique minimale ;
- sauvegardes cloud chiffrees ;
- support et restauration assistee.

## MVP vendable

Le MVP doit couvrir le cycle administratif essentiel :

- parametrage de l'etablissement ;
- annee scolaire ;
- classes et niveaux ;
- eleves ;
- parents ;
- enseignants ;
- matieres ;
- paiements et recus ;
- notes ;
- bulletins PDF ;
- utilisateurs, roles et permissions ;
- import Excel ;
- sauvegarde locale ;
- sauvegarde cloud hebdomadaire ;
- tableau de bord admin et direction.

La version universitaire complete doit venir ensuite, car elle ajoute une complexite importante : credits, semestres, UE, EC, compensation, sessions, deliberations et PV.

