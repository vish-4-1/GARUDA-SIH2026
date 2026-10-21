import random
from typing import List, Dict, Any


def apply_sensor_degradation(
    run_id: str,
    ground_truth_events_with_ids: List[Dict[str, Any]],
    seed: int,
    config: Dict[str, Any]
) -> List[Dict[str, Any]]:
    """
    Simulates physical sensor and network transmission degradation:
    - Transport latency (observation delay)
    - Packet loss / jamming (observation loss rate)
    - Measurement noise (Gaussian jitter on coordinates and radar cross section)
    - Masking ground-truth hostiles from trainee visible payload
    """
    # Use seed derived from scenario seed + 101 to maintain deterministic independence
    rng = random.Random(seed + 101)
    
    delay_mean = float(config.get("observation_delay_mean", 2.5))
    delay_jitter = float(config.get("observation_delay_jitter", 1.0))
    loss_rate = float(config.get("observation_loss_rate", 0.15))
    noise_level = float(config.get("noise_level", 0.20))
    reliability = float(config.get("sensor_reliability", 0.85))
    weather = config.get("weather", "Clear Day")
    
    # Weather degradation modifier
    weather_loss_mod = 0.0
    weather_noise_mod = 0.0
    if weather == "Heavy Rain":
        weather_loss_mod = 0.08
        weather_noise_mod = 0.10
    elif weather == "Dense Fog":
        weather_noise_mod = 0.15
    elif weather == "High RF Jamming":
        weather_loss_mod = 0.25
        weather_noise_mod = 0.20
        
    effective_loss_rate = min(0.90, loss_rate + weather_loss_mod)
    effective_noise_level = min(1.0, noise_level + weather_noise_mod)
    
    observations: List[Dict[str, Any]] = []
    
    for gt in ground_truth_events_with_ids:
        # Determine sensor type based on event_type
        event_type = gt["event_type"]
        if "RF" in event_type:
            sensor_type = "RF_SCANNER"
        elif "OPTICAL" in event_type or "EOIR" in event_type:
            sensor_type = "EO_IR_OPTICAL"
        elif "ACOUSTIC" in event_type:
            sensor_type = "ACOUSTIC"
        else:
            sensor_type = "RADAR"
            
        # 1. Calculate transport delay
        delay_gaussian = rng.gauss(delay_mean, max(0.1, delay_jitter))
        delay_applied = round(max(0.1, delay_gaussian), 2)
        delivered_at = round(gt["simulation_time"] + delay_applied, 2)
        
        # 2. Packet loss check
        is_lost = (rng.random() < effective_loss_rate)
        
        # 3. Measurement noise
        # Base position uncertainty scales with noise_level
        pos_noise_std = effective_noise_level * 180.0  # up to ~180m deviation
        offset_x = round(rng.gauss(0, pos_noise_std), 1)
        offset_y = round(rng.gauss(0, pos_noise_std), 1)
        observed_x = round(gt["pos_x"] + offset_x, 1)
        observed_y = round(gt["pos_y"] + offset_y, 1)
        
        # Sensor quality score (0.0 to 1.0)
        quality_score = round(max(0.1, min(1.0, reliability - (effective_noise_level * 0.4) + rng.uniform(-0.05, 0.05))), 2)
        
        # Delivery status
        if is_lost:
            delivery_status = "LOST"
        elif delay_applied > 4.0:
            delivery_status = "DELAYED"
        else:
            delivery_status = "DELIVERED"
            
        # Trainee payload: sanitised, realistic sensor readouts with uncertainty
        payload_meta = gt["event_payload"]
        
        # Classification cues available to trainee depending on sensor quality
        detected_cues = []
        if quality_score > 0.4:
            detected_cues.append(f"Estimated speed: {round(gt['speed'], 1)} m/s")
            detected_cues.append(f"Estimated altitude: {round(gt['altitude'], 1)} m")
        if payload_meta.get("rf_freq_mhz", 0) > 0 and sensor_type in ["RF_SCANNER", "RADAR"]:
            detected_cues.append(f"RF Carrier: {payload_meta['rf_freq_mhz']} MHz")
        if payload_meta.get("is_remote_id_present"):
            detected_cues.append("Remote-ID beacon detected: Transmitting civilian FAA/DGCA compliant frame")
        if sensor_type == "EO_IR_OPTICAL" and quality_score > 0.6:
            detected_cues.append("Optical silhouette captured: Rotor count / wing geometry resolved")
            
        trainee_payload = {
            "entity_id": gt["entity_id"],
            "sensor_type": sensor_type,
            "observed_pos_x": observed_x,
            "observed_pos_y": observed_y,
            "observed_altitude": round(gt["altitude"] + rng.gauss(0, effective_noise_level * 20.0), 1),
            "observed_speed": round(gt["speed"] + rng.gauss(0, effective_noise_level * 3.0), 1),
            "estimated_bearing": round(gt["heading"] + rng.gauss(0, effective_noise_level * 15.0), 1),
            "signal_to_noise_ratio_db": round(15.0 * quality_score + rng.uniform(2.0, 8.0), 1),
            "confidence_estimate": round(quality_score, 2),
            "sensor_cues": detected_cues,
            "source_sensor": f"{sensor_type}-GRID-Alpha",
            "ambient_weather_impact": weather,
        }
        
        observations.append({
            "run_id": run_id,
            "source_event_id": gt.get("id"),
            "created_at_sim_time": gt["simulation_time"],
            "delivered_at_sim_time": delivered_at,
            "sensor_type": sensor_type,
            "delay_applied": delay_applied,
            "is_lost": is_lost,
            "delivery_status": delivery_status,
            "quality_score": quality_score,
            "noise_offset_x": offset_x,
            "noise_offset_y": offset_y,
            "trainee_payload": trainee_payload
        })
        
    observations.sort(key=lambda x: (x["delivered_at_sim_time"], x["created_at_sim_time"]))
    return observations
