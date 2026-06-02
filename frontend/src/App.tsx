import { useQuery, useMutation, gql } from '@apollo/client';
import { useState } from 'react';

// ===== ЗАПРОСЫ =====

const GET_USERS = gql`
  query GetUsers {
    users {
      id
      name
      email
      phone
    }
  }
`;

const GET_PRODUCTS = gql`
  query GetProducts {
    products {
      id
      name
      description
      price
      stock
    }
  }
`;

const GET_ORDERS = gql`
  query GetOrders {
    orders {
      id
      userId
      status
      items {
        productId
        quantity
        price
      }
      createdAt
    }
  }
`;

// ===== МУТАЦИИ =====

const CREATE_USER = gql`
  mutation CreateUser($name: String!, $email: String!, $phone: String) {
    createUser(name: $name, email: $email, phone: $phone) {
      id
      name
      email
    }
  }
`;

const CREATE_PRODUCT = gql`
  mutation CreateProduct($name: String!, $description: String!, $price: Float!, $stock: Int) {
    createProduct(name: $name, description: $description, price: $price, stock: $stock) {
      id
      name
      price
    }
  }
`;

const CREATE_ORDER = gql`
  mutation CreateOrder($userId: ID!, $items: [OrderItemInput!]!) {
    createOrder(userId: $userId, items: $items) {
      id
      userId
      status
    }
  }
`;

// ДОБАВЛЕНЫ: Мутации удаления
const DELETE_USER = gql`
  mutation DeleteUser($id: ID!) {
    deleteUser(id: $id)
  }
`;

const DELETE_PRODUCT = gql`
  mutation DeleteProduct($id: ID!) {
    deleteProduct(id: $id)
  }
`;

const DELETE_ORDER = gql`
  mutation DeleteOrder($id: ID!) {
    deleteOrder(id: $id)
  }
`;

function App() {
  const [activeTab, setActiveTab] = useState<'users' | 'products' | 'orders'>('users');

  const { data: usersData, loading: usersLoading, refetch: refetchUsers } = useQuery(GET_USERS, {
    skip: activeTab !== 'users',
  });
  const { data: productsData, loading: productsLoading, refetch: refetchProducts } = useQuery(GET_PRODUCTS, {
    skip: activeTab !== 'products',
  });
  const { data: ordersData, loading: ordersLoading, refetch: refetchOrders } = useQuery(GET_ORDERS, {
    skip: activeTab !== 'orders',
  });

  const [createUser] = useMutation(CREATE_USER);
  const [createProduct] = useMutation(CREATE_PRODUCT);
  const [createOrder] = useMutation(CREATE_ORDER);

  // ДОБАВЛЕНЫ: Хуки для удаления
  const [deleteUser] = useMutation(DELETE_USER, {
    onCompleted: () => refetchUsers(),
  });
  const [deleteProduct] = useMutation(DELETE_PRODUCT, {
    onCompleted: () => refetchProducts(),
  });
  const [deleteOrder] = useMutation(DELETE_ORDER, {
    onCompleted: () => refetchOrders(),
  });

  const handleAddUser = () => {
    const name = prompt('Имя:');
    const email = prompt('Email:');
    const phone = prompt('Телефон:');
    if (name && email) {
      createUser({ variables: { name, email, phone } }).then(() => refetchUsers());
    }
  };

  const handleAddProduct = () => {
    const name = prompt('Название товара:');
    const description = prompt('Описание:');
    const price = parseFloat(prompt('Цена:') || '0');
    const stock = parseInt(prompt('Количество на складе:') || '0');
    if (name && description && price > 0) {
      createProduct({ variables: { name, description, price, stock } }).then(() => refetchProducts());
    }
  };

  const handleAddOrder = () => {
    const userId = prompt('ID пользователя:');
    const productId = prompt('ID товара:');
    const quantity = parseInt(prompt('Количество:') || '1');
    const price = parseFloat(prompt('Цена за штуку:') || '0');
    if (userId && productId && quantity > 0) {
      const items = [{ productId, quantity, price }];
      createOrder({ variables: { userId, items } }).then(() => refetchOrders());
    }
  };

  // ДОБАВЛЕНЫ: Обработчики удаления
  const handleDeleteUser = (id: string) => {
    if (window.confirm('Удалить пользователя?')) {
      deleteUser({ variables: { id } });
    }
  };

  const handleDeleteProduct = (id: string) => {
    if (window.confirm('Удалить товар?')) {
      deleteProduct({ variables: { id } });
    }
  };

  const handleDeleteOrder = (id: string) => {
    if (window.confirm('Удалить заказ?')) {
      deleteOrder({ variables: { id } });
    }
  };

  const loading = (activeTab === 'users' && usersLoading) ||
                  (activeTab === 'products' && productsLoading) ||
                  (activeTab === 'orders' && ordersLoading);

  if (loading) return <p>Загрузка...</p>;

  return (
    <div style={{ padding: 20, fontFamily: 'Arial, sans-serif' }}>
      <h1>Микросервисный магазин</h1>

      <div style={{ marginBottom: 20 }}>
        <button onClick={() => setActiveTab('users')} style={tabStyle(activeTab === 'users')}>
          Пользователи
        </button>
        <button onClick={() => setActiveTab('products')} style={tabStyle(activeTab === 'products')}>
          Товары
        </button>
        <button onClick={() => setActiveTab('orders')} style={tabStyle(activeTab === 'orders')}>
          Заказы
        </button>
      </div>

      {activeTab === 'users' && (
        <div>
          <h2>Пользователи</h2>
          <button onClick={handleAddUser} style={btnStyle}>Добавить пользователя</button>
          <ul>
            {usersData?.users.map((user: any) => (
              <li key={user.id} style={itemStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>{user.name}</strong> — {user.email} {user.phone && `(${user.phone})`}
                  </div>
                  {/* ДОБАВЛЕНО: Кнопка удаления */}
                  <button 
                    onClick={() => handleDeleteUser(user.id)} 
                    style={deleteBtnStyle}
                  >
                     Удалить
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {activeTab === 'products' && (
        <div>
          <h2>Товары</h2>
          <button onClick={handleAddProduct} style={btnStyle}>Добавить товар</button>
          <ul>
            {productsData?.products.map((product: any) => (
              <li key={product.id} style={itemStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>{product.name}</strong> — {product.price}₽
                    <br/><small>{product.description} (на складе: {product.stock})</small>
                  </div>
                  {/* ДОБАВЛЕНО: Кнопка удаления */}
                  <button 
                    onClick={() => handleDeleteProduct(product.id)} 
                    style={deleteBtnStyle}
                  >
                    🗑️ Удалить
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {activeTab === 'orders' && (
        <div>
          <h2>Заказы</h2>
          <button onClick={handleAddOrder} style={btnStyle}>Создать заказ</button>
          <ul>
            {ordersData?.orders.map((order: any) => (
              <li key={order.id} style={itemStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>Заказ #{order.id.slice(-4)}</strong> — Статус: <em>{order.status}</em>
                    <br/><small>Пользователь: {order.userId}</small>
                    <br/><small>Товары: {order.items.map((i: any) => `${i.productId} x${i.quantity}`).join(', ')}</small>
                  </div>
                  {/* ДОБАВЛЕНО: Кнопка удаления */}
                  <button 
                    onClick={() => handleDeleteOrder(order.id)} 
                    style={deleteBtnStyle}
                  >
                    🗑️ Удалить
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

const tabStyle = (active: boolean) => ({
  padding: '10px 20px',
  marginRight: 10,
  background: active ? '#007bff' : '#e0e0e0',
  color: active ? 'white' : 'black',
  border: 'none',
  borderRadius: 5,
  cursor: 'pointer',
});

const btnStyle = {
  padding: '8px 16px',
  background: '#28a745',
  color: 'white',
  border: 'none',
  borderRadius: 5,
  cursor: 'pointer',
  marginBottom: 15,
};


const deleteBtnStyle = {
  padding: '4px 8px',
  background: '#dc3545',
  color: 'white',
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: '12px',
};

const itemStyle = {
  padding: 10,
  marginBottom: 10,
  background: '#f8f9fa',
  borderRadius: 5,
  listStyle: 'none',
};

export default App;