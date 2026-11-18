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
