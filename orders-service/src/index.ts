import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import gql from 'graphql-tag';
import { MongoClient, Db, ObjectId } from 'mongodb';

let db: Db;

async function initDB() {
  const client = new MongoClient('mongodb://localhost:27017');
  await client.connect();
  db = client.db('orders_db');
  console.log('Подключено к MongoDB');
}

const typeDefs = gql`
  type Query {
    orders: [Order!]!
    order(id: ID!): Order
  }

  type Mutation {
    createOrder(userId: ID!, items: [OrderItemInput!]!): Order!
    updateOrderStatus(id: ID!, status: String!): Order
    deleteOrder(id: ID!): Boolean!
  }

  input OrderItemInput {
    productId: ID!
    quantity: Int!
    price: Float!
  }

  type Order @key(fields: "id") {
    id: ID!
    userId: ID!
    items: [OrderItem!]!
    status: String!
    createdAt: String!
  }

  type OrderItem {
    productId: ID!
    quantity: Int!
    price: Float!
  }
`;

const resolvers = {
  Order: {
    id: (parent: any) => {
      return parent._id ? parent._id.toString() : parent.id;
    },
    __resolveReference: async (reference: { id: string }) => {
      const order = await db.collection('orders').findOne({ _id: new ObjectId(reference.id) });
      if (!order) return null;
      return {
        ...order,
        id: order._id.toString(),
      };
    },
  },
  
  Query: {
    orders: async () => {
      const orders = await db.collection('orders').find().toArray();
      return orders.map((order: any) => ({
        ...order,
        id: order._id.toString(),
      }));
    },
    order: async (_: any, { id }: { id: string }) => {
      const order = await db.collection('orders').findOne({ _id: new ObjectId(id) });
      if (!order) return null;
      return {
        ...order,
        id: order._id.toString(),
      };
    },
  },
  Mutation: {
    createOrder: async (_: any, { userId, items }: any) => {
      const order = {
        userId,
        items,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      const result = await db.collection('orders').insertOne(order);
      return { 
        id: result.insertedId.toString(), 
        ...order 
      };
    },
    updateOrderStatus: async (_: any, { id, status }: any) => {
      await db.collection('orders').updateOne(
        { _id: new ObjectId(id) },
        { $set: { status } }
      );
      const order = await db.collection('orders').findOne({ _id: new ObjectId(id) });
      if (!order) return null;
      return {
        ...order,
        id: order._id.toString(),
      };
    },
    deleteOrder: async (_: any, { id }: { id: string }) => {
      try {
        // ИСПРАВЛЕНО: проверяем, что документ существует перед удалением
        const existingOrder = await db.collection('orders').findOne({ _id: new ObjectId(id) });
        
        if (!existingOrder) {
          console.log(`Delete order ${id}: NOT FOUND`);
          return false;
        }
        
        const result = await db.collection('orders').deleteOne({ _id: new ObjectId(id) });
        const deleted = result.deletedCount > 0;
        
        console.log(`Delete order ${id}:`, deleted ? 'SUCCESS' : 'FAILED');
        return deleted;
      } catch (error) {
        console.error('Error deleting order:', error);
        throw new Error('Failed to delete order');
      }
    },
  },
};

async function main() {
  try {
    await initDB();
    
    const schema = buildSubgraphSchema({ typeDefs, resolvers });
    const server = new ApolloServer({ 
      schema,
      introspection: true,
    });

    const { url } = await startStandaloneServer(server, { listen: { port: 4003 } });
    console.log(`Orders service ready at ${url}`);
  } catch (error) {
    console.error('Failed to start orders service:', error);
    process.exit(1);
  }
}

main().catch(console.error);
