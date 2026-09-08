# Shopvibe.store API Reference (V1)

**Base URL:** `http://localhost:5000/api/v1`

---

## 1. Authentication Endpoints

### Register Customer
* **POST** `/auth/register`
* **Rate Limit:** 30 requests / 15 minutes
* **Request Body:**
```json
{
  "email": "user@example.com",
  "password": "Password123!",
  "name": "Priya Sharma",
  "phone": "+919876543210"
}
```
* **Response (201 Created):**
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Account created successfully",
  "data": {
    "user": {
      "id": "cuid...",
      "email": "user@example.com",
      "name": "Priya Sharma",
      "role": "CUSTOMER"
    },
    "accessToken": "eyJhbGci..."
  }
}
```
* **Cookie Set:** `shopvibe_refresh` (HTTP-only, Secure in prod, 7-day expiration).

### Login
* **POST** `/auth/login`
* **Rate Limit:** 30 requests / 15 minutes
* **Request Body:**
```json
{
  "email": "user@example.com",
  "password": "Password123!"
}
```
* **Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Signed in successfully",
  "data": {
    "user": {
      "id": "cuid...",
      "email": "user@example.com",
      "name": "Priya Sharma",
      "role": "CUSTOMER"
    },
    "accessToken": "eyJhbGci..."
  }
}
```

### Refresh Session
* **POST** `/auth/refresh-token`
* **Headers:** `Cookie: shopvibe_refresh=<token>`
* **Response (200 OK):** Returns rotated token and fresh access token.

### Logout
* **POST** `/auth/logout`
* **Response (200 OK):** Clears `shopvibe_refresh` cookie.

### Current User Profile
* **GET** `/auth/me`
* **Headers:** `Authorization: Bearer <accessToken>`
* **Response (200 OK):** Current authenticated user profile.

---

## 2. Product Endpoints

### List Products
* **GET** `/products`
* **Query Parameters:**
  * `search` (optional string)
  * `category` (optional string)
  * `minPrice` (optional int in paise/cents)
  * `maxPrice` (optional int in paise/cents)
  * `sort` (`newest`, `price_asc`, `price_desc`, `title_asc`)
  * `page` (int, default 1)
  * `limit` (int, default 20, max 100)
* **Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Products fetched successfully",
  "data": {
    "products": [
      {
        "id": "seed-aerofit-headphones",
        "title": "AeroFit Precision Wireless Headphones",
        "slug": "aerofit-precision-wireless-headphones",
        "description": "...",
        "priceCents": 1299900,
        "compareAtPriceCents": 1599900,
        "currency": "INR",
        "category": "Audio",
        "brand": "AeroFit Studio",
        "sku": "AUD-AF-001",
        "stock": 28
      }
    ],
    "categories": ["Audio", "Home", "Travel", "Workspace"],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 4,
      "totalPages": 1
    }
  }
}
```

### Get Single Product
* **GET** `/products/:productId` (accepts CUID or slug)

### Create Product (Admin/Seller)
* **POST** `/products`
* **Auth:** Required (`ADMIN`, `SELLER`)

---

## 3. Categories

### List Categories
* **GET** `/categories`

### Get Category
* **GET** `/categories/:slug`

---

## 4. Shopping Bag / Cart

### Get Cart
* **GET** `/cart`
* **Auth:** Required

### Add Item to Cart
* **POST** `/cart/items`
* **Auth:** Required
* **Request Body:**
```json
{
  "productId": "seed-aerofit-headphones",
  "quantity": 1
}
```

### Update Item Quantity
* **PATCH** `/cart/items/:productId`
* **Auth:** Required
* **Request Body:**
```json
{
  "quantity": 2
}
```

### Remove Item from Cart
* **DELETE** `/cart/items/:productId`
* **Auth:** Required

---

## 5. Addresses

### List Customer Addresses
* **GET** `/addresses`
* **Auth:** Required

### Add Address
* **POST** `/addresses`
* **Auth:** Required
* **Request Body:**
```json
{
  "fullName": "Priya Sharma",
  "phone": "+919876543210",
  "addressLine1": "402, Lotus Residency",
  "addressLine2": "Linking Road, Bandra West",
  "city": "Mumbai",
  "state": "Maharashtra",
  "postalCode": "400050",
  "country": "India",
  "isDefault": true
}
```

---

## 6. Orders

### Place Order (Atomic Transaction)
* **POST** `/orders`
* **Auth:** Required
* **Request Body:**
```json
{
  "shippingAddressId": "cuid...",
  "couponCode": "WELCOME10"
}
```
* **Response (201 Created):**
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Order placed successfully",
  "data": {
    "order": {
      "id": "ord_...",
      "status": "CONFIRMED",
      "subtotalCents": 1299900,
      "discountCents": 129990,
      "totalCents": 1169910,
      "items": [...]
    }
  }
}
```

### Customer Order History
* **GET** `/orders`
* **Auth:** Required

### Get Order Details
* **GET** `/orders/:orderId`
* **Auth:** Required (Owner or Admin)

---

## 7. Admin

### Overview Metrics
* **GET** `/admin/overview`
* **Auth:** Required (`ADMIN`)

### All Orders
* **GET** `/admin/orders`
* **Auth:** Required (`ADMIN`)

### Update Order Status
* **PATCH** `/admin/orders/:orderId/status`
* **Auth:** Required (`ADMIN`)
* **Request Body:**
```json
{
  "status": "SHIPPED"
}
```
