# Bussola dei Venti

Una bussola che mostra il vento reale (direzione e velocità) nella tua posizione, con i nomi
della rosa dei venti mediterranea a 8 punte in italiano, e un toggle per passare al dialetto
di Manduria.

## Struttura del progetto

```
wind-compass/
├── index.html          # markup della pagina
├── css/
│   └── styles.css      # tema visivo (rosa dei venti / carta nautica)
├── js/
│   ├── app.js           # logica: geolocalizzazione, fetch del vento, disegno bussola, toggle
│   └── data/
│       └── venti.json   # i 8 venti: chiave, gradi, nome italiano, termine dialettale
└── README.md
```

## Come funziona

- Alla prima apertura chiede il permesso di geolocalizzazione, poi legge il vento in corso da
  [Open-Meteo](https://open-meteo.com/) (API pubblica, nessuna chiave richiesta).
- Se il permesso viene negato, usa Manduria come posizione di riferimento.
- Il nome del vento è calcolato arrotondando la direzione reale al punto più vicino della rosa
  dei venti a 8 punte (Tramontana, Grecale, Levante, Scirocco, Ostro, Libeccio, Ponente,
  Maestrale).

## Aggiungere i termini dialettali

Non ci sono fonti verificate integrate per il dialetto di Manduria, quindi il file
`js/data/venti.json` ha il campo `"dialettale"` vuoto per ogni vento. Per aggiungerli:

1. Apri `js/data/venti.json`.
2. Riempi il campo `"dialettale"` per ciascun vento, ad esempio:
   ```json
   { "key": "tramontana", "deg": 0, "italiano": "Tramontana", "dialettale": "..." }
   ```
3. Salva e ricarica la pagina — il toggle "Dialetto Manduria" mostrerà subito il nuovo termine.

Non c'è un'interfaccia di modifica nell'app: è un file dati versionato nel repo, come per
qualunque altro progetto.

## Sviluppo locale

Il browser blocca il `fetch()` di `venti.json` se apri `index.html` direttamente come file
(`file://`). Serve un piccolo server locale:

```bash
# opzione 1
npx serve .

# opzione 2
python3 -m http.server 8000
```

Poi apri `http://localhost:PORT` nel browser.

## Deploy su GitHub Pages

1. Crea un repository e carica il contenuto di questa cartella (mantenendo la struttura).
2. Vai su **Settings → Pages**.
3. In **Source**, scegli il branch (es. `main`) e la cartella `/ (root)`.
4. Salva: GitHub ti darà un URL tipo `https://<utente>.github.io/<repo>/`.

Poiché GitHub Pages serve i file su HTTPS, sia il `fetch()` di `venti.json` sia la chiamata a
Open-Meteo funzionano senza modifiche.
