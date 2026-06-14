/**
 * BigQuery Release Notes Tracker - Client Engine
 * Vanilla JavaScript implementation for state management, AJAX data fetching,
 * real-time filtering, search, theme toggling, and clipboard actions.
 */

document.addEventListener('DOMContentLoaded', () => {
    // State management
    let state = {
        items: [],
        filteredItems: [],
        currentCategory: 'all',
        searchQuery: '',
        lastUpdated: null,
        theme: 'dark' // Default theme
    };

    // DOM Elements
    const elements = {
        body: document.body,
        themeToggleBtn: document.getElementById('theme-toggle-btn'),
        refreshBtn: document.getElementById('refresh-btn'),
        refreshIcon: document.getElementById('refresh-icon'),
        searchInput: document.getElementById('search-input'),
        clearSearchBtn: document.getElementById('clear-search-btn'),
        filterChips: document.getElementById('filter-chips'),
        cardsGrid: document.getElementById('cards-grid'),
        skeletonLoader: document.getElementById('skeleton-loader'),
        emptyState: document.getElementById('empty-state'),
        errorState: document.getElementById('error-state'),
        errorMessage: document.getElementById('error-message'),
        resetFiltersBtn: document.getElementById('reset-filters-btn'),
        retryBtn: document.getElementById('retry-btn'),
        toastContainer: document.getElementById('toast-container'),
        
        // Counter elements
        countTotal: document.getElementById('count-total'),
        countFeature: document.getElementById('count-feature'),
        countChange: document.getElementById('count-change'),
        countIssue: document.getElementById('count-issue'),
        countBreaking: document.getElementById('count-breaking'),
        
        // Stat cards
        statTotal: document.getElementById('stat-total'),
        statFeature: document.getElementById('stat-feature'),
        statChange: document.getElementById('stat-change'),
        statIssue: document.getElementById('stat-issue'),
        statBreaking: document.getElementById('stat-breaking'),
        
        // Meta info
        cacheIndicator: document.getElementById('cache-indicator'),
        cacheStatusText: document.getElementById('cache-status-text'),
        lastUpdatedText: document.getElementById('last-updated-text')
    };

    // ==========================================================================
    // THEME MANAGEMENT
    // ==========================================================================
    
    function initTheme() {
        const savedTheme = localStorage.getItem('bq-theme');
        if (savedTheme === 'light') {
            state.theme = 'light';
            elements.body.classList.remove('dark-theme');
        } else {
            state.theme = 'dark';
            elements.body.classList.add('dark-theme');
        }
    }

    function toggleTheme() {
        if (state.theme === 'dark') {
            state.theme = 'light';
            elements.body.classList.remove('dark-theme');
            localStorage.setItem('bq-theme', 'light');
            showToast('Switched to light mode', 'info');
        } else {
            state.theme = 'dark';
            elements.body.classList.add('dark-theme');
            localStorage.setItem('bq-theme', 'dark');
            showToast('Switched to dark mode', 'info');
        }
    }

    // ==========================================================================
    // DATA FETCHING & STATE MANAGEMENT
    // ==========================================================================

    async function loadFeed(forceRefresh = false) {
        setLoadingState(true);
        
        try {
            const url = `/api/feed${forceRefresh ? '?refresh=true' : ''}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                state.items = data.items;
                state.lastUpdated = data.last_updated;
                
                updateCounters();
                updateMeta(data.status);
                applyFiltersAndSearch();
                
                if (forceRefresh) {
                    showToast('Feed refreshed successfully!', 'success');
                }
            } else {
                throw new Error(data.error || 'Failed to fetch release notes');
            }
        } catch (error) {
            console.error('Error loading feed:', error);
            setErrorState(true, error.message);
        } finally {
            setLoadingState(false);
        }
    }

    // ==========================================================================
    // UI STATE TRANSITIONS
    // ==========================================================================

    function setLoadingState(isLoading) {
        if (isLoading) {
            elements.refreshIcon.classList.add('spinning');
            elements.refreshBtn.disabled = true;
            
            elements.skeletonLoader.classList.remove('hidden');
            elements.cardsGrid.classList.add('hidden');
            elements.emptyState.classList.add('hidden');
            elements.errorState.classList.add('hidden');
        } else {
            elements.refreshIcon.classList.remove('spinning');
            elements.refreshBtn.disabled = false;
            elements.skeletonLoader.classList.add('hidden');
        }
    }

    function setErrorState(isError, message = '') {
        if (isError) {
            elements.errorMessage.textContent = message;
            elements.errorState.classList.remove('hidden');
            elements.cardsGrid.classList.add('hidden');
            elements.skeletonLoader.classList.add('hidden');
            elements.emptyState.classList.add('hidden');
            
            elements.cacheIndicator.className = 'cache-indicator error';
            elements.cacheStatusText.textContent = 'Connection error';
        } else {
            elements.errorState.classList.add('hidden');
        }
    }

    // ==========================================================================
    // UPDATE DASHBOARD INFORMATION
    // ==========================================================================

    function updateCounters() {
        const counts = {
            all: state.items.length,
            Feature: 0,
            Change: 0,
            Issue: 0,
            Breaking: 0
        };

        state.items.forEach(item => {
            if (counts[item.category] !== undefined) {
                counts[item.category]++;
            }
        });

        // Set visual elements
        elements.countTotal.textContent = counts.all;
        elements.countFeature.textContent = counts.Feature;
        elements.countChange.textContent = counts.Change;
        elements.countIssue.textContent = counts.Issue;
        elements.countBreaking.textContent = counts.Breaking;
    }

    function updateMeta(status) {
        // Status class
        elements.cacheIndicator.className = 'cache-indicator ' + (status === 'fetched' ? 'fetched' : 'cached');
        elements.cacheStatusText.textContent = status === 'fetched' ? 'Live (Feed Refreshed)' : 'Cached (Optimal Speed)';

        // Timestamp
        if (state.lastUpdated) {
            const date = new Date(state.lastUpdated * 1000);
            const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const dateString = date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
            elements.lastUpdatedText.textContent = `Last updated: ${dateString} at ${timeString}`;
        } else {
            elements.lastUpdatedText.textContent = 'Last updated: Never';
        }
    }

    // ==========================================================================
    // RENDER FEED CARDS
    // ==========================================================================

    function renderCards() {
        elements.cardsGrid.innerHTML = '';
        
        if (state.filteredItems.length === 0) {
            elements.emptyState.classList.remove('hidden');
            elements.cardsGrid.classList.add('hidden');
            return;
        }

        elements.emptyState.classList.add('hidden');
        elements.cardsGrid.classList.remove('hidden');

        // Create document fragment for performance optimization
        const fragment = document.createDocumentFragment();

        state.filteredItems.forEach((item, index) => {
            const card = document.createElement('article');
            card.className = `note-card category-${item.category.toLowerCase()}`;
            card.id = `card-${item.id}`;
            card.style.animationDelay = `${Math.min(index * 0.05, 0.5)}s`; // Stagger animation

            // Category configuration
            let badgeClass = `badge-${item.category.toLowerCase()}`;
            let iconClass = 'fa-solid ';
            switch(item.category) {
                case 'Feature': iconClass += 'fa-circle-plus'; break;
                case 'Change': iconClass += 'fa-sliders'; break;
                case 'Issue': iconClass += 'fa-triangle-exclamation'; break;
                case 'Breaking': iconClass += 'fa-circle-radiation'; break;
                default: iconClass += 'fa-bullhorn'; badgeClass = 'badge-announcement';
            }

            card.innerHTML = `
                <div class="card-header">
                    <div class="card-meta">
                        <span class="badge ${badgeClass}">
                            <i class="${iconClass}"></i> ${item.original_category}
                        </span>
                        <time class="card-date" datetime="${item.raw_date}">
                            <i class="fa-regular fa-calendar"></i> ${item.date}
                        </time>
                    </div>
                    
                    <div class="card-actions">
                        <button class="btn-icon-only btn-copy" data-link="${item.link}" title="Copy link to this release note">
                            <i class="fa-regular fa-copy"></i>
                        </button>
                        <a href="${item.link}" target="_blank" rel="noopener noreferrer" class="btn-icon-only btn-link" title="Open official documentation">
                            <i class="fa-solid fa-arrow-up-right-from-square"></i>
                        </a>
                    </div>
                </div>
                
                <div class="card-body">
                    ${item.content}
                </div>
            `;

            // Bind copy button event listener directly
            const copyBtn = card.querySelector('.btn-copy');
            copyBtn.addEventListener('click', (e) => {
                e.preventDefault();
                copyToClipboard(item.link, copyBtn);
            });

            fragment.appendChild(card);
        });

        elements.cardsGrid.appendChild(fragment);
    }

    // ==========================================================================
    // FILTERING & SEARCH SEARCH ENGINE
    // ==========================================================================

    function applyFiltersAndSearch() {
        state.filteredItems = state.items.filter(item => {
            // Category filter check
            const matchesCategory = state.currentCategory === 'all' || item.category === state.currentCategory;
            
            // Search query check (title, content, category, original_category, date)
            const query = state.searchQuery.toLowerCase().trim();
            if (!query) return matchesCategory;

            const matchesSearch = 
                item.date.toLowerCase().includes(query) ||
                item.content.toLowerCase().includes(query) ||
                item.category.toLowerCase().includes(query) ||
                item.original_category.toLowerCase().includes(query);

            return matchesCategory && matchesSearch;
        });

        renderCards();
    }

    function changeCategory(category) {
        state.currentCategory = category;
        
        // Update active class on chips
        document.querySelectorAll('.filter-chips .chip').forEach(chip => {
            const chipCategory = chip.getAttribute('data-category');
            if (chipCategory === category) {
                chip.classList.add('active');
            } else {
                chip.classList.remove('active');
            }
        });
        
        applyFiltersAndSearch();
    }

    function clearFilters() {
        state.searchQuery = '';
        state.currentCategory = 'all';
        elements.searchInput.value = '';
        elements.clearSearchBtn.style.display = 'none';
        
        // Reset active chips
        document.querySelectorAll('.filter-chips .chip').forEach(chip => {
            if (chip.getAttribute('data-category') === 'all') {
                chip.classList.add('active');
            } else {
                chip.classList.remove('active');
            }
        });
        
        applyFiltersAndSearch();
        showToast('Search filters reset', 'info');
    }

    // ==========================================================================
    // CLIPBOARD ACTIONS & UTILITIES
    // ==========================================================================

    function copyToClipboard(text, buttonElement) {
        navigator.clipboard.writeText(text).then(() => {
            showToast('Documentation link copied to clipboard!', 'success');
            
            // Subtle button animation feedback
            const icon = buttonElement.querySelector('i');
            icon.className = 'fa-solid fa-check';
            buttonElement.style.borderColor = 'var(--color-feature)';
            buttonElement.style.color = 'var(--color-feature)';
            
            setTimeout(() => {
                icon.className = 'fa-regular fa-copy';
                buttonElement.style.borderColor = '';
                buttonElement.style.color = '';
            }, 2000);
        }).catch(err => {
            console.error('Could not copy text: ', err);
            showToast('Failed to copy link', 'error');
        });
    }

    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let iconClass = 'fa-solid ';
        if (type === 'success') iconClass += 'fa-circle-check';
        else if (type === 'error') iconClass += 'fa-circle-xmark';
        else iconClass += 'fa-circle-info';
        
        toast.innerHTML = `
            <i class="${iconClass}"></i>
            <span>${message}</span>
        `;
        
        elements.toastContainer.appendChild(toast);
        
        // Remove toast after animation finishes
        setTimeout(() => {
            toast.style.animation = 'toast-in 0.3s ease reverse forwards';
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    }

    // ==========================================================================
    // EVENT LISTENERS
    // ==========================================================================

    // Theme toggle
    elements.themeToggleBtn.addEventListener('click', toggleTheme);
    
    // Refresh button
    elements.refreshBtn.addEventListener('click', () => loadFeed(true));
    
    // Retry button (in error state)
    elements.retryBtn.addEventListener('click', () => loadFeed(true));
    
    // Search input typing
    elements.searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value;
        if (state.searchQuery.trim().length > 0) {
            elements.clearSearchBtn.style.display = 'block';
        } else {
            elements.clearSearchBtn.style.display = 'none';
        }
        applyFiltersAndSearch();
    });

    // Clear search button
    elements.clearSearchBtn.addEventListener('click', () => {
        elements.searchInput.value = '';
        state.searchQuery = '';
        elements.clearSearchBtn.style.display = 'none';
        applyFiltersAndSearch();
        elements.searchInput.focus();
    });

    // Category chips click events
    elements.filterChips.addEventListener('click', (e) => {
        const chip = e.target.closest('.chip');
        if (!chip) return;
        const category = chip.getAttribute('data-category');
        changeCategory(category);
    });

    // Stats panel cards click events
    elements.statTotal.addEventListener('click', () => changeCategory('all'));
    elements.statFeature.addEventListener('click', () => changeCategory('Feature'));
    elements.statChange.addEventListener('click', () => changeCategory('Change'));
    elements.statIssue.addEventListener('click', () => changeCategory('Issue'));
    elements.statBreaking.addEventListener('click', () => changeCategory('Breaking'));

    // Reset buttons
    elements.resetFiltersBtn.addEventListener('click', clearFilters);

    // ==========================================================================
    // INITIALIZATION
    // ==========================================================================
    
    initTheme();
    loadFeed(false);
});
