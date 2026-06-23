# JavaScript API Examples

## Using Fetch API

### 1. Register Merchant

```javascript
async function registerMerchant() {
  const response = await fetch('http://localhost:5001/api/merchant/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      businessName: "Tech Store",
      ownerName: "John Smith",
      email: "john@techstore.com",
      password: "SecurePass123!",
      phone: "+1234567890",
      businessAddress: {
        street: "456 Tech Avenue",
        city: "San Francisco",
        state: "CA",
        zipCode: "94105",
        country: "USA"
      }
    })
  });

  const data = await response.json();

  if (data.success) {
    // Store token for future requests
    localStorage.setItem('merchantToken', data.data.token);
    console.log('Registration successful:', data.data.merchant);
    return data.data.token;
  } else {
    console.error('Registration failed:', data.message);
    throw new Error(data.message);
  }
}
```

### 2. Login

```javascript
async function loginMerchant(email, password) {
  const response = await fetch('http://localhost:5001/api/merchant/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  });

  const data = await response.json();

  if (data.success) {
    localStorage.setItem('merchantToken', data.data.token);
    console.log('Login successful');
    return data.data;
  } else {
    throw new Error(data.message);
  }
}
```

### 3. Get Current Merchant

```javascript
async function getCurrentMerchant() {
  const token = localStorage.getItem('merchantToken');

  const response = await fetch('http://localhost:5001/api/merchant/auth/me', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const data = await response.json();

  if (data.success) {
    return data.data.merchant;
  } else {
    throw new Error(data.message);
  }
}
```

### 4. Create Product

```javascript
async function createProduct(productData) {
  const token = localStorage.getItem('merchantToken');

  const response = await fetch('http://localhost:5001/api/merchant/products', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: productData.name,
      description: productData.description,
      price: productData.price,
      inventory: productData.inventory,
      category: productData.category,
      images: productData.images || []
    })
  });

  const data = await response.json();

  if (data.success) {
    console.log('Product created:', data.data.product);
    return data.data.product;
  } else {
    throw new Error(data.message);
  }
}
```

### 5. List Products with Pagination

```javascript
async function getProducts(page = 1, limit = 20, filters = {}) {
  const token = localStorage.getItem('merchantToken');

  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...filters
  });

  const response = await fetch(
    `http://localhost:5001/api/merchant/products?${queryParams}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );

  const data = await response.json();

  if (data.success) {
    return {
      products: data.data.products,
      pagination: data.pagination
    };
  } else {
    throw new Error(data.message);
  }
}
```

### 6. Update Product

```javascript
async function updateProduct(productId, updates) {
  const token = localStorage.getItem('merchantToken');

  const response = await fetch(
    `http://localhost:5001/api/merchant/products/${productId}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    }
  );

  const data = await response.json();

  if (data.success) {
    return data.data.product;
  } else {
    throw new Error(data.message);
  }
}
```

### 7. Get Orders

```javascript
async function getOrders(status = null, page = 1) {
  const token = localStorage.getItem('merchantToken');

  const queryParams = new URLSearchParams({ page: page.toString() });
  if (status) queryParams.append('status', status);

  const response = await fetch(
    `http://localhost:5001/api/merchant/orders?${queryParams}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );

  const data = await response.json();

  if (data.success) {
    return {
      orders: data.data.orders,
      pagination: data.pagination
    };
  } else {
    throw new Error(data.message);
  }
}
```

### 8. Update Order Status

```javascript
async function updateOrderStatus(orderId, newStatus) {
  const token = localStorage.getItem('merchantToken');

  const response = await fetch(
    `http://localhost:5001/api/merchant/orders/${orderId}/status`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: newStatus })
    }
  );

  const data = await response.json();

  if (data.success) {
    return data.data.order;
  } else {
    throw new Error(data.message);
  }
}
```

### 9. Get Analytics

```javascript
async function getAnalytics() {
  const token = localStorage.getItem('merchantToken');

  const response = await fetch(
    'http://localhost:5001/api/merchant/analytics/overview',
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );

  const data = await response.json();

  if (data.success) {
    return data.data;
  } else {
    throw new Error(data.message);
  }
}
```

### 10. Invite Team Member

```javascript
async function inviteTeamMember(email, name, role) {
  const token = localStorage.getItem('merchantToken');

  const response = await fetch(
    'http://localhost:5001/api/merchant/team/invite',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, name, role })
    }
  );

  const data = await response.json();

  if (data.success) {
    console.log('Invitation sent to:', email);
    return data.data;
  } else {
    throw new Error(data.message);
  }
}
```

## Using Axios

### Installation

```bash
npm install axios
```

### API Client Class

```javascript
import axios from 'axios';

class MerchantAPIClient {
  constructor(baseURL = 'http://localhost:5001') {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('merchantToken');

    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Add request interceptor to include token
    this.client.interceptors.request.use((config) => {
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response.data,
      (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          this.logout();
        }
        throw error.response?.data || error;
      }
    );
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem('merchantToken', token);
  }

  logout() {
    this.token = null;
    localStorage.removeItem('merchantToken');
  }

  // Authentication
  async register(data) {
    const response = await this.client.post('/api/merchant/auth/register', data);
    if (response.success) {
      this.setToken(response.data.token);
    }
    return response;
  }

  async login(email, password) {
    const response = await this.client.post('/api/merchant/auth/login', {
      email,
      password
    });
    if (response.success) {
      this.setToken(response.data.token);
    }
    return response;
  }

  async getMe() {
    return this.client.get('/api/merchant/auth/me');
  }

  // Products
  async getProducts(params = {}) {
    return this.client.get('/api/merchant/products', { params });
  }

  async getProduct(id) {
    return this.client.get(`/api/merchant/products/${id}`);
  }

  async createProduct(data) {
    return this.client.post('/api/merchant/products', data);
  }

  async updateProduct(id, data) {
    return this.client.put(`/api/merchant/products/${id}`, data);
  }

  async deleteProduct(id) {
    return this.client.delete(`/api/merchant/products/${id}`);
  }

  // Orders
  async getOrders(params = {}) {
    return this.client.get('/api/merchant/orders', { params });
  }

  async getOrder(id) {
    return this.client.get(`/api/merchant/orders/${id}`);
  }

  async updateOrderStatus(id, status) {
    return this.client.put(`/api/merchant/orders/${id}/status`, { status });
  }

  // Analytics
  async getAnalytics() {
    return this.client.get('/api/merchant/analytics/overview');
  }

  async getSalesData(period = 'daily') {
    return this.client.get(`/api/merchant/analytics/sales/${period}`);
  }

  // Team
  async inviteTeamMember(data) {
    return this.client.post('/api/merchant/team/invite', data);
  }

  async getTeamMembers() {
    return this.client.get('/api/merchant/team');
  }
}

// Usage
const api = new MerchantAPIClient();

// Register
await api.register({
  businessName: "Tech Store",
  ownerName: "John Smith",
  email: "john@techstore.com",
  password: "SecurePass123!",
  phone: "+1234567890",
  businessAddress: {
    street: "456 Tech Avenue",
    city: "San Francisco",
    state: "CA",
    zipCode: "94105",
    country: "USA"
  }
});

// Get products
const products = await api.getProducts({ page: 1, limit: 20 });

// Create product
const newProduct = await api.createProduct({
  name: "Laptop",
  price: 999.99,
  inventory: 50
});
```

## Error Handling

```javascript
async function safeAPICall(apiFunction) {
  try {
    const result = await apiFunction();
    return { success: true, data: result };
  } catch (error) {
    console.error('API Error:', error);

    if (error.response) {
      // Server responded with error
      return {
        success: false,
        message: error.response.data.message,
        status: error.response.status
      };
    } else if (error.request) {
      // No response received
      return {
        success: false,
        message: 'No response from server',
        status: 0
      };
    } else {
      // Request setup error
      return {
        success: false,
        message: error.message,
        status: 0
      };
    }
  }
}

// Usage
const result = await safeAPICall(() => api.createProduct(productData));
if (result.success) {
  console.log('Product created:', result.data);
} else {
  console.error('Failed to create product:', result.message);
}
```

## Complete Example: Product Management

```javascript
class ProductManager {
  constructor(apiClient) {
    this.api = apiClient;
  }

  async loadProducts() {
    try {
      const response = await this.api.getProducts({ page: 1, limit: 50 });
      this.displayProducts(response.data.products);
      this.setupPagination(response.pagination);
    } catch (error) {
      this.showError('Failed to load products');
    }
  }

  async createProduct(formData) {
    try {
      const productData = {
        name: formData.get('name'),
        description: formData.get('description'),
        price: parseFloat(formData.get('price')),
        inventory: parseInt(formData.get('inventory')),
        category: formData.get('category'),
        images: []
      };

      const response = await this.api.createProduct(productData);

      if (response.success) {
        this.showSuccess('Product created successfully');
        this.loadProducts();
      }
    } catch (error) {
      this.showError(error.message);
    }
  }

  async updateInventory(productId, newQuantity) {
    try {
      await this.api.updateProduct(productId, { inventory: newQuantity });
      this.showSuccess('Inventory updated');
      this.loadProducts();
    } catch (error) {
      this.showError('Failed to update inventory');
    }
  }

  async deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product?')) {
      return;
    }

    try {
      await this.api.deleteProduct(productId);
      this.showSuccess('Product deleted');
      this.loadProducts();
    } catch (error) {
      this.showError('Failed to delete product');
    }
  }

  displayProducts(products) {
    const container = document.getElementById('products-list');
    container.innerHTML = products.map(product => `
      <div class="product-card" data-id="${product.id}">
        <h3>${product.name}</h3>
        <p>${product.description}</p>
        <p>Price: $${product.price}</p>
        <p>Stock: ${product.inventory}</p>
        <button onclick="productManager.updateInventory('${product.id}', prompt('New quantity:'))">
          Update Stock
        </button>
        <button onclick="productManager.deleteProduct('${product.id}')">
          Delete
        </button>
      </div>
    `).join('');
  }

  showSuccess(message) {
    console.log('✅', message);
    // Show toast notification
  }

  showError(message) {
    console.error('❌', message);
    // Show error notification
  }
}

// Initialize
const api = new MerchantAPIClient();
const productManager = new ProductManager(api);

// Load products on page load
productManager.loadProducts();
```
