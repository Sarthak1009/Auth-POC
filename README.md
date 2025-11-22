# Authentication POC (Proof of Concept)

A full-stack authentication system demonstrating secure JWT-based authentication with refresh token rotation, HTTP-only cookies, and Angular frontend.

## 🏗️ Project Structure

```
Auth-POC/
├── auth-poc-client/     # Angular 20 frontend application
└── auth-poc-server/     # Node.js/Express backend API
```

## 🔑 Features

### Backend (Node.js + Express)
- **JWT-based Authentication** with access and refresh tokens
- **Refresh Token Rotation** for enhanced security
- **HTTP-only Cookies** to store refresh tokens (XSS protection)
- **CORS Configuration** for secure cross-origin requests
- Protected API endpoints
- In-memory user and token storage (POC purposes)

### Frontend (Angular 20)
- **HTTP Interceptor** for automatic token attachment
- **Auth Store** for state management
- **Auth Service** for login, logout, and token refresh
- Automatic token refresh handling
- Protected route guards

## 🔒 Security Features

- **Access Tokens**: Short-lived (10 seconds) JWT tokens sent in Authorization headers
- **Refresh Tokens**: Long-lived (50 seconds) JWT tokens stored in HTTP-only cookies
- **Token Rotation**: Refresh tokens are rotated on each refresh to prevent reuse attacks
- **CORS Protection**: Configured to allow credentials from trusted origins
- **Token Reuse Detection**: Automatically revokes all tokens if refresh token reuse is detected

## 📋 Prerequisites

- **Node.js** (v16 or higher)
- **npm** or **yarn**
- **Angular CLI** (v20 or higher)

## 🚀 Getting Started

### 1. Clone the Repository

```bash
cd c:\Users\sarth\OneDrive\Desktop\Auth-POC
```

### 2. Setup Backend Server

```bash
cd auth-poc-server
npm install
```

#### Configure Environment Variables (Optional)

Create a `.env` file in the `auth-poc-server` directory:

```env
ACCESS_TOKEN_SECRET=your-access-secret-key
REFRESH_TOKEN_SECRET=your-refresh-secret-key
ACCESS_TOKEN_EXPIRES_IN=10s
REFRESH_TOKEN_EXPIRES_IN=50s
```

#### Start the Backend Server

```bash
npm start
```

The server will run on **http://localhost:4000**

### 3. Setup Frontend Client

Open a new terminal:

```bash
cd auth-poc-client
npm install
```

#### Start the Angular Development Server

```bash
npm start
```

The Angular app will run on **http://localhost:4200**

## 🧪 Testing the Application

### Default Test Credentials

- **Username**: `alice`
- **Password**: `password123`

### API Endpoints

| Method | Endpoint | Description | Authentication |
|--------|----------|-------------|----------------|
| POST | `/login` | Login with credentials | Public |
| POST | `/refresh` | Refresh access token | Requires refresh token cookie |
| POST | `/logout` | Logout and clear tokens | Public |
| GET | `/protected` | Access protected resource | Requires access token |
| GET | `/debug/refresh-store` | View active refresh tokens | Public (debug only) |

### Testing with cURL

#### Login
```bash
curl -X POST http://localhost:4000/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"alice\",\"password\":\"password123\"}" \
  -c cookies.txt
```

#### Access Protected Resource
```bash
curl http://localhost:4000/protected \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### Refresh Token
```bash
curl -X POST http://localhost:4000/refresh \
  -b cookies.txt \
  -c cookies.txt
```

#### Logout
```bash
curl -X POST http://localhost:4000/logout \
  -b cookies.txt
```

## 📖 How It Works

### Authentication Flow

1. **Login**: User submits credentials
   - Server validates credentials
   - Issues short-lived access token (sent in response body)
   - Issues long-lived refresh token (stored in HTTP-only cookie)
   - Stores refresh token metadata server-side

2. **API Requests**: Client makes authenticated requests
   - Access token sent in `Authorization: Bearer <token>` header
   - Angular interceptor automatically attaches the token

3. **Token Refresh**: When access token expires
   - Client automatically sends refresh request with cookie
   - Server validates refresh token and rotation status
   - Issues new access and refresh tokens
   - Old refresh token is invalidated (rotation)

4. **Logout**: User logs out
   - Server invalidates refresh token
   - Clears HTTP-only cookie
   - Client clears stored tokens

### Security Considerations

⚠️ **This is a POC for learning purposes**. For production use:

- Use a proper database for user and token storage
- Implement password hashing (bcrypt, argon2)
- Use HTTPS in production (`secure: true` for cookies)
- Store secrets in environment variables or secret managers
- Implement rate limiting and brute force protection
- Add CSRF protection
- Use stronger secret keys
- Implement proper session management
- Add refresh token expiration cleanup
- Consider using Redis for token storage
- Implement proper error handling and logging

## 🛠️ Technology Stack

### Backend
- **Node.js** - JavaScript runtime
- **Express** - Web framework
- **jsonwebtoken** - JWT implementation
- **cookie-parser** - Cookie handling
- **cors** - Cross-origin resource sharing
- **uuid** - Unique token ID generation
- **dotenv** - Environment variable management

### Frontend
- **Angular 20** - Frontend framework
- **RxJS** - Reactive programming
- **TypeScript** - Type-safe JavaScript

## 📝 Configuration

### Backend Configuration

Edit token expiration times in `.env` or `index.js`:

```javascript
const ACCESS_EXPIRES = '10s';   // Access token lifetime
const REFRESH_EXPIRES = '50s';  // Refresh token lifetime
```

### Frontend Configuration

Configure API endpoint in `auth.service.ts`:

```typescript
private apiUrl = 'http://localhost:4000';
```

## 🐛 Debugging

### View Active Refresh Tokens

```bash
curl http://localhost:4000/debug/refresh-store
```

### Check Browser Cookies

1. Open browser DevTools (F12)
2. Go to Application/Storage tab
3. Check Cookies for `http://localhost:4200`
4. Look for `refreshToken` cookie

### Common Issues

- **CORS errors**: Ensure backend CORS is configured for frontend origin
- **Token expired**: Normal behavior - refresh mechanism should handle this
- **Cookie not set**: Check `secure` and `sameSite` cookie settings
- **401 Unauthorized**: Check if access token is being sent in headers

## 📚 Learning Resources

This POC demonstrates:
- JWT authentication patterns
- Refresh token rotation strategy
- HTTP-only cookie usage
- Angular HTTP interceptors
- State management patterns
- Secure authentication best practices

## 📄 License

MIT

## 👤 Author

Built as a proof of concept for learning authentication patterns.

---

**Note**: This is a demonstration project for learning purposes. Do not use in production without implementing proper security measures.
