// fichaje-api/routes/tickets.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const verificar = require('../middleware/auth');
const { sendMail } = require('../services/mailer');

// ---------- GET /tickets (listado) ----------
router.get('/', verificar, async (req, res) => {
  try {
    const { nif } = req.usuario;
    const [rows] = await db.query(
      `SELECT t.id, t.asunto, t.estado, t.prioridad, t.created_at,
              c.empresa_nombre AS nombre_cliente
         FROM tickets t
         LEFT JOIN clientes c ON c.id = t.cliente_id
        WHERE t.nif = ?
        ORDER BY t.created_at DESC`,
      [nif]
    );
    res.json(rows.map(r => ({
      id: r.id,
      asunto: r.asunto,
      estado: r.estado,
      prioridad: r.prioridad,
      created_at: r.created_at,
      nombre_cliente: r.nombre_cliente,
    })));
  } catch (e) {
    console.error('GET /tickets', e);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ---------- POST /tickets (crear) ----------
router.post('/', verificar, async (req, res) => {
  try {
    const { id: user_id, nif } = req.usuario;
    const { cliente_id, contacto_id = null, asunto, descripcion = '', prioridad = 'baja' } = req.body || {};

    if (!cliente_id) return res.status(400).json({ error: 'cliente_id requerido' });
    if (!asunto || !String(asunto).trim()) return res.status(400).json({ error: 'asunto requerido' });

    const [[uuidRow]] = await db.query(`SELECT UUID() AS id`);
    const tid = uuidRow.id;

    await db.query(
      `INSERT INTO tickets (id, cliente_id, contacto_id, asunto, descripcion, estado, prioridad, user_id, via, created_at, nif)
       VALUES (?, ?, ?, ?, ?, 'abierto', ?, ?, 'web', NOW(), ?)`,
      [tid, cliente_id, contacto_id, asunto.trim(), descripcion.trim(), prioridad, user_id, nif]
    );

    res.status(201).json({ ok: true, id: tid });
  } catch (e) {
    console.error('POST /tickets', e);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ---------- GET /tickets/:id (detalle) ----------
router.get('/:id', verificar, async (req, res) => {
  try {
    const { id } = req.params;
    const { nif } = req.usuario;

    const [tkRows] = await db.query(
      `SELECT t.*,
              c.id AS cliente_id, c.empresa_nombre AS cliente_nombre, c.email AS cliente_email, c.telefono AS cliente_telefono,
              ct.id AS contacto_id, ct.nombre AS contacto_nombre, ct.email AS contacto_email, ct.telefono AS contacto_telefono
         FROM tickets t
         LEFT JOIN clientes c ON c.id = t.cliente_id
         LEFT JOIN clientes_contactos ct ON ct.id = t.contacto_id
        WHERE t.id = ? AND t.nif = ?`,
      [id, nif]
    );
    if (!tkRows.length) return res.status(404).json({ error: 'Ticket no encontrado' });

    const t = tkRows[0];
    const ticket = {
      id: t.id,
      asunto: t.asunto,
      estado: t.estado,
      prioridad: t.prioridad,
      descripcion: t.descripcion,
      created_at: t.created_at,
      updated_at: t.updated_at
    };
    const cliente = {
      id: t.cliente_id,
      nombre: t.cliente_nombre,
      email: t.cliente_email,
      telefono: t.cliente_telefono
    };
    const contacto = {
      id: t.contacto_id,
      nombre: t.contacto_nombre,
      email: t.contacto_email,
      telefono: t.contacto_telefono
    };

    // Lista de contactos del cliente (para el selector)
    let contactos = [];
    if (cliente.id) {
      const [cts] = await db.query(
        `SELECT id, nombre, email, telefono, es_principal
           FROM clientes_contactos
          WHERE cliente_id = ?
          ORDER BY es_principal DESC, nombre ASC`,
        [cliente.id]
      );
      contactos = cts;
    }

    const [msgs] = await db.query(
      `SELECT m.id, m.user_id, m.cuerpo, m.via, m.created_at,
              u.username AS user_name
         FROM ticket_mensajes m
         LEFT JOIN usuarios u ON u.id = m.user_id
        WHERE m.ticket_id = ?
        ORDER BY m.created_at DESC`,
      [id]
    );

    res.json({ ticket, cliente, contacto, contactos, mensajes: msgs });
  } catch (e) {
    console.error('GET /tickets/:id', e);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ---------- PUT /tickets/:id (actualizar) ----------
async function actualizarTicket(req, res) {
  try {
    const { id } = req.params;
    const { nif } = req.usuario;
    const { estado, prioridad, asunto, descripcion } = req.body || {};

    const allowedEstado = ['abierto', 'en_progreso', 'resuelto', 'cerrado'];
    const allowedPrioridad = ['baja', 'media', 'alta', 'critica'];

    const fields = [];
    const params = [];

    if (typeof estado === 'string') {
      const e = estado.trim().toLowerCase();
      if (!allowedEstado.includes(e)) return res.status(400).json({ error: 'estado inválido' });
      fields.push('estado = ?'); params.push(e);
    }
    if (typeof prioridad === 'string') {
      const p = prioridad.trim().toLowerCase();
      if (!allowedPrioridad.includes(p)) return res.status(400).json({ error: 'prioridad inválida' });
      fields.push('prioridad = ?'); params.push(p);
    }
    if (typeof asunto === 'string') {
      const a = asunto.trim();
      if (!a) return res.status(400).json({ error: 'asunto no puede estar vacío' });
      fields.push('asunto = ?'); params.push(a);
    }
    if (typeof descripcion === 'string') {
      fields.push('descripcion = ?'); params.push(descripcion.trim());
    }

    if (!fields.length) return res.status(400).json({ error: 'Nada que actualizar' });

    const [tk] = await db.query(`SELECT id FROM tickets WHERE id=? AND nif=?`, [id, nif]);
    if (!tk.length) return res.status(404).json({ error: 'Ticket no encontrado' });

    const sql = `UPDATE tickets SET ${fields.join(', ')} WHERE id = ?`;
    params.push(id);
    await db.query(sql, params);

    res.json({ ok: true });
  } catch (e) {
    console.error('PUT /tickets/:id', e);
    res.status(500).json({ error: 'Error al actualizar ticket' });
  }
}
router.put('/:id', verificar, actualizarTicket);
router.post('/:id/update', verificar, actualizarTicket);

// ---------- POST /tickets/:id/reply (email + guardar hilo) ----------
router.post('/:id/reply', verificar, async (req, res) => {
  try {
    const { id } = req.params;
    const { to = [], subject = '', body = '' } = req.body || {};
    const { id: user_id, nif } = req.usuario;

    if (!subject.trim()) return res.status(400).json({ error: 'Asunto requerido' });
    if (!String(body).trim()) return res.status(400).json({ error: 'Cuerpo requerido' });

    const [tk] = await db.query(`SELECT id FROM tickets WHERE id=? AND nif=?`, [id, nif]);
    if (!tk.length) return res.status(404).json({ error: 'Ticket no encontrado' });

    // Envío (no tumba si no hay SMTP)
    let info = {};
    try {
      info = await sendMail({
        to: Array.isArray(to) ? to.join(',') : String(to || ''),
        subject,
        text: body,
        html: `<pre style="font-family:inherit; white-space:pre-wrap;">${String(body)
          .replace(/[<>&]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]))}</pre>`
      });
    } catch (err) {
      console.error('[tickets:reply] sendMail:', err?.message || err);
    }

    // Guardar mensaje en ticket_mensajes (cuerpo + via)
    const [[mid]] = await db.query(`SELECT UUID() AS id`);
    await db.query(
      `INSERT INTO ticket_mensajes (id, ticket_id, user_id, cuerpo, via, created_at)
       VALUES (?, ?, ?, ?, 'email', NOW())`,
      [mid.id, id, user_id, `Asunto: ${subject}\n\n${body}`]
    );

    res.json({ ok: true, messageId: info?.messageId || null, fallback: !!info?.fallback });
  } catch (e) {
    console.error('POST /tickets/:id/reply', e);
    res.status(500).json({ error: 'Error al enviar el email' });
  }
});

module.exports = router;
