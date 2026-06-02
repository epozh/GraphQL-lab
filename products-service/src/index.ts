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
  database: 'products_db',
  logging: true,
  entities: [],
});

async function initDB() {
  await AppDataSource.initialize();
  await AppDataSource.query(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name VARCHAR NOT NULL,
      description TEXT,
      price DECIMAL(10,2) NOT NULL,
      stock INTEGER DEFAULT 0
    )
  `);
}

const typeDefs = gql`
  type Query {
    products: [Product!]!
    product(id: ID!): Product
  }

  type Mutation {
    createProduct(name: String!, description: String!, price: Float!, stock: Int): Product!
    updateProduct(id: ID!, name: String, description: String, price: Float, stock: Int): Product
    deleteProduct(id: ID!): Boolean!
  }

  type Product @key(fields: "id") {
    id: ID!
    name: String!
    description: String!
    price: Float!
    stock: Int!
  }
`;

const resolvers = {
  Query: {
    products: async () => {
      try {
        return await AppDataSource.query('SELECT * FROM products');
      } catch (error) {
        console.error('Error fetching products:', error);
        throw new Error('Failed to fetch products');
      }
    },
    product: async (_: any, { id }: { id: string }) => {
      try {
        const result = await AppDataSource.query('SELECT * FROM products WHERE id = $1', [id]);
        return result[0] || null;
      } catch (error) {
        console.error('Error fetching product:', error);
        throw new Error('Failed to fetch product');
      }
    },
  },
  Product: {
    __resolveReference: async (reference: { id: string }) => {
      const result = await AppDataSource.query('SELECT * FROM products WHERE id = $1', [reference.id]);
      return result[0] || null;
    },
  },
  Mutation: {
    createProduct: async (_: any, args: any) => {
      try {
        const result = await AppDataSource.query(
          'INSERT INTO products (name, description, price, stock) VALUES ($1, $2, $3, $4) RETURNING *',
          [args.name, args.description, args.price, args.stock || 0]
        );
        return result[0];
      } catch (error) {
        console.error('Error creating product:', error);
        throw new Error('Failed to create product');
      }
    },
    updateProduct: async (_: any, { id, ...args }: any) => {
      try {
        const sets: string[] = [];
        const values: any[] = [];
        let i = 1;
        
        if (args.name !== undefined) { sets.push(`name = $${i++}`); values.push(args.name); }
        if (args.description !== undefined) { sets.push(`description = $${i++}`); values.push(args.description); }
        if (args.price !== undefined) { sets.push(`price = $${i++}`); values.push(args.price); }
        if (args.stock !== undefined) { sets.push(`stock = $${i++}`); values.push(args.stock); }
        
        if (sets.length === 0) return null;
        
        values.push(id);
        const result = await AppDataSource.query(
          `UPDATE products SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
          values
        );
        return result[0] || null;
      } catch (error) {
        console.error('Error updating product:', error);
        throw new Error('Failed to update product');
      }
    },
    deleteProduct: async (_: any, { id }: { id: string }) => {
      try {
        // ИСПРАВЛЕНО: используем RETURNING для проверки существования записи
        const result = await AppDataSource.query(
          'DELETE FROM products WHERE id = $1 RETURNING id',
          [id]
        );
        
        const deleted = Array.isArray(result) ? result.length > 0 : false;
        
        console.log(`Delete product ${id}:`, deleted ? 'SUCCESS' : 'NOT FOUND');
        return deleted;
      } catch (error) {
        console.error('Error deleting product:', error);
        throw new Error('Failed to delete product');
      }
    },
  },
};

async function main() {
  try {
    await initDB();
    
    const schema = buildSubgraphSchema({ typeDefs, resolvers });
    const server = new ApolloServer({ schema });
    
    const { url } = await startStandaloneServer(server, { listen: { port: 4002 } });
    console.log(`Products service ready at ${url}`);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main().catch(console.error);
