# System Architecture Diagram

```mermaid
graph TB
    subgraph Frontend
        R[React Application] --> |TypeScript| Components
        Components --> |UI| ShadcnUI[Shadcn UI Components]
        Components --> |Maps| Leaflet[Leaflet Map Component]
        Components --> |State| Store[Application State]
    end
    
    subgraph Backend
        F[FastAPI Server] --> |Face Detection| CV[OpenCV]
        F --> |Face Recognition| FR[face_recognition]
        F --> |Data Storage| DB[Encrypted Storage]
        F --> |Server| UV[Uvicorn ASGI]
    end
    
    Frontend ---|HTTP/REST| Backend
```

# Data Flow Diagram

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant BE as Backend
    participant BD as Biometric Detection
    participant DB as Database

    U->>FE: Access Application
    FE->>BE: Authentication Request
    BE->>BD: Process Biometric Data
    BD->>BE: Verification Result
    BE->>DB: Store Access Log
    BE->>FE: Auth Response
    FE->>U: Access Granted/Denied
```

# Security Components

```mermaid
graph LR
    subgraph Security Layer
        E[Encryption Module] --> XOR[XOR Cipher]
        E --> B64[Base64 Encoding]
        A[Authentication] --> FR[Face Recognition]
        A --> PIN[Emergency PIN]
        L[Logging] --> AL[Access Logs]
        L --> GL[GPS Logs]
    end
```

# User Registration Flow

```mermaid
flowchart TD
    A[Start Registration] --> B[Capture Face Image]
    B --> C{Face Detected?}
    C -- Yes --> D[Extract Features]
    C -- No --> B
    D --> E[Encrypt Data]
    E --> F[Store in Database]
    F --> G[Create User Profile]
    G --> H[End Registration]
```

# GPS Tracking System

```mermaid
graph LR
    GPS[GPS Module] --> |Raw Data| P[Position Processing]
    P --> |Coordinates| M[Map Display]
    P --> |History| S[Storage]
    M --> |OpenStreetMap| V[Visualization]
    S --> |Query| H[History View]
```

# System Components Interaction

```mermaid
graph TB
    subgraph User Interface
        Login --> Dashboard
        Dashboard --> |View| History
        Dashboard --> |Track| GPS
        Dashboard --> |Manage| Settings
    end
    
    subgraph Core Services
        Auth[Authentication Service]
        Face[Face Processing]
        Store[Data Storage]
        Track[Location Tracking]
    end
    
    User Interface ---|API Calls| Core Services
```