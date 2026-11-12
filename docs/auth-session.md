# Browser authentication

- `POST /auth/login` and `POST /auth/register`: return `{ accessToken }` and set `refreshToken` as an HttpOnly cookie (7 days, SameSite=Lax, Path=/auth, Secure in production). Refresh tokens are never returned in JSON.
- `POST /auth/refresh`: verify the cookie JWT and its stored SHA-256 hash, then return `{ accessToken }` using the current database role. Does not extend the original 7-day session.
- `POST /auth/logout`: revoke the matching stored refresh token and clear the cookie. Idempotent, including missing/expired cookies.
- Access tokens last 1 hour. Protected APIs continue accepting `Authorization: Bearer <accessToken>`.
- Browser requests include credentials. Configure `FRONTEND_URL` on the backend (default `http://localhost:3000`); credentialed CORS and auth Origin checks use this exact origin. Production requires HTTPS and frontend/API on the same site for SameSite=Lax cookies.
- The existing database model supports one refresh session per account; a new login replaces the old session. Logging out revokes refresh access; already issued access tokens expire normally.
