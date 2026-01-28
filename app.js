// SonarQube Java Rules Viewer
// 695개 룰을 표시하는 한글 UI

let rules = [];
let filteredRules = [];
let selectedRuleId = null;
let currentPage = 1;
const RULES_PER_PAGE = 20;

// DOM Elements
const rulesGrid = document.getElementById('rulesGrid');
const ruleDetail = document.getElementById('ruleDetail');
const pagination = document.getElementById('pagination');
const searchInput = document.getElementById('searchInput');
const filteredCountEl = document.getElementById('filteredCount');

// Type icons
const typeIcons = {
  'vulnerability': '🛡️',
  'bug': '🐛',
  'security-hotspot': '🔥',
  'code-smell': '👃'
};

// Type names in Korean
const typeNames = {
  'vulnerability': '취약점',
  'bug': '버그',
  'security-hotspot': '보안 핫스팟',
  'code-smell': '코드 스멜'
};

// Severity names
const severityNames = {
  'blocker': 'Blocker',
  'critical': 'Critical',
  'major': 'Major',
  'minor': 'Minor',
  'info': 'Info'
};

// Load rules from embedded data or JSON file
async function loadRules() {
  rulesGrid.innerHTML = `
    <div class="loading">
      <div class="loading-spinner"></div>
      <p>규칙을 불러오는 중...</p>
    </div>
  `;

  try {
    // Use embedded data (for local file access) or fetch JSON (for server)
    if (typeof RULES_DATA !== 'undefined') {
      rules = RULES_DATA;
    } else {
      const response = await fetch('translated_rules.json');
      rules = await response.json();
    }

    filteredRules = [...rules];
    updateCounts();
    renderRules();
    setupFilters();
  } catch (error) {
    console.error('Failed to load rules:', error);
    rulesGrid.innerHTML = `
      <div class="loading">
        <p>규칙을 불러오는 데 실패했습니다.</p>
        <p style="font-size: 12px; color: #999;">${error.message}</p>
      </div>
    `;
  }
}

// Update filter counts based on active filters
function updateCounts() {
  const { types, severities } = getActiveFilters();

  // Type counts - filtered by selected severities
  const typeCounts = {};
  // Severity counts - filtered by selected types
  const severityCounts = {};

  rules.forEach(rule => {
    // Count types: if no severity filter OR rule matches selected severities
    if (severities.length === 0 || severities.includes(rule.severity)) {
      typeCounts[rule.type] = (typeCounts[rule.type] || 0) + 1;
    }

    // Count severities: if no type filter OR rule matches selected types
    if (types.length === 0 || types.includes(rule.type)) {
      severityCounts[rule.severity] = (severityCounts[rule.severity] || 0) + 1;
    }
  });

  // Update DOM - type counts
  ['vulnerability', 'bug', 'security-hotspot', 'code-smell'].forEach(type => {
    const el = document.getElementById(`count-${type}`);
    if (el) el.textContent = typeCounts[type] || 0;
  });

  // Update DOM - severity counts
  ['blocker', 'critical', 'major', 'minor', 'info'].forEach(severity => {
    const el = document.getElementById(`count-${severity}`);
    if (el) el.textContent = severityCounts[severity] || 0;
  });
}

// Get active filters
function getActiveFilters() {
  const types = [];
  const severities = [];

  document.querySelectorAll('[data-type]:checked').forEach(cb => {
    types.push(cb.dataset.type);
  });

  document.querySelectorAll('[data-severity]:checked').forEach(cb => {
    severities.push(cb.dataset.severity);
  });

  return { types, severities };
}

// Apply filters
function applyFilters() {
  const { types, severities } = getActiveFilters();
  const searchTerm = searchInput.value.toLowerCase().trim();

  filteredRules = rules.filter(rule => {
    const matchesType = types.length === 0 || types.includes(rule.type);
    const matchesSeverity = severities.length === 0 || severities.includes(rule.severity);
    const matchesSearch = searchTerm === '' ||
      rule.name.toLowerCase().includes(searchTerm) ||
      (rule.name_ko && rule.name_ko.toLowerCase().includes(searchTerm)) ||
      rule.id.toLowerCase().includes(searchTerm) ||
      rule.tags.some(tag => tag.toLowerCase().includes(searchTerm));

    return matchesType && matchesSeverity && matchesSearch;
  });

  currentPage = 1;
  filteredCountEl.textContent = filteredRules.length;
  updateCounts();
  renderRules();
}

// Setup filter listeners
function setupFilters() {
  document.querySelectorAll('.filter-checkbox input').forEach(checkbox => {
    checkbox.addEventListener('change', applyFilters);
  });

  searchInput.addEventListener('input', debounce(applyFilters, 300));
}

// Debounce utility
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Render rules with pagination
function renderRules() {
  const startIndex = (currentPage - 1) * RULES_PER_PAGE;
  const endIndex = startIndex + RULES_PER_PAGE;
  const pageRules = filteredRules.slice(startIndex, endIndex);

  if (pageRules.length === 0) {
    rulesGrid.innerHTML = `
      <div class="loading">
        <p>검색 결과가 없습니다</p>
      </div>
    `;
    pagination.innerHTML = '';
    return;
  }

  rulesGrid.innerHTML = pageRules.map(rule => `
    <div class="rule-card ${selectedRuleId === rule.id ? 'active' : ''}" data-id="${rule.id}">
      <div class="rule-card-header">
        <span class="rule-type-icon ${rule.type}">${typeIcons[rule.type] || '📋'}</span>
        <span class="rule-id">${rule.id}</span>
      </div>
      <div class="rule-title">${rule.name_ko || rule.name}</div>
      <div class="rule-meta">
        <span class="severity-badge ${rule.severity}">${severityNames[rule.severity] || rule.severity}</span>
        <span class="rule-tags">${rule.tags.slice(0, 3).map(t => '#' + t).join(' ')}</span>
      </div>
    </div>
  `).join('');

  // Add click listeners
  document.querySelectorAll('.rule-card').forEach(card => {
    card.addEventListener('click', () => selectRule(card.dataset.id));
  });

  renderPagination();
}

// Render pagination
function renderPagination() {
  const totalPages = Math.ceil(filteredRules.length / RULES_PER_PAGE);

  if (totalPages <= 1) {
    pagination.innerHTML = '';
    return;
  }

  let html = '';

  // Previous button
  html += `<button ${currentPage === 1 ? 'disabled' : ''} data-page="${currentPage - 1}">◀</button>`;

  // Page numbers
  const maxVisiblePages = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  if (startPage > 1) {
    html += `<button data-page="1">1</button>`;
    if (startPage > 2) html += `<span class="page-info">...</span>`;
  }

  for (let i = startPage; i <= endPage; i++) {
    html += `<button class="${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) html += `<span class="page-info">...</span>`;
    html += `<button data-page="${totalPages}">${totalPages}</button>`;
  }

  // Next button
  html += `<button ${currentPage === totalPages ? 'disabled' : ''} data-page="${currentPage + 1}">▶</button>`;

  // Page info
  html += `<span class="page-info">${currentPage} / ${totalPages}</span>`;

  pagination.innerHTML = html;

  // Add click listeners
  pagination.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = parseInt(btn.dataset.page);
      if (page && page !== currentPage && page >= 1 && page <= totalPages) {
        currentPage = page;
        renderRules();
        rulesGrid.scrollTop = 0;
      }
    });
  });
}

// Select and display rule details
function selectRule(ruleId) {
  selectedRuleId = ruleId;
  const rule = rules.find(r => r.id === ruleId);

  if (!rule) return;

  // Update card states
  document.querySelectorAll('.rule-card').forEach(card => {
    card.classList.toggle('active', card.dataset.id === ruleId);
  });

  // Prepare content (use Korean translations if available)
  const whyContent = rule.why_ko || rule.why || '<p>설명이 없습니다.</p>';
  const howToFixContent = rule.howToFix_ko || rule.howToFix || '<p>수정 방법 정보가 없습니다.</p>';
  const moreInfoContent = rule.moreInfo_ko || rule.moreInfo || '<p>추가 정보가 없습니다.</p>';

  // Render detail
  ruleDetail.innerHTML = `
    <div class="detail-header">
      <div class="rule-card-header">
        <span class="rule-type-icon ${rule.type}">${typeIcons[rule.type] || '📋'}</span>
        <span class="severity-badge ${rule.severity}">${severityNames[rule.severity] || rule.severity}</span>
        <span style="margin-left: auto; color: #888; font-size: 12px;">${typeNames[rule.type] || rule.type}</span>
      </div>
      <h2>${rule.name_ko || rule.name}</h2>
      <span class="rule-id">${rule.id}</span>
      ${rule.name_ko ? `<p style="font-size: 12px; color: #888; margin-top: 4px;">${rule.name}</p>` : ''}
    </div>
    <div class="detail-tabs">
      <button class="detail-tab active" data-tab="why">왜 문제인가요?</button>
      <button class="detail-tab" data-tab="fix">어떻게 수정하나요?</button>
      <button class="detail-tab" data-tab="more">추가 정보</button>
    </div>
    <div class="tab-content active" id="tab-why">${processHtmlContent(whyContent)}</div>
    <div class="tab-content" id="tab-fix">${processHtmlContent(howToFixContent)}</div>
    <div class="tab-content" id="tab-more">${processHtmlContent(moreInfoContent)}</div>
  `;

  // Add tab listeners
  document.querySelectorAll('.detail-tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });
}

// Process HTML content (translate common phrases)
function processHtmlContent(html) {
  if (!html) return '';

  // Replace common English phrases with Korean
  const translations = {
    'Noncompliant code example': '규칙을 준수하지 않는 코드',
    'Noncompliant Code Example': '규칙을 준수하지 않는 코드',
    'Compliant solution': '올바른 해결책',
    'Compliant Solution': '올바른 해결책',
    'Compliant code example': '규칙을 준수하는 코드',
    'Exceptions': '예외 사항',
    'See': '참고',
    'Documentation': '문서',
    'Resources': '참고 자료',
    'What is the potential impact?': '잠재적 영향은 무엇인가요?',
    'How to fix it': '수정 방법',
    'Why is this an issue?': '왜 이것이 문제인가요?'
  };

  let result = html;
  for (const [eng, kor] of Object.entries(translations)) {
    result = result.replace(new RegExp(eng, 'gi'), kor);
  }

  return result;
}

// Switch tab
function switchTab(tabId) {
  document.querySelectorAll('.detail-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabId);
  });
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });
  document.getElementById(`tab-${tabId}`).classList.add('active');
}

// Initialize
document.addEventListener('DOMContentLoaded', loadRules);
