const express = require('express');
const db = require('../db');
const { authMiddleware, adminOnly, managerOrAdmin } = require('../middleware/auth');
const { createNotification } = require('./notifications');

const router = express.Router();
router.use(authMiddleware);

// Generate next ticket ID
function nextTicketId() {
  const last = db.prepare("SELECT ticketId FROM tickets ORDER BY id DESC LIMIT 1").get();
  if (!last) return 'TKT-001';
  const num = parseInt(last.ticketId.split('-')[1]) + 1;
  return `TKT-${String(num).padStart(3, '0')}`;
}

// Get all tickets (admin/manager see all, employees see their own)
router.get('/', (req, res) => {
  try {
    let tickets;
    if (req.user.role === 'admin') {
      tickets = db.prepare(`
        SELECT t.*,
          c.name as createdByName, c.department as createdByDept,
          a.name as assignedToName
        FROM tickets t
        LEFT JOIN employees c ON t.createdBy = c.id
        LEFT JOIN employees a ON t.assignedTo = a.id
        ORDER BY t.createdAt DESC
      `).all();
    } else if (req.user.role === 'manager') {
      tickets = db.prepare(`
        SELECT t.*,
          c.name as createdByName, c.department as createdByDept,
          a.name as assignedToName
        FROM tickets t
        LEFT JOIN employees c ON t.createdBy = c.id
        LEFT JOIN employees a ON t.assignedTo = a.id
        WHERE t.createdBy = ? OR t.assignedTo = ? OR c.managerId = ?
        ORDER BY t.createdAt DESC
      `).all(req.user.id, req.user.id, req.user.id);
    } else {
      tickets = db.prepare(`
        SELECT t.*,
          c.name as createdByName, c.department as createdByDept,
          a.name as assignedToName
        FROM tickets t
        LEFT JOIN employees c ON t.createdBy = c.id
        LEFT JOIN employees a ON t.assignedTo = a.id
        WHERE t.createdBy = ? OR t.assignedTo = ?
        ORDER BY t.createdAt DESC
      `).all(req.user.id, req.user.id);
    }
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get ticket stats
router.get('/stats', (req, res) => {
  try {
    const isEmp = req.user.role === 'employee';
    const filter = isEmp ? 'AND createdBy = ?' : '';
    const params = isEmp ? [req.user.id] : [];
    const stats = {
      open: db.prepare(`SELECT COUNT(*) as c FROM tickets WHERE status IN ('open','reopened') ${filter}`).get(...params).c,
      inProgress: db.prepare(`SELECT COUNT(*) as c FROM tickets WHERE status = 'in_progress' ${filter}`).get(...params).c,
      resolved: db.prepare(`SELECT COUNT(*) as c FROM tickets WHERE status = 'resolved' ${filter}`).get(...params).c,
      closed: db.prepare(`SELECT COUNT(*) as c FROM tickets WHERE status = 'closed' ${filter}`).get(...params).c,
    };
    stats.total = stats.open + stats.inProgress + stats.resolved + stats.closed;
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get open ticket count (for badges) - MUST be before /:id
router.get('/count/open', (req, res) => {
  try {
    let count;
    if (req.user.role === 'admin') {
      count = db.prepare("SELECT COUNT(*) as c FROM tickets WHERE status IN ('open','reopened')").get().c;
    } else if (req.user.role === 'manager') {
      count = db.prepare(`
        SELECT COUNT(*) as c FROM tickets t
        LEFT JOIN employees e ON t.createdBy = e.id
        WHERE t.status IN ('open','reopened')
        AND (t.createdBy = ? OR t.assignedTo = ? OR e.managerId = ?)
      `).get(req.user.id, req.user.id, req.user.id).c;
    } else {
      count = db.prepare("SELECT COUNT(*) as c FROM tickets WHERE createdBy = ? AND status IN ('open','in_progress','reopened')").get(req.user.id).c;
    }
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single ticket with comments
router.get('/:id', (req, res) => {
  try {
    const ticket = db.prepare(`
      SELECT t.*,
        c.name as createdByName, c.department as createdByDept, c.avatar as createdByAvatar,
        a.name as assignedToName, a.department as assignedToDept
      FROM tickets t
      LEFT JOIN employees c ON t.createdBy = c.id
      LEFT JOIN employees a ON t.assignedTo = a.id
      WHERE t.id = ?
    `).get(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const comments = db.prepare(`
      SELECT tc.*, e.name as userName, e.avatar as userAvatar, e.role as userRole
      FROM ticket_comments tc
      LEFT JOIN employees e ON tc.userId = e.id
      WHERE tc.ticketId = ?
      ORDER BY tc.createdAt ASC
    `).all(req.params.id);

    res.json({ ...ticket, comments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create ticket
router.post('/', (req, res) => {
  try {
    const { title, description, category, priority } = req.body;
    if (!title || !description) return res.status(400).json({ error: 'Title and description are required' });
    if (title.length > 200) return res.status(400).json({ error: 'Title too long (max 200 characters)' });
    if (description.length > 5000) return res.status(400).json({ error: 'Description too long (max 5000 characters)' });

    const ticketId = nextTicketId();
    const result = db.prepare(`
      INSERT INTO tickets (ticketId, title, description, category, priority, createdBy)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(ticketId, title, description, category || 'general', priority || 'normal', req.user.id);

    // Notify admins
    const admins = db.prepare("SELECT id FROM employees WHERE role = 'admin'").all();
    admins.forEach(admin => {
      createNotification(admin.id, 'New Support Ticket', `${req.user.name} raised ticket: ${title}`, 'ticket', '/tickets');
    });

    db.prepare('INSERT INTO activity_log (userId, action, target, details) VALUES (?,?,?,?)').run(
      req.user.id, 'Created ticket', ticketId, title
    );

    res.status(201).json({ id: result.lastInsertRowid, ticketId, message: 'Ticket created successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Assign ticket (admin/manager only)
router.put('/assign/:id', managerOrAdmin, (req, res) => {
  try {
    const { assignedTo } = req.body;
    const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    db.prepare("UPDATE tickets SET assignedTo = ?, status = 'in_progress', updatedAt = datetime('now') WHERE id = ?").run(assignedTo, req.params.id);

    if (assignedTo) {
      const assignee = db.prepare('SELECT name FROM employees WHERE id = ?').get(assignedTo);
      createNotification(assignedTo, 'Ticket Assigned to You', `Ticket ${ticket.ticketId}: ${ticket.title}`, 'ticket', '/tickets');
      createNotification(ticket.createdBy, 'Ticket Update', `Your ticket ${ticket.ticketId} has been assigned to ${assignee?.name}`, 'ticket', '/tickets');
    }

    res.json({ message: 'Ticket assigned successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update ticket status
router.put('/status/:id', (req, res) => {
  try {
    const { status } = req.body;
    const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const validStatuses = ['open', 'in_progress', 'resolved', 'closed', 'reopened'];
    if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });

    // Only creator, assignee, or admin/manager can update
    const canUpdate = req.user.role === 'admin' || req.user.role === 'manager' || ticket.createdBy === req.user.id || ticket.assignedTo === req.user.id;
    if (!canUpdate) return res.status(403).json({ error: 'Not authorized' });

    const updates = { status };
    if (status === 'resolved') {
      updates.resolvedBy = req.user.id;
      updates.resolvedAt = new Date().toISOString();
    }
    if (status === 'closed') {
      updates.closedAt = new Date().toISOString();
    }

    db.prepare(`UPDATE tickets SET status = ?, resolvedBy = COALESCE(?, resolvedBy), resolvedAt = COALESCE(?, resolvedAt), closedAt = COALESCE(?, closedAt), updatedAt = datetime('now') WHERE id = ?`).run(
      updates.status, updates.resolvedBy || null, updates.resolvedAt || null, updates.closedAt || null, req.params.id
    );

    // Notify relevant people
    if (status === 'resolved' && ticket.createdBy !== req.user.id) {
      createNotification(ticket.createdBy, 'Ticket Resolved', `Your ticket ${ticket.ticketId} has been resolved`, 'success', '/tickets');
    }
    if (status === 'reopened' && ticket.assignedTo) {
      createNotification(ticket.assignedTo, 'Ticket Reopened', `Ticket ${ticket.ticketId} has been reopened`, 'warning', '/tickets');
    }

    res.json({ message: `Ticket ${status}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add comment to ticket
router.post('/comment/:id', (req, res) => {
  try {
    const { comment, isInternal } = req.body;
    if (!comment) return res.status(400).json({ error: 'Comment is required' });

    const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    // Only creator, assignee, or admin/manager can comment
    const canComment = req.user.role === 'admin' || req.user.role === 'manager' || ticket.createdBy === req.user.id || ticket.assignedTo === req.user.id;
    if (!canComment) return res.status(403).json({ error: 'Not authorized to comment on this ticket' });

    db.prepare('INSERT INTO ticket_comments (ticketId, userId, comment, isInternal) VALUES (?,?,?,?)').run(
      req.params.id, req.user.id, comment, isInternal ? 1 : 0
    );

    db.prepare("UPDATE tickets SET updatedAt = datetime('now') WHERE id = ?").run(req.params.id);

    // Notify ticket creator and assignee (except commenter)
    const notifyUsers = new Set();
    if (ticket.createdBy !== req.user.id) notifyUsers.add(ticket.createdBy);
    if (ticket.assignedTo && ticket.assignedTo !== req.user.id) notifyUsers.add(ticket.assignedTo);

    notifyUsers.forEach(userId => {
      createNotification(userId, 'New Comment on Ticket', `${req.user.name} commented on ${ticket.ticketId}`, 'ticket', '/tickets');
    });

    res.status(201).json({ message: 'Comment added' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
