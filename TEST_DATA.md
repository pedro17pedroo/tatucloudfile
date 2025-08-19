# Test Data Documentation

This document contains information about the test data created for the MEGA File Manager API system.

## Test Accounts

### Admin User
- **Email**: `admin@megafilemanager.com`
- **Password**: `admin123`
- **Plan**: Premium
- **Permissions**: Full admin access
- **Features**: 
  - Manage MEGA credentials
  - View system statistics
  - Create/manage plans
  - Access all admin endpoints

### Regular User (Email)
- **Email**: `user@test.com`
- **Password**: `user123`
- **Plan**: Pro
- **Features**:
  - File upload/download/delete
  - Generate API keys
  - 5GB storage limit
  - 1000 API calls per hour

### Phone User
- **Phone**: `+351912345678`
- **Password**: `phone123`
- **Plan**: Basic
- **Features**:
  - File upload/download/delete
  - Generate API keys
  - 2GB storage limit
  - 100 API calls per hour

## Available Plans

### Basic Plan
- **ID**: `basic`
- **Storage**: 2GB
- **Price**: €0/month
- **API Calls**: 100/hour

### Pro Plan
- **ID**: `pro`
- **Storage**: 5GB
- **Price**: €9.99/month
- **API Calls**: 1000/hour

### Premium Plan
- **ID**: `premium`
- **Storage**: 10GB
- **Price**: €19.99/month
- **API Calls**: 5000/hour

## API Endpoints for Testing

### Authentication
```bash
# Register new user
POST /api/auth/register
{
  "firstName": "Test",
  "lastName": "User",
  "emailOrPhone": "test@example.com",
  "password": "password123"
}

# Login
POST /api/auth/login
{
  "emailOrPhone": "user@test.com",
  "password": "user123"
}

# Get current user
GET /api/auth/user
```

### Developer API (requires API key)
```bash
# Upload file
POST /api/dev/files/upload
Authorization: Bearer {api-key}
Content-Type: multipart/form-data

# Get files
GET /api/dev/files
Authorization: Bearer {api-key}

# Delete file
DELETE /api/dev/files/{file-id}
Authorization: Bearer {api-key}
```

### Portal (requires session authentication)
```bash
# Upload file
POST /api/portal/files/upload
Cookie: session-cookie

# Get files
GET /api/portal/files
Cookie: session-cookie

# Admin: Seed database
POST /api/portal/admin/seed
Cookie: admin-session-cookie
```

## How to Generate API Keys

1. Login as any user (e.g., `user@test.com` / `user123`)
2. Navigate to API keys section
3. Create new API key with a name
4. Use the generated key for API requests

## Admin Features

1. **MEGA Credentials Management**
   - Configure real MEGA account credentials
   - Test connection before saving

2. **System Statistics**
   - View total users, files, storage usage
   - Monitor API usage

3. **Plan Management**
   - Create new subscription plans
   - Modify existing plans

## Seeding Commands

To re-seed the database:
```bash
npx tsx server/db/seed.ts
```

Or via admin endpoint (requires admin login):
```bash
POST /api/portal/admin/seed
```

## Testing Workflow

1. **Setup**: Database is already seeded with test data
2. **Login**: Use any of the test accounts above
3. **Configure MEGA**: Admin should set real MEGA credentials
4. **Test Uploads**: Try uploading files through portal or API
5. **API Testing**: Generate API keys and test developer endpoints
6. **Admin Testing**: Use admin account to manage system settings

## Security Notes

- Test passwords are simple for development only
- In production, enforce strong password policies
- API keys should be kept secure and rotated regularly
- MEGA credentials are hashed and stored securely