from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import cv2
import numpy as np
import base64
import json
from datetime import datetime
import os
from typing import Optional
import hashlib
import traceback
import logging

# Initialize FastAPI app
app = FastAPI(title="Biometric Car Security API")

# Add CORS middleware (allow all origins for deployments; restrict locally if needed)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve the built frontend (Vite build) from the `static` folder next to this file.
# The Dockerfile copies the frontend `dist` into the backend static folder at build time.
static_dir = Path(__file__).resolve().parent / "static"
if static_dir.exists():
    app.mount("/", StaticFiles(directory=str(static_dir), html=True), name="static")
else:
    # Don't crash if static files are not present during local development — warn instead
    print(f"Warning: Static directory '{static_dir}' does not exist. Frontend static files will not be served by the backend.")

# --- DYNAMIC CORS ---
API_URL = os.getenv("VITE_API_URL", "http://localhost:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", API_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- PERSISTENT DATA PATHS ---
# Data paths -- prefer a Docker-friendly absolute path when available, but
# fall back to a repo-local path for local development (so files you drop
# into api/biometric_faces are visible to the running server).
DEFAULT_DATA_DIR = "/app/data"
MODULE_PATH = Path(__file__).resolve().parent
MODULE_DATA_DIR = MODULE_PATH / "data"
MODULE_BIOMETRIC_DIR = MODULE_PATH / "biometric_faces"

# Priority: explicit FACE_FOLDER env -> /app/data (Docker) -> repo/api/biometric_faces -> repo/api/data -> repo/api/data (create)
env_face_folder = os.getenv("FACE_FOLDER")
if env_face_folder:
    base_data_dir = env_face_folder
elif os.path.exists(DEFAULT_DATA_DIR):
    base_data_dir = DEFAULT_DATA_DIR
elif MODULE_BIOMETRIC_DIR.exists():
    base_data_dir = str(MODULE_PATH)
elif MODULE_DATA_DIR.exists():
    base_data_dir = str(MODULE_DATA_DIR)
else:
    # Default local data dir (will be created if needed)
    base_data_dir = str(MODULE_DATA_DIR)

FACE_FOLDER = os.path.join(base_data_dir, "biometric_faces")
USERS_DB = os.path.join(base_data_dir, "users_database.encrypted")
CONFIG_FILE = os.path.join(base_data_dir, "system_config.encrypted")
ACCESS_LOG = os.path.join(base_data_dir, "access_log.json")
GPS_LOG = os.path.join(base_data_dir, "gps_log.json")
FACE_ENCODINGS_FILE = os.path.join(base_data_dir, "face_encodings.encrypted")
ENCRYPTION_KEY = "CarBiometric2025SecureKey!@#"  # Keep the encryption key

# Setup basic logging to a file inside the data folder for easier debugging
LOG_DIR = os.path.join(base_data_dir, "logs")
os.makedirs(LOG_DIR, exist_ok=True)
logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s %(levelname)s %(message)s',
                    handlers=[
                        logging.FileHandler(os.path.join(LOG_DIR, 'server.log')),
                        logging.StreamHandler()
                    ])

def log_exception(name: str, e: Exception):
    tb = traceback.format_exc()
    logging.error(f"{name} exception: {e}\n{tb}")
    # Also write a short per-endpoint log for convenience
    try:
        with open(os.path.join(LOG_DIR, f"{name}.log"), 'a') as f:
            f.write(f"[{datetime.now().isoformat()}] {e}\n{tb}\n")
    except Exception:
        pass

# Initialize face detection
cascade_file = 'haarcascade_frontalface_default.xml'
# Try multiple possible paths for the Haar cascade file
possible_paths = [
    os.path.join(cv2.__file__, '..', '..', 'data', cascade_file),
    os.path.join(cv2.__file__, '..', 'data', cascade_file),
    os.path.join(os.path.dirname(cv2.__file__), 'data', cascade_file),
    cascade_file,  # Try direct file if it's in current directory
    # Also try the file bundled next to this module (api/haarcascade_frontalface_default.xml)
    os.path.join(os.path.dirname(__file__), cascade_file),
]

face_cascade = None
for cascade_path in possible_paths:
    if os.path.exists(cascade_path):
        face_cascade = cv2.CascadeClassifier(cascade_path)
        print(f"Found cascade file at: {cascade_path}")
        break

if face_cascade is None:
    print("Warning: Could not find face cascade file. Face detection may not work.")
    print("Suggestion: ensure 'haarcascade_frontalface_default.xml' is present in the 'api/' folder or in OpenCV data directories.")
    print("You can copy the file into api/ from OpenCV (if installed) or download it from: https://github.com/opencv/opencv/tree/master/data/haarcascades")

# Try to import face_recognition. If unavailable, set a flag and continue so the
# FastAPI app can start. Endpoints that require face_recognition will return a
# clear 501 response asking the user to install the optional dependency.
try:
    import face_recognition
    FACE_RECOGNITION_AVAILABLE = True
    print("face_recognition library loaded")
except ImportError:
    FACE_RECOGNITION_AVAILABLE = False
    print("face_recognition not available. Endpoints that require face recognition will return an informative error.")
    print("To enable face_recognition (note: this often requires compiling dlib or using conda):")
    print("  (recommended) install with conda: conda install -c conda-forge dlib face_recognition cmake")
    print("  or in an environment with build tools try: pip install cmake dlib face_recognition")

def initialize_database():
    """Initialize all database files on startup"""
    print("\n" + "="*60)
    print("   INITIALIZING DATABASE")
    print("="*60)
    
    # Create folders
    if not os.path.exists(FACE_FOLDER):
        os.makedirs(FACE_FOLDER)
        print(f" Created folder: {FACE_FOLDER}")
    
    # Initialize Users Database
    if not os.path.exists(USERS_DB):
        users_data = {"users": []}
        SecurityModule.save_encrypted_file(USERS_DB, users_data)
        print(f" Created: {USERS_DB}")
    else:
        print(f"✓ Found: {USERS_DB}")
    
    # Initialize Face Encodings Database
    if not os.path.exists(FACE_ENCODINGS_FILE):
        encodings_data = {"encodings": []}
        SecurityModule.save_encrypted_file(FACE_ENCODINGS_FILE, encodings_data)
        print(f" Created: {FACE_ENCODINGS_FILE}")
    else:
        print(f"✓ Found: {FACE_ENCODINGS_FILE}")
    
    # Initialize Config File
    if not os.path.exists(CONFIG_FILE):
        config_data = {
            "emergency_pin": hashlib.sha256("1234".encode()).hexdigest(),
            "recognition_threshold": 0.6,
            "system_version": "3.0-SECURE",
            "engine_computer_enabled": True,
            "gps_tracking_enabled": True
        }
        SecurityModule.save_encrypted_file(CONFIG_FILE, config_data)
        print(f" Created: {CONFIG_FILE}")
        print(f"   Default Emergency PIN: 1234")
    else:
        print(f"✓ Found: {CONFIG_FILE}")
    
    # Initialize Access Log
    if not os.path.exists(ACCESS_LOG):
        with open(ACCESS_LOG, 'w') as f:
            json.dump({"logs": []}, f, indent=4)
        print(f" Created: {ACCESS_LOG}")
    else:
        print(f"✓ Found: {ACCESS_LOG}")
    
    # Initialize GPS Log
    if not os.path.exists(GPS_LOG):
        with open(GPS_LOG, 'w') as f:
            json.dump({"gps_history": []}, f, indent=4)
        print(f" Created: {GPS_LOG}")
    else:
        print(f"✓ Found: {GPS_LOG}")
    
    print("\n Database initialization complete!")
    print("="*60 + "\n")

# Initialize on startup
@app.on_event("startup")
async def startup_event():
    initialize_database()

def log_access(user_name: str, action: str, status: str, method: str, match_score: float = 0):
    """Log access attempts"""
    try:
        with open(ACCESS_LOG, 'r') as f:
            logs = json.load(f)
        
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "user": user_name,
            "action": action,
            "status": status,
            "method": method,
            "match_score": f"{match_score:.1%}" if match_score > 0 else "N/A",
            "gps_location": "Johannesburg, SA",
            "engine_status": "ENABLED" if status == "GRANTED" else "LOCKED"
        }
        
        logs["logs"].append(log_entry)
        
        with open(ACCESS_LOG, 'w') as f:
            json.dump(logs, f, indent=4)
        
        print(f" Logged: {action} - {status} - {user_name}")
    except Exception as e:
        print(f" Log error: {e}")

def update_gps(latitude: float = -26.2041, longitude: float = 28.0473):
    """Update GPS location"""
    try:
        with open(GPS_LOG, 'r') as f:
            gps_data = json.load(f)
        
        location = {
            "latitude": latitude,
            "longitude": longitude,
            "address": "Johannesburg, Gauteng, South Africa",
            "timestamp": datetime.now().isoformat()
        }
        
        gps_data["gps_history"].append(location)
        
        # Keep only last 100 locations
        if len(gps_data["gps_history"]) > 100:
            gps_data["gps_history"] = gps_data["gps_history"][-100:]
        
        with open(GPS_LOG, 'w') as f:
            json.dump(gps_data, f, indent=4)
    except Exception as e:
        print(f" GPS error: {e}")

class SecurityModule:
    @staticmethod
    def encrypt_data(data):
        try:
            key = ENCRYPTION_KEY.encode()
            data_bytes = data.encode() if isinstance(data, str) else data
            encrypted = bytearray()
            for i, byte in enumerate(data_bytes):
                encrypted.append(byte ^ key[i % len(key)])
            return base64.b64encode(bytes(encrypted)).decode()
        except:
            return None

    @staticmethod
    def decrypt_data(encrypted_data):
        try:
            key = ENCRYPTION_KEY.encode()
            data_bytes = base64.b64decode(encrypted_data)
            decrypted = bytearray()
            for i, byte in enumerate(data_bytes):
                decrypted.append(byte ^ key[i % len(key)])
            return bytes(decrypted).decode()
        except:
            return None

    @staticmethod
    def load_encrypted_file(filename):
        try:
            with open(filename, 'r') as f:
                encrypted = f.read()
            decrypted = SecurityModule.decrypt_data(encrypted)
            return json.loads(decrypted)
        except:
            return None

    @staticmethod
    def save_encrypted_file(filename, data):
        json_str = json.dumps(data)
        encrypted = SecurityModule.encrypt_data(json_str)
        with open(filename, 'w') as f:
            f.write(encrypted)

@app.post("/api/register")
async def register_user(
    name: str,
    driver_id: str,
    phone: str,
    vehicle_reg: str,
    face_image: UploadFile = File(...)
):
    # Ensure face_recognition is available before attempting registration
    if not FACE_RECOGNITION_AVAILABLE:
        raise HTTPException(status_code=501, detail="face_recognition package is not installed. Install it to use face registration endpoints.")

    try:
        # Read and process the uploaded image
        contents = await face_image.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            raise HTTPException(status_code=400, detail="Could not decode uploaded image")

        # Ensure face folder exists
        if not os.path.exists(FACE_FOLDER):
            os.makedirs(FACE_FOLDER, exist_ok=True)

        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = os.path.join(FACE_FOLDER, f"{name.replace(' ','_')}_{timestamp}.jpg")

        # If face_recognition is available, use it for encoding (preferred)
        if FACE_RECOGNITION_AVAILABLE:
            try:
                # Convert to RGB for face_recognition
                rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

                # Detect faces and compute encodings
                face_locations = face_recognition.face_locations(rgb_img)
                if not face_locations:
                    raise HTTPException(status_code=400, detail="No face detected in image")

                face_encoding = face_recognition.face_encodings(rgb_img, face_locations)[0]

                # Save image and encoding
                cv2.imwrite(filename, img)

                encodings_db = SecurityModule.load_encrypted_file(FACE_ENCODINGS_FILE)
                if not encodings_db:
                    encodings_db = {"encodings": []}

                encoding_record = {
                    "name": name,
                    "encoding": face_encoding.tolist(),
                    "file": filename,
                    "date_added": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    "encoding_available": True
                }
                encodings_db["encodings"].append(encoding_record)
                SecurityModule.save_encrypted_file(FACE_ENCODINGS_FILE, encodings_db)

            except HTTPException:
                raise
            except Exception as inner_e:
                print(f"Error during face_recognition processing: {inner_e}")
                raise HTTPException(status_code=500, detail="Face processing failed")

        else:
            # Fallback: use OpenCV Haar cascade to detect a face and save the image.
            # We can't compute a face encoding without face_recognition, but we
            # can still register the user and store the raw image for later processing.
            if face_cascade is None:
                raise HTTPException(status_code=500, detail="Face recognition engine not available and no cascade fallback found")

            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5)
            if len(faces) == 0:
                raise HTTPException(status_code=400, detail="No face detected in image (cascade fallback)")

            # Save the original image (could also crop)
            cv2.imwrite(filename, img)

            encodings_db = SecurityModule.load_encrypted_file(FACE_ENCODINGS_FILE)
            if not encodings_db:
                encodings_db = {"encodings": []}

            # Store a placeholder encoding record to keep the DB consistent
            encoding_record = {
                "name": name,
                "encoding": [],
                "file": filename,
                "date_added": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "encoding_available": False
            }
            encodings_db["encodings"].append(encoding_record)
            SecurityModule.save_encrypted_file(FACE_ENCODINGS_FILE, encodings_db)

        # Save user data
        users_db = SecurityModule.load_encrypted_file(USERS_DB)
        if users_db is None:
            users_db = {"users": []}

        user_record = {
            "name": name,
            "driver_id": driver_id,
            "phone": phone,
            "vehicle_registration": vehicle_reg,
            "registered_date": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "status": "ACTIVE",
            "face_file": filename,
            "encoding_available": FACE_RECOGNITION_AVAILABLE
        }
        users_db["users"].append(user_record)
        SecurityModule.save_encrypted_file(USERS_DB, users_db)

        return {"status": "success", "message": "User registered successfully"}
    except HTTPException:
        # Re-raise HTTP exceptions so FastAPI returns the intended status
        raise
    except Exception as e:
        # Log the exception for debugging and return a safe error message
        print(f"Registration error: {e}")
        raise HTTPException(status_code=500, detail="Registration failed: see server logs")

@app.post("/api/verify-face")
async def verify_face(face_image: UploadFile = File(...)):
    try:
        if not FACE_RECOGNITION_AVAILABLE:
            return {"status": "error", "message": "face_recognition package not installed. Install it to use face verification.", "match_score": 0}

        # Read and process the uploaded image
        contents = await face_image.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            return {"status": "error", "message": "Could not decode uploaded image", "match_score": 0}

        # Load face encodings database
        encodings_db = SecurityModule.load_encrypted_file(FACE_ENCODINGS_FILE)
        if not encodings_db or not encodings_db.get("encodings"):
            return {"status": "error", "message": "No registered faces found", "match_score": 0}

        # If face_recognition is available, use the accurate method
        if FACE_RECOGNITION_AVAILABLE:
            try:
                rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                face_locations = face_recognition.face_locations(rgb_img)
                if not face_locations:
                    return {"status": "error", "message": "No face detected", "match_score": 0}

                face_encoding = face_recognition.face_encodings(rgb_img, face_locations)[0]

                best_match_score = 0
                best_match_name = None
                for user_data in encodings_db["encodings"]:
                    if not user_data.get("encoding"):
                        continue
                    stored_encoding = np.array(user_data["encoding"])
                    face_distance = face_recognition.face_distance([stored_encoding], face_encoding)[0]
                    similarity_score = 1 - face_distance
                    if similarity_score > best_match_score:
                        best_match_score = similarity_score
                        best_match_name = user_data["name"]

                config = SecurityModule.load_encrypted_file(CONFIG_FILE)
                threshold = config.get("recognition_threshold", 0.6) if config else 0.6

                if best_match_score >= threshold:
                    return {"status": "success", "message": "Face verified", "match_score": best_match_score, "user": best_match_name}
                else:
                    return {"status": "error", "message": "Face verification failed", "match_score": best_match_score}
            except Exception as e:
                log_exception('verify_face', e)
                return {"status": "error", "message": "Face verification error", "match_score": 0}

        # Fallback simple verification using histogram correlation when face_recognition is not available
        try:
            def hist_similarity(a, b):
                # compute HSV histogram similarity (correlation) scaled to 0..1
                hsv_a = cv2.cvtColor(a, cv2.COLOR_BGR2HSV)
                hsv_b = cv2.cvtColor(b, cv2.COLOR_BGR2HSV)
                hist_a = cv2.calcHist([hsv_a], [0,1], None, [50,60], [0,180,0,256])
                hist_b = cv2.calcHist([hsv_b], [0,1], None, [50,60], [0,180,0,256])
                cv2.normalize(hist_a, hist_a)
                cv2.normalize(hist_b, hist_b)
                score = cv2.compareHist(hist_a, hist_b, cv2.HISTCMP_CORREL)
                # correlation can be in [-1,1], clamp and scale
                score = max(min(score, 1.0), -1.0)
                return (score + 1.0) / 2.0

            best_score = 0
            best_name = None
            for user_data in encodings_db["encodings"]:
                file_path = user_data.get("file")
                if not file_path or not os.path.exists(file_path):
                    continue
                try:
                    stored = cv2.imread(file_path)
                    if stored is None:
                        continue
                    # Resize both to a comparable size to reduce scale effects
                    stored_rs = cv2.resize(stored, (300,300))
                    probe_rs = cv2.resize(img, (300,300))
                    score = hist_similarity(stored_rs, probe_rs)
                    if score > best_score:
                        best_score = score
                        best_name = user_data.get("name")
                except Exception as inner:
                    logging.warning(f"Failed similarity for {file_path}: {inner}")

            # Threshold: convert histogram score to 0..1; pick threshold 0.5 as baseline
            threshold = 0.5
            if best_score >= threshold:
                return {"status": "success", "message": "Face verified (histogram fallback)", "match_score": best_score, "user": best_name}
            else:
                return {"status": "error", "message": "Face verification failed (histogram)", "match_score": best_score}
        except Exception as e:
            log_exception('verify_face_fallback', e)
            return {"status": "error", "message": "Verification error", "match_score": 0}
    except Exception as e:
        log_exception('verify_face_outer', e)
        return {"status": "error", "message": "Unexpected verification error", "match_score": 0}

@app.post("/api/verify-pin")
async def verify_pin(pin: str):
    try:
        config = SecurityModule.load_encrypted_file(CONFIG_FILE)
        if not config:
            raise HTTPException(status_code=500, detail="System configuration error")
        
        pin_hash = hashlib.sha256(pin.encode()).hexdigest()
        if pin_hash == config["emergency_pin"]:
            return {"status": "success", "message": "PIN verified"}
        else:
            return {"status": "error", "message": "Invalid PIN"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/users")
async def get_users():
    """Get all registered users"""
    try:
        users_db = SecurityModule.load_encrypted_file(USERS_DB)
        if not users_db:
            return {"status": "success", "count": 0, "users": []}
        
        # Remove sensitive data
        users_list = []
        for user in users_db.get("users", []):
            users_list.append({
                "name": user["name"],
                "driver_id": user["driver_id"],
                "phone": user["phone"],
                "vehicle_registration": user["vehicle_registration"],
                "registered_date": user["registered_date"],
                "status": user["status"],
                "total_accesses": user.get("total_accesses", 0),
                "last_access": user.get("last_access", None)
            })
        
        return {
            "status": "success",
            "count": len(users_list),
            "users": users_list
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/logs")
async def get_logs(status: Optional[str] = None, limit: int = 50):
    """Get access logs"""
    try:
        with open(ACCESS_LOG, 'r') as f:
            logs_data = json.load(f)
        
        logs = logs_data.get("logs", [])
        
        # Filter by status if provided
        if status:
            logs = [log for log in logs if log["status"] == status]
        
        # Get most recent logs
        logs = logs[-limit:]
        logs.reverse()  # Most recent first
        
        return {
            "status": "success",
            "count": len(logs),
            "logs": logs
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/stats")
async def get_stats():
    """Get system statistics"""
    try:
        # Load users
        users_db = SecurityModule.load_encrypted_file(USERS_DB)
        total_users = len(users_db.get("users", [])) if users_db else 0
        
        # Load logs
        with open(ACCESS_LOG, 'r') as f:
            logs_data = json.load(f)
        
        logs = logs_data.get("logs", [])
        total_accesses = len(logs)
        granted_count = len([log for log in logs if log["status"] == "GRANTED"])
        denied_count = len([log for log in logs if log["status"] == "DENIED"])
        
        success_rate = (granted_count / total_accesses * 100) if total_accesses > 0 else 0
        
        return {
            "status": "success",
            "stats": {
                "total_users": total_users,
                "total_accesses": total_accesses,
                "granted_accesses": granted_count,
                "denied_accesses": denied_count,
                "success_rate": f"{success_rate:.1f}%"
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def root():
    """API health check"""
    return {
        "status": "online",
        "message": "Biometric Car Security API",
        "version": "3.0",
        "timestamp": datetime.now().isoformat(),
        "face_recognition": "Available" if FACE_RECOGNITION_AVAILABLE else "Basic Mode"
    }

@app.get("/api/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "online",
        "database": {
            "users": os.path.exists(USERS_DB),
            "encodings": os.path.exists(FACE_ENCODINGS_FILE),
            "config": os.path.exists(CONFIG_FILE),
            "logs": os.path.exists(ACCESS_LOG)
        },
        "face_recognition": FACE_RECOGNITION_AVAILABLE,
        "timestamp": datetime.now().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    print("\n" + "="*60)
    print(" BIOMETRIC CAR SECURITY API SERVER")
    print("="*60)
    print("\n Server will start at: http://localhost:8000")
    print(" API Documentation: http://localhost:8000/docs")
    print("\n" + "="*60 + "\n")
    
    uvicorn.run(app, host="0.0.0.0", port=8000)