// index.js
require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const uuid = require('uuid');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());
app.use(cookieParser());

// CORS for local dev: allow frontend origin + cookies
app.use(cors({
  origin: 'http://localhost:4200', // change if needed
  credentials: true
}));

const ACCESS_SECRET = process.env.ACCESS_TOKEN_SECRET || 'access-secret';
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET || 'refresh-secret';
const ACCESS_EXPIRES = process.env.ACCESS_TOKEN_EXPIRES_IN || '10s';
const REFRESH_EXPIRES = process.env.REFRESH_TOKEN_EXPIRES_IN || '50s';

// In-memory user store (POC)
const USERS = {
  alice: { password: 'password123', id: 'user-alice' }
};

// In-memory refresh token store for rotation: map refreshTokenId -> { userId, expiresAt }
const refreshTokenStore = new Map();

// utility: sign tokens
function signAccessToken(userId) {
  // minimal payload; include jti if needed
  return jwt.sign({ sub: userId }, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES });
}

function signRefreshToken(userId, tokenId) {
  // include tokenId so server can identify it
  return jwt.sign({ sub: userId, tid: tokenId }, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES });
}

function setRefreshCookie(res, refreshToken) {
  // cookie options: HttpOnly, Secure (requires https), SameSite
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: false, // true in production (requires HTTPS)
    sameSite: 'lax',
    path: '/refresh', // restrict to refresh path optionally
    maxAge: 7 * 24 * 3600 * 1000 // 7 days
  });
}

// LOGIN
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = USERS[username];
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'invalid_credentials' });
  }
  const userId = user.id;
  const accessToken = signAccessToken(userId);

  // create refresh token id and store server-side
  const tokenId = uuid.v4();
  const refreshToken = signRefreshToken(userId, tokenId);
  // store token metadata
  const expiresAt = Date.now() + (7 * 24 * 3600 * 1000);
  refreshTokenStore.set(tokenId, { userId, expiresAt });

  setRefreshCookie(res, refreshToken);

  return res.json({ accessToken, accessExp: expiresAt });
});

// REFRESH
app.post('/refresh', (req, res) => {
  const incoming = req.cookies.refreshToken;
  if (!incoming) return res.status(401).json({ error: 'no_refresh_token' });

  try {
    const payload = jwt.verify(incoming, REFRESH_SECRET);
    const tokenId = payload.tid;
    const userId = payload.sub;

    const stored = refreshTokenStore.get(tokenId);
    if (!stored || stored.userId !== userId) {
      // token reuse or not found -> revoke all and force logout
      console.warn('Refresh token reuse or invalid: ', tokenId);
      // In real system: revoke all tokens for user and require re-login
      // For this POC, just clear all tokens for the user:
      for (const [tid, meta] of refreshTokenStore.entries()) {
        if (meta.userId === userId) refreshTokenStore.delete(tid);
      }
      return res.status(401).json({ error: 'invalid_refresh_token' });
    }

    // rotate: remove old token and issue a new one
    refreshTokenStore.delete(tokenId);
    const newTokenId = uuid.v4();
    const newRefreshToken = signRefreshToken(userId, newTokenId);
    const expiresAt = Date.now() + (7 * 24 * 3600 * 1000);
    refreshTokenStore.set(newTokenId, { userId, expiresAt });

    // issue new access token
    const newAccessToken = signAccessToken(userId);

    setRefreshCookie(res, newRefreshToken);
    return res.json({ accessToken: newAccessToken, accessExp:  expiresAt});
  } catch (err) {
    console.warn('refresh verify failed', err);
    return res.status(401).json({ error: 'invalid_refresh_signature' });
  }
});

// Protected resource
app.get('/protected', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'missing_auth' });
  const token = auth.split(' ')[1];
  try {
    const payload = jwt.verify(token, ACCESS_SECRET);
    return res.json({ data: 'protected data for ' + payload.sub });
  } catch (err) {
    return res.status(401).json({ error: 'invalid_access_token' });
  }
});

// Logout — remove refresh token by clearing cookie and server-side token if present
app.post('/logout', (req, res) => {
  const incoming = req.cookies.refreshToken;
  if (incoming) {
    try {
      const payload = jwt.verify(incoming, REFRESH_SECRET);
      const tid = payload.tid;
      refreshTokenStore.delete(tid);
    } catch (e) {
      // ignore
    }
  }
  // clear cookie
  res.clearCookie('refreshToken', { path: '/refresh' });
  res.json({ ok: true });
});

// Debug endpoint to show refresh token store (NOT for production)
app.get('/debug/refresh-store', (req, res) => {
  const out = Array.from(refreshTokenStore.entries()).map(([k, v]) => ({ id: k, ...v }));
  res.json(out);
});

app.listen(4000, () => console.log('Auth PoC server listening on :4000'));
