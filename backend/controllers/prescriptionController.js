const prisma = require('../config/prisma');

async function getPrescriptions(req, res, next) {
  try {
    const { search, status } = req.query;
    const where = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { rxId: { contains: search, mode: 'insensitive' } },
        { patientName: { contains: search, mode: 'insensitive' } },
        { doctorName: { contains: search, mode: 'insensitive' } },
      ];
    }
    const prescriptions = await prisma.prescription.findMany({ where, orderBy: { dateIssued: 'desc' } });
    const counts = {
      all: await prisma.prescription.count(),
      pending: await prisma.prescription.count({ where: { status: 'Pending' } }),
      verified: await prisma.prescription.count({ where: { status: 'Verified' } }),
      expired: await prisma.prescription.count({ where: { status: 'Expired' } }),
    };
    res.json({ data: prescriptions, counts });
  } catch (err) {
    next(err);
  }
}

async function createPrescription(req, res, next) {
  try {
    const rxId = `RX-${Math.floor(1000 + Math.random() * 9000)}-${String.fromCharCode(
      65 + Math.floor(Math.random() * 26)
    )}`;
    const { dateIssued, ...rest } = req.body;
    const prescription = await prisma.prescription.create({
      data: { ...rest, rxId, dateIssued: new Date(dateIssued) },
    });
    res.status(201).json(prescription);
  } catch (err) {
    next(err);
  }
}

async function verifyPrescription(req, res, next) {
  try {
    const prescription = await prisma.prescription.update({
      where: { id: req.params.id },
      data: { status: 'Verified' },
    });
    res.json(prescription);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Prescription not found' });
    next(err);
  }
}

async function updatePrescription(req, res, next) {
  try {
    const { dateIssued, ...rest } = req.body;
    const data = { ...rest };
    if (dateIssued) data.dateIssued = new Date(dateIssued);
    const prescription = await prisma.prescription.update({ where: { id: req.params.id }, data });
    res.json(prescription);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Prescription not found' });
    next(err);
  }
}

module.exports = { getPrescriptions, createPrescription, verifyPrescription, updatePrescription };
