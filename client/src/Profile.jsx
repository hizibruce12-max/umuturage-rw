
import { useEffect, useRef, useState } from "react";

const API_URL = "http://localhost:5000/api";
const SERVER_URL = "http://localhost:5000";

const emptyForm = {
  fullName: "",
  dateOfBirth: "",
  gender: "",
  maritalStatus: "",
  phone: "",
  email: "",
  province: "",
  district: "",
  sector: "",
  cell: "",
  village: "",
  citizenCode: "",
  emergencyName: "",
  emergencyRelationship: "",
  emergencyPhone: "",
};

function normalizeProfile(data = {}) {
  return {
    ...emptyForm,
    ...data,
    gender: data.gender
      ? data.gender.charAt(0).toUpperCase() +
        data.gender.slice(1).toLowerCase()
      : "",
    email: data.email || "",
  };
}

function getPhotoUrl(url) {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `${SERVER_URL}${url}`;
}

function Profile({ citizen, onProfileUpdated }) {
  const fileInput = useRef(null);

  const [editing, setEditing] = useState(false);
  const [photo, setPhoto] = useState("");
  const [form, setForm] = useState(() => normalizeProfile(citizen));
  const [savedMessage, setSavedMessage] = useState("");
  const [messageType, setMessageType] = useState("success");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [accountStatus, setAccountStatus] = useState("active");

  function showMessage(message, type = "success") {
    setSavedMessage(message);
    setMessageType(type);
  }

  async function apiRequest(endpoint, options = {}) {
    const token = localStorage.getItem("umuturageToken");

    if (!token) {
      throw new Error("Your session has expired. Please sign in again.");
    }

    const response = await fetch(`${API_URL}/${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Something went wrong.");
    }

    return data;
  }

  async function loadProfile() {
    setLoading(true);

    try {
      const data = await apiRequest("profile");
      const profile = normalizeProfile(data.profile);

      setForm(profile);
      setAccountStatus(data.profile.accountStatus || "active");

      const savedPhoto = getPhotoUrl(
        data.profile.profilePhotoUrl ||
          data.profile.profile_photo_url
      );

      setPhoto(savedPhoto);

      if (onProfileUpdated) {
        onProfileUpdated({
          profilePhotoUrl: savedPhoto,
        });
      }
    } catch (error) {
      showMessage(error.message, "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateField(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setSavedMessage("");
  }

  async function handlePhoto(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      showMessage("Please select a JPG, PNG or WebP image.", "error");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showMessage("Please choose an image smaller than 5 MB.", "error");
      event.target.value = "";
      return;
    }

    const token = localStorage.getItem("umuturageToken");

    if (!token) {
      showMessage("Your session has expired. Please sign in again.", "error");
      return;
    }

    const previousPhoto = photo;
    const previewUrl = URL.createObjectURL(file);

    setPhoto(previewUrl);
    setUploadingPhoto(true);
    setSavedMessage("");

    try {
      const formData = new FormData();
      formData.append("photo", file);

      const response = await fetch(`${API_URL}/profile/photo`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Photo upload failed.");
      }

      const savedPhoto = getPhotoUrl(result.profilePhotoUrl);

      setPhoto(savedPhoto);

      if (onProfileUpdated) {
        onProfileUpdated({
          profilePhotoUrl: savedPhoto,
        });
      }

      showMessage(
        result.message || "Profile photo uploaded successfully!",
        "success"
      );
    } catch (error) {
      setPhoto(previousPhoto);
      showMessage(error.message, "error");
    } finally {
      URL.revokeObjectURL(previewUrl);
      setUploadingPhoto(false);

      if (fileInput.current) {
        fileInput.current.value = "";
      }
    }
  }

  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);
    setSavedMessage("");

    try {
      const payload = {
        fullName: form.fullName,
        dateOfBirth: form.dateOfBirth || null,
        gender: form.gender ? form.gender.toLowerCase() : null,
        maritalStatus: form.maritalStatus || null,
        phone: form.phone,
        email: form.email || null,
        province: form.province,
        district: form.district,
        sector: form.sector,
        cell: form.cell,
        village: form.village,
        emergencyName: form.emergencyName,
        emergencyRelationship: form.emergencyRelationship,
        emergencyPhone: form.emergencyPhone,
      };

      const result = await apiRequest("profile", {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      await loadProfile();

      setEditing(false);

      showMessage(
        result.message || "Your profile has been updated successfully.",
        "success"
      );
    } catch (error) {
      showMessage(error.message, "error");
    } finally {
      setSaving(false);
    }
  }

  function cancelEditing() {
    setEditing(false);
    setSavedMessage("");
    loadProfile();
  }

  const inputClass =
    "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50 disabled:text-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:disabled:bg-slate-900";

  const labelClass =
    "text-sm font-semibold text-slate-600 dark:text-slate-300";

  function Field({
    label,
    name,
    type = "text",
    placeholder = "",
    disabled = false,
  }) {
    return (
      <label className="block">
        <span className={labelClass}>{label}</span>
        <input
          type={type}
          name={name}
          value={form[name] || ""}
          onChange={updateField}
          placeholder={placeholder}
          disabled={!editing || disabled}
          className={inputClass}
        />
      </label>
    );
  }

  function SelectField({ label, name, options }) {
    return (
      <label className="block">
        <span className={labelClass}>{label}</span>
        <select
          name={name}
          value={form[name] || ""}
          onChange={updateField}
          disabled={!editing}
          className={inputClass}
        >
          <option value="">Select {label.toLowerCase()}</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    );
  }

  function Section({ title, description, children }) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6 dark:border-slate-700 dark:bg-[#172432]">
        <div className="mb-6">
          <h2 className="text-lg font-bold">{title}</h2>
          <p className="mt-1 text-sm text-slate-400">{description}</p>
        </div>
        {children}
      </section>
    );
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center dark:border-slate-700 dark:bg-[#172432]">
        <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-600" />
        <p className="mt-4 text-sm font-medium text-slate-500">
          Loading your profile...
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold text-emerald-600">
            Personal information
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight md:text-3xl">
            My Profile
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Manage your personal information and contact details.
          </p>
        </div>

        <div className="flex gap-2">
          {editing ? (
            <>
              <button
                type="button"
                onClick={cancelEditing}
                disabled={saving || uploadingPhoto}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold dark:border-slate-600"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving || uploadingPhoto}
                className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save changes"}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                setEditing(true);
                setSavedMessage("");
              }}
              className="rounded-xl bg-[#102D50] px-5 py-3 text-sm font-bold text-white hover:bg-emerald-700"
            >
              ✎ Edit profile
            </button>
          )}
        </div>
      </div>

      {savedMessage && (
        <div
          role="status"
          className={`rounded-xl border p-4 text-sm ${
            messageType === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
              : "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
          }`}
        >
          {savedMessage}
        </div>
      )}

      <Section
        title="Profile photo"
        description="Your photo helps identify your citizen account."
      >
        <div className="flex flex-col items-center gap-5 sm:flex-row">
          <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-emerald-100 bg-[#102D50] text-3xl font-black text-white dark:border-emerald-900">
            {photo ? (
              <img
                src={photo}
                alt="Profile"
                className="h-full w-full object-cover"
              />
            ) : (
              (form.fullName || "C")
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()
            )}
          </div>

          <div>
            <p className="font-bold">{form.fullName || "Your name"}</p>
            <p className="mt-1 text-sm text-slate-400">
              Umuturage.rw citizen profile
            </p>

            <input
              ref={fileInput}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handlePhoto}
              className="hidden"
            />

            <button
              type="button"
              disabled={!editing || uploadingPhoto}
              onClick={() => fileInput.current?.click()}
              className="mt-3 rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {uploadingPhoto ? "Uploading photo..." : "Upload photo"}
            </button>

            <p className="mt-2 text-xs text-slate-400">
              JPG, PNG or WebP · Maximum 5 MB
            </p>
          </div>
        </div>
      </Section>

      <Section
        title="Personal details"
        description="Your basic personal information."
      >
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Full name" name="fullName" />
          <Field label="Date of birth" name="dateOfBirth" type="date" />

          <SelectField
            label="Gender"
            name="gender"
            options={["Male", "Female"]}
          />

          <SelectField
            label="Marital status"
            name="maritalStatus"
            options={["Single", "Married", "Divorced", "Widowed"]}
          />
        </div>
      </Section>

      <Section
        title="Contact information"
        description="How Umuturage.rw and authorized services can reach you."
      >
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Phone number" name="phone" />
          <Field
            label="Email address"
            name="email"
            type="email"
            placeholder="example@email.com"
          />
        </div>

        <p className="mt-4 text-xs text-slate-400">
          Email verification will be added when we connect the account services.
        </p>
      </Section>

      <Section
        title="Residential address"
        description="Your current place of residence in Rwanda."
      >
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Province / City" name="province" />
          <Field label="District" name="district" />
          <Field label="Sector" name="sector" />
          <Field label="Cell" name="cell" />
          <Field label="Village" name="village" />
        </div>
      </Section>

      <Section
        title="Citizen identity"
        description="Your Umuturage.rw account identification."
      >
        <div className="grid gap-5 md:grid-cols-2">
          <Field
            label="Umuturage Citizen Code"
            name="citizenCode"
            disabled
          />

          <div>
            <p className={labelClass}>Account status</p>
            <div className="mt-2 flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {accountStatus.charAt(0).toUpperCase() +
                accountStatus.slice(1)}
            </div>
          </div>
        </div>

        <p className="mt-3 text-xs text-slate-400">
          This is your Umuturage.rw platform code, not an official national
          identification number.
        </p>
      </Section>

      <Section
        title="Emergency contact"
        description="A person to contact in case of an emergency."
      >
        <div className="grid gap-5 md:grid-cols-2">
          <Field
            label="Contact person's full name"
            name="emergencyName"
            placeholder="Full name"
          />
          <Field
            label="Relationship"
            name="emergencyRelationship"
            placeholder="e.g. Parent, spouse, sibling"
          />
          <Field
            label="Emergency phone number"
            name="emergencyPhone"
            placeholder="+250..."
          />
        </div>
      </Section>

      <div className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center dark:border-slate-700 dark:bg-[#172432]">
        <div>
          <p className="font-bold">Your information matters</p>
          <p className="mt-1 text-xs text-slate-400">
            Keep your personal and contact details accurate.
          </p>
        </div>

        {editing && (
          <button
            type="submit"
            disabled={saving || uploadingPhoto}
            className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        )}
      </div>
    </form>
  );
}

export default Profile;
