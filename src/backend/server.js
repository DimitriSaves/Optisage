import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { parse } from 'csv-parse';

const app = express();
const port = 3001;

app.use(cors());

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
      if (row.length >= 7) {
        const code = row[1];
        codes.push(code);
        const types = row[5] === '1' ? '1' : row[5] === '2' ? '2' : '';
        console.log(`Function: ${code}, Types: ${types}`);  // Log the types value

        const detailedData = {
          profileCode: row[4],
          access: row[2],
          sites: row[6],
          types: types,
          function: code,
          options: row[3]
        };
        fullData.push(detailedData);
      }
    });

    console.log({ codes, fullData }); // Log final data structure
    res.json({ codes, fullData });
  });
});


app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
