import uuid
from typing import Dict, Any, List
from datetime import datetime
from sqlalchemy.orm import Session

from app.models.simulation import SimulationRun, GroundTruthEvent, Observation, TraineeDecision
from app.models.evaluation import ScoringRecord


class EvidenceAwareScoringEngine:
    @staticmethod
    def evaluate_run(db: Session, run_id: str) -> Dict[str, Any]:
        run = db.query(SimulationRun).filter(SimulationRun.id == run_id).first()
        if not run:
            raise ValueError(f"Run {run_id} not found")

        # 1. Fetch all ground truth events, grouped by entity_id
        gt_events = db.query(GroundTruthEvent).filter(GroundTruthEvent.run_id == run_id).all()
        entities_gt: Dict[str, Dict[str, Any]] = {}
        for ev in gt_events:
            eid = ev.entity_id
            if eid not in entities_gt:
                entities_gt[eid] = {
                    "entity_id": eid,
                    "is_hostile": ev.is_hostile,
                    "threat_category": ev.threat_category,
                    "threat_level": ev.threat_level,
                    "first_seen": ev.simulation_time,
                    "events": []
                }
            entities_gt[eid]["events"].append(ev)

        # 2. Fetch all delivered and lost observations
        observations = db.query(Observation).filter(Observation.run_id == run_id).all()
        obs_by_entity: Dict[str, List[Observation]] = {}
        delivered_obs_by_entity: Dict[str, List[Observation]] = {}
        lost_obs_by_entity: Dict[str, List[Observation]] = {}

        for obs in observations:
            eid = obs.trainee_payload.get("entity_id")
            if not eid:
                continue
            if eid not in obs_by_entity:
                obs_by_entity[eid] = []
                delivered_obs_by_entity[eid] = []
                lost_obs_by_entity[eid] = []

            obs_by_entity[eid].append(obs)
            if obs.is_lost:
                lost_obs_by_entity[eid].append(obs)
            else:
                delivered_obs_by_entity[eid].append(obs)

        # 3. Fetch trainee decisions
        decisions = db.query(TraineeDecision).filter(TraineeDecision.run_id == run_id).order_by(TraineeDecision.simulation_time).all()

        # Build decision evaluations
        decision_evals = []
        evidence_limited_count = 0
        unassessable_count = 0
        correct_classifications = 0
        assessable_decisions_count = 0
        false_alarms = 0
        response_latencies = []

        decisions_by_entity: Dict[str, List[TraineeDecision]] = {}
        for d in decisions:
            eid = d.target_entity_id
            if eid:
                decisions_by_entity.setdefault(eid, []).append(d)

            # Check evidence delivered prior to d.simulation_time
            delivered_before_decision = [
                obs for obs in delivered_obs_by_entity.get(eid, [])
                if obs.delivered_at_sim_time <= d.simulation_time
            ]
            evidence_count = len(delivered_before_decision)

            target_gt = entities_gt.get(eid)
            actual_cat = target_gt["threat_category"] if target_gt else "Unknown"
            actual_hostile = target_gt["is_hostile"] if target_gt else False

            is_correct = False
            notes = ""

            # EVIDENCE-AWARE RULE:
            # If trainee had 0 delivered observations prior to decision, they were acting blindly
            if evidence_count == 0:
                unassessable_count += 1
                evidence_status = "UNASSESSABLE"
                notes = "Decision made without prior delivered sensor observation. Unassessable under evidence-aware protocol."
            elif evidence_count == 1:
                evidence_limited_count += 1
                evidence_status = "EVIDENCE_LIMITED"
                notes = "Single delivered sensor observation available. High environmental uncertainty."
                assessable_decisions_count += 1
            else:
                evidence_status = "ADEQUATE"
                notes = f"Corroborated across {evidence_count} delivered sensor observation packets."
                assessable_decisions_count += 1

            # Check correctness if assessable
            if target_gt:
                if d.decision_type in ["CLASSIFY", "ENGAGE_COUNTERMEASURE"]:
                    # Match classification or threat assessment
                    matched_cat = (d.selected_classification == actual_cat)
                    matched_hostile = (
                        (d.threat_assessment == "HOSTILE" and actual_hostile) or
                        (d.threat_assessment in ["FRIENDLY", "CLUTTER"] and not actual_hostile)
                    )
                    if matched_cat or matched_hostile:
                        is_correct = True
                        if evidence_status != "UNASSESSABLE":
                            correct_classifications += 1
                    else:
                        is_correct = False
                        # False alarm check
                        if not actual_hostile and (d.threat_assessment == "HOSTILE" or d.decision_type == "ENGAGE_COUNTERMEASURE"):
                            false_alarms += 1
                            notes += " FALSE ALARM: Non-hostile target engaged or assessed as hostile."

                elif d.decision_type in ["MARK_UNCERTAIN", "REQUEST_PING"]:
                    # Prudent action under degraded/limited evidence
                    if evidence_status in ["EVIDENCE_LIMITED", "UNASSESSABLE"]:
                        is_correct = True
                        notes += " Commendable caution: Requested verification under degraded sensor feed."
                        correct_classifications += 1
                    else:
                        is_correct = True
                        notes += " Verification requested before kinetic action."

                elif d.decision_type == "FLAG_FALSE_ALARM":
                    if not actual_hostile:
                        is_correct = True
                        correct_classifications += 1
                        notes += " Accurately flagged benign contact / clutter."
                    else:
                        is_correct = False
                        notes += " Missed hostile: Hostile drone misidentified as false alarm."

                # Latency
                first_delivered_obs = next(
                    (obs for obs in sorted(delivered_obs_by_entity.get(eid, []), key=lambda x: x.delivered_at_sim_time)),
                    None
                )
                if first_delivered_obs and d.simulation_time >= first_delivered_obs.delivered_at_sim_time:
                    latency = round(d.simulation_time - first_delivered_obs.delivered_at_sim_time, 2)
                    response_latencies.append(latency)

            decision_evals.append({
                "decision_id": d.id,
                "target_entity_id": eid,
                "simulation_time": d.simulation_time,
                "decision_type": d.decision_type,
                "selected_classification": d.selected_classification,
                "actual_ground_truth_category": actual_cat,
                "actual_is_hostile": actual_hostile,
                "confidence": d.confidence,
                "is_correct": is_correct,
                "evidence_status": evidence_status,
                "delivered_evidence_count_at_decision": evidence_count,
                "scoring_notes": notes
            })

        # Calculate metrics with protected denominators
        # 1. Detection Rate (Observable threats detected / Total observable threats)
        observable_hostile_count = 0
        detected_hostile_count = 0
        missed_observable_hostile_count = 0

        for eid, gt_info in entities_gt.items():
            if not gt_info["is_hostile"]:
                continue
            delivered_for_this = delivered_obs_by_entity.get(eid, [])
            if len(delivered_for_this) > 0:
                observable_hostile_count += 1
                # Check if trainee made a decision for this hostile
                if eid in decisions_by_entity:
                    detected_hostile_count += 1
                else:
                    missed_observable_hostile_count += 1
            else:
                # Event was 100% lost due to jamming/packet loss -> EXCLUDED from missed count!
                unassessable_count += 1

        detection_rate = round(
            (detected_hostile_count / observable_hostile_count * 100.0)
            if observable_hostile_count > 0 else 100.0,
            1
        )

        # 2. Classification Accuracy
        classification_accuracy = round(
            (correct_classifications / assessable_decisions_count * 100.0)
            if assessable_decisions_count > 0 else (100.0 if len(decisions) == 0 else 0.0),
            1
        )

        # 3. False Alarm Rate
        non_hostile_entities_count = sum(1 for gt in entities_gt.values() if not gt["is_hostile"])
        false_alarm_rate = round(
            (false_alarms / non_hostile_entities_count * 100.0)
            if non_hostile_entities_count > 0 else 0.0,
            1
        )

        # 4. Timeliness / Latency score
        mean_latency = round(sum(response_latencies) / len(response_latencies), 2) if response_latencies else 0.0
        # Latency score decays from 100 down if latency > 10 seconds
        latency_score = round(max(30.0, 100.0 - max(0.0, mean_latency - 4.0) * 4.0), 1)

        # 5. Evidence Awareness Bonus/Penalty
        # Trainee gets points for prudent actions under degraded evidence, and small deduction for blind guessing
        blind_guesses = unassessable_count
        evidence_awareness_score = round(max(0.0, 100.0 - (blind_guesses * 15.0)), 1)

        # 6. Overall Weighted Score
        # Overall = 0.35 * Detection + 0.30 * Classification + 0.15 * Latency + 0.20 * EvidenceAwareness - (False Alarm Penalty)
        raw_overall = (
            (0.35 * detection_rate) +
            (0.30 * classification_accuracy) +
            (0.15 * latency_score) +
            (0.20 * evidence_awareness_score) -
            (false_alarm_rate * 0.25)
        )
        overall_score = round(max(0.0, min(100.0, raw_overall)), 1)

        # Update run in DB
        run.overall_score = overall_score
        run.summary_metrics = {
            "detection_rate": detection_rate,
            "classification_accuracy": classification_accuracy,
            "false_alarm_rate": false_alarm_rate,
            "mean_response_latency_s": mean_latency,
            "latency_score": latency_score,
            "evidence_awareness_score": evidence_awareness_score,
            "unassessable_count": unassessable_count,
            "evidence_limited_count": evidence_limited_count,
            "observable_hostile_count": observable_hostile_count,
            "total_decisions": len(decisions),
        }

        # Clear existing scoring records for this run
        db.query(ScoringRecord).filter(ScoringRecord.run_id == run_id).delete()

        # Create structured scoring records
        records = [
            ScoringRecord(
                id=str(uuid.uuid4()),
                run_id=run.id,
                metric_category="DETECTION",
                metric_name="Observable Threat Detection Rate",
                score_value=detection_rate,
                weight=0.35,
                numerator=float(detected_hostile_count),
                denominator=float(observable_hostile_count),
                formula_description="Detected Hostiles / Observable Hostiles (100% lost threats excluded from denominator)",
                evidence_limited_count=evidence_limited_count,
                unassessable_count=unassessable_count,
                calculation_details={"detected": detected_hostile_count, "observable": observable_hostile_count}
            ),
            ScoringRecord(
                id=str(uuid.uuid4()),
                run_id=run.id,
                metric_category="CLASSIFICATION",
                metric_name="Assessable Classification Accuracy",
                score_value=classification_accuracy,
                weight=0.30,
                numerator=float(correct_classifications),
                denominator=float(assessable_decisions_count),
                formula_description="Correct Trainee Decisions / Total Assessable Decisions (with delivered evidence)",
                evidence_limited_count=evidence_limited_count,
                unassessable_count=unassessable_count,
                calculation_details={"correct": correct_classifications, "assessable_decisions": assessable_decisions_count}
            ),
            ScoringRecord(
                id=str(uuid.uuid4()),
                run_id=run.id,
                metric_category="TIMELINESS",
                metric_name="Decision Response Timeliness",
                score_value=latency_score,
                weight=0.15,
                numerator=mean_latency,
                denominator=float(len(response_latencies) if response_latencies else 1),
                formula_description="Average latency in seconds from first delivered sensor observation to trainee action",
                evidence_limited_count=evidence_limited_count,
                unassessable_count=unassessable_count,
                calculation_details={"mean_latency_seconds": mean_latency, "samples": len(response_latencies)}
            ),
            ScoringRecord(
                id=str(uuid.uuid4()),
                run_id=run.id,
                metric_category="EVIDENCE_AWARENESS",
                metric_name="Degraded Information Discipline",
                score_value=evidence_awareness_score,
                weight=0.20,
                numerator=float(max(0, 100 - blind_guesses * 15)),
                denominator=100.0,
                formula_description="100 - (Blind Guesses on Zero Evidence * 15), rewarding verification requests",
                evidence_limited_count=evidence_limited_count,
                unassessable_count=unassessable_count,
                calculation_details={"blind_guesses_penalized": blind_guesses}
            )
        ]

        db.bulk_save_objects(records)
        db.commit()

        # Build output structure
        return {
            "run_id": run.id,
            "trainee_id": run.trainee_id,
            "overall_score": overall_score,
            "detection_score": detection_rate,
            "classification_score": classification_accuracy,
            "timeliness_score": latency_score,
            "evidence_awareness_score": evidence_awareness_score,
            "summary_metrics": run.summary_metrics,
            "metrics": records,
            "decision_evaluations": decision_evals,
            "evidence_aware_disclaimer": "GARUDA Evidence-Aware Scoring: Trainees are evaluated strictly against observations actually delivered. Dropped or delayed packets do not penalize the trainee as misses."
        }

