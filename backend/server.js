const postRoutes = require('./src/routes/postRoute.js');
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const userRoutes = require('./src/routes/userRoute.js');
const sessionMiddleware = require('./src/middleware/session.js');
const profileRoutes = require('./src/routes/profileRoutes.js')
const sessionRoutes = require('./src/routes/sessionRoute.js')

dotenv.config();
const app = express();

app.use(express.json());
app.use(sessionMiddleware);

mongoose.connect(process.env.MONGO_URL)
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.log(err));

app.get('/', (req, res) => {
  res.send('Backend in Running!');
});

app.use('/api/posts',postRoutes);
app.use('/api/users',userRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/session-info", sessionRoutes);
app.listen(process.env.PORT || 5000, () => {
    console.log(`Server is running on port ${process.env.PORT || 5000}`);
})
