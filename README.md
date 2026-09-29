# 🦈 MofuTrack — calories, pas & poids (thème bleu requin)

Web app pour iPhone, installable sur l'écran d'accueil. Elle marche hors-ligne et **toutes les données restent sur ton téléphone**.

- 🔥 **Calories du jour en un coup d'œil** : anneau « mangées / objectif / reste » et graphique des 7 derniers jours
- 🔍 **Barre de recherche** dans plus de 350 aliments : fast-food (McDo, KFC, BK, kebab, tacos…), pizzas, pho, ramen, bo bun, sushi, riz, viandes, chorizo, légumes, fruits, céréales, boissons, sauces… On peut compter en portions ou en grammes, créer ses propres aliments, ou entrer des kcal directement
- 👣 **Pas + énergie active** importés depuis l'app Santé avec un Raccourci (tuto plus bas)
- ⚖️ **Pesée du matin** avec courbe, variation, IMC et poids objectif
- 🧍 **Profil** (sexe, âge, taille, poids de départ) → calcul du **BMR** (Mifflin-St Jeor), de la dépense et de l'objectif calorique
- 📝 **Notes** libres, avec recherche
- 🐾 **Rangs d'évolution** : de *Plancton* à *Légende des Abysses*. Chaque rang débloque un chat costumé de plus en plus rare (Commun → Rare → Épique → Légendaire → Mythique)
- 💾 Export et import d'une sauvegarde JSON

---

## 1. Mettre l'app en ligne (GitHub Pages, une seule fois)

1. Sur GitHub, ouvre le dépôt **MofusandTracker** → **Settings** → **Pages**.
2. Dans *Build and deployment* : **Source = Deploy from a branch**, puis choisis la branche `claude/calorie-step-tracker-app-ov3748` (ou `main` si tu l'as fusionnée) et le dossier **/ (root)** → **Save**.
3. Attends 1 à 2 minutes. L'adresse de l'app sera :
   **https://tristanhuang01122004-byte.github.io/MofusandTracker/**

> Si le dépôt est privé, GitHub Pages demande un compte GitHub Pro. Sinon, passe le dépôt en public (les données restent quand même sur ton téléphone, elles ne sont jamais envoyées sur GitHub).

## 2. Installer l'app sur l'iPhone

1. Ouvre l'adresse ci-dessus dans **Safari**.
2. Touche le bouton **Partager** (carré avec une flèche) → **Sur l'écran d'accueil** → **Ajouter**.
3. Ouvre **MofuTrack** depuis son icône de requin 🦈, puis ⚙️ → remplis ton profil.

## 3. Importer ses pas avec Raccourcis : étape par étape

On crée un raccourci qui lit tes pas du jour dans Santé et les copie. L'app n'a ensuite qu'à les coller.

1. Ouvre l'app **Raccourcis** → onglet **Raccourcis** → **+** en haut à droite. Renomme-le **MofuPas**.
2. **Ajouter une action** → cherche **« Rechercher des échantillons de santé »** → ajoute-la.
3. Règle l'action :
   - **Type** : *Nombre de pas*
   - Filtre : **Date de début** *est aujourd'hui*
   - Touche **Afficher plus** : **Regrouper par** = *Jour*, **Unité** = *pas*. Tu obtiens le total du jour, sans compter deux fois l'iPhone et l'Apple Watch.
4. *(Optionnel, pour les calories brûlées)* Ajoute une 2ᵉ action **« Rechercher des échantillons de santé »** : Type = *Énergie active*, même filtre, Regrouper par = *Jour*, Unité = *kcal*.
5. Ajoute l'action **« Texte »** et écris `pas=`, puis touche **Variable** → le 1ᵉʳ *Échantillons de santé*.
   Si tu as fait l'étape 4, ajoute `;kcal=` puis la variable du 2ᵉ *Échantillons de santé*.
   Tu dois obtenir un texte du genre : `pas=10432;kcal=385`
6. Ajoute l'action **« Copier dans le presse-papiers »**.
7. *(Optionnel)* Ajoute **« Afficher une notification »** avec le texte « Pas copiés, ouvre MofuTrack 🦈 ».
8. Touche **▶︎** pour tester. La 1ʳᵉ fois, autorise l'accès à **Santé**.
9. Ouvre **MofuTrack** → **📋 Importer (raccourci)** → touche **Coller** quand iOS le demande. ✅

**Pour aller plus vite :**
- **Widget** Raccourcis sur l'écran d'accueil, à côté de l'icône MofuTrack
- **Siri** : « Dis Siri, MofuPas »
- **Toucher le dos** : Réglages → Accessibilité → Toucher → Toucher le dos → Toucher deux fois → *MofuPas*
- **Automatique** : Raccourcis → **Automatisation** → **+** → *Heure de la journée* (ex. 21:30) → *Exécuter immédiatement* → *MofuPas*

**Variante « lien » (si tu utilises l'app dans Safari, sans l'icône) :** à la place des étapes 6 et 7, mets l'action **URL** `https://tristanhuang01122004-byte.github.io/MofusandTracker/?pas=[variable pas]&kcal=[variable kcal]`, puis l'action **Ouvrir les URL**. L'import se fait tout seul à l'ouverture.
⚠️ Sur iPhone, l'app de l'écran d'accueil a une mémoire séparée de Safari. Si tu utilises l'icône, reste sur la méthode « Importer ».

## 4. Les rangs et les chats 🐾

| Rang | XP | Chat débloqué | Rareté |
|---|---|---|---|
| Plancton | 0 | Minou Tout Doux | Commun |
| Crevette | 60 | Chat Grenouille | Commun |
| Poisson-clown | 150 | Chat Ourson | Commun |
| Méduse | 300 | Chat Requin Bleu | Rare |
| Tortue de mer | 480 | Chat Abeille | Rare |
| Dauphin | 700 | Chat Lapin Rose | Rare |
| Pieuvre | 1 000 | Chat Dino | Épique |
| Raie manta | 1 350 | Chat Pieuvre | Épique |
| Requin bleu | 1 800 | Chat Requin de Nuit | Épique |
| Grand requin blanc | 2 400 | Chat Licorne | Légendaire |
| Orque | 3 100 | Chat Dragon | Légendaire |
| Mégalodon | 4 000 | Chat Requin Doré | Mythique |
| Légende des Abysses | 5 000 | Roi Requin Cosmique | Mythique |

**Gagner de l'XP (par jour) :** repas noté +10 · 2 repas ou plus +5 · à ±10 % de l'objectif +15 · objectif de pas +20 (+10 à 1,5×) · pesée +10 · note +3 · série de 7 jours +10/jour.
Un chat débloqué le reste pour toujours.

---

Les calories sont des moyennes indicatives (tables Ciqual et étiquettes des enseignes). Les chats sont des dessins originaux faits pour l'app, dans l'esprit des chats costumés mofusand.
