# GARUDA — End-to-End Operational Demonstration Script

Follow this step-by-step walkthrough to demonstrate GARUDA's end-to-end mission simulation, evidence evaluation, and adaptive training capabilities.

---

### Step 1: Open Command Center
1. Navigate to `http://localhost:5173` (or port 3000 in Docker).
2. Show the **Command Center Overview** with live KPIs, operational status indicators, and the **Core Innovation Callout** explaining the 3-Layer Evidence Architecture:
   - Ground Truth vs Delivered Observations vs Trainee Decisions.

---

### Step 2: Launch Demonstration Scenario
1. Under **Demonstration Scenarios**, click **"Start Training Mission"** on `Alpha-1: Clear Airspace Baseline`.
2. Notice the simulation workspace opens with the **Tactical Radar Grid** displaying range rings (1km to 4km), defense perimeter (1.8km), and real-time clock.
3. Click **"Start Clock"** or **"Step +5s"** to advance simulation time.
4. Observe synthetic drone contacts arriving on radar blips with estimated altitude, speed, and SNR.

---

### Step 3: Record Trainee Decisions
1. Click a contact on the radar or from the **Observed Contacts** bar (e.g. `DRONE-01`).
2. Select **"Classify Contact"** -> Choose `Micro-Quadcopter` -> Select Threat Assessment `HOSTILE`.
3. Set confidence to `90%` and click **"Commit Decision to Evidence Ledger"**.
4. Select another contact and demonstrate **"Mark Uncertain"** or **"Request Sensor Ping"** to show verification protocol under degraded information.

---

### Step 4: Demonstrate the Core Innovation (Degraded vs Ground Truth)
1. Toggle the **"Evaluator Truth ON"** button in the upper right.
2. Evaluator mode unlocks the **Evaluator Ground Truth Overlay**:
   - The true coordinates and classifications appear in green/red vector lines side-by-side with the noisy, delayed blips visible to the trainee!
   - Point out to the evaluator: The trainee interface never leaked this hidden ground truth.

---

### Step 5: Inspect Evidence Timeline
1. Navigate to **Evidence Timeline** from the sidebar.
2. Filter by **"Lost / Jammed Packets"** and **"Delayed Packets"**.
3. Click an event node to inspect its telemetry payload in the **Evidence Packet Inspector**.
4. Explain to the evaluator: Dropped observations are retained in the evaluator's ledger so the scoring engine knows the trainee was blind to that contact.

---

### Step 6: Review Decision Scoring
1. Navigate to **Decision Scoring**.
2. Show the **Overall Score** and the 4 metric cards:
   - Observable Threat Detection Rate
   - Assessable Classification Accuracy
   - Decision Response Timeliness
   - Degraded Information Discipline
3. Point out the **protected denominators** and the **Decision-by-Decision Evidence Audit Ledger** showing the exact evidence count at decision time!

---

### Step 7: After-Action Review & Data Export
1. Navigate to **After-Action Review**.
2. Show the automatically generated **Strengths** and **Target Areas for Improvement**.
3. Click **"Export JSON"** and **"Export CSV"** to demonstrate functional, downloadable mission reports.

---

### Step 8: Adaptive Training Progression
1. Navigate to **Adaptive Training** (or click the recommendation link on the AAR page).
2. Show the rule-based curriculum engine: It detected the trainee's specific operational weakness and generated a tailored drill.
3. Click **"Launch Recommended Exercise"**: GARUDA generates the custom scenario and launches directly into the simulation workspace with 1 click!
