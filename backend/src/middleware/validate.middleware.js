const { BadRequestError } = require("../errors/AppError");

/**
 * Returns an Express middleware that validates req.body (default) or
 * another request part against a Zod schema, replacing it with the
 * parsed/coerced value on success.
 *
 * Usage: router.post('/x', validate(schema), controller.create)
 */
function validate(schema, part = "body") {
  return (req, res, next) => {
    const result = schema.safeParse(req[part]);
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      }));
      return next(new BadRequestError("Validation failed", details));
    }
    req[part] = result.data;
    next();
  };
}

module.exports = validate;
