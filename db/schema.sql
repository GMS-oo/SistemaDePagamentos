CREATE DATABASE IF NOT EXISTS compras_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE compras_db;

CREATE TABLE IF NOT EXISTS compras (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  descricao   VARCHAR(255)   NOT NULL,
  categoria   VARCHAR(100)   NOT NULL DEFAULT 'Geral',
  valor       DECIMAL(10,2)  NOT NULL,
  quantidade  INT            NOT NULL DEFAULT 1,
  subtotal    DECIMAL(10,2)  GENERATED ALWAYS AS (valor * quantidade) STORED,
  data_compra DATE           NOT NULL,
  criado_em   DATETIME       DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
