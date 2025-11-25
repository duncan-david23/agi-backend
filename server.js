import express from 'express';
import cors from 'cors';
import userAccountRoute from './routes/userAccountRoute.js';
import userTasksRoute from './routes/userTasksRoute.js';
import withdrawalRoute from './routes/withdrawalRoute.js';


const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/users', userAccountRoute);
app.use('/api/users', userTasksRoute);
app.use('/api/users', withdrawalRoute);

// Sample route
app.get('/', (req, res) => {
  res.send('Hello from the backend server!');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});