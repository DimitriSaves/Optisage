import express from 'express';
import * as process from 'process';
import multer from 'multer';
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
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
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

  // Read the content of the CSV file
  fs.readFile(file.path, 'utf8', (err, fileContent) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error reading file');
    }

    // Parse the content of the CSV file
    Papa.parse(fileContent, {
      delimiter: ";",
      header: true,
      complete: (results) => {
        res.json(results.data);
      }
    });
  });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
