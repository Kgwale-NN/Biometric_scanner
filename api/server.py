import os
import json
import base64
import hashlib
import logging
import traceback
from datetime import datetime
from pathlib import Path
from typing import Optional

import cv2
import numpy as np
import firebase_admin
from firebase_admin import credentials, firestore, storage
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# --- Firebase Initialization ---
# This assumes Application Default Credentials (ADC) are available.
# In Cloud Run, this is automatically handled by the service account.
# Locally, you might need `gcloud auth application-default login` or
# set the GOOGLE_APPLICATION_CREDENTIALS environment variable.
try:
    firebase_admin.initialize_app()
    db = firestore.client()
    gcs_bucket_name = os.environ.get("GCS_BUCKET_NAME")
    if not gcs_bucket_name:
        raise ValueError("GCS_BUCKET_NAME environment variable not set.")
    gcs_bucket = storage.bucket(name=gcs_bucket_name)
    logging.info(f"Firebase initialized. Firestore client ready. GCS bucket: {gcs_bucket_name}")
except Exception as e:
    logging.error(f"Failed to initialize Firebase: {e}")
    # Exit or raise error if Firebase is crucial and cannot be initialized
    # For now, we'll let it try to proceed, but operations will fail.
    db = None
    gcs_bucket = None

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
    logging.warning(f"Static directory '{static_dir}' does not exist. Frontend static files will not be served by the backend.")

# --- DYNAMIC CORS ---
API_URL = os.getenv("VITE_API_URL", "http://localhost:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", API_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- PERSISTENT DATA HANDLED BY FIRESTORE & CLOUD STORAGE ---
# Remove local file paths and rely on Firestore collections and GCS paths
ENCRYPTION_KEY = os.environ.get("ENCRYPTION_KEY")
if not ENCRYPTION_KEY:
    logging.error("ENCRYPTION_KEY environment variable not set. PIN verification will fail.")
    ENCRYPTION_KEY = "DEFAULT_UNSECURE_KEY" # Fallback for local testing, DO NOT USE IN PROD

# Setup basic logging
logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s %(levelname)s %(message)s',
                    handlers=[
                        logging.StreamHandler()
                    ])

def log_exception(name: str, e: Exception):
    tb = traceback.format_exc()
    logging.error(f"{name} exception: {e}\n{tb}")

# Initialize face detection
cascade_file = 'haarcascade_frontalface_default.xml'
# The Dockerfile ensures this is copied to /usr/share/opencv4/haarcascades
# We can reference it directly or ensure it's in the current working directory or a known path.
# For Cloud Run, it's safer to use the path we explicitly copied to in the Dockerfile.
HAARCASCADE_PATH = '/usr/share/opencv4/haarcascades/haarcascade_frontalface_default.xml'

face_cascade = None
if os.path.exists(HAARCASCADE_PATH):
    face_cascade = cv2.CascadeClassifier(HAARCASCADE_PATH)
    logging.info(f"Found cascade file at: {HAARCASCADE_PATH}")
else:
    logging.warning(f"Could not find face cascade file at {HAARCASCADE_PATH}. Face detection may not work.")
    logging.warning("Suggestion: ensure 'haarcascade_frontalface_default.xml' is present in the 'api/' folder and Dockerfile correctly copies it.")

# Try to import face_recognition.
try:
    import face_recognition
    FACE_RECOGNITION_AVAILABLE = True
    logging.info("face_recognition library loaded")
except ImportError:
    FACE_RECOGNITION_AVAILABLE = False
    logging.warning("face_recognition not available. Endpoints that require face recognition will return an informative error.")

async def initialize_firebase_data():
    """Initialize default Firebase collections/documents on startup."""
    logging.info("\n" + "="*60)
    logging.info("   INITIALIZING FIREBASE DATA")
    logging.info("="*60)

    if not db:
        logging.error("Firestore client not initialized. Skipping data initialization.")
        return
    if not gcs_bucket:
        logging.error("GCS bucket not initialized. Skipping data initialization.")
        return

    # Initialize Config Document (in 'settings' collection)
    config_ref = db.collection('settings').document('system_config')
    config_doc = await config_ref.get()
    if not config_doc.exists:
        config_data = {
            "emergency_pin_hash": hashlib.sha256("1234".encode()).hexdigest(), # Stored as hash
            "recognition_threshold": 0.6,
            "system_version": "3.0-SECURE-F", # F for Firebase
            "engine_computer_enabled": True,
            "gps_tracking_enabled": True,
            "last_updated": firestore.SERVER_TIMESTAMP
        }
        await config_ref.set(config_data)
        logging.info(f" Created config: settings/system_config (Default Emergency PIN: 1234)")
    else:
        logging.info("✓ Found config: settings/system_config")

    # Initialize Users Collection (empty if not exists)
    # Firestore creates collections implicitly on first document write.
    # We just log a check here.
    users_collection_ref = db.collection('users')
    first_user = await users_collection_ref.limit(1).get()
    if not first_user:
        logging.info(" Users collection ready (will be created on first user registration).")
    else:
        logging.info("✓ Users collection found.")

    # Initialize Access Logs Collection
    access_logs_collection_ref = db.collection('access_logs')
    first_log = await access_logs_collection_ref.limit(1).get()
    if not first_log:
        logging.info(" Access logs collection ready.")
    else:
        logging.info("✓ Access logs collection found.")

    # Initialize GPS Logs Collection
    gps_logs_collection_ref = db.collection('gps_logs')
    first_gps = await gps_logs_collection_ref.limit(1).get()
    if not first_gps:
        logging.info(" GPS logs collection ready.")
    else:
        logging.info("✓ GPS logs collection found.")

    # Check/Create Cloud Storage bucket (Firebase Storage already guarantees this)
    try:
        gcs_bucket.blob("test_path/test_file.txt").exists() # Simple check for bucket access
        logging.info(f"✓ GCS Bucket '{gcs_bucket_name}' accessible.")
    except Exception as e:
        logging.error(f"GCS Bucket '{gcs_bucket_name}' is not accessible: {e}")


    logging.info("\n Firebase data initialization complete!")
    logging.info("="*60 + "\n")

# Initialize on startup
@app.on_event("startup")
async def startup_event():
    await initialize_firebase_data()

async def log_access(user_name: str, action: str, status: str, method: str, match_score: float = 0):
    """Log access attempts to Firestore."""
    if not db:
        logging.error("Firestore client not initialized. Cannot log access.")
        return

    try:
        log_entry = {
            "timestamp": datetime.now(), # Firestore native timestamp
            "user": user_name,
            "action": action,
            "status": status,
            "method": method,
            "match_score": float(f"{match_score:.4f}") if match_score > 0 else 0.0,
            "gps_location": "Johannesburg, SA", # Placeholder, ideally dynamic
            "engine_status": "ENABLED" if status == "GRANTED" else "LOCKED"
        }
        await db.collection('access_logs').add(log_entry)
        logging.info(f" Logged: {action} - {status} - {user_name}")
    except Exception as e:
        log_exception("log_access", e)

async def update_gps(latitude: float = -26.2041, longitude: float = 28.0473):
    """Update GPS location in Firestore."""
    if not db:
        logging.error("Firestore client not initialized. Cannot update GPS.")
        return

    try:
        location = {
            "latitude": latitude,
            "longitude": longitude,
            "address": "Johannesburg, Gauteng, South Africa",
            "timestamp": datetime.now()
        }
        await db.collection('gps_logs').add(location)
        # We'll rely on Firestore queries for retrieving recent logs,
        # rather than managing a fixed-size list here.
    except Exception as e:
        log_exception("update_gps", e)

class SecurityModule:
    # This encryption is primarily for hashing PINs for storage.
    # General data encryption/decryption is less relevant now that we're using Firestore
    # with its own security rules.
    @staticmethod
    def hash_pin(pin: str) -> str:
        if not ENCRYPTION_KEY:
            logging.error("ENCRYPTION_KEY not set. Hashing with default key.")
        return hashlib.sha256((pin + ENCRYPTION_KEY).encode()).hexdigest()

    # --- Firestore Operations ---
    @staticmethod
    async def get_system_config():
        if not db: return None
        config_doc = await db.collection('settings').document('system_config').get()
        return config_doc.to_dict() if config_doc.exists else None

    @staticmethod
    async def get_all_users():
        if not db: return []
        users_stream = db.collection('users').stream()
        return [user.to_dict() for user in users_stream]

    @staticmethod
    async def get_user_by_driver_id(driver_id: str):
        if not db: return None
        users_ref = db.collection('users')
        query = users_ref.where('driver_id', '==', driver_id).limit(1)
        user_docs = await query.get()
        if user_docs:
            return user_docs[0].to_dict()
        return None

    @staticmethod
    async def add_user(user_data: dict):
        if not db: return None
        # Use driver_id as document ID for easier retrieval and to ensure uniqueness
        doc_ref = db.collection('users').document(user_data['driver_id'])
        await doc_ref.set(user_data)
        return {"id": doc_ref.id}

    @staticmethod
    async def update_user(driver_id: str, updates: dict):
        if not db: return None
        doc_ref = db.collection('users').document(driver_id)
        await doc_ref.update(updates)

    # --- Cloud Storage Operations ---
    @staticmethod
    async def upload_face_image(image_bytes: bytes, user_id: str, timestamp: str):
        if not gcs_bucket: return None
        # Store images in a 'face_images' folder within the bucket
        blob_name = f"face_images/{user_id}_{timestamp}.jpg"
        blob = gcs_bucket.blob(blob_name)
        blob.upload_from_string(image_bytes, content_type='image/jpeg')
        # Make the blob publicly accessible if your Firestore security rules allow it
        # or if your app downloads directly. Consider signed URLs for better security.
        blob.make_public()
        return blob.public_url

    @staticmethod
    async def download_face_image(public_url: str) -> Optional[bytes]:
        if not gcs_bucket: return None
        try:
            # You might need to parse the blob name from the public_url
            # For simplicity, if we know the blob name, we can use that directly
            # Or make a request to the public_url
            # For now, let's assume we can retrieve from a public URL directly
            import httpx
            async with httpx.AsyncClient() as client:
                response = await client.get(public_url)
                response.raise_for_status()
                return response.content
        except Exception as e:
            logging.error(f"Failed to download image from {public_url}: {e}")
            return None

@app.post("/api/register")
async def register_user(
    name: str,
    driver_id: str,
    phone: str,
    vehicle_reg: str,
    face_image: UploadFile = File(...)
):
    if not FACE_RECOGNITION_AVAILABLE:
        raise HTTPException(status_code=501, detail="face_recognition package is not installed. Install it to use face registration endpoints.")
    if not db or not gcs_bucket:
        raise HTTPException(status_code=500, detail="Firebase services not initialized.")

    try:
        # Check if user already exists
        existing_user = await SecurityModule.get_user_by_driver_id(driver_id)
        if existing_user:
            raise HTTPException(status_code=400, detail=f"User with Driver ID {driver_id} already exists.")

        contents = await face_image.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            raise HTTPException(status_code=400, detail="Could not decode uploaded image")

        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        face_image_url = await SecurityModule.upload_face_image(contents, driver_id, timestamp)
        if not face_image_url:
            raise HTTPException(status_code=500, detail="Failed to upload face image to Cloud Storage.")

        face_encoding_list = []
        if FACE_RECOGNITION_AVAILABLE:
            try:
                rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                face_locations = face_recognition.face_locations(rgb_img)
                if not face_locations:
                    # Allow registration without encoding if no face detected by face_recognition
                    # but set encoding_available to False
                    logging.warning(f"No face detected by face_recognition for {name}, proceeding without encoding.")
                else:
                    face_encoding_list = face_recognition.face_encodings(rgb_img, face_locations)[0].tolist()

            except Exception as inner_e:
                logging.error(f"Error during face_recognition processing for {name}: {inner_e}")
                # Decide if this should stop registration or just mark encoding_available as False
                # For now, let's proceed with encoding_available=False
        
        user_record = {
            "name": name,
            "driver_id": driver_id, # Document ID in Firestore
            "phone": phone,
            "vehicle_registration": vehicle_reg,
            "registered_date": datetime.now(), # Firestore native timestamp
            "status": "ACTIVE",
            "face_image_url": face_image_url,
            "face_encoding": face_encoding_list, # Store encoding directly in user document
            "encoding_available": bool(face_encoding_list)
        }
        await SecurityModule.add_user(user_record)

        return {"status": "success", "message": "User registered successfully", "face_image_url": face_image_url}
    except HTTPException:
        raise
    except Exception as e:
        log_exception("register_user", e)
        raise HTTPException(status_code=500, detail="Registration failed: see server logs")

@app.post("/api/verify-face")
async def verify_face(face_image: UploadFile = File(...)):
    if not db:
        raise HTTPException(status_code=500, detail="Firebase services not initialized.")

    try:
        contents = await face_image.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            return {"status": "error", "message": "Could not decode uploaded image", "match_score": 0}

        all_users = await SecurityModule.get_all_users()
        if not all_users:
            return {"status": "error", "message": "No registered faces found", "match_score": 0}

        best_match_score = 0
        best_match_name = "UNKNOWN"
        best_match_driver_id = None

        config = await SecurityModule.get_system_config()
        threshold = config.get("recognition_threshold", 0.6) if config else 0.6

        if FACE_RECOGNITION_AVAILABLE:
            try:
                rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                face_locations = face_recognition.face_locations(rgb_img)
                if not face_locations:
                    return {"status": "error", "message": "No face detected in probe image", "match_score": 0}

                probe_encoding = face_recognition.face_encodings(rgb_img, face_locations)[0]

                known_encodings = []
                known_names_ids = []
                for user_data in all_users:
                    if user_data.get("encoding_available") and user_data.get("face_encoding"):
                        known_encodings.append(np.array(user_data["face_encoding"]))
                        known_names_ids.append((user_data["name"], user_data["driver_id"]))

                if known_encodings:
                    face_distances = face_recognition.face_distance(known_encodings, probe_encoding)
                    best_match_index = np.argmin(face_distances)
                    best_match_score = 1 - face_distances[best_match_index]
                    best_match_name, best_match_driver_id = known_names_ids[best_match_index]

            except Exception as e:
                log_exception('verify_face_recognition', e)
                # Fallback to histogram if face_recognition fails unexpectedly
                pass

        # Fallback or if face_recognition is not available
        if not FACE_RECOGNITION_AVAILABLE or best_match_score < threshold: # Only attempt if FR not available or didn't meet threshold
            def hist_similarity(a, b):
                hsv_a = cv2.cvtColor(a, cv2.COLOR_BGR2HSV)
                hsv_b = cv2.cvtColor(b, cv2.COLOR_BGR2HSV)
                hist_a = cv2.calcHist([hsv_a], [0,1], None, [50,60], [0,180,0,256])
                hist_b = cv2.calcHist([hsv_b], [0,1], None, [50,60], [0,180,0,256])
                cv2.normalize(hist_a, hist_a)
                cv2.normalize(hist_b, hist_b)
                score = cv2.compareHist(hist_a, hist_b, cv2.HISTCMP_CORREL)
                return (score + 1.0) / 2.0 # Scale to 0-1

            fallback_best_score = 0
            fallback_best_name = "UNKNOWN"
            fallback_best_driver_id = None
            
            for user_data in all_users:
                if not user_data.get("face_image_url"):
                    continue
                stored_image_bytes = await SecurityModule.download_face_image(user_data["face_image_url"])
                if stored_image_bytes:
                    stored_nparr = np.frombuffer(stored_image_bytes, np.uint8)
                    stored_img = cv2.imdecode(stored_nparr, cv2.IMREAD_COLOR)
                    if stored_img is None:
                        continue
                    
                    try:
                        stored_rs = cv2.resize(stored_img, (300,300))
                        probe_rs = cv2.resize(img, (300,300))
                        score = hist_similarity(stored_rs, probe_rs)
                        if score > fallback_best_score:
                            fallback_best_score = score
                            fallback_best_name = user_data.get("name")
                            fallback_best_driver_id = user_data.get("driver_id")
                    except Exception as inner:
                        logging.warning(f"Failed histogram similarity for {user_data.get('name')}: {inner}")
            
            # If fallback score is better than FR score (or FR wasn't used/failed)
            if fallback_best_score > best_match_score:
                best_match_score = fallback_best_score
                best_match_name = fallback_best_name
                best_match_driver_id = fallback_best_driver_id
                
            threshold = config.get("recognition_threshold", 0.6) if config else 0.6 # Use same threshold for consistency

        status = "DENIED"
        message = "Face verification failed"
        if best_match_score >= threshold:
            status = "GRANTED"
            message = "Face verified"
            if best_match_driver_id:
                # Update last access and total accesses for the user
                user_updates = {
                    "last_access": datetime.now(),
                    "total_accesses": firestore.Increment(1)
                }
                await SecurityModule.update_user(best_match_driver_id, user_updates)
        
        await log_access(best_match_name, "Face Verification", status, "POST", best_match_score)

        return {"status": status, "message": message, "match_score": best_match_score, "user": best_match_name}

    except HTTPException:
        raise
    except Exception as e:
        log_exception('verify_face_outer', e)
        await log_access("UNKNOWN", "Face Verification", "ERROR", "POST", 0)
        raise HTTPException(status_code=500, detail="Unexpected verification error: see server logs")

@app.post("/api/verify-pin")
async def verify_pin(pin: str):
    if not db:
        raise HTTPException(status_code=500, detail="Firebase services not initialized.")
    if not ENCRYPTION_KEY:
        raise HTTPException(status_code=500, detail="ENCRYPTION_KEY not set. PIN verification is insecure.")

    try:
        config = await SecurityModule.get_system_config()
        if not config:
            raise HTTPException(status_code=500, detail="System configuration error: config not found in Firestore.")
        
        hashed_pin_input = SecurityModule.hash_pin(pin)
        
        if hashed_pin_input == config.get("emergency_pin_hash"):
            await log_access("System Admin", "PIN Verification", "GRANTED", "POST")
            return {"status": "success", "message": "PIN verified"}
        else:
            await log_access("System Admin", "PIN Verification", "DENIED", "POST")
            return {"status": "error", "message": "Invalid PIN"}
    except HTTPException:
        raise
    except Exception as e:
        log_exception("verify_pin", e)
        await log_access("System Admin", "PIN Verification", "ERROR", "POST")
        raise HTTPException(status_code=500, detail=f"PIN verification failed: {e}")

@app.get("/api/users")
async def get_users():
    """Get all registered users from Firestore"""
    if not db:
        raise HTTPException(status_code=500, detail="Firebase services not initialized.")
    try:
        all_users = await SecurityModule.get_all_users()
        
        users_list = []
        for user in all_users:
            users_list.append({
                "name": user.get("name"),
                "driver_id": user.get("driver_id"),
                "phone": user.get("phone"),
                "vehicle_registration": user.get("vehicle_registration"),
                "registered_date": user.get("registered_date").isoformat() if user.get("registered_date") else None,
                "status": user.get("status"),
                "total_accesses": user.get("total_accesses", 0),
                "last_access": user.get("last_access").isoformat() if user.get("last_access") else None
            })
        
        return {
            "status": "success",
            "count": len(users_list),
            "users": users_list
        }
    except Exception as e:
        log_exception("get_users", e)
        raise HTTPException(status_code=500, detail=f"Failed to retrieve users: {e}")

@app.get("/api/logs")
async def get_logs(status: Optional[str] = None, limit: int = 50):
    """Get access logs from Firestore"""
    if not db:
        raise HTTPException(status_code=500, detail="Firebase services not initialized.")
    try:
        logs_ref = db.collection('access_logs').order_by('timestamp', direction=firestore.Query.DESCENDING)
        if status:
            logs_ref = logs_ref.where('status', '==', status)
        
        logs_stream = logs_ref.limit(limit).stream()
        logs = []
        for log_doc in logs_stream:
            log_data = log_doc.to_dict()
            log_data["timestamp"] = log_data["timestamp"].isoformat()
            logs.append(log_data)
        
        return {
            "status": "success",
            "count": len(logs),
            "logs": logs
        }
    except Exception as e:
        log_exception("get_logs", e)
        raise HTTPException(status_code=500, detail=f"Failed to retrieve logs: {e}")

@app.get("/api/stats")
async def get_stats():
    """Get system statistics from Firestore"""
    if not db:
        raise HTTPException(status_code=500, detail="Firebase services not initialized.")
    try:
        # Get total users
        users_count_query = await db.collection('users').count().get()
        total_users = users_count_query[0].value

        # Get total access logs
        logs_count_query = await db.collection('access_logs').count().get()
        total_accesses = logs_count_query[0].value
        
        # Get granted/denied counts
        granted_query = await db.collection('access_logs').where('status', '==', 'GRANTED').count().get()
        granted_count = granted_query[0].value

        denied_query = await db.collection('access_logs').where('status', '==', 'DENIED').count().get()
        denied_count = denied_query[0].value
        
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
        log_exception("get_stats", e)
        raise HTTPException(status_code=500, detail=f"Failed to retrieve stats: {e}")

@app.get("/")
async def root():
    """API health check"""
    return {
        "status": "online",
        "message": "Biometric Car Security API",
        "version": "3.0-Firebase",
        "timestamp": datetime.now().isoformat(),
        "face_recognition": "Available" if FACE_RECOGNITION_AVAILABLE else "Basic Mode (No FR)"
    }

@app.get("/api/health")
async def health_check():
    """Detailed health check including Firebase service status"""
    firestore_status = "OK" if db else "ERROR"
    gcs_status = "OK" if gcs_bucket else "ERROR"
    try:
        if db: await db.collection('settings').document('system_config').get() # Simple Firestore ping
        if gcs_bucket: gcs_bucket.blob("health_check_test.txt").exists() # Simple GCS ping
    except Exception:
        firestore_status = "UNREACHABLE" if db else firestore_status
        gcs_status = "UNREACHABLE" if gcs_bucket else gcs_status

    return {
        "status": "online",
        "database": {
            "firestore_client": firestore_status,
            "cloud_storage_client": gcs_status,
        },
        "face_recognition_lib": FACE_RECOGNITION_AVAILABLE,
        "timestamp": datetime.now().isoformat()
    }
