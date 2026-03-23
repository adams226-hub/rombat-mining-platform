# TODO - Fix Production Module

## ✅ Complété
- [x] Dev server lancé (http://localhost:4028/)
- [x] ErrorBoundary amélioré (affiche erreur exacte + stack trace)
- [x] Analysé tous fichiers production (index, simple, final)
- [x] Port conflict résolu

## 🔍 Diagnostic
- Aller sur /production-management
- Copier erreur UI/console F12
- Tester /production-simple (devrait marcher)

## 🛠️ Fixes prioritaires
- [ ] Clear localStorage 'production_fallback' corrompu
- [ ] Ajouter try/catch calculateStock dans index.jsx
- [ ] Route par défaut vers /production-simple
- [ ] Run migration Supabase production table
- [ ] Intégrer Supabase real data (après RLS)

## Tests
- [ ] Production entry (simple/final)
- [ ] npm run check-db
- [ ] Full app flow login->production->dashboard

## Deploy
- [ ] npm run build
- [ ] Netlify deploy
