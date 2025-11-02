const postRoutes = require('./src/routes/postRoute.js');
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const app = express();

app.use(express.json());

mongoose.connect(process.env.MONGO_URL)
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.log(err));

app.get('/', (req, res) => {
  res.send('Backend in Running!');
});

app.use('/api/posts',postRoutes);

app.listen(process.env.PORT || 5000, () => {
    console.log(`Server is running on port ${process.env.PORT || 5000}`);
})
