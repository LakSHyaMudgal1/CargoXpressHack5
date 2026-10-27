import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import {
  Package,
  Plus,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight
} from "lucide-react";
import { BASE_URL } from "../utils/constants";
import PageHeader from "../components/ui/PageHeader";
import StatCard from "../components/ui/StatCard";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import SearchInput from "../components/ui/SearchInput";
import Modal from "../components/ui/Modal";
import { CardSkeleton } from "../components/ui/Skeleton";
import EmptyState from "../components/ui/EmptyState";
import ErrorPanel from "../components/ui/ErrorPanel";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "../components/ui/Table";

const TraderDashboard = () => {
  const [traderData, setTraderData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "in_transit" | "awaiting" | "delivered" | "failed"

  // Selected shipment for milestone tracking modal
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchTraderData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(BASE_URL + "/trader/my-requests", { withCredentials: true });
      setTraderData(res.data);
    } catch (err) {
      console.error("Trader requests fetch failed:", err);
      setError(err.response?.data?.message || err.message || "Failed to load trader consignments data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTraderData();
  }, []);

  const stats = traderData?.stats || {
    totalRequests: 0,
    awaitingAssignment: 0,
    inTransit: 0,
    delivered: 0,
    failed: 0,
  };

  const requests = traderData?.requests || [];

  // Filter requests
  const filteredRequests = requests.filter((r) => {
    if (statusFilter === "in_transit" && r.status !== "in_transit" && r.status !== "assigned" && r.status !== "partially_delivered") return false;
    if (statusFilter === "awaiting" && r.status !== "awaiting_assignment") return false;
    if (statusFilter === "delivered" && r.status !== "delivered") return false;
    if (statusFilter === "failed" && r.status !== "delivery_failed") return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const sourceMatch = r.source && r.source.toLowerCase().includes(q);
    const destMatch = r.destination && r.destination.toLowerCase().includes(q);
    const plateMatch = r.carrierLicensePlate && r.carrierLicensePlate.toLowerCase().includes(q);
    const idMatch = r._id && r._id.toLowerCase().includes(q);

    return sourceMatch || destMatch || plateMatch || idMatch;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case "delivered":
        return <Badge variant="emerald" size="sm" dot>Delivered</Badge>;
      case "in_transit":
        return <Badge variant="aqua" size="sm" dot>In Transit</Badge>;
      case "partially_delivered":
        return <Badge variant="amber" size="sm" dot>Partially Delivered</Badge>;
      case "assigned":
        return <Badge variant="purple" size="sm" dot>Carrier Assigned</Badge>;
      case "delivery_failed":
        return <Badge variant="coral" size="sm" dot>Delivery Exception</Badge>;
      case "awaiting_assignment":
      default:
        return <Badge variant="neutral" size="sm">Awaiting Carrier</Badge>;
    }
  };

  const handleTrackShipment = (req) => {
    setSelectedShipment(req);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Page Header with Prominent Consignment Creation Action */}
      <PageHeader
        eyebrow="Consignor Cargo Hub"
        title="Freight Consignments & Tracking"
        description="Book cargo shipments, monitor vehicle pairing status, and track delivery progress across regional corridors."
        badge={<Badge variant="emerald" dot>Consignor Portal</Badge>}
        breadcrumbs={[
          { label: "Consignor", href: "/trader" },
          { label: "My Consignments" },
        ]}
        actions={
          <div className="flex items-center gap-2.5">
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchTraderData}
              isLoading={loading}
              leftIcon={RefreshCw}
            >
              Refresh
            </Button>
            <Link to="/traderRequest">
              <Button variant="primary" size="sm" leftIcon={Plus}>
                New Shipment Request
              </Button>
            </Link>
          </div>
        }
      />

      {/* Error Panel if failed */}
      {error && (
        <ErrorPanel
          title="Consignments Load Error"
          message={error}
          onRetry={fetchTraderData}
        />
      )}

      {/* 2. Delivery Exceptions Notification Banner (If Any Failures Occurred) */}
      {stats.failed > 0 && (
        <div className="p-4 rounded-lg bg-surface-elevated border border-signal-coral/30 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-signal-coral/10 border border-signal-coral/20 flex items-center justify-center text-signal-coral shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold text-xs sm:text-sm text-ink">
                {stats.failed} Delivery Exception{stats.failed > 1 ? "s" : ""} Recorded
              </span>
              <p className="text-xs text-ink-muted mt-0.5">
                One or more cargo consignments encountered delivery issues at destination. Review exception records below.
              </p>
            </div>
          </div>
          <Button
            variant="destructive"
            size="xs"
            onClick={() => setStatusFilter("failed")}
          >
            View Exceptions
          </Button>
        </div>
      )}

      {/* 3. Consignment Status KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Total Consignments"
          value={stats.totalRequests}
          unit="Shipments"
          subtitle="All registered cargo bookings"
          change="Account Total"
          changeType="neutral"
        />
        <StatCard
          label="Active in Transit"
          value={stats.inTransit}
          unit="En Route"
          subtitle="Currently onboard carrier vehicles"
          change="Live Delivery"
          changeType="positive"
        />
        <StatCard
          label="Awaiting Carrier"
          value={stats.awaitingAssignment}
          unit="Pending"
          subtitle="Awaiting dispatch vehicle pairing"
          change={stats.awaitingAssignment > 0 ? "In Allocation" : "All Paired"}
          changeType={stats.awaitingAssignment > 0 ? "warning" : "positive"}
        />
        <StatCard
          label="Delivered Consignments"
          value={stats.delivered}
          unit="Completed"
          subtitle="Successfully fulfilled shipments"
          change={stats.failed > 0 ? `${stats.failed} Exceptions` : "100% Fulfilled"}
          changeType={stats.failed > 0 ? "negative" : "positive"}
        />
      </div>

      {/* 4. Consignments Registry & Tracking Table */}
      <div className="space-y-4 pt-2 border-t border-border">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Segmented Filter Controls */}
          <div className="inline-flex items-center p-1 rounded-md bg-surface-elevated border border-border shrink-0 overflow-x-auto">
            {[
              { id: "all", label: "All Cargo", count: requests.length },
              { id: "in_transit", label: "In Transit", count: stats.inTransit },
              { id: "awaiting", label: "Awaiting Carrier", count: stats.awaitingAssignment },
              { id: "delivered", label: "Delivered", count: stats.delivered },
              { id: "failed", label: "Exceptions", count: stats.failed },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono uppercase tracking-wider transition-all select-none ${
                  statusFilter === tab.id
                    ? "bg-surface text-signal-emerald border border-border font-semibold shadow-sm"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                <span>{tab.label}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/5 text-ink-subtle">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="max-w-xs w-full">
            <SearchInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClear={() => setSearchQuery("")}
              placeholder="Search origin, destination, or truck..."
            />
          </div>
        </div>

        {/* Consignments Table */}
        {loading ? (
          <CardSkeleton />
        ) : filteredRequests.length > 0 ? (
          <Table>
            <TableHeader>
              <tr>
                <TableHead>Consignment</TableHead>
                <TableHead>Route Corridor</TableHead>
                <TableHead>Cargo Weight</TableHead>
                <TableHead>Carrier Assignment</TableHead>
                <TableHead>Milestone Status</TableHead>
                <TableHead align="right">Tracking</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {filteredRequests.map((req) => (
                <TableRow key={req._id} hover>
                  {/* ID & Date */}
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-mono text-xs font-semibold text-ink">
                        #{req._id?.slice(-6).toUpperCase()}
                      </span>
                      <span className="text-[10.5px] font-mono text-ink-subtle">
                        {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : ""}
                      </span>
                    </div>
                  </TableCell>

                  {/* Corridor */}
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <div className="text-xs font-mono font-medium text-ink flex items-center gap-1.5 flex-wrap">
                        <span>{req.source}</span>
                        <span className="text-ink-subtle">→</span>
                        <span>{req.destination}</span>
                      </div>
                      {req.stops && req.stops.length > 0 && (
                        <span className="text-[10.5px] font-mono text-ink-subtle">
                          via {req.stops.join(", ")}
                        </span>
                      )}
                    </div>
                  </TableCell>

                  {/* Weight */}
                  <TableCell isNumeric>
                    <span className="font-mono text-xs font-semibold text-ink">
                      {req.weightKg?.toLocaleString()} kg
                    </span>
                  </TableCell>

                  {/* Carrier */}
                  <TableCell>
                    {req.carrierLicensePlate ? (
                      <div className="flex flex-col">
                        <span className="font-mono text-xs font-semibold text-signal-aqua">
                          {req.carrierLicensePlate}
                        </span>
                        {req.driverName && (
                          <span className="text-[10.5px] text-ink-subtle">
                            Driver: {req.driverName}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-ink-subtle text-xs font-mono">
                        Awaiting Carrier
                      </span>
                    )}
                  </TableCell>

                  {/* Status Badge */}
                  <TableCell>
                    <div className="flex flex-col gap-1 items-start">
                      {getStatusBadge(req.status)}
                      <span className="text-[10.5px] text-ink-subtle font-mono truncate max-w-[160px]">
                        {req.latestMilestone || req.statusLabel}
                      </span>
                    </div>
                  </TableCell>

                  {/* Action */}
                  <TableCell align="right">
                    <Button
                      variant="secondary"
                      size="xs"
                      onClick={() => handleTrackShipment(req)}
                      rightIcon={ArrowRight}
                    >
                      Track Cargo
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState
            icon={Package}
            title="No Consignments Found"
            description={
              searchQuery
                ? `No shipments matching query "${searchQuery}".`
                : "You have not registered any cargo delivery requests in this category. Submit a request to have your freight paired with carrier trucks."
            }
            actionLabel="New Shipment Request"
            onAction={() => window.location.assign("/traderRequest")}
          />
        )}
      </div>

      {/* 5. Live Consignment Tracking & Milestone Inspection Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedShipment(null);
        }}
        title="Freight Consignment Milestone Verification"
        description={selectedShipment ? `Consignment #${selectedShipment._id?.slice(-6).toUpperCase()} — ${selectedShipment.source} → ${selectedShipment.destination}` : ""}
        size="md"
        footer={
          <Button
            variant="secondary"
            onClick={() => {
              setIsModalOpen(false);
              setSelectedShipment(null);
            }}
          >
            Close Tracking
          </Button>
        }
      >
        {selectedShipment && (
          <div className="space-y-4 text-xs">
            {/* Summary card */}
            <div className="p-3.5 rounded-lg bg-surface-elevated border border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs sm:text-sm text-ink font-mono">
                  {selectedShipment.source} → {selectedShipment.destination}
                </span>
                {getStatusBadge(selectedShipment.status)}
              </div>
              <div className="flex items-center justify-between text-ink-subtle font-mono text-[11px] border-t border-border/40 pt-1.5">
                <span>Cargo Weight: <strong className="text-ink">{selectedShipment.weightKg} kg</strong></span>
                <span>Carrier Truck: <strong className="text-signal-aqua">{selectedShipment.carrierLicensePlate || "Pending Pairing"}</strong></span>
              </div>
              {selectedShipment.failureReason && (
                <div className="p-2 rounded bg-signal-coral/10 border border-signal-coral/20 text-signal-coral text-xs">
                  <strong>Delivery Exception:</strong> {selectedShipment.failureReason}
                </div>
              )}
            </div>

            {/* Milestones list */}
            <div className="space-y-2">
              <span className="cx-eyebrow text-ink-muted">
                Milestone Verification History
              </span>

              <div className="space-y-2">
                {(selectedShipment.milestones || []).map((m, mIdx) => (
                  <div
                    key={mIdx}
                    className="p-2.5 rounded-lg bg-surface border border-border flex items-center gap-3"
                  >
                    {m.completed ? (
                      <CheckCircle2 className="w-4 h-4 text-signal-emerald shrink-0" />
                    ) : m.error ? (
                      <XCircle className="w-4 h-4 text-signal-coral shrink-0" />
                    ) : (
                      <Clock className="w-4 h-4 text-ink-subtle shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-xs text-ink">{m.event}</p>
                      {m.location && (
                        <p className="text-[11px] text-ink-subtle font-mono">{m.location}</p>
                      )}
                      {m.error && (
                        <p className="text-[11px] text-signal-coral mt-0.5">{m.error}</p>
                      )}
                    </div>
                    {m.timestamp && (
                      <span className="font-mono text-[10px] text-ink-subtle">
                        {new Date(m.timestamp).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default TraderDashboard;
