const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
dotenv.config();
const sessionMiddleware = require('./src/middleware/session.js');
const postRoutes = require('./src/routes/postRoute.js');
const userRoutes = require('./src/routes/userRoute.js');
const profileRoutes = require('./src/routes/profileRoutes.js');
const feedRoute = require('./src/routes/feedRoute.js');

const app = express();

app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
// DB connect...
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.log(err));
app.use(express.json());

app.use(sessionMiddleware);


app.get('/', (req, res) => res.send('Backend is Running!'));

app.use('/api/posts', postRoutes);
app.use('/api/users', userRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/feed', feedRoute);

app.listen(process.env.PORT || 5000, () => {
  console.log(`Server is running on port ${process.env.PORT || 5000}`);
});
