import random
import math
from typing import List, Dict, Any


THREAT_PROFILES = [
    {
        "category": "Micro-Quadcopter",
        "is_hostile": True,
        "threat_level": "HIGH",
        "speed_range": (10.0, 18.0),
        "alt_range": (50.0, 140.0),
        "rcs_m2": 0.015,
        "rf_freq_mhz": 2400.0,
        "acoustic_db": 58.0,
        "description": "Commercial micro-quadcopter conducting low-altitude reconnaissance"
    },
    {
        "category": "Fixed-Wing Loitering",
        "is_hostile": True,
        "threat_level": "CRITICAL",
        "speed_range": (32.0, 48.0),
        "alt_range": (200.0, 600.0),
        "rcs_m2": 0.08,
        "rf_freq_mhz": 915.0,
        "acoustic_db": 74.0,
        "description": "High-speed tactical fixed-wing loitering munition on inbound vector"
    },
    {
        "category": "Heavy Commercial",
        "is_hostile": True,
        "threat_level": "HIGH",
        "speed_range": (14.0, 24.0),
        "alt_range": (100.0, 300.0),
        "rcs_m2": 0.25,
        "rf_freq_mhz": 5800.0,
        "acoustic_db": 78.0,
        "description": "Heavy-lift hexacopter carrying unidentified payload container"
    },
    {
        "category": "Friendly Civilian",
        "is_hostile": False,
        "threat_level": "NONE",
        "speed_range": (8.0, 16.0),
        "alt_range": (60.0, 120.0),
        "rcs_m2": 0.03,
        "rf_freq_mhz": 2450.0,
        "acoustic_db": 60.0,
        "description": "Authorized municipal survey drone with active Remote-ID broadcast"
    },
    {
        "category": "Wildlife Clutter",
        "is_hostile": False,
        "threat_level": "NONE",
        "speed_range": (6.0, 14.0),
        "alt_range": (30.0, 150.0),
        "rcs_m2": 0.008,
        "rf_freq_mhz": 0.0,
        "acoustic_db": 35.0,
        "description": "Flock of birds exhibiting wandering thermal signature and no RF telemetry"
    }
]


def generate_synthetic_ground_truth(
    run_id: str,
    duration_seconds: int,
    seed: int,
    config: Dict[str, Any]
) -> List[Dict[str, Any]]:
    """
    Deterministically generates ground-truth drone threat entities and kinematic event tracks.
    Same seed + config yields identical output every single time.
    """
    rng = random.Random(seed)
    num_entities = config.get("num_entities", 5)
    
    events: List[Dict[str, Any]] = []
    
    for i in range(num_entities):
        entity_id = f"DRONE-{i+1:02d}"
        
        # Select profile (bias towards hostile in higher difficulty)
        profile_idx = rng.randint(0, len(THREAT_PROFILES) - 1)
        profile = THREAT_PROFILES[profile_idx]
        
        # Starting point on boundary perimeter (e.g. 3000m to 4500m from tactical center)
        start_angle = rng.uniform(0, 2 * math.pi)
        start_dist = rng.uniform(3200.0, 4800.0)
        start_x = start_dist * math.cos(start_angle)
        start_y = start_dist * math.sin(start_angle)
        
        # Target/destination vector
        if profile["is_hostile"]:
            # Hostile drones fly towards perimeter center (target coordinates ~ 0,0)
            dest_x = rng.uniform(-400.0, 400.0)
            dest_y = rng.uniform(-400.0, 400.0)
        else:
            # Civilians / wildlife skirt across the area
            dest_angle = start_angle + rng.uniform(math.pi * 0.6, math.pi * 1.4)
            dest_dist = rng.uniform(3000.0, 4500.0)
            dest_x = dest_dist * math.cos(dest_angle)
            dest_y = dest_dist * math.sin(dest_angle)
            
        dx = dest_x - start_x
        dy = dest_y - start_y
        total_dist = math.hypot(dx, dy)
        heading_rad = math.atan2(dy, dx)
        heading_deg = (math.degrees(heading_rad) + 360.0) % 360.0
        
        speed = rng.uniform(*profile["speed_range"])
        altitude = rng.uniform(*profile["alt_range"])
        
        # Ingress time between 5s and 60% of duration
        start_sim_time = rng.uniform(4.0, max(10.0, duration_seconds * 0.55))
        
        # How many telemetry track updates to generate
        update_interval = rng.uniform(8.0, 14.0)
        current_time = start_sim_time
        curr_x = start_x
        curr_y = start_y
        
        step_idx = 0
        while current_time < duration_seconds and math.hypot(curr_x, curr_y) > 100.0:
            # Determine event type
            if step_idx == 0:
                event_type = "RADAR_INITIAL_CONTACT"
            elif profile["rf_freq_mhz"] > 0 and step_idx % 2 == 1:
                event_type = "RF_EMISSION_DETECTED"
            elif math.hypot(curr_x, curr_y) < 2000.0 and step_idx % 3 == 0:
                event_type = "OPTICAL_EOIR_CONTACT"
            else:
                event_type = "RADAR_TRACK_UPDATE"
                
            dist_to_center = math.hypot(curr_x, curr_y)
            
            # Check perimeter intrusion at 1800m
            if dist_to_center < 1800.0 and dist_to_center + (speed * update_interval) >= 1800.0:
                event_type = "PERIMETER_ZONE_BREACH"
                
            event_payload = {
                "entity_name": f"{profile['category']} ({entity_id})",
                "rcs_m2": profile["rcs_m2"],
                "rf_freq_mhz": profile["rf_freq_mhz"],
                "acoustic_db": profile["acoustic_db"],
                "distance_to_core_m": round(dist_to_center, 1),
                "tactical_bearing_deg": round(heading_deg, 1),
                "is_remote_id_present": (profile["category"] == "Friendly Civilian"),
                "description": profile["description"],
            }
            
            events.append({
                "run_id": run_id,
                "simulation_time": round(current_time, 2),
                "entity_id": entity_id,
                "event_type": event_type,
                "is_hostile": profile["is_hostile"],
                "threat_category": profile["category"],
                "threat_level": profile["threat_level"],
                "pos_x": round(curr_x, 1),
                "pos_y": round(curr_y, 1),
                "altitude": round(altitude + rng.uniform(-5.0, 5.0), 1),
                "speed": round(speed + rng.uniform(-1.0, 1.0), 1),
                "heading": round(heading_deg, 1),
                "event_payload": event_payload
            })
            
            # Advance position
            advance_dist = speed * update_interval
            curr_x += advance_dist * math.cos(heading_rad)
            curr_y += advance_dist * math.sin(heading_rad)
            current_time += update_interval
            step_idx += 1
            
    # Sort events deterministically by simulation_time
    events.sort(key=lambda x: (x["simulation_time"], x["entity_id"]))
    return events
