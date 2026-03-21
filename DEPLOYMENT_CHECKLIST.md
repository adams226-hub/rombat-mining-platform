# 🚀 GUIDE DE MISE EN PRODUCTION - VÉRIFICATION BASE DE DONNÉES

## ✅ ÉTAPE 1: VÉRIFIER VOTRE PROJET SUPABASE

### A) Connectez-vous à Supabase
1. Allez sur https://supabase.com/dashboard
2. Connectez-vous avec votre compte
3. Vérifiez que votre projet existe

### B) Récupérer les vraies credentials
Dans votre dashboard Supabase :
1. Cliquez sur votre projet
2. Allez dans "Settings" → "API"
3. Copiez :
   - **Project URL** (pas l'URL du dashboard)
   - **anon/public key**

## ✅ ÉTAPE 2: METTRE À JOUR LES VARIABLES D'ENVIRONNEMENT

Remplacez dans `.env` et `.env.production` :

```env
VITE_SUPABASE_URL=https://VOTRE-VRAI-PROJET.supabase.co
VITE_SUPABASE_ANON_KEY=votre-vraie-cle-anon
```

## ✅ ÉTAPE 3: DÉPLOYER LE SCHÉMA DE BASE DE DONNÉES

### Dans Supabase Dashboard :
1. Allez dans "SQL Editor"
2. Copiez-collez le contenu de `database-schema.sql`
3. Exécutez le script

### Tables qui doivent être créées :
- ✅ users
- ✅ sites
- ✅ equipment
- ✅ material_dimensions
- ✅ stock_entries & stock_entry_details
- ✅ stock_exits & stock_exit_details
- ✅ clients
- ✅ fuel_transactions
- ✅ maintenance
- ✅ financial_transactions
- ✅ production_targets
- ✅ alerts
- ✅ audit_logs
- ✅ reports
- ✅ dashboard_stats

## ✅ ÉTAPE 4: CONFIGURER LES POLITIQUES DE SÉCURITÉ

Si vous voulez activer RLS (recommandé pour la production) :
1. Dans SQL Editor, exécutez les politiques du schéma
2. OU pour le développement, exécutez `disable_rls.sql`

## ✅ ÉTAPE 5: VÉRIFIER LES DONNÉES INITIALES

Après déploiement du schéma, vérifiez que :
- ✅ 1 utilisateur admin existe
- ✅ Au moins 1 site est créé
- ✅ Les dimensions de matériaux sont présentes
- ✅ Les vues analytiques fonctionnent

## ✅ ÉTAPE 6: TEST DE CONNEXION

Une fois tout configuré :
1. Redéployez sur Netlify
2. Testez la connexion depuis l'application
3. Vérifiez que les données se chargent

---

## 🔧 COMMANDES UTILES

```bash
# Tester la connexion (après correction des credentials)
node test-db.js

# Redéployer
npm run build
# Puis pousser sur GitHub pour déclencher Netlify
```

## 🚨 PROBLÈMES COURANTS

1. **URL incorrecte** : Vérifiez que c'est l'URL du projet, pas du dashboard
2. **Clé expirée** : Régénérez la clé anon dans Supabase
3. **Projet supprimé** : Recréez un projet Supabase
4. **RLS trop restrictif** : Utilisez `disable_rls.sql` pour les tests

---

**STATUS ACTUEL** : ❌ Base de données non accessible
**ACTION REQUISE** : Vérifiez votre projet Supabase et mettez à jour les credentials