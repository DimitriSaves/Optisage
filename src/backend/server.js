import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { parse } from 'csv-parse';

const app = express();
const port = 3001;

app.use(cors());

// Configuration de multer pour stocker les fichiers en mémoire
const upload = multer({ storage: multer.memoryStorage() });

app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file || !req.file.buffer) {
    return res.status(400).send('Aucun fichier reçu');
  }

  parse(req.file.buffer, {
    delimiter: ';',
    trim: true,
    skip_empty_lines: true
  }, (err, output) => {
    if (err) {
      return res.status(500).send('Erreur lors du parsing du fichier');
    }

    const codes = [];
    const fullData = [];

    output.forEach(row => {
      if (row.length >= 7) { // Assurez-vous que chaque ligne a au moins 7 éléments
        const code = row[1];
        codes.push(code);

        const detailedData = {
          profileCode: row[4],
          access: row[2],
          sites: row[6],
          menu: row[5],
          function: code,
          options: row[3]
        };
        fullData.push(detailedData);
      }
    });

    console.log({ codes, fullData }); // Affichez pour vérifier
    res.json({ codes, fullData });
  });
});



app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
