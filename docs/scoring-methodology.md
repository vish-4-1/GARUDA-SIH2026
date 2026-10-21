# GARUDA — Evidence-Aware Scoring Methodology

## 1. Core Evaluation Philosophy

In a high-intensity drone defense scenario under electronic jamming, an operator cannot act on information they never received. Conventional simulators compute metrics by comparing trainee actions directly against ground truth, which produces two major failures:
1. **Unfair Penalties:** Trainees are scored as "missed detection" for drones that were 100% invisible due to packet drops or sensor loss.
2. **False Praise / Guessing:** Trainees who fire randomly on empty radar blips can be awarded accidental credit.

GARUDA formalizes **Evidence-Aware Evaluation** through an immutable evidence ledger.

---

## 2. Mathematical Metric Formulations

### A. Observable Threat Detection Rate ($D_r$)
Evaluates detection strictly against threats that produced at least one delivered sensor observation packet prior to the trainee's decision.
$$D_r = \frac{\sum \text{Detected Observable Hostile Threats}}{\sum \text{Total Observable Hostile Threats}} \times 100$$
*Safe Denominator Protection:* If zero observable hostiles occur ($\text{Denominator} = 0$), $D_r$ defaults safely to $100.0\%$, avoiding `NaN` or zero divide exceptions. Threats whose packets were 100% lost are classified as **Unassessable** and excluded from the denominator.

### B. Assessable Classification Accuracy ($C_a$)
Evaluates whether classifications were accurate among decisions where sufficient delivered evidence ($N_{packets} \ge 1$) existed:
$$C_a = \frac{\sum \text{Correct Trainee Decisions (with Delivered Evidence)}}{\sum \text{Total Assessable Trainee Decisions}} \times 100$$

### C. False Alarm Rate ($F_a$)
Tracks unwarranted kinetic actions or hostile designations against friendly civilian UAVs or wildlife echoes:
$$F_a = \frac{\sum \text{False Hostile Engagements on Non-Threats}}{\sum \text{Total Non-Hostile Contacts}} \times 100$$

### D. Response Latency Score ($T_l$)
Measures response time from the **delivered timestamp** ($t_{delivered}$) rather than the ground-truth creation time:
$$\bar{\Delta t} = \frac{1}{K} \sum_{k=1}^K (t_{decision, k} - t_{first\_delivered, k})$$
$$T_l = \max(30.0, 100.0 - \max(0, \bar{\Delta t} - 4.0) \times 4.0)$$

### E. Degraded Information Discipline ($E_d$)
Rewards prudent tactical verification (such as "Mark Uncertain" or "Request Sensor Ping") under degraded telemetry, and penalizes blind guessing:
$$E_d = \max(0.0, 100.0 - (\text{Blind Decisions on Zero Evidence} \times 15.0))$$

---

## 3. Overall Weighted Score Composite

$$\text{Overall Score} = 0.35 D_r + 0.30 C_a + 0.15 T_l + 0.20 E_d - (0.25 F_a)$$
Clamped strictly to $[0.0, 100.0]$.
