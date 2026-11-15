# GENESIS · Ajouter une salle

1. Copier `genesis/scenes/template.json` en `genesis/scenes/mon-atelier.json`. Donner à la scène un identifiant unique, une identité, une position initiale (x, y, z en mètres) et des objectifs stables.
2. Choisir `2d`, `3d` ou `hybrid`. Pour une salle 3D, prendre aussi exemple sur `resonance.json`. Ajouter les ressources locales et déclarer les composants des objets. Les disques de collision de l’espace sont [x, z, rayon]. Les positions des objets sont [x, y, z].
3. Ouvrir `/genesis/?scene=mon-atelier`. Les transitions d’une salle sont des liens internes. Une nouvelle scène peut être reliée depuis une autre définition. L’entrée officielle du parcours de test reste `/fusion-native/`.
4. Pour étendre le catalogue des comportements, enregistrer un adaptateur dans `genesis/src/adapters.js` avec une validation et une fonction mount(scope, object, config). Utiliser scope.listen/emit pour les événements, animate pour la boucle, release pour le nettoyage, achieved/complete pour la progression. Le JSON contient uniquement des données.

## Démonstration

Depuis l’entrée, utiliser « Consulter la console » ou E à portée de la machine. On peut se déplacer au clavier ou avec le joystick et orienter la vue en la faisant glisser. La console est le GLB Quaternius Props_Computer du Réseau Est. La nef charge le vrai fichier Spark de N04 dans la même scène Three.js. Le signal modifie progressivement la teinte du volume et ouvre la tablette scientifique originale de N02. « Enregistrer la lecture » valide l’objectif et le retrouve après actualisation. L’audio est facultatif et activé par le joueur.

## Périmètre

Le parcours historique conserve ses contrôleurs de scène et sa session existante. Le routeur utilise genesis/src/journey.js pour adapter les messages 2D, 3D et Spark. Les nouvelles scènes utilisent les services de public/core via GenesisBridge. La démo dispose de clés genesis.bridge.v1:objective.<salle>.<objectif>, indépendantes de la partie NOCTIS. La physique actuelle traite un sol horizontal, des limites rectangulaires et des obstacles circulaires. Le type 2D réutilise les interfaces DOM. Il ne reproduit pas automatiquement les anciens décors. La nef disponible ici est la version Spark v2.

## Source et exécution

Dans le dépôt Sites, npm run build produit dist. Le lecteur hybride livré contient déjà le bundle spatial. Pour le reconstruire, installer les dépendances verrouillées dans public/spark-fusion/source-spark (npm ci), puis exécuter node scripts/build-genesis-spatial.mjs depuis la racine. Tests ciblés : node --test tests/genesis-bridge.test.mjs.

L’archive autonome fournit public/genesis, public/core, les modules historiques employés, les ressources de démonstration et le script de compilation. Pour lancer la démo depuis la racine extraite : python -m http.server 8000 --directory public, puis ouvrir http://localhost:8000/genesis/. Le parcours NOCTIS complet est disponible sur le site de test et dans son dépôt. Le lien vers /fusion-native/ nécessite ce dépôt complet pour jouer en local.

## N05 · Observatoire spatial

Ouvrir /genesis/?scene=n05. L’arrivée se fait directement dans la salle. Le module n05-observatoire remplace le décor de N04 par un volume gaussien propre à N05. La direction architecturale provient de l’illustration n05-observatoire.webp, conservée comme référence. La baie, le poste et le résonateur occupent des profondeurs distinctes. Le résonateur utilise un volume Spark. Le sol, les cloisons, le poste de diagnostic et le cadre de la baie sont des maillages avec matériaux physiques. La station au-delà de la vitre est tridimensionnelle. Une image originale de la Terre et de son atmosphère couvre la voûte lointaine. Les commandes et la lecture de la tablette restent celles du lecteur hybride.

Reconstruction des fichiers spatiaux : python public/genesis/tools/build_observatory.py (numpy et scipy requis). Le module orbital réutilisable est src/orbital-view.js. Les collisions déclarées correspondent à l’enveloppe et au résonateur ; la console déclare son propre collider. Aucun intérieur de la station extérieure n’est accessible.

Le point de restauration avant cette correction est le commit 6a875c1 de la version 47. Le parcours historique N01 à N04 garde ses scènes et ses ressources.

## Réseau de N05

Face à la baie, les passages latéraux conduisent à la cryogénie et à la puissance. Le couloir arrière croise la traverse de maintenance et continue jusqu’à l’atlas orbital. Les opérations sur la capsule, le régulateur et le terminal de cartographie enregistrent trois objectifs indépendants. Le plan en cellules de deux mètres (src/sector-plan.js) sert aux collisions et à la construction des couloirs dans src/sector-art.js. Les équipements GLB sont déclarés dans scenes/modules.json.
