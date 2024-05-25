const express = require('express'); // framework pour créer des applications web.
const http = require('http');//module pour créer un serveur HTTP.
const socketIo = require('socket.io');//bibliothèque pour la communication en temps réel via WebSockets.
const mongoose = require('mongoose');//outil pour interagir avec MongoDB.
const cors = require('cors');//middleware pour gérer les politiques de sécurité CORS (Cross-Origin Resource Sharing).

const app = express();//initialisation de l'app en creant une application express
const server = http.createServer(app); //creation d'un serveur http base sur l'app express
const io = socketIo(server, {//initialisation du socket.io avec la configuration CORS
  cors: {
    origin: "http://localhost:3000", //everything request that commes from localhost:3000 to the socket server let it go 
    methods: ["GET", "POST"]//whatever the method was
  }
});

// Middleware
app.use(express.json()); //permet de traiter les requetes json
app.use(cors({ //permet les requetes provenant de localhost:3000 to the backend server 
  origin: "http://localhost:3000" 
}));

// Connect to MongoDB Atlas
const mongoUri = 'mongodb+srv://hazy:thisislife17@cluster0.g12s1mf.mongodb.net/locationn';
mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('Connected to MongoDB Atlas');
})
.catch(err => {
  console.error('Error connecting to MongoDB Atlas', err);
});

const locationSchema = new mongoose.Schema({//définit la structure des documents de localisation avec des champs lat (latitude) et lng (longitude).
  lat: Number,
  lng: Number,
}, { timestamps: true });

const Location = mongoose.model('Location', locationSchema);//Location est un modele 
//Gestion des connexion Secket.io
app.post('/update-location', async (req, res) => {
  try {
    const { lat, lng } = req.body;//Extrait les valeurs de latitude (lat) et de longitude (lng) du corps de la requête.
    const location = new Location({ lat, lng });//Crée une nouvelle instance du modèle Location avec les coordonnées reçues.
    await location.save();//Sauvegarde la nouvelle localisation dans la base de données MongoDB.
    console.log('Location saved:', location);

    // Emit the new location to all connected clients
    io.emit('locationUpdate', { lat, lng });

    res.status(200).send('Location updated');
  } catch (error) {//gestion des erreurs
    console.error('Error saving location:', error);
    res.status(500).send('Error updating location');
  }
});
//gere les nouveaux clients connectes,
io.on('connection', (socket) => {//
  console.log('New client connected');
//gere les nouvelles localisations envoyees par les clients via websockets 
  socket.on('location', async (data) => {
    try {
      const { lat, lng } = data;
      const location = new Location({ lat, lng });
      await location.save();
      console.log('Location saved via socket:', location);

      io.emit('locationUpdate', { lat, lng });
    } catch (error) {
      console.error('Error saving location via socket:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});
app.get('/get-location', async (req, res) => {
  try {
    // Fetch the latest location from MongoDB
    const latestLocation = await Location.findOne().sort({ createdAt: -1 });

    // If no location found, return an empty response
    if (!latestLocation) {
      return res.status(404).send('Location not found');
    }

    // Otherwise, return the latest location
    res.json({ lat: latestLocation.lat, lng: latestLocation.lng });
  } catch (error) {
    console.error('Error fetching location:', error);
    res.status(500).send('Error fetching location');
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});


// Define schema for taxi location
const taxiLocationSchema = new mongoose.Schema({
  taxiId: String, // Add a field for taxi ID
  lat: Number,
  lng: Number,
}, { timestamps: true });

// Create model for taxi location
const TaxiLocation = mongoose.model('TaxiLocation', taxiLocationSchema);

// Route to update taxi location
app.post('/update-taxi-location', async (req, res) => {
  try {
    const { taxiId, lat, lng } = req.body;
    const taxiLocation = new TaxiLocation({ taxiId, lat, lng });
    await taxiLocation.save();
    console.log('Taxi location saved:', taxiLocation);

    // Emit the new taxi location to all connected clients
    io.emit('taxiLocationUpdate', { taxiId, lat, lng });

    res.status(200).send('Taxi location updated');
  } catch (error) {
    console.error('Error saving taxi location:', error);
    res.status(500).send('Error updating taxi location');
  }
});

// Handle new connections
io.on('connection', (socket) => {
  console.log('New client connected');

  // Handle new taxi locations sent by clients via websockets
  socket.on('taxiLocation', async (data) => {
    try {
      const { taxiId, lat, lng } = data;
      const taxiLocation = new TaxiLocation({ taxiId, lat, lng });
      await taxiLocation.save();
      console.log('Taxi location saved via socket:', taxiLocation);

      io.emit('taxiLocationUpdate', { taxiId, lat, lng });
    } catch (error) {
      console.error('Error saving taxi location via socket:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Route to get latest taxi location
app.get('/get-taxi-location/:taxiId', async (req, res) => {
  try {
    const { taxiId } = req.params;
    // Fetch the latest taxi location from MongoDB based on taxiId
    const latestTaxiLocation = await TaxiLocation.findOne({ taxiId }).sort({ createdAt: -1 });

    // If no location found, return an empty response
    if (!latestTaxiLocation) {
      return res.status(404).send('Taxi location not found');
    }

    // Otherwise, return the latest taxi location
    res.json({ taxiId: latestTaxiLocation.taxiId, lat: latestTaxiLocation.lat, lng: latestTaxiLocation.lng });
  } catch (error) {
    console.error('Error fetching taxi location:', error);
    res.status(500).send('Error fetching taxi location');
  }
});

