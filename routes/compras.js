const express = require('express');
const router  = express.Router();
const db      = require('../db/connection');

// GET /api/compras — lista todas com filtros opcionais
router.get('/', async (req, res) => {
  try {
    const { categoria, busca, ordem } = req.query;

    let sql    = 'SELECT * FROM compras WHERE 1=1';
    const params = [];

    if (categoria) {
      sql += ' AND categoria = ?';
      params.push(categoria);
    }
    if (busca) {
      sql += ' AND descricao LIKE ?';
      params.push(`%${busca}%`);
    }

    const ordens = { valor: 'subtotal DESC', data: 'data_compra DESC', nome: 'descricao ASC' };
    sql += ' ORDER BY ' + (ordens[ordem] || 'criado_em DESC');

    const [rows] = await db.query(sql, params);
    res.json({ ok: true, data: rows });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

// GET /api/compras/stats — estatísticas agregadas
router.get('/stats', async (req, res) => {
  try {
    const [[totais]] = await db.query(`
      SELECT
        COUNT(*)                        AS total_registros,
        COALESCE(SUM(subtotal), 0)      AS total_gasto,
        COALESCE(AVG(subtotal), 0)      AS ticket_medio,
        COALESCE(MAX(subtotal), 0)      AS maior_compra,
        COALESCE(MIN(subtotal), 0)      AS menor_compra,
        COALESCE(SUM(quantidade), 0)    AS total_itens
      FROM compras
    `);

    const [porCategoria] = await db.query(`
      SELECT categoria, SUM(subtotal) AS total
      FROM compras
      GROUP BY categoria
      ORDER BY total DESC
    `);

    // Mediana via subconsulta
    const [[{ mediana }]] = await db.query(`
      SELECT AVG(subtotal) AS mediana
      FROM (
        SELECT subtotal
        FROM compras
        ORDER BY subtotal
        LIMIT 2 - (SELECT COUNT(*) FROM compras) % 2
        OFFSET (SELECT (COUNT(*) - 1) / 2 FROM compras)
      ) sub
    `);

    res.json({
      ok: true,
      data: {
        ...totais,
        mediana: mediana || 0,
        por_categoria: porCategoria,
      }
    });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

// GET /api/compras/:id — busca por id
router.get('/:id', async (req, res) => {
  try {
    const [[row]] = await db.query('SELECT * FROM compras WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ ok: false, erro: 'Não encontrado' });
    res.json({ ok: true, data: row });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

// POST /api/compras — cria registro
router.post('/', async (req, res) => {
  try {
    const { descricao, categoria = 'Geral', valor, quantidade = 1, data_compra } = req.body;

    if (!descricao || valor == null || !data_compra) {
      return res.status(400).json({ ok: false, erro: 'descricao, valor e data_compra são obrigatórios' });
    }

    const [result] = await db.query(
      'INSERT INTO compras (descricao, categoria, valor, quantidade, data_compra) VALUES (?, ?, ?, ?, ?)',
      [descricao, categoria, valor, quantidade, data_compra]
    );

    const [[nova]] = await db.query('SELECT * FROM compras WHERE id = ?', [result.insertId]);
    res.status(201).json({ ok: true, data: nova });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

// PUT /api/compras/:id — atualiza registro
router.put('/:id', async (req, res) => {
  try {
    const { descricao, categoria, valor, quantidade, data_compra } = req.body;

    const [result] = await db.query(
      `UPDATE compras
       SET descricao = COALESCE(?, descricao),
           categoria = COALESCE(?, categoria),
           valor     = COALESCE(?, valor),
           quantidade = COALESCE(?, quantidade),
           data_compra = COALESCE(?, data_compra)
       WHERE id = ?`,
      [descricao, categoria, valor, quantidade, data_compra, req.params.id]
    );

    if (result.affectedRows === 0) return res.status(404).json({ ok: false, erro: 'Não encontrado' });

    const [[atualizado]] = await db.query('SELECT * FROM compras WHERE id = ?', [req.params.id]);
    res.json({ ok: true, data: atualizado });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

// DELETE /api/compras/:id — remove registro
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM compras WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ ok: false, erro: 'Não encontrado' });
    res.json({ ok: true, mensagem: 'Registro excluído' });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

module.exports = router;
