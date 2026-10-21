# GARUDA — Simulation & Sensor Degradation Model

## 1. Deterministic Synthetic Threat Generation

GARUDA avoids dependencies on external live hardware feeds or unpredictable random models by employing a **strictly seeded Pseudorandom Number Generator (PRNG)** (`random.Random(seed)`).

Given an identical `seed` and `ScenarioConfiguration`, GARUDA guarantees:
- Exact same drone threat profiles generated
- Exact same ingress bearing, speed, and altitude vectors
- Exact same telemetry sequence over simulation duration $T$

### Synthetic Drone Threat Library

| Drone Category | True Profile | Speed (m/s) | Alt (m) | RCS ($m^2$) | Acoustic (dB) | Hostile? |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Micro-Quadcopter** | Reconnaissance probe | 10 - 18 | 50 - 140 | 0.015 | 58 | **Yes** |
| **Fixed-Wing Loitering** | High-speed Kamikaze munition | 32 - 48 | 200 - 600 | 0.080 | 74 | **Yes** |
| **Heavy Commercial** | Hexacopter with IED payload | 14 - 24 | 100 - 300 | 0.250 | 78 | **Yes** |
| **Friendly Civilian** | Municipal drone + Remote-ID | 8 - 16 | 60 - 120 | 0.030 | 60 | **No** |
| **Wildlife Clutter** | Flock of birds / erratic echo | 6 - 14 | 30 - 150 | 0.008 | 35 | **No** |

---

## 2. Sensor Degradation & Physical Modeling

When a ground truth event $E_{gt}(t)$ occurs at simulation time $t$, it is not instantaneously or perfectly transmitted to the trainee. The degradation pipeline models three real-world electronic warfare factors:

### A. Transmission Latency Jitter
Observations experience Gaussian transport delay:
$$\Delta t_{delay} = \max(0.1, \mathcal{N}(\mu_{delay}, \sigma_{jitter}))$$
The trainee terminal only receives the observation at:
$$t_{delivered} = t_{creation} + \Delta t_{delay}$$

### B. RF Jamming & Packet Loss
Hostile counter-UAS or contested RF environments result in dropped packets:
$$P(Drop) = \text{clamp}(L_{rate} + \Delta_{weather}, 0, 0.90)$$
If dropped:
- `is_lost = True`
- `delivery_status = 'LOST'`
- The packet is stored in the evaluator's ledger but **never transmitted to the trainee's workspace**.

### C. Sensor Measurement Noise
Trainee-visible coordinate blips contain Gaussian measurement uncertainty:
$$x_{obs} = x_{true} + \mathcal{N}(0, \sigma_{noise})$$
$$y_{obs} = y_{true} + \mathcal{N}(0, \sigma_{noise})$$
where $\sigma_{noise} = \text{NoiseLevel} \times 180.0\text{ meters}$.
