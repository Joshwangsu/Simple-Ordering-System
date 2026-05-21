-- ============================================================
--  EasyOrder — Database Schema
-- ============================================================

DROP DATABASE IF EXISTS simple_ordering_db;
CREATE DATABASE simple_ordering_db;
USE simple_ordering_db;

-- ─── Customers / Users ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  first_name     VARCHAR(50)   NOT NULL,
  middle_name    VARCHAR(50),
  last_name      VARCHAR(50)   NOT NULL,
  email          VARCHAR(150)  NOT NULL UNIQUE,
  phone          VARCHAR(20),
  address        TEXT,
  password_hash  VARCHAR(255)  NOT NULL,
  role           ENUM('admin','buyer') DEFAULT 'buyer',
  is_first_login BOOLEAN       DEFAULT TRUE,
  created_at     TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

-- ─── Products ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(150)   NOT NULL,
  description TEXT,
  price       DECIMAL(10,2)  NOT NULL,
  stock       INT            NOT NULL DEFAULT 0,
  image_url   TEXT,
  is_on_sale  BOOLEAN        DEFAULT TRUE,
  created_at  TIMESTAMP      DEFAULT CURRENT_TIMESTAMP
);

-- ─── Orders ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  customer_id  INT           NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  status       ENUM('pending','processing','completed','cancelled') DEFAULT 'pending',
  created_at   TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- ─── Order Items ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  order_id   INT           NOT NULL,
  product_id INT           NOT NULL,
  quantity   INT           NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (order_id)   REFERENCES orders(id)   ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);
