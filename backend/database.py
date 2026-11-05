"""
TrueTone Database Layer
Manages MySQL connection, table schemas, parameterized CRUD operations,
user-scoped data isolation (Firebase UID), and honest connection reporting.
"""

import os
import json
import time
from typing import Optional, List, Dict, Any, Tuple
from pathlib import Path

# Load environment variables securely from backend/.env or root .env
try:
    from dotenv import load_dotenv
    _backend_dir = Path(__file__).parent
    _root_dir = _backend_dir.parent
    if (_backend_dir / ".env").exists():
        load_dotenv(_backend_dir / ".env")
    if (_root_dir / ".env").exists():
        load_dotenv(_root_dir / ".env")
except ImportError:
    pass

# Database configuration from environment variables
MYSQL_HOST = os.getenv("MYSQL_HOST", "127.0.0.1")
MYSQL_PORT = int(os.getenv("MYSQL_PORT", "3306"))
MYSQL_USER = os.getenv("MYSQL_USER", "root")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "")
MYSQL_DATABASE = os.getenv("MYSQL_DATABASE", "truetone_db")

FALLBACK_DIR = Path(__file__).parent / "data"
FALLBACK_FILE = FALLBACK_DIR / "truetone_store.json"

try:
    import pymysql
    import pymysql.cursors
    PYMYSQL_AVAILABLE = True
except ImportError:
    PYMYSQL_AVAILABLE = False


class DatabaseManager:
    def __init__(self):
        self.is_connected = False
        self.last_error = ""
        self.connection_attempts = 0
        self._init_db()

    def _get_connection(self, create_db: bool = False):
        if not PYMYSQL_AVAILABLE:
            raise RuntimeError("PyMySQL library is not installed.")

        # Connect without database if creating it
        db_name = None if create_db else MYSQL_DATABASE
        return pymysql.connect(
            host=MYSQL_HOST,
            port=MYSQL_PORT,
            user=MYSQL_USER,
            password=MYSQL_PASSWORD,
            database=db_name,
            charset="utf8mb4",
            cursorclass=pymysql.cursors.DictCursor,
            connect_timeout=3,
            autocommit=True,
        )

    def _init_db(self):
        """Attempts to connect to MySQL, create database and tables with user isolation."""
        self.connection_attempts += 1
        if not PYMYSQL_AVAILABLE:
            self.is_connected = False
            self.last_error = "pymysql package not installed"
            return

        try:
            # 1. Connect and create database if missing
            conn = self._get_connection(create_db=True)
            with conn.cursor() as cursor:
                cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{MYSQL_DATABASE}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
            conn.close()

            # 2. Connect to the database and create tables
            conn = self._get_connection(create_db=False)
            with conn.cursor() as cursor:
                # Call analyses table with user_id and optional caller_number
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS call_analyses (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        user_id VARCHAR(128) DEFAULT NULL,
                        caller_number VARCHAR(30) DEFAULT '',
                        caller_name VARCHAR(100) DEFAULT 'Unknown caller',
                        ai_probability FLOAT NOT NULL,
                        human_confidence FLOAT NOT NULL,
                        is_ai BOOLEAN NOT NULL,
                        verdict VARCHAR(20) NOT NULL,
                        behavior_score INT NOT NULL,
                        combined_risk_score INT NOT NULL,
                        audio_source VARCHAR(100) DEFAULT 'Audio Sample',
                        chunk_probabilities JSON,
                        behavior_flags JSON,
                        blocked BOOLEAN DEFAULT FALSE,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        INDEX idx_user_id (user_id),
                        INDEX idx_caller_number (caller_number)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
                """)

                # Blocked numbers table with user_id
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS blocked_numbers (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        user_id VARCHAR(128) DEFAULT NULL,
                        caller_number VARCHAR(30) NOT NULL,
                        caller_name VARCHAR(100) DEFAULT 'Unknown caller',
                        reason VARCHAR(255) DEFAULT 'Flagged as high-risk synthetic voice',
                        blocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        INDEX idx_block_user (user_id),
                        INDEX idx_block_caller (caller_number)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
                """)

                # Ensure backwards-compatible migrations on existing tables
                try:
                    cursor.execute("ALTER TABLE call_analyses ADD COLUMN user_id VARCHAR(128) DEFAULT NULL")
                    cursor.execute("CREATE INDEX idx_user_id ON call_analyses (user_id)")
                except Exception:
                    pass
                try:
                    cursor.execute("ALTER TABLE blocked_numbers ADD COLUMN user_id VARCHAR(128) DEFAULT NULL")
                    cursor.execute("CREATE INDEX idx_block_user ON blocked_numbers (user_id)")
                except Exception:
                    pass
                try:
                    cursor.execute("ALTER TABLE call_analyses MODIFY caller_number VARCHAR(30) DEFAULT ''")
                except Exception:
                    pass

            conn.close()
            self.is_connected = True
            self.last_error = ""
            print(f"[TrueTone DB] Successfully connected to MySQL at {MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DATABASE}")
        except Exception as e:
            self.is_connected = False
            self.last_error = str(e)
            print(f"[TrueTone DB] Notice: MySQL not reachable ({e}). Using transparent persistent local fallback.")

    def get_status(self) -> Dict[str, Any]:
        # Try reconnecting if previously failed
        if not self.is_connected:
            self._init_db()

        return {
            "type": "MySQL",
            "host": MYSQL_HOST,
            "port": MYSQL_PORT,
            "database": MYSQL_DATABASE,
            "user": MYSQL_USER,
            "connected": self.is_connected,
            "error": self.last_error if not self.is_connected else None,
            "storage_mode": "MySQL" if self.is_connected else "local_fallback (MySQL unavailable)",
        }

    # -------------------------------------------------------------
    # Fallback Storage Helpers
    # -------------------------------------------------------------
    def _read_fallback(self) -> Dict[str, Any]:
        FALLBACK_DIR.mkdir(parents=True, exist_ok=True)
        if not FALLBACK_FILE.exists():
            default_data = {"analyses": [], "blocked": [], "users": []}
            with open(FALLBACK_FILE, "w", encoding="utf-8") as f:
                json.dump(default_data, f, indent=2)
            return default_data

        try:
            with open(FALLBACK_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {"analyses": [], "blocked": [], "users": []}

    def _write_fallback(self, data: Dict[str, Any]):
        FALLBACK_DIR.mkdir(parents=True, exist_ok=True)
        with open(FALLBACK_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

    # -------------------------------------------------------------
    # Call Analysis Operations (Account-Scoped)
    # -------------------------------------------------------------
    def save_analysis(self, record: Dict[str, Any]) -> Dict[str, Any]:
        user_id = (record.get("user_id") or "").strip() or None
        raw_number = record.get("caller_number", "")
        caller_number = raw_number.strip() if raw_number else ""
        caller_name = (record.get("caller_name") or "Unknown caller").strip() or "Unknown caller"
        ai_prob = float(record.get("ai_probability", 0.0))
        human_conf = float(record.get("human_confidence", 1.0 - ai_prob))
        is_ai = bool(record.get("is_ai", False))
        verdict = record.get("verdict", "Safe")
        behavior_score = int(record.get("behavior_score", 0))
        combined_risk = int(record.get("combined_risk_score", 0))
        audio_source = record.get("audio_source", "Audio Sample")
        chunks = record.get("chunk_probabilities", [])
        flags = record.get("behavior_flags", [])

        # Check if caller is already blocked for this user
        blocked = self.is_number_blocked(caller_number, user_id=user_id) if caller_number else False

        if self.is_connected:
            try:
                conn = self._get_connection()
                with conn.cursor() as cursor:
                    sql = """
                        INSERT INTO call_analyses (
                            user_id, caller_number, caller_name, ai_probability, human_confidence,
                            is_ai, verdict, behavior_score, combined_risk_score,
                            audio_source, chunk_probabilities, behavior_flags, blocked
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """
                    cursor.execute(sql, (
                        user_id, caller_number, caller_name, ai_prob, human_conf,
                        is_ai, verdict, behavior_score, combined_risk,
                        audio_source, json.dumps(chunks), json.dumps(flags), blocked
                    ))
                    record_id = cursor.lastrowid
                conn.close()

                return {
                    "id": record_id,
                    "user_id": user_id,
                    "caller_number": caller_number,
                    "caller_name": caller_name,
                    "ai_probability": ai_prob,
                    "human_confidence": human_conf,
                    "is_ai": is_ai,
                    "verdict": verdict,
                    "behavior_score": behavior_score,
                    "combined_risk_score": combined_risk,
                    "audio_source": audio_source,
                    "chunk_probabilities": chunks,
                    "behavior_flags": flags,
                    "blocked": blocked,
                    "timestamp": "Just now",
                }
            except Exception as e:
                print(f"[TrueTone DB] MySQL save failed ({e}), using fallback.")
                self.is_connected = False
                self.last_error = str(e)

        # Fallback persistence
        fb = self._read_fallback()
        record_id = len(fb["analyses"]) + 1
        created_item = {
            "id": record_id,
            "user_id": user_id,
            "caller_number": caller_number,
            "caller_name": caller_name,
            "ai_probability": ai_prob,
            "human_confidence": human_conf,
            "is_ai": is_ai,
            "verdict": verdict,
            "behavior_score": behavior_score,
            "combined_risk_score": combined_risk,
            "audio_source": audio_source,
            "chunk_probabilities": chunks,
            "behavior_flags": flags,
            "blocked": blocked,
            "timestamp": "Just now",
            "created_at": time.time(),
        }
        fb["analyses"].insert(0, created_item)
        self._write_fallback(fb)
        return created_item

    def get_analyses(self, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        clean_uid = user_id.strip() if user_id and user_id.strip() else None

        if self.is_connected:
            try:
                conn = self._get_connection()
                with conn.cursor() as cursor:
                    if clean_uid:
                        cursor.execute("""
                            SELECT id, user_id, caller_number, caller_name, ai_probability, human_confidence,
                                   is_ai, verdict, behavior_score, combined_risk_score, audio_source,
                                   chunk_probabilities, behavior_flags, blocked, created_at
                            FROM call_analyses
                            WHERE user_id = %s
                            ORDER BY id DESC
                        """, (clean_uid,))
                    else:
                        cursor.execute("""
                            SELECT id, user_id, caller_number, caller_name, ai_probability, human_confidence,
                                   is_ai, verdict, behavior_score, combined_risk_score, audio_source,
                                   chunk_probabilities, behavior_flags, blocked, created_at
                            FROM call_analyses
                            WHERE user_id IS NULL OR user_id = ''
                            ORDER BY id DESC
                        """)
                    rows = cursor.fetchall()
                conn.close()

                # Parse JSON fields and format timestamp
                for row in rows:
                    if isinstance(row.get("chunk_probabilities"), str):
                        try:
                            row["chunk_probabilities"] = json.loads(row["chunk_probabilities"])
                        except Exception:
                            row["chunk_probabilities"] = []
                    if isinstance(row.get("behavior_flags"), str):
                        try:
                            row["behavior_flags"] = json.loads(row["behavior_flags"])
                        except Exception:
                            row["behavior_flags"] = []
                    row["timestamp"] = row["created_at"].strftime("%d %b · %I:%M %p") if row.get("created_at") else "Earlier"
                return rows
            except Exception as e:
                print(f"[TrueTone DB] MySQL query failed ({e}), using fallback.")
                self.is_connected = False
                self.last_error = str(e)

        fb = self._read_fallback()
        all_analyses = fb.get("analyses", [])
        if clean_uid:
            # Enforce user boundary: only return records belonging to this UID
            return [a for a in all_analyses if a.get("user_id") == clean_uid]
        else:
            # Return unassigned legacy records without leaking to specific accounts
            return [a for a in all_analyses if not a.get("user_id")]

    # -------------------------------------------------------------
    # Blocked Numbers Operations (Account-Scoped)
    # -------------------------------------------------------------
    def is_number_blocked(self, caller_number: str, user_id: Optional[str] = None) -> bool:
        if not caller_number or caller_number.strip().lower() in ("", "unknown"):
            return False
        norm = self._normalize_number(caller_number)
        if not norm:
            return False

        clean_uid = user_id.strip() if user_id and user_id.strip() else None

        if self.is_connected:
            try:
                conn = self._get_connection()
                with conn.cursor() as cursor:
                    if clean_uid:
                        cursor.execute("""
                            SELECT id FROM blocked_numbers 
                            WHERE caller_number = %s AND user_id = %s
                        """, (norm, clean_uid))
                    else:
                        cursor.execute("""
                            SELECT id FROM blocked_numbers 
                            WHERE caller_number = %s AND (user_id IS NULL OR user_id = '')
                        """, (norm,))
                    row = cursor.fetchone()
                conn.close()
                return bool(row)
            except Exception:
                pass

        fb = self._read_fallback()
        for b in fb.get("blocked", []):
            if self._normalize_number(b.get("caller_number", "")) == norm:
                if clean_uid:
                    if b.get("user_id") == clean_uid:
                        return True
                else:
                    if not b.get("user_id"):
                        return True
        return False

    def block_number(self, caller_number: str, caller_name: str = "Unknown caller", reason: str = "Flagged as high-risk synthetic voice", user_id: Optional[str] = None) -> Dict[str, Any]:
        if not caller_number or caller_number.strip().lower() in ("", "unknown"):
            raise ValueError("A valid phone number is required to block.")
        norm = self._normalize_number(caller_number)
        if not norm:
            raise ValueError("A valid phone number is required to block.")

        clean_name = (caller_name or "Unknown caller").strip() or "Unknown caller"
        clean_uid = user_id.strip() if user_id and user_id.strip() else None

        if self.is_connected:
            try:
                conn = self._get_connection()
                with conn.cursor() as cursor:
                    # Check if already blocked for this user
                    if clean_uid:
                        cursor.execute("SELECT id FROM blocked_numbers WHERE caller_number = %s AND user_id = %s", (norm, clean_uid))
                    else:
                        cursor.execute("SELECT id FROM blocked_numbers WHERE caller_number = %s AND (user_id IS NULL OR user_id = '')", (norm,))
                    existing = cursor.fetchone()

                    if not existing:
                        cursor.execute("""
                            INSERT INTO blocked_numbers (user_id, caller_number, caller_name, reason)
                            VALUES (%s, %s, %s, %s)
                        """, (clean_uid, norm, clean_name, reason))

                    # Update call_analyses records matching this number for this user
                    if clean_uid:
                        cursor.execute("""
                            UPDATE call_analyses
                            SET blocked = TRUE
                            WHERE (caller_number = %s OR caller_number = %s) AND user_id = %s
                        """, (norm, caller_number, clean_uid))
                    else:
                        cursor.execute("""
                            UPDATE call_analyses
                            SET blocked = TRUE
                            WHERE (caller_number = %s OR caller_number = %s) AND (user_id IS NULL OR user_id = '')
                        """, (norm, caller_number))
                conn.close()

                return {
                    "success": True,
                    "caller_number": norm,
                    "caller_name": clean_name,
                    "status": "Blocked in TrueTone",
                    "note": "Application-level blocklist active in TrueTone.",
                }
            except Exception as e:
                print(f"[TrueTone DB] MySQL block failed ({e}), using fallback.")
                self.is_connected = False
                self.last_error = str(e)

        # Fallback
        fb = self._read_fallback()
        already = False
        for b in fb.get("blocked", []):
            if self._normalize_number(b.get("caller_number", "")) == norm and b.get("user_id") == clean_uid:
                already = True
                break

        if not already:
            fb.setdefault("blocked", []).append({
                "user_id": clean_uid,
                "caller_number": norm,
                "caller_name": clean_name,
                "reason": reason,
                "blocked_at": time.time(),
            })

        for a in fb.get("analyses", []):
            if (self._normalize_number(a.get("caller_number", "")) == norm or a.get("caller_number") == caller_number) and a.get("user_id") == clean_uid:
                a["blocked"] = True

        self._write_fallback(fb)
        return {
            "success": True,
            "caller_number": norm,
            "caller_name": clean_name,
            "status": "Blocked in TrueTone",
            "note": "Application-level blocklist active in TrueTone.",
        }

    def get_blocked_numbers(self, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        clean_uid = user_id.strip() if user_id and user_id.strip() else None

        if self.is_connected:
            try:
                conn = self._get_connection()
                with conn.cursor() as cursor:
                    if clean_uid:
                        cursor.execute("""
                            SELECT caller_number, caller_name, reason, blocked_at 
                            FROM blocked_numbers 
                            WHERE user_id = %s 
                            ORDER BY id DESC
                        """, (clean_uid,))
                    else:
                        cursor.execute("""
                            SELECT caller_number, caller_name, reason, blocked_at 
                            FROM blocked_numbers 
                            WHERE user_id IS NULL OR user_id = '' 
                            ORDER BY id DESC
                        """)
                    rows = cursor.fetchall()
                conn.close()
                for r in rows:
                    if r.get("blocked_at"):
                        r["blocked_at"] = r["blocked_at"].strftime("%d %b · %I:%M %p")
                return rows
            except Exception:
                pass

        fb = self._read_fallback()
        blocked_list = fb.get("blocked", [])
        if clean_uid:
            return [b for b in blocked_list if b.get("user_id") == clean_uid]
        else:
            return [b for b in blocked_list if not b.get("user_id")]

    # -------------------------------------------------------------
    # Statistics (Account-Scoped)
    # -------------------------------------------------------------
    def get_stats(self, user_id: Optional[str] = None) -> Dict[str, int]:
        clean_uid = user_id.strip() if user_id and user_id.strip() else None

        if self.is_connected:
            try:
                conn = self._get_connection()
                with conn.cursor() as cursor:
                    if clean_uid:
                        cursor.execute("SELECT COUNT(*) AS total FROM call_analyses WHERE user_id = %s", (clean_uid,))
                        row1 = cursor.fetchone()
                        cursor.execute("SELECT COUNT(*) AS total FROM blocked_numbers WHERE user_id = %s", (clean_uid,))
                        row2 = cursor.fetchone()
                    else:
                        cursor.execute("SELECT COUNT(*) AS total FROM call_analyses WHERE user_id IS NULL OR user_id = ''")
                        row1 = cursor.fetchone()
                        cursor.execute("SELECT COUNT(*) AS total FROM blocked_numbers WHERE user_id IS NULL OR user_id = ''")
                        row2 = cursor.fetchone()
                    total_checked = int(row1["total"]) if row1 else 0
                    threats_stopped = int(row2["total"]) if row2 else 0
                conn.close()
                return {
                    "calls_checked": total_checked,
                    "threats_stopped": threats_stopped,
                }
            except Exception:
                pass

        fb = self._read_fallback()
        if clean_uid:
            user_analyses = [a for a in fb.get("analyses", []) if a.get("user_id") == clean_uid]
            user_blocked = [b for b in fb.get("blocked", []) if b.get("user_id") == clean_uid]
            return {
                "calls_checked": len(user_analyses),
                "threats_stopped": len(user_blocked),
            }
        else:
            legacy_analyses = [a for a in fb.get("analyses", []) if not a.get("user_id")]
            legacy_blocked = [b for b in fb.get("blocked", []) if not b.get("user_id")]
            return {
                "calls_checked": len(legacy_analyses),
                "threats_stopped": len(legacy_blocked),
            }

    @staticmethod
    def _normalize_number(number: str) -> str:
        """Normalizes Indian phone numbers consistently (+91 XXXXX XXXXX)."""
        if not number:
            return ""
        digits = "".join(ch for ch in number if ch.isdigit())
        if digits.startswith("91") and len(digits) == 12:
            digits = digits[2:]
        elif digits.startswith("0") and len(digits) == 11:
            digits = digits[1:]

        if len(digits) == 10:
            return f"+91 {digits[:5]} {digits[5:]}"
        elif len(digits) > 0:
            return f"+{digits}"
        return number.strip()


db_manager = DatabaseManager()
