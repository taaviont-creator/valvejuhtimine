# Netlify kasutuselevott

## Netlify seadistus

1. Ava Netlify ja vali **Add new site**.
2. Vali **Import an existing project**.
3. Uhendage GitHub ja valige selle rakenduse repo.
4. Määra build seadistus:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Lisa Netlify keskkonnamuutujad:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Salvesta seadistus ja käivita deploy.
7. Kui muudad keskkonnamuutujaid, tee Netlifys uus deploy.

## Oluline

- Ara lisa päris Supabase võtmeid reposse ega `.env.example` faili.
- Kasuta ainult Supabase public anon key väärtust, mitte `service_role` võtit.
- `.env.local` on mõeldud ainult lokaalseks arenduseks ja on Gitist välja jäetud.

## Kontroll pärast deployd

1. Ava Netlify URL tavabrauseris õppejõu vaatena.
2. Loo uus simulatsioon ja kopeeri simulatsiooni kood.
3. Ava sama Netlify URL teises brauseris või incognito aknas.
4. Liitu korrapidajana simulatsiooni koodiga.
5. Õppejõud lisab või käivitab sündmuse.
6. Kontrolli, et korrapidaja näeb sündmust ilma käsitsi värskendamata.
7. Korrapidaja suunab ametniku sündmusele või saatebussile.
8. Kontrolli, et õppejõu vaade näeb muudatust.
9. Kontrolli, et hoiatused ja otsuste logi uuenevad mõlemas vaates.
