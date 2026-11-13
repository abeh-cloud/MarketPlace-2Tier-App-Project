// API requests use the same origin as the website.
// Nginx forwards /api and /health to the backend.

window.API_BASE_URL = "";

// Codespaces: use local image assets.
// AWS: replace this with your S3 or CloudFront base URL.

window.IMAGE_BASE_URL = "/assets/images";