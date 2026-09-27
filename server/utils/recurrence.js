const Transaction = require("../models/Transaction");

const FREQUENCY_TO_MS = {
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
};

// Adds one period of `frequency` to `date`. Handled separately for monthly/yearly since
// those aren't fixed-length in milliseconds (months/years vary in day count).
function addPeriod(date, frequency) {
  const next = new Date(date);
  switch (frequency) {
    case "daily":
    case "weekly":
      return new Date(next.getTime() + FREQUENCY_TO_MS[frequency]);
    case "monthly":
      next.setMonth(next.getMonth() + 1);
      return next;
    case "yearly":
      next.setFullYear(next.getFullYear() + 1);
      return next;
    default:
      throw new Error(`Unknown recurrence frequency: ${frequency}`);
  }
}

// Finds every recurring "template" transaction for this user whose nextRunDate has
// arrived, and creates the next real transaction occurrence for each one, then rolls
// nextRunDate forward. Designed to be called cheaply on login/API access rather than
// requiring a separate always-on worker process.
async function processDueRecurringTransactions(userId) {
  const now = new Date();

  const dueTemplates = await Transaction.find({
    user: userId,
    isRecurring: true,
    "recurrence.nextRunDate": { $lte: now },
  });

  const created = [];

  for (const template of dueTemplates) {
    let cursor = template.recurrence.nextRunDate;

    // Catch up on any missed periods (e.g. user didn't log in for two months) rather
    // than only generating a single occurrence.
    while (cursor && cursor <= now) {
      const occurrence = await Transaction.create({
        user: template.user,
        amount: template.amount,
        type: template.type,
        category: template.category,
        account: template.account,
        note: template.note,
        date: cursor,
        isRecurring: false,
        recurrence: { parentTransaction: template._id },
      });
      created.push(occurrence);
      cursor = addPeriod(cursor, template.recurrence.frequency);
    }

    template.recurrence.nextRunDate = cursor;
    await template.save();
  }

  return created;
}

module.exports = { addPeriod, processDueRecurringTransactions };
