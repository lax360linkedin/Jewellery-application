import helmet from 'helmet';

export const securityHeaders = helmet({
  contentSecurityPolicy: false, // Allow API JSON responses without CSP header conflicts
  crossOriginEmbedderPolicy: false,
});

export default securityHeaders;
