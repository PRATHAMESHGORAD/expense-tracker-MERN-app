const { body, query, param, validationResult } = require("express-validator");

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400);
    throw new Error(errors.array().map((e) => e.msg).join(", "));
  }
  next();
};

const createTransactionValidation = [
  body("amount").isFloat({ gt: 0 }).withMessage("Amount must be a positive number"),
  body("type").isIn(["income", "expense"]).withMessage("Type must be income or expense"),
  body("category").trim().notEmpty().withMessage("Category is required"),
  body("account").isMongoId().withMessage("A valid account id is required"),
  body("note").optional().trim().isLength({ max: 500 }),
  body("date").optional().isISO8601().withMessage("Date must be a valid date"),
  body("attachmentUrl").optional({ values: "falsy" }).isURL().withMessage("Attachment must be a valid URL"),
  body("isRecurring").optional().isBoolean(),
  body("recurrence.frequency")
    .if(body("isRecurring").equals("true"))
    .isIn(["daily", "weekly", "monthly", "yearly"])
    .withMessage("A valid recurrence frequency is required for recurring transactions"),
  validate,
];

const updateTransactionValidation = [
  param("id").isMongoId().withMessage("Invalid transaction id"),
  body("amount").optional().isFloat({ gt: 0 }),
  body("type").optional().isIn(["income", "expense"]),
  body("category").optional().trim().notEmpty(),
  body("account").optional().isMongoId(),
  body("note").optional().trim().isLength({ max: 500 }),
  body("date").optional().isISO8601(),
  validate,
];

// Every incoming filter/search value is explicitly type-checked here. Nothing from
// req.query ever reaches a Mongoose query unless it has passed one of these checks -
// this is what prevents a NoSQL-injection payload like `category[$ne]=null`.
const listTransactionsValidation = [
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
  query("type").optional().isIn(["income", "expense"]),
  query("category").optional().isString().trim().isLength({ max: 100 }),
  query("account").optional().isMongoId(),
  query("dateFrom").optional().isISO8601(),
  query("dateTo").optional().isISO8601(),
  query("amountMin").optional().isFloat({ min: 0 }).toFloat(),
  query("amountMax").optional().isFloat({ min: 0 }).toFloat(),
  query("search").optional().isString().trim().isLength({ max: 200 }),
  validate,
];

module.exports = {
  createTransactionValidation,
  updateTransactionValidation,
  listTransactionsValidation,
};
