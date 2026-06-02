import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import gql from 'graphql-tag';

const AppDataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: 'admin',
  database: 'users_db',
  logging: true,
  entities: [],
});

async function initDB() {
  try {
    await AppDataSource.initialize();
    console.log('PostgreSQL connected successfully');
    
    await AppDataSource.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR NOT NULL,
        email VARCHAR UNIQUE NOT NULL,
        phone VARCHAR
      )
    `);
    console.log('Table "users" created/verified');
  } catch (error) {
    console.error(' Database initialization failed:', error);
    throw error;
  }
}

const typeDefs = gql`
  type Query {
    users: [User!]!
    user(id: ID!): User
  }

  type Mutation {
    createUser(name: String!, email: String!, phone: String): User!
    updateUser(id: ID!, name: String, email: String, phone: String): User
    deleteUser(id: ID!): Boolean!
  }

  type User @key(fields: "id") {
    id: ID!
    name: String!
    email: String!
    phone: String
  }
`;

const resolvers = {
  Query: {
    users: async () => {
      try {
        const result = await AppDataSource.query('SELECT * FROM users');
        console.log(' Users fetched:', result.length, 'records');
        return result;
      } catch (error) {
        console.error(' Error fetching users:', error);
        throw new Error('Failed to fetch users');
      }
    },
    user: async (_: any, { id }: { id: string }) => {
      try {
        const result = await AppDataSource.query('SELECT * FROM users WHERE id = $1', [id]);
        console.log('User fetched:', result[0] || 'not found');
        return result[0] || null;
      } catch (error) {
        console.error(' Error fetching user:', error);
        throw new Error('Failed to fetch user');
      }
    },
  },
  Mutation: {
    createUser: async (_: any, args: any) => {
      try {
        console.log(' Creating user with args:', args);
        
        // ПРОВЕРКА: убедимся, что args содержит нужные поля
        if (!args.name || !args.email) {
          throw new Error('Name and email are required');
        }
        
        const result = await AppDataSource.query(
          'INSERT INTO users (name, email, phone) VALUES ($1, $2, $3) RETURNING *',
          [args.name, args.email, args.phone || null]
        );
        
        console.log('User created:', result[0]);
        return result[0];
      } catch (error: any) {
        console.error(' Error creating user:', error);
        console.error(' Error details:', error.message);
        console.error(' Error stack:', error.stack);
        throw new Error('Failed to create user: ' + error.message);
      }
    },
    updateUser: async (_: any, { id, ...args }: any) => {
      try {
        const sets: string[] = [];
        const values: any[] = [];
        let i = 1;
        
        if (args.name !== undefined) { sets.push(`name = $${i++}`); values.push(args.name); }
        if (args.email !== undefined) { sets.push(`email = $${i++}`); values.push(args.email); }
        if (args.phone !== undefined) { sets.push(`phone = $${i++}`); values.push(args.phone); }
        
        if (sets.length === 0) return null;
        
        values.push(id);
        const result = await AppDataSource.query(
          `UPDATE users SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
          values
        );
        return result[0] || null;
      } catch (error) {
        console.error(' Error updating user:', error);
        throw new Error('Failed to update user');
      }
    },
    deleteUser: async (_: any, { id }: { id: string }) => {
      try {
        const result = await AppDataSource.query(
          'DELETE FROM users WHERE id = $1 RETURNING id',
          [id]
        );
        const deleted = Array.isArray(result) ? result.length > 0 : false;
        console.log(`🗑️ Delete user ${id}:`, deleted ? 'SUCCESS' : 'NOT FOUND');
        return deleted;
      } catch (error) {
        console.error(' Error deleting user:', error);
        throw new Error('Failed to delete user');
      }
    },
  },
  User: {
    __resolveReference: async (reference: { id: string }) => {
      const result = await AppDataSource.query('SELECT * FROM users WHERE id = $1', [reference.id]);
      return result[0] || null;
    },
  },
};

async function main() {
  try {
    await initDB();
    
    const schema = buildSubgraphSchema({ typeDefs, resolvers });
    const server = new ApolloServer({ schema });
    
    const { url } = await startStandaloneServer(server, { listen: { port: 4001 } });
    console.log(`Users service ready at ${url}`);
  } catch (error) {
    console.error('Failed to start users service:', error);
    process.exit(1);
  }
}

main().catch(console.error);
