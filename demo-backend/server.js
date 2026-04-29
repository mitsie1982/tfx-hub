// Demo Backend: Express REST + GraphQL API
const express = require('express');
const { graphqlHTTP } = require('express-graphql');
const { buildSchema } = require('graphql');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// REST API mock endpoint
demoData = [
  { id: 1, name: 'Alice', role: 'admin' },
  { id: 2, name: 'Bob', role: 'user' },
];

app.get('/api/users', (req, res) => {
  res.json(demoData);
});

app.get('/api/users/:id', (req, res) => {
  const user = demoData.find(u => u.id === parseInt(req.params.id));
  if (user) res.json(user);
  else res.status(404).json({ error: 'User not found' });
});

// GraphQL schema and resolver
const schema = buildSchema(`
  type User {
    id: Int
    name: String
    role: String
  }
  type Query {
    users: [User]
    user(id: Int!): User
  }
`);

const root = {
  users: () => demoData,
  user: ({ id }) => demoData.find(u => u.id === id),
};

app.use('/graphql', graphqlHTTP({
  schema,
  rootValue: root,
  graphiql: true,
}));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Demo backend running on http://localhost:${PORT}`);
});
