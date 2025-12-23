import { Hono } from 'hono';
import { PORT } from '../config/constants';
import { openApiSpec } from '../config/scalar';

const router = new Hono();

/**
 * @route GET /openapi.json
 * @summary OpenAPI specification
 * @description Get OpenAPI 3.1.0 specification in JSON format
 */
router.get('/openapi.json', (c) => {
  return c.json(openApiSpec);
});

/**
 * @route GET /docs
 * @summary API Documentation
 * @description Interactive API documentation powered by Scalar
 */
router.get('/docs', (c) => {
  const specUrl = `http://localhost:${PORT}/openapi.json`;
  // Using Scalar with data attributes approach
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nayarta Docker Dashboard API Documentation</title>
  <style>
    body {
      margin: 0;
      padding: 0;
    }
  </style>
</head>
<body>
  <script
    id="api-reference"
    type="application/json"
    data-configuration='{"theme": "purple", "layout": "modern"}'
    data-url="${specUrl}"
  ></script>
  <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference@latest/dist/browser/standalone.js"></script>
</body>
</html>`;
  return c.html(html);
});

export default router;

