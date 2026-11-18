# CORTEX Académie — version Supabase séparée

**Le site de démonstration original n'a pas été modifié.**
- Original : https://sel18290.github.io/creations/evaluations/
- Nouveau portail académique : https://sel18290.github.io/creations/evaluations-academie/

## État réel

Le portail académique **est branché à Supabase Paris** : projet `jhtmaoeazmjigfruandl`, région `eu-west-3`. Les formulaires sont actifs, mais l'inscription réelle nécessite encore de configurer l'envoi SMTP et les URLs de redirection dans Supabase Auth. Aucun compte enseignant n'a été créé dans cette session.

La migration `cortex_academie_teacher_access` **a été appliquée** et vérifiée : trois tables, RLS, déclencheur `@ac-paris.fr`, neuf politiques de sécurité, aucun avertissement aux Security Advisors. Aucune donnée élève n'a été migrée ; le site de démonstration reste inchangé.

## Terminer le déploiement

1. Le projet **CORTEX Evaluations** existe déjà dans l'organisation `cortex.evaluation`, en région Paris `eu-west-3`. Son coût annoncé était de 0 $/mois, sous réserve des quotas du plan.
2. La migration `cortex_academie_teacher_access` est déjà appliquée. `supabase/schema.sql` est conservé comme copie de référence du schéma ; il réserve les comptes aux adresses `@ac-paris.fr` et isole les classes et les évaluations par propriétaire.
3. Dans **Authentication → Sign In / Providers → Email**, conserver **Confirm email = ON**. Configurer un mot de passe minimum de 14 caractères (dans Password Settings si disponible), les protections anti-bot/CAPTCHA, les limites de tentative et les protections contre les mots de passe compromis selon les options du plan.
4. **Configurer un serveur SMTP personnalisé** : le serveur intégré Supabase n'envoie qu'aux adresses autorisées de l'organisation et n'est pas utilisable pour ouvrir les inscriptions à tous les enseignants de l'académie.
5. Dans **Authentication → URL Configuration**, déclarer le Site URL et Redirect URL exacts `https://sel18290.github.io/creations/evaluations-academie/`.
6. L'URL publique de Supabase et sa **publishable key** sont déjà configurées dans `config.js`. Jamais de clé `service_role`, `sb_secret_...`, mot de passe SMTP ou jeton d'administration dans le dépôt GitHub public.
7. Effectuer un test de bout en bout : adresse académique autorisée, adresse hors domaine refusée au serveur, confirmation e-mail, connexion, réinitialisation du mot de passe, déconnexion, deux enseignants ne voyant que leurs propres données. Vérifier les Security Advisors et les logs.
8. **Ne pas importer de véritables notes/copies avant** validation de l'établissement / DPO académique, politique de conservation et intégration sécurisée du parcours élèves. Les règles `teacher_id` sont des bases, pas la preuve d'une conformité RGPD complète.

## Principe d'architecture

- GitHub Pages héberge le **site vitrine/application navigateur**, avec authentification Supabase.
- Supabase Auth gère les comptes, mots de passe et confirmations.
- PostgreSQL + RLS limite les lignes au professeur propriétaire.
- L'environnement test (données fictives, stockage local) reste **indépendant**.
- L'import des contrôles, la correction, les fichiers PDF, les copies élèves et leur propre accès par PIN nécessiteront une phase de migration distincte, avec serveur/RLS et protection contre l'usurpation.

## Sécurité

Le domaine `@ac-paris.fr` vérifie l'appartenance à une adresse académique **mais ne prouve pas que le titulaire est un enseignant habilité au lycée**. Envisager une activation par un administrateur ou une liste d'invitations approuvées avant d'autoriser l'utilisation réelle.

**Statut : projet Supabase actif, schéma appliqué, navigateur connecté, classes et contrôles désormais gérés via Supabase. SMTP personnalisé, URLs de redirection et tests de confirmation e-mail encore à configurer et valider.**

## Mode intégrité des évaluations (novembre 2026)

- **Site test conservé :** `https://sel18290.github.io/creations/evaluations/#professeur/integrite` propose un onglet anti-triche interactif, des réglages spécifiques à chaque contrôle et un journal local des incidents par copie. Le moteur de démonstration intercepte les tentatives de collage et de copie, ainsi que les sorties de page de plus de deux secondes, dans la limite des événements fournis par le navigateur.
- **CORTEX Académie / Supabase :** chaque contrôle peut enregistrer `content.antiCheat` avec les champs booléens `enabled`, `blockPaste`, `blockCopy`, `trackVisibility`, `warnStudent`. L'interface permet de modifier ces paramètres, en conservant les questions et la description déjà stockées.
- **Journal Supabase :** migration `cortex_integrity_event_read_only`, fichier de référence `supabase/integrity-events.sql`. La table `public.cortex_integrity_events` n'enregistre que professeur, contrôle, numéro sur liste, type d'événement, heure et durée éventuelle. **Les clients ne peuvent pas insérer directement** : il faudra un futur service d'examen authentifiant les élèves et leur session pour enregistrer les incidents côté serveur. Le professeur propriétaire peut consulter les lignes autorisées par RLS.
- **Confidentialité :** aucune capture webcam, écran, presse-papiers, adresse IP ou score automatique de fraude. Un événement navigateur ne prouve jamais une triche ; information, accessibilité, supervision humaine et validations institutionnelles sont nécessaires avant d'utiliser de véritables données scolaires.

### Vérifications réalisées

1. Test de démarrage élève sur la version test avec contrôle fictif, puis collage/copie interceptés et sortie de page simulée de 16,5 secondes : les trois événements et leur durée sont correctement enregistrés dans le stockage local.
2. Test simulé de l'interface professeur académique : activation du mode et mise à jour du contrôle dans Supabase via les appels attendus, sans perte du texte du sujet.
3. Test SQL réel dans une transaction annulée : création et mise à jour de `antiCheat` sur un contrôle fictif, RLS de la table des incidents pour deux professeurs, impossibilité d'écrire un événement directement avec le rôle `authenticated`.
4. Analyseur de sécurité Supabase : aucun avertissement. La base est restée vide après les tests.

**Limite :** le site Académie ne dispose pas encore du parcours élève synchronisé. Les règles sont donc sauvegardées sur Supabase, mais ne s'appliquent pas encore aux élèves dans cette version. Aucun journal réel d'élève ne peut être reçu sans le service serveur prévu. Le rendu visuel final sur téléphone n'a pas été vérifié dans un navigateur connecté.

## Actualisation : espace Anti-triche v2 (novembre 2026)

Le site test et CORTEX Académie disposent d'une nouvelle direction visuelle **bleu nuit / rouge corail**, avec cartes de contrôle, réglages accessibles, explication de chaque protection et journal des événements.

Une option booléenne `antiCheat.watermarkCapture` est disponible par contrôle :
- **Site test** : lorsque `antiCheat.enabled` et `antiCheat.watermarkCapture` sont vrais, un filigrane discret et répété s'affiche sur la page d'examen avec uniquement **CORTEX + classe + numéro sur la liste**. Le PIN et les réponses ne sont jamais utilisés dans le filigrane. Le professeur peut désactiver l'option pour un aménagement d'accessibilité.
- **CORTEX Académie** : l'option figure dans la création et les paramètres des évaluations ; la valeur est sauvegardée dans `cortex_teacher_assessments.content.antiCheat`, avec les autres protections. L'application académique ne possède pas encore le moteur élève serveur ; ce réglage n'y applique pas encore le filigrane sur les téléphones élèves.

**Limite technique essentielle :** une page web n'est pas autorisée à bloquer ou détecter fiablement les captures faites par Android, iOS ou Windows. Le filigrane est un élément dissuasif et non un blocage. Une éventuelle application Android native dédiée pourrait utiliser `FLAG_SECURE`, sans pour autant empêcher une photo prise avec un second appareil.

Vérifications : parsing JS, affichage du filigrane sur une évaluation fictive, désactivation effective, absence de PIN dans le filigrane, navigation interne de l'espace professeur, versions des assets. Test SQL Supabase sous transaction annulée : enregistrement et modification de `watermarkCapture` dans le JSON du contrôle, avec conservation du sujet. La disponibilité effective des nouveaux fichiers sur GitHub Pages et le rendu réel sur mobile n'ont pas été confirmés depuis le navigateur de test.


## Nov. 2026 — flux serveur professeur / élève / professeur

Le bouton « DÉMONSTRATION TEST » de CORTEX Académie renvoie vers ../evaluations/#visite, en conservant la version de démonstration indépendante.

### Parcours déployé

1. L'enseignant crée une classe et un contrôle contenant des consignes et des questions ouvertes.
2. Il peut joindre un sujet PDF, Word, texte ou image de 8 Mo au maximum. Les fichiers sont stockés dans un bucket Supabase privé.
3. Il publie le contrôle : un lien/QR code individuel au contrôle et des PIN de six chiffres par numéro d'élève (1 à 60) sont générés. Un CSV des PIN nouvellement créés est proposé une seule fois.
4. L'élève ouvre le QR, saisit son numéro de liste et son PIN, consulte le document, répond aux questions et/ou joint sa copie, puis confirme la remise.
5. Le professeur consulte sa boîte de réception, lit ou télécharge le document, note la copie sur 20, ajoute un commentaire et peut publier la correction.
6. L'élève retrouve l'accusé de réception et sa note/commentaire une fois publiés.

### Sécurité

Le service Edge nommé cortex-coursework vérifie côté serveur les JWT des professeurs, la propriété de chaque contrôle et les tokens de session des élèves. Le secret serveur ne figure pas dans GitHub Pages. Les PIN et les tokens de session sont conservés sous forme de condensats ; le nombre d'essais de PIN est limité. Les sessions expirent au bout de huit heures. Le stockage de documents est privé ; seuls les accès autorisés reçoivent des liens signés de courte durée. Les tables nouvelles sont sous RLS ; les tables sensibles de PIN et de session n'ont aucune permission de consultation directe. Le site test ne partage ni comptes ni notes avec Académie.

Tests réalisés : analyse syntaxique JavaScript/Edge, publication des fichiers sur GitHub, déploiement Edge actif, création des nouvelles tables, bucket privé, contrôle SQL de séparation entre deux enseignants fictifs avec transaction annulée, revue des avis de sécurité Supabase. L'absence de politiques de lecture sur les deux tables sensibles est intentionnelle.

### Limites avant usage réel

- Il n'existe actuellement aucun compte utilisateur enregistré dans le projet Supabase. Une inscription et une confirmation sur une véritable adresse académique restent à tester.
- Le SMTP personnalisé est nécessaire pour envoyer les e-mails de confirmation aux enseignants hors de l'équipe Supabase : https://supabase.com/docs/guides/auth/auth-smtp
- Aucun essai intégral multi-appareil du trajet professeur → élève → professeur n'a pu être effectué sur GitHub Pages depuis cet environnement.
- Faire valider l'usage scolaire par l'établissement et le DPO : RGPD, rétention des notes, sauvegardes, accessibilité et analyse des documents potentiellement dangereux.
- La parité complète avec la démo n'est pas encore réalisée : moyennes longitudinales, export PDF groupé et certaines fonctions avancées restent à porter.

Ne pas déclarer une utilisation scolaire 100 % validée tant que ces contrôles ne sont pas terminés.
