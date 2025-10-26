# Biometric Car Security System - Technical Documentation

## System Architecture

### 1. Frontend Architecture (React + TypeScript)
- **Technology Stack:**
  - React 18+ with TypeScript
  - Vite for build tooling
  - ShadcnUI for component library
  - Leaflet for GPS mapping

### 2. Backend Architecture (FastAPI)
- **Technology Stack:**
  - FastAPI (Python)
  - OpenCV for face detection
  - face_recognition library for advanced biometric processing
  - Uvicorn ASGI server

## Core Components

### 1. Biometric Authentication System
- **Face Detection & Recognition:**
  - Primary: face_recognition library (based on dlib)
  - Fallback: OpenCV Haar Cascade Classifier
  - Accuracy threshold: 0.6 (configurable)

- **Data Processing:**
  - Face encoding storage in encrypted format
  - Real-time face verification
  - Emergency PIN backup system

### 2. Security Module
- **Encryption System:**
  - Custom XOR-based encryption
  - Base64 encoding for storage
  - Secure key management

- **File Structure:**
  ```
  /api
  ├── biometric_faces/     # Face image storage
  ├── users_database.encrypted
  ├── face_encodings.encrypted
  ├── system_config.encrypted
  ├── access_log.json
  └── gps_log.json
  ```

### 3. GPS Tracking System
- **Features:**
  - Real-time location tracking
  - History logging
  - Geofencing capabilities
  - OpenStreetMap integration

### 4. User Management
- **Features:**
  - User registration with biometric data
  - Access control and permissions
  - Activity logging
  - Emergency access protocols

## API Endpoints

### 1. Authentication Endpoints
```
POST /api/register
- Register new users with biometric data
- Parameters: name, driver_id, phone, vehicle_reg, face_image

POST /api/verify-face
- Verify user identity via face recognition
- Parameters: face_image

POST /api/verify-pin
- Emergency PIN verification
- Parameters: pin
```

### 2. Data Access Endpoints
```
GET /api/users
- Retrieve registered users list

GET /api/logs
- Access system activity logs
- Optional filters: status, limit

GET /api/stats
- System statistics and metrics
```

## Security Features

### 1. Data Protection
- Encrypted storage for sensitive data
- Secure file system organization
- Access logging and monitoring

### 2. Authentication Methods
- Primary: Facial Recognition
- Secondary: Emergency PIN
- Session management and timeout

### 3. System Monitoring
- Access attempt logging
- GPS location tracking
- System health monitoring
- Error handling and reporting

## Frontend Components

### 1. Core Pages
- Login.tsx - Authentication interface
- Register.tsx - User registration
- Dashboard.tsx - Main user interface
- GPSTracking.tsx - Location monitoring
- History.tsx - Activity logs
- Manager.tsx - System management

### 2. UI Components
- LeafletMap.tsx - GPS visualization
- Various shadcn/ui components for consistent UI

## Database Structure

### 1. User Records
```json
{
  "name": "string",
  "driver_id": "string",
  "phone": "string",
  "vehicle_registration": "string",
  "registered_date": "ISO date",
  "status": "ACTIVE/INACTIVE",
  "face_file": "filename",
  "total_accesses": "number",
  "last_access": "ISO date"
}
```

### 2. Access Logs
```json
{
  "timestamp": "ISO date",
  "user": "string",
  "action": "string",
  "status": "GRANTED/DENIED",
  "method": "string",
  "match_score": "percentage",
  "gps_location": "string",
  "engine_status": "ENABLED/LOCKED"
}
```

## System Requirements

### 1. Backend Requirements
- Python 3.8+
- FastAPI
- OpenCV
- face_recognition
- uvicorn
- python-multipart

### 2. Frontend Requirements
- Node.js 16+
- npm/yarn
- Modern web browser
- Camera access for face recognition

## Performance Considerations

### 1. Face Recognition
- Optimal lighting conditions
- Camera resolution requirements
- Processing time considerations

### 2. GPS Tracking
- Location update frequency
- Data storage optimization
- Battery usage considerations

## Error Handling

### 1. Biometric Failures
- Fallback to basic detection
- Emergency PIN system
- Multiple attempt handling

### 2. System Errors
- Graceful degradation
- User feedback
- Error logging and reporting

## Future Enhancements

### 1. Planned Features
- Multi-factor authentication
- Advanced GPS analytics
- Mobile app integration
- AI-powered anomaly detection

### 2. Scalability Plans
- Cloud integration
- Multi-vehicle support
- Enterprise features

## Development Workflow

### 1. Local Development
```bash
# Backend
cd api
python -m uvicorn server:app --reload

# Frontend
npm run dev
```

### 2. Testing
- Unit tests for critical components
- Integration testing
- End-to-end testing scenarios

## Maintenance Guidelines

### 1. Regular Tasks
- Database backups
- Log rotation
- System updates
- Security audits

### 2. Troubleshooting
- Common issues and solutions
- Debug procedures
- Support contacts