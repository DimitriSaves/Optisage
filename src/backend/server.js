import express from 'express';
import * as process from 'process';
import multer from 'multer';
import db from './db.js';
import cors from 'cors';
import bodyParser from 'body-parser';
import Papa from 'papaparse';
import fs from 'fs';

const app = express();
const port = process.env['PORT'] || 3001;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));


var corsOptions = {
  origin: 'http://localhost:4200',
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Ajoutez toutes les méthodes HTTP requises
  allowedHeaders: ['Content-Type', 'Authorization'] // Ajoutez les en-têtes autorisés
};

app.use(cors(corsOptions));

app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.send('Hello World!');
});

const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function(req, file, cb) {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage: storage });

app.post('/upload', upload.single('file'), (req, res) => {
  const file = req.file;

  // Lire le contenu du fichier CSV
  fs.readFile(file.path, 'utf8', (err, fileContent) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error reading file');
    }

    // Parse le contenu du fichier CSV
    Papa.parse(fileContent, {
      delimiter: ";",
      header: true,
      complete: (results) => {
        // Insérer chaque ligne de données dans la base de données
        results.data.forEach((row) => {
          const sql = 'INSERT INTO fichier SET ?';
          const values = {
            filename: file.originalname, // Ajoutez le nom du fichier ici
            FNC_0: row.FNC_0,
            ACS_0: row.ACS_0,
            OPT_0: row.OPT_0,
            PRFCOD_0: row.PRFCOD_0,
            FCYGRUCOD_0: row.FCYGRUCOD_0,
            FCYGRU_0: row.FCYGRU_0
          };

          db.query(sql, values, function(err, result) {
            if (err) throw err;
          });
        });

        console.log('File saved to database');
        res.send('File uploaded!');
      }
    });
  });
});



app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

app.get('/getFiles', (req, res) => {
  const sql = 'SELECT * FROM fichier';
  db.query(sql, (err, result) => {
    if (err) throw err;
    res.send(result);
  });
});
// Mettre à jour un fichier
app.post('/uploadFile', (req, res) => {
  const { data, filename } = req.body;

  // Insérer les données du fichier dans la base de données avec le nom de fichier
  const query = "INSERT INTO fichier (filename, FNC_0, ACS_0, OPT_0, PRFCOD_0, FCYGRUCOD_0, FCYGRU_0) VALUES ?";
  const values = data.map((row) => [filename, row.FNC_0, row.ACS_0, row.OPT_0, row.PRFCOD_0, row.FCYGRUCOD_0, row.FCYGRU_0]);
  db.query(query, [values], (error, results, fields) => {
    if (error) {
      console.log('Error inserting file:', error);
      res.status(500).send('Error inserting file');
    } else {
      console.log('File inserted:', results);
      res.status(200).send('File inserted');
    }
  });
});



app.post('/deleteFile', (req, res) => {
  const { filename } = req.body;

  // Supprimer le fichier de la base de données en fonction du nom de fichier
  const query = "DELETE FROM fichier WHERE filename = ?";
  db.query(query, [filename], (error, results, fields) => {
    if (error) {
      console.log('Error deleting file:', error);
      res.status(500).send('Error deleting file');
    } else {
      console.log('File deleted:', results);
      res.status(200).send('File deleted');
    }
  });
});



