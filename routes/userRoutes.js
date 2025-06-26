const express = require('express');
const router = express.Router();
const { validateUser } = require('../validators/userValidator');

let users = {}; // storing users in memory

// Create user
router.post('/', (req, res) => {
  const { name, email, age } = req.body;
  if (!validateUser(email)) {
    return res.status(400).json({ error: 'Please enter a valid email' });
  }
  const id = uuidv4();
  users[id] = { id, name, email, age };
  res.status(201).json(users[id]);
});

// Read all users
router.get('/', (req, res) => {
  res.json(Object.values(users));
});

// Read one user by ID
router.get('/:id', (req, res) => {
  const user = users[req.params.id];
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json(user);
});

// Update user
router.put('/:id', (req, res) => {
  const { name, email, age } = req.body;
  if (!users[req.params.id]) {
    return res.status(404).json({ error: 'User not found' });
  }
  if (!validateUser(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }
  users[req.params.id] = { ...users[req.params.id], name, email, age };
  res.json(users[req.params.id]);
});

// Delete user
router.delete('/:id', (req, res) => {
  if (!users[req.params.id]) {
    return res.status(404).json({ error: 'User not found' });
  }
  delete users[req.params.id];
  res.json({ message: 'User has been deleted' });
});

module.exports = router;
