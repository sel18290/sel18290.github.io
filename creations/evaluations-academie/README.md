# CORTEX Académie — version Supabase séparée

**Le site de démonstration original n'a pas été modifié.**
- Original : https://sel18290.github.io/creations/evaluations/
- Nouveau portail académique : https://sel18290.github.io/creations/evaluations-academie/

## État réel

Le portail académique est publié dans le dépôt GitHub, mais **pas encore branché à Supabase** : la connexion Supabase a bloqué la création du projet. Les formulaires d'inscription / connexion sont volontairement désactivés et aucun compte n'a été créé.

Le schéma SQL de démarrage est disponible dans `supabase/schema.sql`, mais **n'a pas encore été exécuté**. Aucune donnée élève n'est migrée, et le site de démonstration reste accessible uniquement comme démonstration.

## Terminer le déploiement

1. Dans l'organisation Supabase `cortex.evaluation`, créer un **projet gratuit** nommé `CORTEX Evaluations`, en région **Paris — eu-west-3**. Une estimation à **0 $/mois** a été retournée pendant la préparation ; vérifier le coût réel et les quotas avant validation.
2. Une fois le projet actif, appliquer `supabase/schema.sql` avec SQL Editor (ou une migration versionnée). Le script réserve, au niveau PostgreSQL, la création et la modification de comptes aux adresses `@ac-paris.fr`. Les tables préparatoires ont RLS activé, avec des droits limités au professeur propriétaire.
3. Dans **Authentication → Sign In / Providers → Email**, conserver **Confirm email = ON**. Configurer un mot de passe minimum de 14 caractères (dans Password Settings si disponible), les protections anti-bot/CAPTCHA, les limites de tentative et les protections contre les mots de passe compromis selon les options du plan.
4. **Configurer un serveur SMTP personnalisé** : le serveur intégré Supabase n'envoie qu'aux adresses autorisées de l'organisation et n'est pas utilisable pour ouvrir les inscriptions à tous les enseignants de l'académie.
5. Dans **Authentication → URL Configuration**, déclarer le Site URL et Redirect URL exacts `https://sel18290.github.io/creations/evaluations-academie/`.
6. Ajouter seulement l'URL publique de Supabase et la **publishable key** (`sb_publishable_...`) dans `config.js`. Jamais de clé `service_role`, `sb_secret_...`, mot de passe SMTP ou jeton d'administration dans le dépôt GitHub public.
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

**Statut au 18 novembre 2026 : frontend académique et script SQL préparés ; infrastructure Supabase et envoi SMTP restant à mettre en service.**
