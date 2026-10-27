import React, { useState } from "react";
import { useDispatch } from "react-redux";
import axios from "axios";
import { UserCog, Save } from "lucide-react";
import { BASE_URL } from "../utils/constants";
import { addUser } from "../utils/userSlice";
import { useToast } from "../components/ui/Toast";
import PageHeader from "../components/ui/PageHeader";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import { ThemePreferencesCard } from "../components/ui/ThemePreferencesCard";
import UserCard from "./UserCard";

const EditProfile = ({ user }) => {
  const [name, setName] = useState(user?.name || "");
  const [photoUrl, setPhotoUrl] = useState(user?.photoUrl || "");
  const [emailId, setEmailId] = useState(user?.emailId || "");

  const isTrader = user?.aadharNumber !== undefined;

  const [address, setAddress] = useState(user?.address || "");
  const [registrationNumber, setRegistrationNumber] = useState(user?.registrationNumber || "");
  const [aadharNumber, setAadharNumber] = useState(user?.aadharNumber || "");

  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const dispatch = useDispatch();
  const { showToast } = useToast();

  const saveProfile = async (e) => {
    e?.preventDefault();
    try {
      setIsSaving(true);
      setError("");
      const payload = isTrader
        ? { name, photoUrl, aadharNumber, emailId }
        : { name, photoUrl, address, registrationNumber, emailId };

      let res;
      if (isTrader) {
        res = await axios.put(BASE_URL + "/profile/traderEdit", payload, { withCredentials: true });
      } else {
        res = await axios.put(BASE_URL + "/profile/companyEdit", payload, { withCredentials: true });
      }
      dispatch(addUser(res.data.data));
      showToast("success", "Profile Updated", "Your account credentials and enterprise information were saved.");
    } catch (err) {
      const errMsg = err.response?.data?.message || err.response?.data || "Failed to update profile.";
      setError(typeof errMsg === "string" ? errMsg : JSON.stringify(errMsg));
      showToast("error", "Update Failed", typeof errMsg === "string" ? errMsg : "Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const previewUser = isTrader
    ? { name, photoUrl, aadharNumber, emailId }
    : { name, photoUrl, address, registrationNumber, emailId };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header */}
      <PageHeader
        eyebrow="Account Settings"
        title="Profile & Identity Credentials"
        description="Manage your enterprise dispatch credentials, contact coordinates, and KYC identity verification records."
        badge={<Badge variant={isTrader ? "emerald" : "aqua"} dot>{isTrader ? "Trader Account" : "Carrier Account"}</Badge>}
        breadcrumbs={[
          { label: isTrader ? "Trader" : "Carrier", href: isTrader ? "/trader" : "/company" },
          { label: "Account Profile" },
        ]}
      />

      {error && (
        <div className="p-3.5 rounded-lg bg-signal-coral/10 border border-signal-coral/20 text-signal-coral text-xs">
          {error}
        </div>
      )}

      {/* 2. Main Form & Preview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form */}
        <div className="lg:col-span-8">
          <Card className="p-6 space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-border/60">
              <UserCog className="w-4 h-4 text-signal-aqua" />
              <h3 className="text-sm font-semibold text-ink">Personal & Enterprise Information</h3>
            </div>

            <form onSubmit={saveProfile} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-ink-muted font-semibold block mb-1.5">
                    Account Name *
                  </label>
                  <Input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-ink-muted font-semibold block mb-1.5">
                    Dispatch Email Address *
                  </label>
                  <Input
                    type="email"
                    value={emailId}
                    onChange={(e) => setEmailId(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-mono uppercase tracking-wider text-ink-muted font-semibold block mb-1.5">
                  Profile Photo URL
                </label>
                <Input
                  type="url"
                  placeholder="https://..."
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                />
              </div>

              {isTrader ? (
                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-ink-muted font-semibold block mb-1.5">
                    Aadhaar UIDAI Number
                  </label>
                  <Input
                    type="text"
                    value={aadharNumber}
                    onChange={(e) => setAadharNumber(e.target.value)}
                    disabled
                  />
                  <span className="text-[10px] text-ink-subtle mt-1 block">
                    Verified KYC identity identifier. Cannot be modified directly.
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-mono uppercase tracking-wider text-ink-muted font-semibold block mb-1.5">
                      Business Registration Number
                    </label>
                    <Input
                      type="text"
                      value={registrationNumber}
                      onChange={(e) => setRegistrationNumber(e.target.value)}
                      disabled
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-mono uppercase tracking-wider text-ink-muted font-semibold block mb-1.5">
                      Dispatch Terminal Address
                    </label>
                    <Input
                      type="text"
                      placeholder="City, State"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-border/60 flex items-center justify-end gap-3">
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSaving}
                  leftIcon={Save}
                >
                  Save Profile
                </Button>
              </div>
            </form>
          </Card>
        </div>

        {/* Right Column: Live Identity Card */}
        <div className="lg:col-span-4 space-y-3">
          <span className="cx-eyebrow text-ink-muted">
            Live Identity Preview
          </span>
          <UserCard user={previewUser} />
        </div>
      </div>

      {/* 3. Visual Appearance & Workspace Theme Preferences */}
      <ThemePreferencesCard />
    </div>
  );
};

export default EditProfile;
