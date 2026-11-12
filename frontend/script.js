/**
 * Sahaay 2.0 - Frontend API Integration (Fetch)
 * Connects UI with Python Flask Backend Routes (GET, POST, PUT, DELETE)
 */

// Determine API Base URL
// When running via Flask: uses relative '/api'
// When running on GitHub Pages: uses relative '/api' or local memory if no cloud host
const API_BASE = (window.location.hostname.includes("github.io"))
  ? (localStorage.getItem("sahaay_api_url") || "/api")
  : "/api";

// Local storage fallback for GitHub Pages demo (Starts 100% empty — no fake people)
let memoryHelpers = [];
let memoryBookings = [];
let memoryChat = {};

let currentFilterSkill = "all";
let currentSearchTerm = "";
let activeChatHelperId = null;
let activeHelperForBooking = null;

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

  loadHelpers();
  loadBookings();
});

// ----------------------------------------------------------------------------
// Tabs Navigation
// ----------------------------------------------------------------------------
function initTabs() {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-tab");
      switchTab(targetId);
    });
  });
}

function switchTab(targetId) {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-tab") === targetId);
  });

  document.querySelectorAll(".section-panel").forEach(panel => {
    panel.classList.toggle("active", panel.id === targetId);
  });

  if (targetId === "browse-panel") loadHelpers();
  if (targetId === "emergency-panel") loadEmergencyHelpers();
  if (targetId === "bookings-panel") loadBookings();

  window.scrollTo({ top: 320, behavior: "smooth" });
}

// ----------------------------------------------------------------------------
// HTTP GET: Load Helpers
// ----------------------------------------------------------------------------
async function loadHelpers() {
  const container = document.getElementById("helpers-grid");
  container.innerHTML = `<div class="empty-state"><p>Loading helpers...</p></div>`;

  try {
    let url = `${API_BASE}/helpers?emergency=0`;
    if (currentSearchTerm) url += `&search=${encodeURIComponent(currentSearchTerm)}`;
    if (currentFilterSkill && currentFilterSkill !== "all") {
      url += `&skill=${encodeURIComponent(currentFilterSkill)}`;
    }

    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    renderHelpers(data.data, container, false);
  } catch (err) {
    // If running static on GitHub Pages without backend
    let filtered = memoryHelpers.filter(h => !h.is_emergency);
    if (currentFilterSkill && currentFilterSkill !== "all") {
      filtered = filtered.filter(h => (h.skills || []).some(s => s.toLowerCase().includes(currentFilterSkill.toLowerCase())));
    }
    if (currentSearchTerm) {
      const q = currentSearchTerm.toLowerCase();
      filtered = filtered.filter(h =>
        h.name.toLowerCase().includes(q) ||
        h.location.toLowerCase().includes(q)
      );
    }
    renderHelpers(filtered, container, false);
  }
}

// ----------------------------------------------------------------------------
// HTTP GET: Emergency Helpers
// ----------------------------------------------------------------------------
async function loadEmergencyHelpers() {
  const container = document.getElementById("emergency-grid");
  container.innerHTML = `<div class="empty-state"><p>Loading emergency services...</p></div>`;

  try {
    const res = await fetch(`${API_BASE}/emergency`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    renderHelpers(data.data, container, true);
  } catch (err) {
    const emergencyList = memoryHelpers.filter(h => h.is_emergency);
    renderHelpers(emergencyList, container, true);
  }
}

function renderHelpers(helpers, container, isEmergency) {
  if (!helpers || helpers.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-state-icon">📋</div>
        <h3>No helpers registered yet</h3>
        <p>Click on <strong>"Provide Service"</strong> above to register a helper profile!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = helpers.map(h => {
    const skillsList = Array.isArray(h.skills) ? h.skills : [];
    const skillsHtml = skillsList.map(s => `<span class="skill-tag">${escapeHtml(s)}</span>`).join("");
    const initial = (h.name || "H").charAt(0).toUpperCase();

    return `
      <div class="helper-card">
        <div class="card-top">
          <div class="helper-avatar">${initial}</div>
          <div class="helper-header-info">
            <div class="helper-name-row">
              <h3 class="helper-name">${escapeHtml(h.name)}</h3>
              <span class="status-badge ${h.is_emergency ? 'emergency' : ''}">
                ${escapeHtml(h.availability_status || 'Available')}
              </span>
            </div>
            <div class="helper-location">📍 ${escapeHtml(h.location)}</div>
          </div>
        </div>

        <div class="card-meta-chips">
          <span class="meta-chip">⏰ ${escapeHtml(h.timings || 'Flexible')}</span>
          <span class="meta-chip">⭐ ${h.experience_years || 1} yrs exp</span>
        </div>

        <div class="skills-wrapper">${skillsHtml}</div>
        <p class="helper-bio">${escapeHtml(h.bio || 'Verified household service provider.')}</p>

        <div class="card-footer">
          <div>
            <span class="hourly-rate">₹${h.hourly_rate || 150}</span>
            <span class="rate-label">${h.is_emergency ? 'per visit' : 'per hour'}</span>
          </div>

          <div class="card-actions">
            <button class="btn-chat" onclick="openChatModal(${h.id}, '${escapeHtml(h.name)}')">💬 Chat</button>
            <button class="btn-book" onclick="openBookingModal(${h.id}, '${escapeHtml(h.name)}', ${h.hourly_rate || 150})">Book</button>
            <button class="btn-delete-card" title="Delete Profile (HTTP DELETE)" onclick="deleteHelper(${h.id}, '${escapeHtml(h.name)}')">🗑️</button>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

// ----------------------------------------------------------------------------
// HTTP POST: Register a Helper (Providing Service)
// ----------------------------------------------------------------------------
function initRegistrationForm() {
  const form = document.getElementById("helper-register-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const selectedSkills = Array.from(document.querySelectorAll("input[name='skills']:checked")).map(cb => cb.value);

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
      is_emergency: document.getElementById("reg-emergency").checked ? 1 : 0
    };

    try {
      const res = await fetch(`${API_BASE}/helpers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      showToast(`Helper profile for ${payload.name} created!`, "success");
      form.reset();
      switchTab("browse-panel");
    } catch (err) {
      // Offline fallback
      const newHelper = { id: Date.now(), ...payload, availability_status: "Available" };
      memoryHelpers.unshift(newHelper);
      showToast(`Helper profile for ${payload.name} created!`, "success");
      form.reset();
      switchTab("browse-panel");
    }
  });
}

// ----------------------------------------------------------------------------
// HTTP DELETE: Delete a Helper
// ----------------------------------------------------------------------------
async function deleteHelper(helperId, helperName) {
  if (!confirm(`Are you sure you want to delete ${helperName}? (HTTP DELETE)`)) return;

  try {
    const res = await fetch(`${API_BASE}/helpers/${helperId}`, { method: "DELETE" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    showToast(`Helper ${helperName} deleted.`, "success");
    loadHelpers();
  } catch (err) {
    memoryHelpers = memoryHelpers.filter(h => h.id !== helperId);
    showToast(`Helper ${helperName} deleted.`, "success");
    loadHelpers();
  }
}

// ----------------------------------------------------------------------------
// Bookings (HTTP POST & GET)
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
      const res = await fetch(`${API_BASE}/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      showToast("Booking Confirmed!", "success");
    } catch (err) {
      memoryBookings.unshift({
        id: Date.now(),
        helper_name: activeHelperForBooking.name,
        ...payload,
        status: "Confirmed"
      });
      showToast("Booking Confirmed!", "success");
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
    const res = await fetch(`${API_BASE}/bookings`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    renderBookings(data.data, tbody);
  } catch (err) {
    renderBookings(memoryBookings, tbody);
  }
}

function renderBookings(bookings, tbody) {
  if (!bookings || bookings.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 24px;">No bookings yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = bookings.map(b => `
    <tr>
      <td><strong>#${b.id}</strong></td>
      <td><strong>${escapeHtml(b.helper_name || 'Helper')}</strong></td>
      <td>${escapeHtml(b.customer_name)}<br><small style="color:var(--text-muted);">${escapeHtml(b.customer_phone)}</small></td>
      <td><span class="skill-tag">${escapeHtml(b.service_needed)}</span></td>
      <td>📅 ${escapeHtml(b.booking_date || 'Today')}</td>
      <td><span class="status-badge">${escapeHtml(b.status || 'Confirmed')}</span></td>
    </tr>
  `).join("");
}

// ----------------------------------------------------------------------------
// Chat (HTTP GET & POST)
// ----------------------------------------------------------------------------
async function openChatModal(helperId, helperName) {
  activeChatHelperId = helperId;
  document.getElementById("chat-helper-title").innerText = `Chat with ${helperName}`;
  document.getElementById("chat-modal").classList.add("active");
  loadChat(helperId);
}

function closeChatModal() {
  document.getElementById("chat-modal").classList.remove("active");
  activeChatHelperId = null;
}

async function loadChat(helperId) {
  const container = document.getElementById("chat-messages-container");
  container.innerHTML = `<p style="text-align:center; font-size:12px; color:var(--text-muted);">Loading chat...</p>`;

  try {
    const res = await fetch(`${API_BASE}/chat/${helperId}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    renderChat(data.data, container);
  } catch (err) {
    renderChat(memoryChat[helperId] || [], container);
  }
}

function renderChat(messages, container) {
  if (!messages || messages.length === 0) {
    container.innerHTML = `<p style="text-align:center; font-size:12px; color:var(--text-muted);">No messages yet. Send a message to discuss timings!</p>`;
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
      await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ helper_id: activeChatHelperId, sender: "customer", text: text })
      });
      loadChat(activeChatHelperId);
    } catch (err) {
      if (!memoryChat[activeChatHelperId]) memoryChat[activeChatHelperId] = [];
      memoryChat[activeChatHelperId].push({ sender: "customer", text: text });
      loadChat(activeChatHelperId);
    }
  });
}

// ----------------------------------------------------------------------------
// Custom Skill Adder
// ----------------------------------------------------------------------------
function initCustomSkillAdder() {
  const addBtn = document.getElementById("btn-add-custom-skill");
  const input = document.getElementById("custom-skill-input");
  const container = document.getElementById("skills-checkbox-grid");

  if (!addBtn || !input || !container) return;

  const addSkill = () => {
    const val = input.value.trim();
    if (!val) return;

    const label = document.createElement("label");
    label.className = "checkbox-label";
    label.innerHTML = `<input type="checkbox" name="skills" value="${escapeHtml(val)}" checked> ✨ ${escapeHtml(val)}`;
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
    let timer;
    searchInput.addEventListener("input", (e) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        currentSearchTerm = e.target.value.trim();
        loadHelpers();
      }, 200);
    });
  }

  document.querySelectorAll(".pill-filter").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".pill-filter").forEach(b => b.classList.remove("active"));
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

  setTimeout(() => toast.remove(), 3000);
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
