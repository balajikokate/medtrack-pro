const { Resend } = require('resend');

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.RESEND_FROM_EMAIL || 'MedTrack Pro <onboarding@resend.dev>';
const PORTAL_URL = process.env.SUPPLIER_PORTAL_URL || 'http://localhost:5173/supplier/login';

async function sendMail({ to, subject, html }) {
  if (!resend) {
    console.warn(`[email] RESEND_API_KEY not set — skipping send. Would have sent "${subject}" to ${to}`);
    return { skipped: true };
  }
  if (!to) {
    console.warn(`[email] No recipient email on file — skipping send of "${subject}"`);
    return { skipped: true };
  }
  try {
    const result = await resend.emails.send({ from: FROM, to, subject, html });
    return result;
  } catch (err) {
    console.error('[email] send failed:', err.message);
    return { error: err.message };
  }
}

function poSummaryHtml(po) {
  const items = Array.isArray(po.items?.lines) ? po.items.lines : [];
  const itemsHtml = items.length
    ? `<ul>${items
        .map((line) => `<li>${escapeHtml(line.name)} &times; ${escapeHtml(line.quantity)}</li>`)
        .join('')}</ul>`
    : '<p>(no item lines provided)</p>';
  return `
    <p><strong>PO Number:</strong> ${escapeHtml(po.poNumber)}</p>
    <p><strong>Amount:</strong> ₹${Number(po.amount).toFixed(2)}</p>
    <p><strong>Needed by:</strong> ${new Date(po.neededByDate).toDateString()}</p>
    <p><strong>Items:</strong></p>
    ${itemsHtml}
  `;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

async function sendPOCreatedEmail(supplier, po) {
  return sendMail({
    to: supplier.contactEmail,
    subject: `New Purchase Order ${po.poNumber} — Action Required`,
    html: `
      <h2>New Purchase Order from MedTrack Pro</h2>
      <p>Hi ${escapeHtml(supplier.contactName || supplier.name)},</p>
      <p>A new purchase order has been created for you. Please log in to the supplier portal to approve or reject it.</p>
      ${poSummaryHtml(po)}
      <p><a href="${PORTAL_URL}">Log in to the Supplier Portal</a></p>
    `,
  });
}

async function sendPOReminderEmail(supplier, po, reminderNumber) {
  return sendMail({
    to: supplier.contactEmail,
    subject: `Reminder ${reminderNumber}: Purchase Order ${po.poNumber} awaiting your response`,
    html: `
      <h2>Reminder: Action needed on ${po.poNumber}</h2>
      <p>Hi ${escapeHtml(supplier.contactName || supplier.name)},</p>
      <p>This purchase order is still awaiting your approval. Please log in to the supplier portal to respond.</p>
      ${poSummaryHtml(po)}
      <p><a href="${PORTAL_URL}">Log in to the Supplier Portal</a></p>
    `,
  });
}

async function sendPOReassignedEmail(newSupplier, po) {
  return sendMail({
    to: newSupplier.contactEmail,
    subject: `New Purchase Order ${po.poNumber} — Reassigned to you`,
    html: `
      <h2>Purchase Order Reassigned to You</h2>
      <p>Hi ${escapeHtml(newSupplier.contactName || newSupplier.name)},</p>
      <p>A purchase order previously sent to another supplier has been reassigned to you.</p>
      ${poSummaryHtml(po)}
      <p><a href="${PORTAL_URL}">Log in to the Supplier Portal</a></p>
    `,
  });
}

async function sendPOResponseEmail(adminEmail, supplier, po, status) {
  const verb = status === 'Approved' ? 'approved' : 'rejected';
  const lines = Array.isArray(po.items?.lines) ? po.items.lines : [];

  let bodyHtml;
  if (status === 'Approved' && lines.length) {
    const rows = lines
      .map((l) => {
        const short = l.fulfilledQuantity !== undefined && l.fulfilledQuantity < l.quantity;
        return `<tr>
          <td style="padding:4px 12px 4px 0;">${escapeHtml(l.name)}</td>
          <td style="padding:4px 12px;text-align:right;">${escapeHtml(l.quantity)}</td>
          <td style="padding:4px 12px;text-align:right;${short ? 'color:#b91c1c;font-weight:bold;' : ''}">
            ${l.fulfilledQuantity ?? '—'}${short ? ' (short)' : ''}
          </td>
        </tr>`;
      })
      .join('');
    bodyHtml = `
      <p><strong>PO Number:</strong> ${escapeHtml(po.poNumber)}</p>
      <table style="border-collapse:collapse;">
        <tr>
          <th style="text-align:left;padding:4px 12px 4px 0;">Medicine</th>
          <th style="text-align:right;padding:4px 12px;">Ordered</th>
          <th style="text-align:right;padding:4px 12px;">Confirmed by Supplier</th>
        </tr>
        ${rows}
      </table>
      <p style="margin-top:12px;"><strong>This has NOT been added to your inventory yet.</strong>
      Go to Suppliers → this order and click <strong>Mark as Delivered</strong> once the stock actually arrives.</p>
    `;
  } else {
    bodyHtml = poSummaryHtml(po);
  }

  return sendMail({
    to: adminEmail,
    subject: `${supplier.name} ${verb} Purchase Order ${po.poNumber}`,
    html: `
      <h2>Purchase Order ${verb}</h2>
      <p><strong>${escapeHtml(supplier.name)}</strong> has ${verb} the following order:</p>
      ${bodyHtml}
    `,
  });
}

module.exports = {
  sendPOCreatedEmail,
  sendPOReminderEmail,
  sendPOReassignedEmail,
  sendPOResponseEmail,
};
