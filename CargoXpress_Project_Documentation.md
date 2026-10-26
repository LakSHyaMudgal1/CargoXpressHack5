# CargoXpress — Smart Truck Load Merging & Logistics Optimization

---

## 1. Executive Summary & The Big Idea

In the freight and logistics industry, **over 30% to 40% of truck capacity goes empty on highways**, while transport companies burn expensive fuel running half-filled trucks along the exact same highway corridors. At the same time, small and medium traders struggle to move partial loads because hiring a full truck is prohibitively expensive.

**CargoXpress** is an intelligent **Truck Load & Route Merging Platform**. It functions as an automated consolidation and ride-share system for freight logistics:
1. It analyzes delivery schedules, highway corridors, and multi-stop capacity.
2. It detects when two trucks are traveling along overlapping routes and merges their compatible shipments into a single vehicle.
3. It frees up the secondary vehicle into a **Free Truck Pool** for new transport jobs.
4. It enables independent traders to plug partial shipments directly into trucks with surplus capacity.

---

## 2. The Core Problem Statement

Traditional freight transport faces systemic inefficiencies:

- **Deadheading & Sub-optimal Load Factors**: Trucks frequently operate below capacity or return empty.
- **Redundant Trips**: Multiple logistics companies operate half-full trucks on identical highway routes (e.g., Delhi–Mumbai or Mumbai–Ahmedabad).
- **High Operational Costs**: Burning double the fuel, paying double tolls, driver wages, and vehicle wear-and-tear for loads that could fit in one truck.
- **Environmental Impact**: High carbon footprint ($CO_2$ emissions per ton-kilometer).
- **Trader Barrier to Entry**: Small businesses needing to ship partial loads are either forced to pay high LTL (Less-Than-Truckload) markups or delay shipments until a truck is fully booked.

---

## 3. Platform Roles & User Personas

The system features multi-tenant Role-Based Access Control (RBAC) connecting three key stakeholders:

### 1. Transport Company (Fleet Operator)
- **Registration**: Signs up with company name, email, password, and state registration number.
- **Fleet Registration**: Adds trucks specifying license plate number, total weight capacity (kg), and existing load distribution across stops.
- **Route Planning**: Defines highway corridors with source, destination, and ordered intermediate stops (e.g., *Mumbai → Surat → Vadodara → Ahmedabad*).
- **Fleet Monitoring**: Tracks capacity utilization across every route segment.

### 2. Trader (Goods Shipper)
- **Registration**: Signs up with name, email, password, and 12-digit Aadhaar number.
- **Delivery Requests**: Submits shipment details including origin, destination, intermediate delivery points, and shipment weight (kg) per stop.
- **Cost Reduction**: Achieves fair, pay-per-kg shipping by utilizing pre-scheduled trucks rather than chartering an entire vehicle.

### 3. Admin (Platform Dispatcher & Operations Manager)
- **Route Optimization Engine**: Discovers mergeable truck pairs based on corridor containment and capacity availability.
- **Merge Decisions**: Approves merges (`Accept`), creating combined dispatch schedules and transferring redundant trucks to the `FreeTruck` pool, or dispatches trucks independently (`Reject`).
- **Trader Cargo Matching**: Matches pending trader requests with trucks traveling the requested corridor and automatically recalculates truck capacity in real time.
- **Registry Oversight**: Views all registered transport companies, fleets, and active traders.

---

## 4. End-to-End Operational Workflow

```
[ Transport Company ] ── Registers Trucks & Routes ──┐
                                                      │
[ Trader ] ────────────── Submits Delivery Request ───┼──> [ CargoXpress Engine ]
                                                      │           │
[ Admin Dispatcher ] ──── Runs Optimization ──────────┘           ▼
                                                       ┌─────────────────────┐
                                                       │ 1. Pair Merging     │
                                                       │ 2. Free Truck Pool  │
                                                       │ 3. Trader Cargo Fit │
                                                       │ 4. Final Dispatch   │
                                                       └─────────────────────┘
```

### Detailed Scenario Walkthrough

Consider the realistic test scenario pre-configured in the platform:

1. **Truck 1 (FastTrack Logistics)**:
   - Capacity: **8,000 kg**
   - Route: `Mumbai → Surat → Vadodara → Ahmedabad → Rajkot` (5 stops)
   - Current load: `[1000, 800, 600, 500, 400] kg` (Mostly empty)

2. **Truck 2 (NorthStar Transport)**:
   - Capacity: **5,000 kg**
   - Route: `Mumbai → Surat → Vadodara → Ahmedabad` (4 stops, complete subset of Truck 1)
   - Current load: `[900, 700, 600, 500] kg`

3. **Optimization Discovery**:
   - The admin opens the **Route Optimization** dashboard.
   - The engine checks corridor containment: Truck 2's stops are completely covered within Truck 1's route.
   - The engine checks capacity feasibility at each stop:
     - At Mumbai: Remaining space in Truck 1 ($7,000\text{ kg}$) $\ge$ Load of Truck 2 ($900\text{ kg}$) ✅
     - At Surat: Remaining space ($7,200\text{ kg}$) $\ge$ Load ($700\text{ kg}$) ✅
     - At Vadodara: Remaining space ($7,400\text{ kg}$) $\ge$ Load ($600\text{ kg}$) ✅
     - At Ahmedabad: Remaining space ($7,500\text{ kg}$) $\ge$ Load ($500\text{ kg}$) ✅

4. **Merge Execution**:
   - Admin approves the merge.
   - Truck 1 carries both shipments ($1,000 + 900 = 1,900\text{ kg}$ total load, leaving $>6,000\text{ kg}$ capacity).
   - **Truck 2 is relieved from duty and moved to the Free Truck Pool**, immediately ready to take a new shipment contract.

5. **Trader Cargo Ingestion**:
   - Trader **Ramesh Kumar** needs to move **500 kg** from `Surat → Ahmedabad`.
   - Admin runs the **Trader Merging Engine**.
   - Truck 1 covers Surat to Ahmedabad with ample headroom.
   - Admin approves: Truck 1's load at Surat and Ahmedabad increases by 500 kg, and remaining load is updated live.

---

## 5. Technical Architecture & Implementation

### 5.1 Architecture Stack
- **Frontend**: React 19, Vite, React Router v7, Redux Toolkit, Tailwind CSS, DaisyUI, Lucide React icons.
- **Backend**: Node.js, Express.js REST API, Mongoose ODM.
- **Database**: MongoDB Atlas.
- **Security**: JWT stored in `httpOnly` secure cookies, bcrypt password hashing, input sanitization via validator.
- **Deployment**: Supports both standard Node servers and serverless environments (Vercel).

### 5.2 Key Data Models
- `TransportCompany`: Fleet owner credentials and profile.
- `Trader`: Shipper identity and verification (Aadhaar).
- `Admin`: Dispatcher authorization (`@cargoxpress.com`).
- `Truck`: Vehicle record with capacity and sequential stop load arrays (`currentLoad`, `remainingLoad`).
- `Route`: Geographic itinerary with ordered `stops`.
- `TraderRequest`: Shipper orders with origin, destination, and stop loads.
- `MergeablePair`: Computed candidate truck pairs awaiting review.
- `MergedSchedule`: Approved consolidated or independent route manifests.
- `FreeTruck`: Surplus vehicles made available by consolidation.
- `MergeableTrader`: Record of trader shipments assigned to carrier trucks.

---

## 6. Business Value & Environmental Impact

| Metric | Traditional Logistics | With CargoXpress |
| :--- | :--- | :--- |
| **Fleet Capacity Utilization** | 40% – 60% | **85% – 95%+** |
| **Fuel & Operating Costs** | Duplicated on common routes | **Reduced by up to 50%** on merged routes |
| **Carbon Footprint ($CO_2$)** | High per ton-km | **Substantially reduced** via fleet consolidation |
| **Fleet Asset Efficiency** | Vehicles locked in sub-optimal runs | **Free Truck Pool** creates instant capacity |
| **Trader Shipping Rates** | High full-truck or LTL charges | **Pay-per-kg** rate on active trucks |

---

## 7. Demo Accounts & Verification

| Role | Email ID | Password | Key Testing Walkthrough |
| :--- | :--- | :--- | :--- |
| **Admin** | `dinky@cargoxpress.com` | `Admin@1234` | Open Admin Dashboard → Route Optimization → Find Mergeable Routes → Accept Merge → Inspect Approved Merged Routes & Trader Cargo. |
| **Transport Company** | `fasttrack@logistics.com` | `Test@1234` | Add a truck with capacities and loads → Define route stops. |
| **Trader** | `ramesh@trading.com` | `Test@1234` | Submit delivery request with stops and weights. |
