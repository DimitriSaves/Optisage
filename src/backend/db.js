import mysql from 'mysql';

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'saves',
  database: 'fichiercsv'
});

connection.connect(function(err) {
  if (err) throw err;
  console.log('Connected to MySQL');
});

export default connection;
