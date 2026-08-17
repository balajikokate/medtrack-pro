const prisma = require('../config/prisma');

async function getSettings(req, res, next) {
  try {
    let settings = await prisma.settings.findFirst();
    if (!settings) settings = await prisma.settings.create({ data: {} });
    res.json(settings);
  } catch (err) {
    next(err);
  }
}

async function updateSettings(req, res, next) {
  try {
    let settings = await prisma.settings.findFirst();
    if (!settings) {
      settings = await prisma.settings.create({ data: req.body });
    } else {
      settings = await prisma.settings.update({ where: { id: settings.id }, data: req.body });
    }
    res.json(settings);
  } catch (err) {
    next(err);
  }
}

module.exports = { getSettings, updateSettings };
