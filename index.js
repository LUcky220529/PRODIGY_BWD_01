const express = require('express');
const { v4: uuidv4 } = require('uuid');
const userRoutes = require('./routes/userRoutes');
const app = express();

app.use(express.json());
app.use('/users', userRoutes);

const PORT = 3000;
app.listen(PORT, () => {
  console.log('Server is running on port', PORT);
});
