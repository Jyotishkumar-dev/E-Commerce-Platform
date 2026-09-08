# Shopvibe.store API Reference (V1)

**Base URL:** `http://localhost:5000/api/v1`

---

## 1. Product Catalog & Discovery

### List Products (Paginated with Server-Side Search & Filters)
* **GET** `/products`
* **Query Parameters:**
  * `search` (string, optional): Searches across title, description, brand, and SKU.
  * `category` (string, optional): Filter by category name or slug.
  * `minPrice` (int, optional): Minimum price in paise/cents.
  * `maxPrice` (int, optional): Maximum price in paise/cents.
  * `inStock` (boolean, optional): `true` to return only available inventory (`stock > 0`).
  * `sort` (`newest` | `price_asc` | `price_desc` | `title_asc`, default `newest`).
  * `page` (int, default `1`).
  * `limit` (int, default `20`, max `100`).
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
        "description": "Spatial audio headphones with active noise cancellation and 40-hour lossless playback.",
        "priceCents": 1299900,
        "compareAtPriceCents": 1599900,
        "currency": "INR",
        "category": "Audio",
        "brand": "AeroFit Studio",
        "sku": "AUD-AF-001",
        "imageUrl": "https://...",
        "stock": 28,
        "isActive": true
      }
    ],
    "categories": ["Audio", "Home", "Travel", "Workspace"],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 12,
      "totalPages": 1
    }
  }
}
```

### Get Single Product by ID or Slug
* **GET** `/products/:productId` (accepts CUID or slug string)
* **GET** `/products/slug/:slug`
* **Response (200 OK):** Returns single product with category reference, images, and seller name.

### Create Product
* **POST** `/products`
* **Auth:** Required (`ADMIN`, `SELLER`)

### Update Product
* **PATCH** `/products/:productId`
* **Auth:** Required (`ADMIN`, `SELLER`)

### Deactivate Product
* **DELETE** `/products/:productId`
* **Auth:** Required (`ADMIN`, `SELLER`)

---

## 2. Categories

### List Categories with Product Counts
* **GET** `/categories`
* **Response (200 OK):** Returns active categories with `_count: { products: N }`.

### Get Category by Slug
* **GET** `/categories/:slug`

---

## 3. Authentication Endpoints

### Register Customer
* **POST** `/auth/register`
* **Rate Limit:** 30 requests / 15 minutes

### Login
* **POST** `/auth/login`
* **Rate Limit:** 30 requests / 15 minutes

### Refresh Session
* **POST** `/auth/refresh-token`

### Logout
* **POST** `/auth/logout`

### Current User Profile
* **GET** `/auth/me`

### Update Profile
* **PATCH** `/auth/profile`

### Change Password
* **POST** `/auth/change-password`

### Request Password Reset
* **POST** `/auth/forgot-password`

### Reset Password with Token
* **POST** `/auth/reset-password`

---

## 4. Shopping Bag / Cart

### Get Cart
* **GET** `/cart`
* **Auth:** Required

### Add Item to Cart
* **POST** `/cart/items`
* **Auth:** Required

### Update Item Quantity
* **PATCH** `/cart/items/:productId`
* **Auth:** Required

### Remove Item from Cart
* **DELETE** `/cart/items/:productId`
* **Auth:** Required

---

## 5. Wishlist / Saved Items

### List Wishlist
* **GET** `/wishlist`
* **Auth:** Required

### Add to Wishlist
* **POST** `/wishlist/:productId`
* **Auth:** Required

### Remove from Wishlist
* **DELETE** `/wishlist/:productId`
* **Auth:** Required

---

## 6. Orders

### Place Order (Atomic ACID Transaction)
* **POST** `/orders`
* **Auth:** Required

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
