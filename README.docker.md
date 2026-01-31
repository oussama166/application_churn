# Docker Setup Guide

This guide explains how to run the entire application using Docker Compose.

## Prerequisites

- Docker (version 20.10 or higher)
- Docker Compose (version 2.0 or higher)

## Quick Start

1. **Clone the repository** (if not already done):
   ```bash
   cd application_churn
   ```

2. **Create environment file** (optional, defaults are provided):
   ```bash
   cp .env.example .env
   ```

3. **Build and start all services**:
   ```bash
   docker-compose up --build
   ```

   Or run in detached mode:
   ```bash
   docker-compose up -d --build
   ```

4. **Access the services**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs
   - pgAdmin: http://localhost:5050 (admin@admin.com / admin)
   - PostgreSQL: localhost:5433

## Services

The docker-compose file includes the following services:

### 1. PostgreSQL Database
- **Port**: 5433 (host) → 5432 (container)
- **Database**: churn
- **User**: postgres
- **Password**: postgres
- **Volume**: Persistent data storage

### 2. pgAdmin
- **Port**: 5050
- **Email**: admin@admin.com
- **Password**: admin
- **Purpose**: Database administration interface

### 3. Backend (FastAPI)
- **Port**: 8000
- **Environment**: Development mode with hot reload
- **Dependencies**: Python packages from requirements.txt
- **Artifacts**: ML models mounted from ./backend/artifacts

### 4. Frontend (Next.js)
- **Port**: 3000
- **Environment**: Production build
- **API URL**: Configured via NEXT_PUBLIC_API_URL

## Environment Variables

You can customize the setup by creating a `.env` file in the root directory:

```env
APP_ENV=dev
DEBUG=false
DATABASE_URL=postgresql+asyncpg://postgres:postgres@postgres:5432/churn
ARTIFACTS_DIR=artifacts
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://frontend:3000
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Common Commands

### Start services
```bash
docker-compose up
```

### Start in background
```bash
docker-compose up -d
```

### Stop services
```bash
docker-compose down
```

### Stop and remove volumes (⚠️ deletes database data)
```bash
docker-compose down -v
```

### View logs
```bash
docker-compose logs -f
```

### View logs for specific service
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Rebuild specific service
```bash
docker-compose build backend
docker-compose up -d backend
```

### Execute commands in containers
```bash
# Backend shell
docker-compose exec backend bash

# Frontend shell
docker-compose exec frontend sh

# Database shell
docker-compose exec postgres psql -U postgres -d churn
```

## Development vs Production

### Development Mode
- Backend runs with `--reload` flag for hot reloading
- Frontend uses standalone build for faster startup
- Volumes are mounted for live code updates

### Production Mode
For production deployment, consider:
1. Remove `--reload` from backend Dockerfile
2. Use production-optimized Next.js build
3. Set proper environment variables
4. Use secrets management
5. Configure reverse proxy (nginx)
6. Enable SSL/TLS

## Troubleshooting

### Port conflicts
If ports are already in use, modify the port mappings in `docker-compose.yml`:
```yaml
ports:
  - "3001:3000"  # Change host port
```

### Database connection issues
- Ensure PostgreSQL container is healthy: `docker-compose ps`
- Check database URL in backend environment variables
- Verify network connectivity: `docker-compose exec backend ping postgres`

### Frontend can't reach backend
- Verify `NEXT_PUBLIC_API_URL` environment variable
- Check CORS settings in backend
- Ensure both services are on the same Docker network

### Build failures
- Clear Docker cache: `docker-compose build --no-cache`
- Check Dockerfile syntax
- Verify all required files are present

## Network Architecture

All services are connected via a bridge network (`churn-network`):
- Services can communicate using service names as hostnames
- Frontend → Backend: `http://backend:8000`
- Backend → Database: `postgres:5432`

## Data Persistence

- PostgreSQL data: Stored in `postgres_data` volume
- pgAdmin data: Stored in `pgadmin_data` volume
- To backup database: `docker-compose exec postgres pg_dump -U postgres churn > backup.sql`
- To restore: `docker-compose exec -T postgres psql -U postgres churn < backup.sql`
