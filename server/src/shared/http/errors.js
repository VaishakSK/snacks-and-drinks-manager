export function notFound(_req, res) {
  res.status(404).json({ error: "Not Found" });
}

export function errorHandler(err, _req, res, _next) {
  let status = err?.statusCode || err?.status || 500;
  let message = err?.message || "Internal Server Error";

  if (err?.name === "ZodError") {
    status = 400;
    const first = err?.errors?.[0]?.message;
    message = first || "Invalid input";
  }

  if (err?.code === 11000) {
    status = 409;
    const keys = err?.keyValue ? Object.keys(err.keyValue) : [];
    if (keys.length) {
      message = `Duplicate value for ${keys.join(", ")}`;
    } else {
      message = "Duplicate value";
    }
  }

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV !== "production" ? { stack: err?.stack } : {})
  });
}

