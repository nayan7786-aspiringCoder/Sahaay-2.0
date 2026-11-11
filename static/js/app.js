/**
 * Sahaay 2.0 - Client Application
 * Handles API integration with Flask Backend (GET, POST, PUT, DELETE)
 * Supports live local / cloud API mode and graceful GitHub Pages preview.
 */

// Determine API Base URL
// When served via Flask: uses relative '/api'
// When hosted on GitHub Pages: allows custom API host or falls back gracefully
const API_BASE = (window.location.hostname.includes("github.io"))
  ? (localStorage.getItem("sahaay_api_url") || "/api")
  : "/api";

// State Management
let currentFilterSkill = "all";
let currentSearchTerm = "";
let activeChatHelperId = null;
let activeHelperForBooking = null;

// Built-in offline fallback data for instant GitHub Pages demonstration
const FALLBACK_HELPERS = [
  {
    id: 1,
    name: "Sunita Sharma",
    phone: "9876543210",
    location: "Indiranagar, Sector 12",
    skills: ["Cleaning House", "Washing Clothes", "Washing Dishes"],
    timings: "Morning (07:00 AM - 11:00 AM)",
    experience_years: 4,
    hourly_rate: 160,
    bio: "Punctual, thorough cleaner with 4 years experience in household domestic help.",
    is_emergency: 0,
    availability_status: "Available",
    avatar_color: "#2d6a4f"
  },
  {
    id: 2,
    name: "Ramesh Kumar",
    phone: "9811223344",
    location: "Green Park, Block C",
    skills: ["Cooking", "Washing Dishes"],
    timings: "Afternoon & Evening (12:00 PM - 08:00 PM)",
    experience_years: 6,
    hourly_rate: 250,
    bio: "Specialized in North & South Indian home cooking, hygienic and reliable.",
    is_emergency: 0,
    availability_status: "Available",
    avatar_color: "#40916c"
  },
  {
    id: 3,
    name: "Priya Verma",
    phone: "9712345678",
    location: "Model Town, Phase 1",
    skills: ["Babysitting", "Cooking", "Cleaning House"],
    timings: "Morning & Afternoon (09:00 AM - 04:00 PM)",
    experience_years: 5,
    hourly_rate: 220,
    bio: "Experienced nanny and gentle child caregiver with references from 3 families.",
    is_emergency: 0,
    availability_status: "Available",
    avatar_color: "#1b4332"
  },
  {
    id: 4,
    name: "Vikram Rao (Vikram Electricals)",
    phone: "9900112233",
    location: "City Center & Surrounding 10km",
    skills: ["Electrician"],
    timings: "24x7 Immediate Emergency Dispatch",
    experience_years: 9,
    hourly_rate: 300,
    bio: "Certified licensed electrician. Short circuits, MCB tripping, emergency repairs.",
    is_emergency: 1,
    availability_status: "Available Now",
    avatar_color: "#b02a37"
  },
  {
    id: 5,
    name: "Mohan Lal (SafeFlow Plumbing)",
    phone: "9955443322",
    location: "Metro Area (Within 30 mins)",
    skills: ["Plumber"],
    timings: "On-Call Emergency (06:00 AM - 11:30 PM)",
    experience_years: 11,
    hourly_rate: 280,
    bio: "Rapid response plumber. Water pipe bursts, severe blockage & pump repair.",
    is_emergency: 1,
    availability_status: "Available Now",
    avatar_color: "#087f5b"
  }
];

// Fallback memory store when running purely static
let memoryHelpers = [...FALLBACK_HELPERS];
let memoryBookings = [];
let memoryChat = {
  1: [
    { sender: "customer", text: "Hello Sunita ji, are you available for house cleaning this Saturday?" },
    { sender: "helper", text: "Namaste! Yes, I am free from 8:00 AM onwards. What is your sector?" }
  ]
};

// ----------------------------------------------------------------------------
// Initialization
// ----------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  initCustomSkillAdder();
  initRegistrationForm();
  initBookingForm();
  initChatForm();
  initSearchAndFilters();
  
  // Load initial helpers list via HTTP GET
  loadHelpers();
  loadBookings();
});

// ----------------------------------------------------------------------------
// Navigation Tabs
// ----------------------------------------------------------------------------
function initTabs() {
  const tabButtons = document.querySelectorAll(".tab-btn");
  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-tab");
      switchTab(targetId);
    });
  });
}

function switchTab(targetId) {
  // Update buttons
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-tab") === targetId);
  });
  
  // Update panels
  document.querySelectorAll(".section-panel").forEach(panel => {
    panel.classList.toggle("active", panel.id === targetId);
  });

  if (targetId === "browse-panel") {
    loadHelpers();
  } else if (targetId === "emergency-panel") {
    loadEmergencyHelpers();
  } else if (targetId === "bookings-panel") {
    loadBookings();
  }

  window.scrollTo({ top: 320, behavior: "smooth" });
}

// ----------------------------------------------------------------------------
// HTTP GET: Fetch & Render Helpers
// ----------------------------------------------------------------------------
async function loadHelpers() {
  const container = document.getElementById("helpers-grid");
  container.innerHTML = `<div class="empty-state"><p>Loading household helpers...</p></div>`;

  try {
    let url = `${API_BASE}/helpers?emergency=0`;
    if (currentSearchTerm) url += `&search=${encodeURIComponent(currentSearchTerm)}`;
    if (currentFilterSkill && currentFilterSkill !== "all") {
      url += `&skill=${encodeURIComponent(currentFilterSkill)}`;
    }

    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const result = await response.json();
    renderHelpersList(result.data, container, false);
  } catch (err) {
    console.warn("API request failed, rendering local demonstration helpers:", err);
    // Offline / GitHub Pages fallback filter
    let filtered = memoryHelpers.filter(h => h.is_emergency === 0);
    if (currentFilterSkill && currentFilterSkill !== "all") {
      filtered = filtered.filter(h => h.skills.some(s => s.toLowerCase().includes(currentFilterSkill.toLowerCase())));
    }
    if (currentSearchTerm) {
      const q = currentSearchTerm.toLowerCase();
      filtered = filtered.filter(h =>
        h.name.toLowerCase().includes(q) ||
        h.location.toLowerCase().includes(q) ||
        h.skills.some(s => s.toLowerCase().includes(q))
      );
    }
    renderHelpersList(filtered, container, false);
  }
}

// ----------------------------------------------------------------------------
// HTTP GET: Fetch & Render Emergency Services
// ----------------------------------------------------------------------------
async function loadEmergencyHelpers() {
  const container = document.getElementById("emergency-grid");
  container.innerHTML = `<div class="empty-state"><p>Loading emergency services...</p></div>`;

  try {
    const response = await fetch(`${API_BASE}/emergency`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const result = await response.json();
    renderHelpersList(result.data, container, true);
  } catch (err) {
    const emergencyList = memoryHelpers.filter(h => h.is_emergency === 1);
    renderHelpersList(emergencyList, container, true);
  }
}

function renderHelpersList(helpers, container, isEmergency) {
  if (!helpers || helpers.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-state-icon">🔍</div>
        <h3>No helpers found</h3>
        <p>Try clearing your search or selecting a different service category.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = helpers.map(helper => {
    const skillsArray = Array.isArray(helper.skills) ? helper.skills : [];
    const skillsHtml = skillsArray.map(s => `<span class="skill-tag">${escapeHtml(s)}</span>`).join("");
    const initials = helper.name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();

    return `
      <div class="helper-card" id="helper-card-${helper.id}">
        <div class="card-top">
          <div class="helper-avatar" style="background: ${helper.avatar_color || '#2d6a4f'}">
            ${initials}
          </div>
          <div class="helper-header-info">
            <div class="helper-name-row">
              <h3 class="helper-name">${escapeHtml(helper.name)}</h3>
              <span class="status-badge ${helper.is_emergency ? 'emergency' : ''}">
                ${escapeHtml(helper.availability_status || 'Available')}
              </span>
            </div>
            <div class="helper-location">
              📍 ${escapeHtml(helper.location)}
            </div>
          </div>
        </div>

        <div class="card-meta-chips">
          <span class="meta-chip">⏰ ${escapeHtml(helper.timings || 'Flexible')}</span>
          <span class="meta-chip">⭐ ${helper.experience_years} yrs exp</span>
        </div>

        <div class="skills-wrapper">
          ${skillsHtml}
        </div>

        <p class="helper-bio">${escapeHtml(helper.bio || 'Reliable household helper.')}</p>

        <div class="card-footer">
          <div>
            <span class="hourly-rate">₹${helper.hourly_rate}</span>
            <span class="rate-label">${helper.is_emergency ? 'per visit' : 'per hour'}</span>
          </div>

          <div class="card-actions">
            <button class="btn-chat" onclick="openChatModal(${helper.id}, '${escapeHtml(helper.name)}')">
              💬 Chat
            </button>
            <button class="btn-book" onclick="openBookingModal(${helper.id}, '${escapeHtml(helper.name)}', ${helper.hourly_rate})">
              Book
            </button>
            <button class="btn-delete-card" title="Delete Profile (HTTP DELETE)" onclick="deleteHelper(${helper.id}, '${escapeHtml(helper.name)}')">
              🗑️
            </button>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

// ----------------------------------------------------------------------------
// HTTP POST: Register as a Helper (Providing Service)
// ----------------------------------------------------------------------------
function initRegistrationForm() {
  const form = document.getElementById("helper-register-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Gather selected skills from checkboxes
    const skillCheckboxes = document.querySelectorAll("input[name='skills']:checked");
    const selectedSkills = Array.from(skillCheckboxes).map(cb => cb.value);

    if (selectedSkills.length === 0) {
      showToast("Please select at least one skill or add a custom skill.", "error");
      return;
    }

    const payload = {
      name: document.getElementById("reg-name").value.trim(),
      phone: document.getElementById("reg-phone").value.trim(),
      location: document.getElementById("reg-location").value.trim(),
      timings: document.getElementById("reg-timings").value.trim(),
      skills: selectedSkills,
      experience_years: parseInt(document.getElementById("reg-exp").value) || 1,
      hourly_rate: parseInt(document.getElementById("reg-rate").value) || 150,
      bio: document.getElementById("reg-bio").value.trim(),
      is_emergency: document.getElementById("reg-emergency").checked ? 1 : 0,
      availability_status: "Available"
    };

    try {
      const response = await fetch(`${API_BASE}/helpers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      showToast(`Success! Helper profile for ${payload.name} created!`, "success");
      form.reset();
      switchTab("browse-panel");
    } catch (err) {
      console.warn("API POST failed, updating local state:", err);
      // Fallback local memory update for GitHub Pages
      const newHelper = {
        id: Date.now(),
        ...payload,
        avatar_color: payload.is_emergency ? "#b02a37" : "#2d6a4f"
      };
      memoryHelpers.unshift(newHelper);
      showToast(`Profile created successfully for ${payload.name}!`, "success");
      form.reset();
      switchTab("browse-panel");
    }
  });
}

// ----------------------------------------------------------------------------
// HTTP DELETE: Delete a Helper Profile
// ----------------------------------------------------------------------------
async function deleteHelper(helperId, helperName) {
  if (!confirm(`Are you sure you want to remove ${helperName}'s profile? (Demonstrates HTTP DELETE)`)) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/helpers/${helperId}`, {
      method: "DELETE"
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    showToast(`Helper profile ${helperName} deleted.`, "success");
    loadHelpers();
  } catch (err) {
    console.warn("API DELETE failed, updating local state:", err);
    memoryHelpers = memoryHelpers.filter(h => h.id !== helperId);
    showToast(`Helper ${helperName} deleted.`, "success");
    loadHelpers();
  }
}

// ----------------------------------------------------------------------------
// HTTP PUT: Update Helper Availability
// ----------------------------------------------------------------------------
async function toggleAvailability(helperId, currentStatus) {
  const newStatus = (currentStatus === "Available") ? "Busy" : "Available";

  try {
    const response = await fetch(`${API_BASE}/helpers/${helperId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ availability_status: newStatus })
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    showToast(`Availability updated to ${newStatus}`, "success");
    loadHelpers();
  } catch (err) {
    const item = memoryHelpers.find(h => h.id === helperId);
    if (item) item.availability_status = newStatus;
    showToast(`Availability updated to ${newStatus}`, "success");
    loadHelpers();
  }
}

// ----------------------------------------------------------------------------
// Booking System (HTTP POST & GET)
// ----------------------------------------------------------------------------
function openBookingModal(helperId, helperName, rate) {
  activeHelperForBooking = { id: helperId, name: helperName, rate: rate };
  document.getElementById("modal-helper-name").innerText = helperName;
  document.getElementById("modal-helper-rate").innerText = `₹${rate}`;
  document.getElementById("booking-modal").classList.add("active");
}

function closeBookingModal() {
  document.getElementById("booking-modal").classList.remove("active");
}

function initBookingForm() {
  const form = document.getElementById("booking-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!activeHelperForBooking) return;

    const payload = {
      helper_id: activeHelperForBooking.id,
      customer_name: document.getElementById("book-name").value.trim(),
      customer_phone: document.getElementById("book-phone").value.trim(),
      customer_address: document.getElementById("book-address").value.trim(),
      service_needed: document.getElementById("book-service").value.trim(),
      booking_date: document.getElementById("book-date").value,
      booking_time: document.getElementById("book-time").value,
      notes: document.getElementById("book-notes").value.trim()
    };

    try {
      const response = await fetch(`${API_BASE}/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      showToast("Booking Confirmed! Helper has been notified.", "success");
    } catch (err) {
      console.warn("API booking failed, using local storage:", err);
      memoryBookings.unshift({
        id: Date.now(),
        helper_name: activeHelperForBooking.name,
        helper_phone: "9876543210",
        ...payload,
        status: "Confirmed"
      });
      showToast("Booking Confirmed! (Demo Mode)", "success");
    }

    closeBookingModal();
    form.reset();
    switchTab("bookings-panel");
  });
}

async function loadBookings() {
  const tbody = document.getElementById("bookings-table-body");
  if (!tbody) return;

  try {
    const response = await fetch(`${API_BASE}/bookings`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const result = await response.json();
    renderBookingsTable(result.data, tbody);
  } catch (err) {
    renderBookingsTable(memoryBookings, tbody);
  }
}

function renderBookingsTable(bookings, tbody) {
  if (!bookings || bookings.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 24px;">No active bookings yet. Book a helper from the browse section!</td></tr>`;
    return;
  }

  tbody.innerHTML = bookings.map(b => `
    <tr>
      <td><strong>#${b.id}</strong></td>
      <td><strong>${escapeHtml(b.helper_name || 'Helper')}</strong></td>
      <td>${escapeHtml(b.customer_name)}<br><small style="color:var(--text-muted);">${escapeHtml(b.customer_phone)}</small></td>
      <td><span class="skill-tag">${escapeHtml(b.service_needed)}</span></td>
      <td>📅 ${escapeHtml(b.booking_date || 'Today')} ${b.booking_time ? '⏰ ' + escapeHtml(b.booking_time) : ''}</td>
      <td><span class="status-badge">${escapeHtml(b.status || 'Confirmed')}</span></td>
    </tr>
  `).join("");
}

// ----------------------------------------------------------------------------
// In-App Chat Modal & Communication (HTTP GET & POST)
// ----------------------------------------------------------------------------
async function openChatModal(helperId, helperName) {
  activeChatHelperId = helperId;
  document.getElementById("chat-helper-title").innerText = `Chat with ${helperName}`;
  document.getElementById("chat-modal").classList.add("active");
  loadChatMessages(helperId);
}

function closeChatModal() {
  document.getElementById("chat-modal").classList.remove("active");
  activeChatHelperId = null;
}

async function loadChatMessages(helperId) {
  const container = document.getElementById("chat-messages-container");
  container.innerHTML = `<p style="text-align: center; color: var(--text-light); font-size: 12px;">Loading chat history...</p>`;

  try {
    const response = await fetch(`${API_BASE}/chat/${helperId}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const result = await response.json();
    renderChatMessages(result.data, container);
  } catch (err) {
    const localMsgs = memoryChat[helperId] || [
      { sender: "helper", text: "Namaste! How can I assist you with your household needs?" }
    ];
    renderChatMessages(localMsgs, container);
  }
}

function renderChatMessages(messages, container) {
  if (!messages || messages.length === 0) {
    container.innerHTML = `<p style="text-align: center; color: var(--text-light); font-size: 12px;">No messages yet. Send a message to discuss timings or requirements!</p>`;
    return;
  }

  container.innerHTML = messages.map(m => `
    <div class="chat-bubble ${m.sender}">
      <div class="chat-bubble-sender">${m.sender === 'customer' ? 'You' : 'Helper'}</div>
      <div>${escapeHtml(m.text)}</div>
    </div>
  `).join("");

  container.scrollTop = container.scrollHeight;
}

function initChatForm() {
  const form = document.getElementById("chat-send-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = document.getElementById("chat-text-input");
    const text = input.value.trim();
    if (!text || !activeChatHelperId) return;

    input.value = "";

    try {
      const response = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          helper_id: activeChatHelperId,
          sender: "customer",
          text: text
        })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      loadChatMessages(activeChatHelperId);
    } catch (err) {
      if (!memoryChat[activeChatHelperId]) memoryChat[activeChatHelperId] = [];
      memoryChat[activeChatHelperId].push({ sender: "customer", text: text });

      // Simulated helper reply after 600ms
      setTimeout(() => {
        memoryChat[activeChatHelperId].push({
          sender: "helper",
          text: "Namaste! Thank you for messaging. I can adjust according to your preferred time and address."
        });
        loadChatMessages(activeChatHelperId);
      }, 600);

      loadChatMessages(activeChatHelperId);
    }
  });
}

// ----------------------------------------------------------------------------
// Custom Skill Adder Feature
// ----------------------------------------------------------------------------
function initCustomSkillAdder() {
  const addBtn = document.getElementById("btn-add-custom-skill");
  const input = document.getElementById("custom-skill-input");
  const container = document.getElementById("skills-checkbox-grid");

  if (!addBtn || !input || !container) return;

  const addSkill = () => {
    const val = input.value.trim();
    if (!val) return;

    const id = "skill-" + Date.now();
    const label = document.createElement("label");
    label.className = "checkbox-label";
    label.innerHTML = `
      <input type="checkbox" name="skills" value="${escapeHtml(val)}" checked>
      ✨ ${escapeHtml(val)}
    `;
    container.appendChild(label);
    input.value = "";
    showToast(`Added custom skill: "${val}"`, "success");
  };

  addBtn.addEventListener("click", addSkill);
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addSkill();
    }
  });
}

// ----------------------------------------------------------------------------
// Search and Skill Filtering
// ----------------------------------------------------------------------------
function initSearchAndFilters() {
  const searchInput = document.getElementById("search-input");
  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener("input", (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        currentSearchTerm = e.target.value.trim();
        loadHelpers();
      }, 250);
    });
  }

  const pillButtons = document.querySelectorAll(".pill-filter");
  pillButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      pillButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilterSkill = btn.getAttribute("data-skill") || "all";
      loadHelpers();
    });
  });
}

// ----------------------------------------------------------------------------
// Utility Functions
// ----------------------------------------------------------------------------
function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${type === 'success' ? '✓' : '⚠️'}</span> <span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
