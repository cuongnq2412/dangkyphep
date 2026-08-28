/* ==========================================================================
   LEAVE PORTAL - MODERN JAVASCRIPT APPLICATION CORE (SaaS v2.0)
   Smart Month Navigator, Realtime Cloud Sync, Bento & Quick Chips System
   ========================================================================== */

(function () {
    'use strict';

    // 1. Core Constants & Config
    const ADMIN_PASSCODE = 'Cuong@032';

    const STORAGE_EMPLOYEES = 'leave_app_employees_data';
    const STORAGE_REGISTRATIONS = 'leave_app_registrations_v9';
    const STORAGE_CONFIG = 'leave_app_config_data';
    const STORAGE_SUPABASE = 'leave_app_supabase_data';
    const STORAGE_STATUS_CACHE = 'leave_app_status_cache_v1';

    const syncChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('leave_app_sync_channel') : null;

    const DEFAULT_EMPLOYEES = [
        { code: 'NV001', name: 'Nguyễn Văn An' },
        { code: 'NV002', name: 'Trần Thị Bình' },
        { code: 'NV003', name: 'Lê Hoàng Cường' },
        { code: 'NV004', name: 'Phạm Minh Đức' },
        { code: 'NV005', name: 'Hoàng Thị Em' }
    ];

    // Default target month is September 2026 (Month index 8 in JS)
    const DEFAULT_CONFIG = {
        targetMonth: 8, 
        targetYear: 2026,
        startTime: '',
        endTime: '',
        isOpenAlways: true,
        sundayShifts: {}
    };

    const DEFAULT_SUPABASE = {
        url: 'https://duyttseooezluyhvwnud.supabase.co',
        key: 'sb_publishable_BYEpFH4CdWD6gZtXnZVacg_uIEX_cxK'
    };

    const DAY_NAMES = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

    // 2. Application State
    let employees = [];
    let registrationsList = [];
    let appConfig = { ...DEFAULT_CONFIG };
    let supabaseConfig = { ...DEFAULT_SUPABASE };
    let supabaseClient = null;
    let realtimeChannel = null;

    // Viewing Month Navigation State (Default to target configured month)
    let viewingMonth = 8; // September
    let viewingYear = 2026;

    let activeFilter = 'all';
    let activeApprFilter = 'all';
    let searchQuery = '';
    let timerInterval = null;
    let isInternalUpdate = false;
    let isFetchingCloud = false;
    let serverTimeOffset = 0;
    let isSyncingServerTime = false;

    // 3. DOM Elements
    const topStatusBanner = document.getElementById('topStatusBanner');
    const bannerIcon = document.getElementById('bannerIcon');
    const bannerText = document.getElementById('bannerText');
    const cloudStatusChip = document.getElementById('cloudStatusChip');
    const cloudStatusIcon = document.getElementById('cloudStatusIcon');

    const appHeaderSub = document.getElementById('appHeaderSub');
    const gridTitleSection = document.getElementById('gridTitleSection');
    const daysListEl = document.getElementById('daysList');
    const searchInput = document.getElementById('searchInput');
    const filterPills = document.querySelectorAll('.filter-pill');

    // Month Navigator Elements
    const btnPrevMonth = document.getElementById('btnPrevMonth');
    const btnNextMonth = document.getElementById('btnNextMonth');
    const currentMonthName = document.getElementById('currentMonthName');
    const currentMonthStatusBadge = document.getElementById('currentMonthStatusBadge');

    // Countdown Elements
    const countdownOverlay = document.getElementById('countdownOverlay');
    const cdTitleText = document.getElementById('cdTitleText');
    const cdDescText = document.getElementById('cdDescText');
    const cdDays = document.getElementById('cdDays');
    const cdHours = document.getElementById('cdHours');
    const cdMins = document.getElementById('cdMins');
    const cdSecs = document.getElementById('cdSecs');
    const btnCountdownGuide = document.getElementById('btnCountdownGuide');

    // Modals
    const btnHeaderGuide = document.getElementById('btnHeaderGuide');
    const guideModal = document.getElementById('guideModal');
    const closeGuideModal = document.getElementById('closeGuideModal');
    const btnCloseGuideSubmit = document.getElementById('btnCloseGuideSubmit');

    const btnAdminKey = document.getElementById('btnAdminKey');
    const passwordModal = document.getElementById('passwordModal');
    const closePasswordModal = document.getElementById('closePasswordModal');
    const btnCancelPass = document.getElementById('btnCancelPass');
    const passwordForm = document.getElementById('passwordForm');
    const adminPassInput = document.getElementById('adminPassInput');
    const passErrorMsg = document.getElementById('passErrorMsg');

    const registerModal = document.getElementById('registerModal');
    const closeRegisterModal = document.getElementById('closeRegisterModal');
    const btnCancelRegister = document.getElementById('btnCancelRegister');
    const registerForm = document.getElementById('registerForm');
    const modalDateTitle = document.getElementById('modalDateTitle');
    const modalDateInput = document.getElementById('modalDateInput');
    const empCardGrid = document.getElementById('empCardGrid');
    const selectedEmpValue = document.getElementById('selectedEmpValue');
    const registerReason = document.getElementById('registerReason');
    const pendingListBanner = document.getElementById('pendingListBanner');
    const pendingItemsContainer = document.getElementById('pendingItemsContainer');
    const pendingCountBadge = document.getElementById('pendingCountBadge');
    const adminDayToolbar = document.getElementById('adminDayToolbar');
    const adminAssignEmpSelect = document.getElementById('adminAssignEmpSelect');
    const adminAssignStatusSelect = document.getElementById('adminAssignStatusSelect');
    const adminAssignReasonInput = document.getElementById('adminAssignReasonInput');
    const btnAdminAssignSubmit = document.getElementById('btnAdminAssignSubmit');

    let isAdminSession = false;

    // Admin Dashboard Elements
    const adminModal = document.getElementById('adminModal');
    const closeAdminModal = document.getElementById('closeAdminModal');
    const adminTabBtns = document.querySelectorAll('.admin-tab-btn');
    const adminTabPanes = document.querySelectorAll('.admin-tab-pane');

    const cntAllRegs = document.getElementById('cntAllRegs');
    const cntPendingRegs = document.getElementById('cntPendingRegs');
    const cntApprovedRegs = document.getElementById('cntApprovedRegs');
    const cntRejectedRegs = document.getElementById('cntRejectedRegs');
    const adminRegsTableBody = document.getElementById('adminRegsTableBody');
    const apprFilterBtns = document.querySelectorAll('.appr-filter-btn');
    const btnExportExcel = document.getElementById('btnExportExcel');

    const sundayShiftsGrid = document.getElementById('sundayShiftsGrid');
    const btnSaveSundayShifts = document.getElementById('btnSaveSundayShifts');

    const configMonthSelect = document.getElementById('configMonthSelect');
    const configYearSelect = document.getElementById('configYearSelect');
    const startTimeInput = document.getElementById('startTimeInput');
    const endTimeInput = document.getElementById('endTimeInput');
    const btnSetOpenNow = document.getElementById('btnSetOpenNow');
    const btnSetLockNow = document.getElementById('btnSetLockNow');
    const btnSaveTimeConfig = document.getElementById('btnSaveTimeConfig');
    const btnClearAllRegs = document.getElementById('btnClearAllRegs');

    const newEmpId = document.getElementById('newEmpId');
    const newEmpName = document.getElementById('newEmpName');
    const btnAddEmployee = document.getElementById('btnAddEmployee');
    const empTableBody = document.getElementById('empTableBody');

    const supabaseUrl = document.getElementById('supabaseUrl');
    const supabaseKey = document.getElementById('supabaseKey');
    const btnSaveSupabase = document.getElementById('btnSaveSupabase');
    const btnDisconnectSupabase = document.getElementById('btnDisconnectSupabase');
    const supabaseStatusAlert = document.getElementById('supabaseStatusAlert');

    // 4. Utility Functions
    function sanitizeSupabaseUrl(url) {
        if (!url) return '';
        let cleaned = url.trim();
        cleaned = cleaned.replace(/\/rest\/v1\/?$/i, '');
        cleaned = cleaned.replace(/\/+$/, '');
        return cleaned;
    }

    function formatForDateTimeInput(dateStr) {
        if (!dateStr) return '';
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return '';
            const pad = (n) => String(n).padStart(2, '0');
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        } catch (e) {
            return '';
        }
    }

    function formatDateTime(d) {
        if (!d) return '';
        const pad = (n) => String(n).padStart(2, '0');
        return `${pad(d.getHours())}:${pad(d.getMinutes())} - ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) return;

        const toastEl = document.createElement('div');
        toastEl.className = `toast-item toast-${type}`;

        let icon = 'fa-info-circle';
        if (type === 'success') icon = 'fa-circle-check';
        if (type === 'error') icon = 'fa-circle-exclamation';
        if (type === 'warning') icon = 'fa-triangle-exclamation';

        toastEl.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${escapeHtml(message)}</span>`;
        toastContainer.appendChild(toastEl);

        setTimeout(() => {
            toastEl.style.opacity = '0';
            toastEl.style.transform = 'translateY(10px)';
            setTimeout(() => toastEl.remove(), 300);
        }, 4000);
    }

    function openModal(modalEl) { if (modalEl) modalEl.classList.add('active'); }
    function closeModal(modalEl) { if (modalEl) modalEl.classList.remove('active'); }

    // 5. Cloud Server Time Sync
    async function syncServerTime() {
        if (isSyncingServerTime) return;
        isSyncingServerTime = true;
        try {
            const startMs = Date.now();
            const cleanUrl = sanitizeSupabaseUrl(supabaseConfig.url || DEFAULT_SUPABASE.url);
            const activeKey = supabaseConfig.key || DEFAULT_SUPABASE.key;
            
            const res = await fetch(`${cleanUrl}/rest/v1/app_config?select=id&limit=1`, {
                method: 'GET',
                headers: { 'apikey': activeKey, 'Authorization': `Bearer ${activeKey}` }
            });
            const dateHead = res.headers.get('date');
            if (dateHead) {
                const serverMs = new Date(dateHead).getTime();
                const latency = (Date.now() - startMs) / 2;
                serverTimeOffset = (serverMs + latency) - Date.now();
            }
        } catch (e) {
            console.warn('Sync server time note:', e);
        } finally {
            isSyncingServerTime = false;
        }
    }

    function getCloudServerNow() {
        return new Date(Date.now() + serverTimeOffset);
    }

    // 6. Data Storage & Local Persistence
    function loadData() {
        try {
            const savedEmp = localStorage.getItem(STORAGE_EMPLOYEES);
            employees = savedEmp ? JSON.parse(savedEmp) : [...DEFAULT_EMPLOYEES];

            const savedRegs = localStorage.getItem(STORAGE_REGISTRATIONS);
            registrationsList = savedRegs ? JSON.parse(savedRegs) : [];

            const savedConfig = localStorage.getItem(STORAGE_CONFIG);
            appConfig = savedConfig ? JSON.parse(savedConfig) : { ...DEFAULT_CONFIG };

            if (appConfig.targetMonth === undefined || appConfig.targetMonth === null) {
                appConfig.targetMonth = 8; // Default September
            }

            viewingMonth = appConfig.targetMonth ?? 8;
            viewingYear = appConfig.targetYear ?? 2026;

            const savedSupa = localStorage.getItem(STORAGE_SUPABASE);
            if (savedSupa) {
                const parsed = JSON.parse(savedSupa);
                supabaseConfig = {
                    url: sanitizeSupabaseUrl(parsed.url) || DEFAULT_SUPABASE.url,
                    key: parsed.key || DEFAULT_SUPABASE.key
                };
            }
        } catch (e) {
            console.warn('Data load exception:', e);
        }

        if (supabaseUrl) supabaseUrl.value = supabaseConfig.url;
        if (supabaseKey) supabaseKey.value = supabaseConfig.key;
        if (configMonthSelect) configMonthSelect.value = String(appConfig.targetMonth ?? 8);
        if (configYearSelect) configYearSelect.value = String(appConfig.targetYear ?? 2026);
        if (startTimeInput) startTimeInput.value = formatForDateTimeInput(appConfig.startTime);
        if (endTimeInput) endTimeInput.value = formatForDateTimeInput(appConfig.endTime);
    }

    function saveData(broadcast = true) {
        localStorage.setItem(STORAGE_EMPLOYEES, JSON.stringify(employees));
        localStorage.setItem(STORAGE_REGISTRATIONS, JSON.stringify(registrationsList));
        localStorage.setItem(STORAGE_CONFIG, JSON.stringify(appConfig));
        localStorage.setItem(STORAGE_SUPABASE, JSON.stringify(supabaseConfig));

        const statusCache = {};
        registrationsList.forEach(r => {
            if (r.id) statusCache[r.id] = r.status;
            if (r.dateStr && r.empCode) statusCache[`${r.dateStr}_${r.empCode}`] = r.status;
        });
        localStorage.setItem(STORAGE_STATUS_CACHE, JSON.stringify(statusCache));

        if (broadcast && syncChannel) {
            isInternalUpdate = true;
            syncChannel.postMessage({ type: 'DATA_UPDATED' });
            setTimeout(() => { isInternalUpdate = false; }, 300);
        }
    }

    function updateCloudBadge(state, text) {
        if (!cloudStatusChip) return;
        cloudStatusChip.className = `cloud-status-chip ${state}`;
        const titleMsg = text || (state === 'online' ? 'Supabase Cloud Realtime Đang Đồng Bộ' : (state === 'syncing' ? 'Đang Đồng Bộ Cloud...' : 'Ngoại Tuyến'));
        cloudStatusChip.title = titleMsg;

        if (cloudStatusIcon) {
            if (state === 'online') {
                cloudStatusIcon.className = 'fa-solid fa-circle';
                cloudStatusIcon.style.color = '#22c55e';
            } else if (state === 'syncing') {
                cloudStatusIcon.className = 'fa-solid fa-circle-notch fa-spin';
                cloudStatusIcon.style.color = '#f59e0b';
            } else {
                cloudStatusIcon.className = 'fa-solid fa-circle';
                cloudStatusIcon.style.color = '#ef4444';
            }
        }
    }

    // 7. Supabase Realtime & Cloud Operations
    function initSupabaseIfConfigured() {
        const cleanUrl = sanitizeSupabaseUrl(supabaseConfig.url || DEFAULT_SUPABASE.url);
        const activeKey = supabaseConfig.key || DEFAULT_SUPABASE.key;

        if (window.supabase && cleanUrl && activeKey) {
            try {
                supabaseConfig.url = cleanUrl;
                supabaseConfig.key = activeKey;
                supabaseClient = window.supabase.createClient(cleanUrl, activeKey);
                fetchSupabaseData();
                subscribeSupabaseRealtime();
            } catch (err) {
                updateCloudBadge('offline', 'Lỗi kết nối');
            }
        }
    }

    function subscribeSupabaseRealtime() {
        if (!supabaseClient) return;
        try {
            if (realtimeChannel) supabaseClient.removeChannel(realtimeChannel);

            realtimeChannel = supabaseClient.channel('leave-app-realtime-v2')
                .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
                    if (payload.table === 'registrations') {
                        if (payload.eventType === 'INSERT' && payload.new) {
                            showToast(`🔔 ${payload.new.emp_name} vừa gửi đơn xin nghỉ ngày ${payload.new.date_str}!`, 'warning');
                        } else if (payload.eventType === 'UPDATE' && payload.new) {
                            if (payload.new.status === 'approved') {
                                showToast(`🎉 Đã duyệt đơn nghỉ ngày ${payload.new.date_str} cho ${payload.new.emp_name}!`, 'success');
                            }
                        }
                    } else if (payload.table === 'app_config') {
                        showToast(`🔔 Cấu hình kỳ đăng ký vừa được cập nhật từ Cloud!`, 'info');
                    }
                    fetchSupabaseData(true);
                })
                .subscribe((status) => {
                    if (status === 'SUBSCRIBED') updateCloudBadge('online', 'Cloud Realtime');
                });
        } catch (err) {
            console.warn('Realtime exception:', err);
        }
    }

    async function fetchSupabaseData(isSilent = false) {
        if (!supabaseClient || isFetchingCloud) return;
        isFetchingCloud = true;
        if (!isSilent) updateCloudBadge('syncing', 'Đang đồng bộ...');

        try {
            const [regRes, cfgRes, empRes] = await Promise.all([
                supabaseClient.from('registrations').select('*'),
                supabaseClient.from('app_config').select('*').limit(1),
                supabaseClient.from('employees').select('*')
            ]);

            // 1. Process Registrations with Smart Bundling Support
            if (!regRes.error && regRes.data) {
                const unpackedRegs = [];
                regRes.data.forEach(item => {
                    let hasBundled = false;
                    if (item.note && (item.note.startsWith('[') && item.note.endsWith(']'))) {
                        try {
                            const list = JSON.parse(item.note);
                            if (Array.isArray(list) && list.length > 0) {
                                list.forEach((p, idx) => {
                                    unpackedRegs.push({
                                        id: p.id || `reg_${item.date_str}_${p.empCode || idx}`,
                                        dateStr: item.date_str,
                                        empCode: p.empCode || p.emp_code || '',
                                        empName: p.empName || p.emp_name || '',
                                        reason: p.reason || p.note || 'Nghỉ phép cá nhân',
                                        status: p.status || 'pending',
                                        adminNote: p.adminNote || p.admin_note || '',
                                        createdAt: p.createdAt || p.created_at || item.created_at || ''
                                    });
                                });
                                hasBundled = true;
                            }
                        } catch (e) {
                            hasBundled = false;
                        }
                    }

                    if (!hasBundled) {
                        unpackedRegs.push({
                            id: item.id || `reg_${item.date_str}_${item.emp_code}`,
                            dateStr: item.date_str,
                            empCode: item.emp_code,
                            empName: item.emp_name,
                            reason: item.reason || item.note || 'Nghỉ phép cá nhân',
                            status: item.status || 'pending',
                            adminNote: item.admin_note || '',
                            createdAt: item.created_at || ''
                        });
                    }
                });
                registrationsList = unpackedRegs;
            }

            // 2. Process App Config
            if (!cfgRes.error && cfgRes.data && cfgRes.data.length > 0) {
                const cloudCfg = cfgRes.data[0].config_json;
                const parsed = typeof cloudCfg === 'string' ? JSON.parse(cloudCfg) : cloudCfg;
                appConfig = { ...appConfig, ...parsed };
                if (configMonthSelect) configMonthSelect.value = String(appConfig.targetMonth ?? 8);
                if (configYearSelect) configYearSelect.value = String(appConfig.targetYear ?? 2026);
                if (startTimeInput) startTimeInput.value = formatForDateTimeInput(appConfig.startTime);
                if (endTimeInput) endTimeInput.value = formatForDateTimeInput(appConfig.endTime);
            }

            // 3. Process Employees
            if (!empRes.error && empRes.data && empRes.data.length > 0) {
                employees = empRes.data.map(e => ({ code: e.code, name: e.name }));
            }

            updateCloudBadge('online', 'Cloud Realtime');
            saveData(false);
            refreshAllUI();
        } catch (e) {
            updateCloudBadge('offline', 'Ngoại tuyến');
        } finally {
            isFetchingCloud = false;
        }
    }

    async function pushConfigToSupabase() {
        if (!supabaseClient) return false;
        try {
            const { error } = await supabaseClient.from('app_config').upsert({
                id: 1,
                config_json: appConfig,
                updated_at: new Date().toISOString()
            });
            return !error;
        } catch (e) {
            return false;
        }
    }

    async function pushEmployeesToSupabase() {
        if (!supabaseClient) return false;
        try {
            await supabaseClient.from('employees').delete().neq('code', 'TEMP_DEL_999');
            if (employees.length > 0) {
                await supabaseClient.from('employees').insert(employees.map(e => ({ code: e.code, name: e.name })));
            }
            return true;
        } catch (e) {
            return false;
        }
    }

    async function syncDayToSupabase(dateStr) {
        if (!supabaseClient) return false;
        try {
            const dayRegs = registrationsList.filter(r => r.dateStr === dateStr);
            if (dayRegs.length === 0) {
                await supabaseClient.from('registrations').delete().eq('date_str', dateStr);
                return true;
            }

            const approved = dayRegs.find(r => r.status === 'approved');
            const rep = approved || dayRegs[0];
            const bundleJson = JSON.stringify(dayRegs);
            const statusVal = approved ? 'approved' : (dayRegs.some(r => r.status === 'pending') ? 'pending' : 'rejected');

            const payload = {
                date_str: dateStr,
                emp_code: rep.empCode,
                emp_name: rep.empName,
                note: bundleJson,
                reason: rep.reason || 'Nghỉ phép cá nhân',
                status: statusVal,
                created_at: rep.createdAt || getCloudServerNow().toLocaleString('vi-VN')
            };

            const { data: existing } = await supabaseClient.from('registrations').select('id').eq('date_str', dateStr);
            if (existing && existing.length > 0) {
                await supabaseClient.from('registrations').update(payload).eq('date_str', dateStr);
            } else {
                await supabaseClient.from('registrations').insert([payload]);
            }
            return true;
        } catch (err) {
            console.warn('Sync day error:', err);
            return false;
        }
    }

    // 8. Countdown Timer & Target Month State Engine
    let isTargetMonthOpen = true;

    function checkTimeAndTicker() {
        const now = getCloudServerNow();
        const mStr = String((appConfig.targetMonth ?? 8) + 1).padStart(2, '0');
        const y = appConfig.targetYear ?? 2026;

        if (appConfig.isOpenAlways) {
            isTargetMonthOpen = true;
            if (countdownOverlay) countdownOverlay.style.display = 'none';
            if (topStatusBanner) {
                topStatusBanner.className = 'top-status-banner open';
                if (bannerIcon) bannerIcon.className = 'fa-solid fa-circle-check';
                if (bannerText) bannerText.innerHTML = `<i class="fa-solid fa-circle-check"></i> MỞ ĐĂNG KÝ NGHỈ PHÉP - THÁNG ${mStr}/${y}`;
            }
            return;
        }

        const start = appConfig.startTime ? new Date(appConfig.startTime) : null;
        const end = appConfig.endTime ? new Date(appConfig.endTime) : null;

        if (start && now < start) {
            isTargetMonthOpen = false;
            if (countdownOverlay) countdownOverlay.style.display = 'flex';
            if (topStatusBanner) {
                topStatusBanner.className = 'top-status-banner closed';
                if (bannerIcon) bannerIcon.className = 'fa-solid fa-hourglass-half';
                if (bannerText) bannerText.innerHTML = `<i class="fa-solid fa-hourglass-half"></i> SẮP MỞ ĐĂNG KÝ PHÉP THÁNG ${mStr}/${y}`;
            }

            const diff = start - now;
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const secs = Math.floor((diff % (1000 * 60)) / 1000);

            if (cdDays) cdDays.textContent = String(days).padStart(2, '0');
            if (cdHours) cdHours.textContent = String(hours).padStart(2, '0');
            if (cdMins) cdMins.textContent = String(mins).padStart(2, '0');
            if (cdSecs) cdSecs.textContent = String(secs).padStart(2, '0');
            if (cdDescText) cdDescText.textContent = `Tự động mở cổng đăng ký vào lúc: ${formatDateTime(start)}`;
            return;
        }

        if (end && now > end) {
            isTargetMonthOpen = false;
            if (countdownOverlay) countdownOverlay.style.display = 'flex';
            if (topStatusBanner) {
                topStatusBanner.className = 'top-status-banner closed';
                if (bannerIcon) bannerIcon.className = 'fa-solid fa-lock';
                if (bannerText) bannerText.innerHTML = `<i class="fa-solid fa-lock"></i> KỲ ĐĂNG KÝ THÁNG ${mStr}/${y} ĐÃ KHÓA`;
            }
            if (cdDays) cdDays.textContent = '00';
            if (cdHours) cdHours.textContent = '00';
            if (cdMins) cdMins.textContent = '00';
            if (cdSecs) cdSecs.textContent = '00';
            if (cdDescText) cdDescText.textContent = `Kỳ đăng ký đã kết thúc lúc: ${formatDateTime(end)}`;
            return;
        }

        isTargetMonthOpen = true;
        if (countdownOverlay) countdownOverlay.style.display = 'none';
        if (topStatusBanner) {
            topStatusBanner.className = 'top-status-banner open';
            if (bannerIcon) bannerIcon.className = 'fa-solid fa-circle-check';
            if (bannerText) bannerText.innerHTML = `<i class="fa-solid fa-circle-check"></i> MỞ ĐĂNG KÝ NGHỈ PHÉP - THÁNG ${mStr}/${y}`;
        }
    }

    function startCountdownTicker() {
        if (timerInterval) clearInterval(timerInterval);
        checkTimeAndTicker();
        timerInterval = setInterval(checkTimeAndTicker, 1000);
    }

    // 9. UI Rendering Engine
    function updateMonthHeaderInfo() {
        const mStr = String(viewingMonth + 1).padStart(2, '0');
        if (currentMonthName) currentMonthName.textContent = `Tháng ${mStr}/${viewingYear}`;
        if (appHeaderSub) appHeaderSub.textContent = `THÁNG ${mStr} / ${viewingYear} • ĐĂNG KÝ & DUYỆT LỊCH TỰ ĐỘNG`;
        if (gridTitleSection) gridTitleSection.innerHTML = `<i class="fa-solid fa-calendar-week" style="color: #4f46e5;"></i> Bảng Lịch Nghỉ Phép Tháng ${mStr}/${viewingYear}`;

        const isTarget = (viewingMonth === (appConfig.targetMonth ?? 8)) && (viewingYear === (appConfig.targetYear ?? 2026));
        if (currentMonthStatusBadge) {
            if (isTarget) {
                if (isTargetMonthOpen) {
                    currentMonthStatusBadge.className = 'month-status-tag open';
                    currentMonthStatusBadge.textContent = 'Đang Mở';
                } else {
                    currentMonthStatusBadge.className = 'month-status-tag locked';
                    currentMonthStatusBadge.textContent = 'Đang Khóa';
                }
            } else if (viewingYear < (appConfig.targetYear ?? 2026) || (viewingYear === (appConfig.targetYear ?? 2026) && viewingMonth < (appConfig.targetMonth ?? 8))) {
                currentMonthStatusBadge.className = 'month-status-tag locked';
                currentMonthStatusBadge.textContent = 'Đã Đóng / Lưu Trữ';
            } else {
                currentMonthStatusBadge.className = 'month-status-tag locked';
                currentMonthStatusBadge.textContent = 'Chưa Mở';
            }
        }
    }

    function renderDaysGrid() {
        if (!daysListEl) return;
        daysListEl.innerHTML = '';

        const totalDaysInMonth = new Date(viewingYear, viewingMonth + 1, 0).getDate();
        const mStr = String(viewingMonth + 1).padStart(2, '0');
        const isTargetConfigMonth = (viewingMonth === (appConfig.targetMonth ?? 8)) && (viewingYear === (appConfig.targetYear ?? 2026));

        for (let dayNum = 1; dayNum <= totalDaysInMonth; dayNum++) {
            const dateObj = new Date(viewingYear, viewingMonth, dayNum);
            const dayOfWeekIndex = dateObj.getDay();
            const dayName = DAY_NAMES[dayOfWeekIndex];
            const isSunday = (dayOfWeekIndex === 0);

            const dateFormatted = `${viewingYear}-${mStr}-${String(dayNum).padStart(2, '0')}`;
            const displayDateStr = `${String(dayNum).padStart(2, '0')}/${mStr}`;

            const dayRegs = registrationsList.filter(r => r.dateStr === dateFormatted);
            const approvedRegs = dayRegs.filter(r => r.status === 'approved');
            const pendingRegs = dayRegs.filter(r => r.status === 'pending');

            // Apply Filters
            if (activeFilter === 'available' && (isSunday || approvedRegs.length > 0)) continue;
            if (activeFilter === 'registered' && approvedRegs.length === 0 && pendingRegs.length === 0) continue;
            if (activeFilter === 'sunday' && !isSunday) continue;

            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const matchDay = dayName.toLowerCase().includes(q) || displayDateStr.includes(q);
                const matchEmp = dayRegs.some(r => r.empCode.toLowerCase().includes(q) || r.empName.toLowerCase().includes(q) || r.reason.toLowerCase().includes(q));
                if (!matchDay && !matchEmp) continue;
            }

            const card = document.createElement('div');
            card.dataset.date = dateFormatted;
            card.dataset.title = `${dayName}, Ngày ${displayDateStr}/${viewingYear}`;
            card.dataset.isTarget = isTargetConfigMonth ? 'true' : 'false';

            // 1. SUNDAY CARD
            if (isSunday) {
                card.className = 'bento-day-card card-theme-sunday';
                const sundayAssignedCodes = appConfig.sundayShifts ? (appConfig.sundayShifts[dateFormatted] || []) : [];
                let sundayAssignedHtml = '';
                if (sundayAssignedCodes.length > 0) {
                    const sundayAssignedEmps = sundayAssignedCodes.map(code => {
                        const emp = employees.find(e => e.code === code);
                        return emp ? `${emp.code} - ${emp.name}` : code;
                    });
                    sundayAssignedHtml = `
                        <div class="card-sunday-duty" title="Trực Chủ Nhật">
                            <i class="fa-solid fa-user-clock" style="color:var(--danger);"></i>
                            <span>${escapeHtml(sundayAssignedEmps.join(' & '))}</span>
                        </div>
                    `;
                } else {
                    sundayAssignedHtml = `
                        <div style="font-size:11px; color:var(--danger); font-weight:600; opacity:0.8;">
                            <i class="fa-solid fa-calendar-xmark"></i> Nghỉ định kỳ
                        </div>
                    `;
                }

                card.innerHTML = `
                    <div class="card-header-row">
                        <span class="card-date-badge">${displayDateStr}</span>
                        <span class="card-day-lbl">${dayName}</span>
                    </div>
                    <div class="card-body-content">${sundayAssignedHtml}</div>
                `;
            }
            // 2. APPROVED CARD
            else if (approvedRegs.length > 0) {
                card.className = 'bento-day-card card-theme-approved';
                const firstApproved = approvedRegs[0];
                const extraCount = approvedRegs.length > 1 ? ` (+${approvedRegs.length - 1})` : '';

                card.innerHTML = `
                    <div class="card-header-row">
                        <span class="card-date-badge">${displayDateStr}</span>
                        <span class="card-day-lbl">${dayName}</span>
                    </div>
                    <div class="card-body-content">
                        <div class="card-approved-person" title="Lý do: ${escapeHtml(firstApproved.reason)}">
                            <i class="fa-solid fa-user-check" style="color:var(--success);"></i>
                            <span>${escapeHtml(firstApproved.empCode)} - ${escapeHtml(firstApproved.empName)}${extraCount}</span>
                        </div>
                    </div>
                `;
            }
            // 3. PENDING APPLICATIONS CARD
            else if (pendingRegs.length > 0) {
                card.className = 'bento-day-card card-theme-pending';
                const firstPending = pendingRegs[0];
                const extraCountText = pendingRegs.length > 1 ? ` (+${pendingRegs.length - 1} đơn)` : ' (Chờ duyệt)';

                card.innerHTML = `
                    <div class="card-header-row">
                        <span class="card-date-badge">${displayDateStr}</span>
                        <span class="card-day-lbl">${dayName}</span>
                    </div>
                    <div class="card-body-content">
                        <div class="card-pending-chip" title="Chờ duyệt: ${escapeHtml(firstPending.empCode)} - ${escapeHtml(firstPending.empName)} (${escapeHtml(firstPending.reason)})">
                            <i class="fa-solid fa-clock-rotate-left" style="color:var(--warning-dark); flex-shrink:0;"></i>
                            <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:160px; font-weight:700;">${escapeHtml(firstPending.empCode)} - ${escapeHtml(firstPending.empName)}${extraCountText}</span>
                        </div>
                    </div>
                `;
            }
            // 4. AVAILABLE CARD
            else {
                card.className = 'bento-day-card card-theme-available';
                card.innerHTML = `
                    <div class="card-header-row">
                        <span class="card-date-badge">${displayDateStr}</span>
                        <span class="card-day-lbl">${dayName}</span>
                    </div>
                    <div class="card-body-content">
                        <div class="card-action-hint">
                            <i class="fa-solid fa-plus-circle"></i>
                            <span>Còn trống</span>
                        </div>
                    </div>
                `;
            }

            daysListEl.appendChild(card);
        }
    }

    function renderEmployeeCardsGrid() {
        if (!empCardGrid) return;
        empCardGrid.innerHTML = '';
        if (selectedEmpValue) selectedEmpValue.value = '';

        if (employees.length === 0) {
            empCardGrid.innerHTML = '<div style="color:#94a3b8; font-size:12px; grid-column:1/-1;">Chưa có nhân viên nào trong cấu hình.</div>';
            return;
        }

        employees.forEach((emp) => {
            const card = document.createElement('div');
            card.className = 'emp-picker-card';
            card.dataset.value = `${emp.code}|${emp.name}`;

            const initials = emp.name.split(' ').pop() || emp.code;

            card.innerHTML = `
                <div class="emp-picker-avatar">${escapeHtml(initials.substring(0, 2).toUpperCase())}</div>
                <div class="emp-picker-code">${escapeHtml(emp.code)}</div>
                <div class="emp-picker-name">${escapeHtml(emp.name)}</div>
            `;

            empCardGrid.appendChild(card);
        });
    }

    function renderAdminEmployeeTable() {
        if (!empTableBody) return;
        empTableBody.innerHTML = '';

        if (employees.length === 0) {
            empTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#94a3b8;">Chưa có nhân viên nào.</td></tr>';
            return;
        }

        employees.forEach((emp, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${index + 1}</td>
                <td><strong>${escapeHtml(emp.code)}</strong></td>
                <td>${escapeHtml(emp.name)}</td>
                <td>
                    <button class="btn btn-danger btn-sm btn-del-emp" data-code="${escapeHtml(emp.code)}" style="padding:4px 8px;">
                        <i class="fa-solid fa-trash"></i> Xóa
                    </button>
                </td>
            `;
            empTableBody.appendChild(tr);
        });
    }

    function renderAdminSundayShifts() {
        if (!sundayShiftsGrid) return;
        sundayShiftsGrid.innerHTML = '';

        const m = appConfig.targetMonth ?? 8;
        const y = appConfig.targetYear ?? 2026;
        const mStr = String(m + 1).padStart(2, '0');

        const sundays = [];
        const totalDays = new Date(y, m + 1, 0).getDate();
        for (let d = 1; d <= totalDays; d++) {
            const dateObj = new Date(y, m, d);
            if (dateObj.getDay() === 0) {
                sundays.push({ dateStr: `${y}-${mStr}-${String(d).padStart(2, '0')}`, dayNum: d });
            }
        }

        appConfig.sundayShifts = appConfig.sundayShifts || {};

        sundays.forEach(sun => {
            const currentSelected = appConfig.sundayShifts[sun.dateStr] || [];
            const block = document.createElement('div');
            block.className = 'stat-box';
            block.dataset.date = sun.dateStr;
            block.style.display = 'block';

            let chipsHtml = '';
            employees.forEach(emp => {
                const isChecked = currentSelected.includes(emp.code) ? 'checked' : '';
                chipsHtml += `
                    <label style="display:inline-flex; align-items:center; gap:6px; background:#ffffff; border:1px solid #cbd5e1; padding:4px 8px; border-radius:6px; font-size:11px; cursor:pointer;">
                        <input type="checkbox" class="cb-sunday-emp" value="${escapeHtml(emp.code)}" ${isChecked}>
                        <span>${escapeHtml(emp.code)} - ${escapeHtml(emp.name)}</span>
                    </label>
                `;
            });

            block.innerHTML = `
                <div style="font-weight:800; font-size:13px; color:#4f46e5; margin-bottom:8px; display:flex; justify-content:space-between;">
                    <span>Chủ Nhật, ${String(sun.dayNum).padStart(2, '0')}/${mStr}/${y}</span>
                    <span class="sun-badge" style="font-size:10px; background:#e0f2fe; color:#0284c7; padding:2px 6px; border-radius:10px;">Đã chọn: ${currentSelected.length}/2</span>
                </div>
                <div style="display:flex; flex-wrap:wrap; gap:6px; max-height:120px; overflow-y:auto;">
                    ${chipsHtml}
                </div>
            `;

            block.addEventListener('change', (e) => {
                const checked = block.querySelectorAll('.cb-sunday-emp:checked');
                const badge = block.querySelector('.sun-badge');
                if (checked.length > 2) {
                    e.target.checked = false;
                    showToast('Chỉ được phân công tối đa 02 nhân viên mỗi Chủ Nhật!', 'warning');
                } else if (badge) {
                    badge.textContent = `Đã chọn: ${checked.length}/2`;
                }
            });

            sundayShiftsGrid.appendChild(block);
        });
    }

    function renderAdminRegsTable() {
        if (!adminRegsTableBody) return;
        adminRegsTableBody.innerHTML = '';

        const mStr = String((appConfig.targetMonth ?? 8) + 1).padStart(2, '0');
        const monthPrefix = `${appConfig.targetYear ?? 2026}-${mStr}`;

        // Scoped to current admin target month
        const currentMonthRegs = registrationsList.filter(r => r.dateStr && r.dateStr.startsWith(monthPrefix));

        if (cntAllRegs) cntAllRegs.textContent = currentMonthRegs.length;
        if (cntPendingRegs) cntPendingRegs.textContent = currentMonthRegs.filter(r => r.status === 'pending').length;
        if (cntApprovedRegs) cntApprovedRegs.textContent = currentMonthRegs.filter(r => r.status === 'approved').length;
        if (cntRejectedRegs) cntRejectedRegs.textContent = currentMonthRegs.filter(r => r.status === 'rejected').length;

        let filtered = [...currentMonthRegs];
        if (activeApprFilter !== 'all') {
            filtered = filtered.filter(r => r.status === activeApprFilter);
        }

        filtered.sort((a, b) => {
            if (a.dateStr !== b.dateStr) return b.dateStr.localeCompare(a.dateStr);
            return (a.createdAt || a.id).localeCompare(b.createdAt || b.id);
        });

        if (filtered.length === 0) {
            adminRegsTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#94a3b8; padding:20px;">Không có đơn xin nghỉ phép nào.</td></tr>';
            return;
        }

        filtered.forEach(reg => {
            const parts = reg.dateStr.split('-');
            const displayDate = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : reg.dateStr;

            let badge = `<span class="badge-tag badge-pending"><i class="fa-solid fa-clock"></i> Chờ duyệt</span>`;
            if (reg.status === 'approved') badge = `<span class="badge-tag badge-approved"><i class="fa-solid fa-check"></i> Đã duyệt</span>`;
            if (reg.status === 'rejected') badge = `<span class="badge-tag badge-rejected"><i class="fa-solid fa-xmark"></i> Từ chối</span>`;

            let actionBtns = '';
            if (reg.status === 'pending') {
                actionBtns = `
                    <button class="btn btn-primary btn-sm btn-appr-approve" data-id="${reg.id}"><i class="fa-solid fa-check"></i> Duyệt</button>
                    <button class="btn btn-secondary btn-sm btn-appr-reject" data-id="${reg.id}"><i class="fa-solid fa-xmark"></i> Từ Chối</button>
                    <button class="btn btn-danger btn-sm btn-appr-delete" data-id="${reg.id}" title="Xóa vĩnh viễn đơn này"><i class="fa-solid fa-trash-can"></i> Xóa</button>
                `;
            } else if (reg.status === 'approved') {
                actionBtns = `
                    <button class="btn btn-secondary btn-sm btn-appr-reject" data-id="${reg.id}"><i class="fa-solid fa-xmark"></i> Hủy Duyệt</button>
                    <button class="btn btn-danger btn-sm btn-appr-delete" data-id="${reg.id}" title="Xóa vĩnh viễn đơn này"><i class="fa-solid fa-trash-can"></i> Xóa</button>
                `;
            } else {
                actionBtns = `
                    <button class="btn btn-primary btn-sm btn-appr-approve" data-id="${reg.id}"><i class="fa-solid fa-check"></i> Duyệt Lại</button>
                    <button class="btn btn-danger btn-sm btn-appr-delete" data-id="${reg.id}" title="Xóa vĩnh viễn đơn này"><i class="fa-solid fa-trash-can"></i> Xóa</button>
                `;
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${displayDate}</strong></td>
                <td><strong style="color:var(--primary);">${escapeHtml(reg.empCode)} - ${escapeHtml(reg.empName)}</strong></td>
                <td><span style="font-size:11px; color:#64748b;">${escapeHtml(reg.createdAt || 'N/A')}</span></td>
                <td><div style="max-width:240px;">${escapeHtml(reg.reason || 'Nghỉ phép cá nhân')}</div></td>
                <td>${badge}</td>
                <td><div style="display:flex; gap:6px; flex-wrap:wrap;">${actionBtns}</div></td>
            `;
            adminRegsTableBody.appendChild(tr);
        });
    }

    function refreshAllUI() {
        updateMonthHeaderInfo();
        renderDaysGrid();
        renderEmployeeCardsGrid();
        renderAdminEmployeeTable();
        renderAdminRegsTable();
        renderAdminSundayShifts();
        checkTimeAndTicker();
    }

    // 10. Event Listeners Setup
    function setupEventListeners() {
        // Month Navigation (Prev / Next)
        if (btnPrevMonth) {
            btnPrevMonth.addEventListener('click', () => {
                viewingMonth--;
                if (viewingMonth < 0) {
                    viewingMonth = 11;
                    viewingYear--;
                }
                refreshAllUI();
            });
        }

        if (btnNextMonth) {
            btnNextMonth.addEventListener('click', () => {
                viewingMonth++;
                if (viewingMonth > 11) {
                    viewingMonth = 0;
                    viewingYear++;
                }
                refreshAllUI();
            });
        }

        // Search Input
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                searchQuery = e.target.value;
                renderDaysGrid();
            });
        }

        // Filter Pills
        filterPills.forEach(btn => {
            btn.addEventListener('click', () => {
                filterPills.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                activeFilter = btn.dataset.filter;
                renderDaysGrid();
            });
        });

        // Quick Reason Chips
        document.querySelectorAll('.reason-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                if (registerReason) {
                    registerReason.value = chip.dataset.reason;
                    registerReason.focus();
                }
            });
        });

        // Modals Open/Close
        if (btnHeaderGuide) btnHeaderGuide.addEventListener('click', () => openModal(guideModal));
        if (btnCountdownGuide) btnCountdownGuide.addEventListener('click', () => openModal(guideModal));
        if (closeGuideModal) closeGuideModal.addEventListener('click', () => closeModal(guideModal));
        if (btnCloseGuideSubmit) btnCloseGuideSubmit.addEventListener('click', () => closeModal(guideModal));

        if (btnAdminKey) {
            btnAdminKey.addEventListener('click', () => {
                if (adminPassInput) adminPassInput.value = '';
                if (passErrorMsg) passErrorMsg.style.display = 'none';
                openModal(passwordModal);
                setTimeout(() => adminPassInput && adminPassInput.focus(), 150);
            });
        }

        if (closePasswordModal) closePasswordModal.addEventListener('click', () => closeModal(passwordModal));
        if (btnCancelPass) btnCancelPass.addEventListener('click', () => closeModal(passwordModal));

        if (passwordForm) {
            passwordForm.addEventListener('submit', (e) => {
                e.preventDefault();
                if (adminPassInput && adminPassInput.value.trim() === ADMIN_PASSCODE) {
                    isAdminSession = true;
                    closeModal(passwordModal);
                    renderAdminRegsTable();
                    renderAdminSundayShifts();
                    renderAdminEmployeeTable();
                    openModal(adminModal);
                    showToast('Đăng nhập Trưởng nhóm thành công!', 'success');
                } else {
                    if (passErrorMsg) passErrorMsg.style.display = 'block';
                    showToast('Mật khẩu không chính xác!', 'error');
                }
            });
        }

        if (closeAdminModal) closeAdminModal.addEventListener('click', () => closeModal(adminModal));

        // Admin Tab Navigation
        adminTabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                adminTabBtns.forEach(b => b.classList.remove('active'));
                adminTabPanes.forEach(p => p.classList.remove('active'));
                btn.classList.add('active');
                const targetPane = document.getElementById(btn.dataset.tab);
                if (targetPane) targetPane.classList.add('active');
            });
        });

        // Admin Approval Filter
        apprFilterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                apprFilterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                activeApprFilter = btn.dataset.apprFilter;
                renderAdminRegsTable();
            });
        });

        function populateAdminAssignSelect() {
            if (!adminAssignEmpSelect) return;
            adminAssignEmpSelect.innerHTML = '';
            employees.forEach(emp => {
                const opt = document.createElement('option');
                opt.value = `${emp.code}|${emp.name}`;
                opt.textContent = `${emp.code} – ${emp.name}`;
                adminAssignEmpSelect.appendChild(opt);
            });
        }

        function renderDayModalContent(dateFormatted, isTargetConfig) {
            if (!modalDateInput) return;
            modalDateInput.value = dateFormatted;
            if (registerReason) registerReason.value = '';

            const dayAllRegs = registrationsList.filter(r => r.dateStr === dateFormatted);
            const approvedList = dayAllRegs.filter(r => r.status === 'approved');
            const pendingList = dayAllRegs.filter(r => r.status === 'pending');

            // 1. ADMIN MODE
            if (isAdminSession) {
                if (adminDayToolbar) adminDayToolbar.style.display = 'block';
                populateAdminAssignSelect();

                if (pendingListBanner) pendingListBanner.style.display = 'block';
                if (pendingCountBadge) pendingCountBadge.textContent = `${dayAllRegs.length} đơn`;

                if (pendingItemsContainer) {
                    if (dayAllRegs.length === 0) {
                        pendingItemsContainer.innerHTML = `<div style="font-size:12px; color:#64748b; padding:4px 0;">Chưa có đơn nào trong ngày này.</div>`;
                    } else {
                        pendingItemsContainer.innerHTML = dayAllRegs.map(reg => {
                            let badgeHtml = `<span style="font-size:10px; background:#fef3c7; color:#d97706; padding:1px 6px; border-radius:6px; font-weight:700;">Chờ Duyệt</span>`;
                            let actBtns = `
                                <button type="button" class="btn btn-primary btn-sm btn-modal-act" data-act="approve" data-id="${reg.id}" style="padding:2px 8px; font-size:11px;"><i class="fa-solid fa-check"></i> Duyệt</button>
                                <button type="button" class="btn btn-secondary btn-sm btn-modal-act" data-act="reject" data-id="${reg.id}" style="padding:2px 8px; font-size:11px;"><i class="fa-solid fa-xmark"></i> Từ Chối</button>
                                <button type="button" class="btn btn-danger btn-sm btn-modal-act" data-act="delete" data-id="${reg.id}" style="padding:2px 8px; font-size:11px;"><i class="fa-solid fa-trash-can"></i> Xóa</button>
                            `;

                            if (reg.status === 'approved') {
                                badgeHtml = `<span style="font-size:10px; background:#dcfce7; color:#15803d; padding:1px 6px; border-radius:6px; font-weight:700;">Đã Duyệt</span>`;
                                actBtns = `
                                    <button type="button" class="btn btn-secondary btn-sm btn-modal-act" data-act="reject" data-id="${reg.id}" style="padding:2px 8px; font-size:11px;"><i class="fa-solid fa-xmark"></i> Hủy Duyệt</button>
                                    <button type="button" class="btn btn-danger btn-sm btn-modal-act" data-act="delete" data-id="${reg.id}" style="padding:2px 8px; font-size:11px;"><i class="fa-solid fa-trash-can"></i> Xóa</button>
                                `;
                            } else if (reg.status === 'rejected') {
                                badgeHtml = `<span style="font-size:10px; background:#fee2e2; color:#b91c1c; padding:1px 6px; border-radius:6px; font-weight:700;">Từ Chối</span>`;
                                actBtns = `
                                    <button type="button" class="btn btn-primary btn-sm btn-modal-act" data-act="approve" data-id="${reg.id}" style="padding:2px 8px; font-size:11px;"><i class="fa-solid fa-check"></i> Duyệt Lại</button>
                                    <button type="button" class="btn btn-danger btn-sm btn-modal-act" data-act="delete" data-id="${reg.id}" style="padding:2px 8px; font-size:11px;"><i class="fa-solid fa-trash-can"></i> Xóa</button>
                                `;
                            }

                            return `
                                <div style="background:#ffffff; border:1px solid #e2e8f0; padding:8px 10px; border-radius:8px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                                    <div>
                                        <div style="font-size:12px; font-weight:700; color:#0f172a; display:flex; align-items:center; gap:6px;">
                                            <span>${escapeHtml(reg.empCode)} - ${escapeHtml(reg.empName)}</span>
                                            ${badgeHtml}
                                        </div>
                                        <div style="font-size:11px; color:#64748b; margin-top:2px;">"${escapeHtml(reg.reason || reg.note || 'N/A')}" • <span style="font-size:10px;">${escapeHtml(reg.createdAt || '')}</span></div>
                                    </div>
                                    <div style="display:flex; gap:4px;">${actBtns}</div>
                                </div>
                            `;
                        }).join('');
                    }
                }

                if (registerForm) registerForm.style.display = 'none'; // Admin uses admin toolbar
            } 
            // 2. REGULAR USER MODE
            else {
                if (adminDayToolbar) adminDayToolbar.style.display = 'none';

                if (!isTargetConfig || !isTargetMonthOpen) {
                    if (registerForm) registerForm.style.display = 'none';
                    if (pendingListBanner) {
                        pendingListBanner.style.display = 'block';
                        let htmlStr = `<div style="font-size:12px; color:#0369a1; padding:4px 0;"><i class="fa-solid fa-lock"></i> Kỳ đăng ký tháng này đang đóng hoặc lưu trữ.</div>`;
                        if (approvedList.length > 0) {
                            htmlStr += approvedList.map(a => `<div style="font-weight:700; color:#15803d; font-size:12px; margin-top:4px;">• Đã duyệt: ${escapeHtml(a.empCode)} - ${escapeHtml(a.empName)}</div>`).join('');
                        }
                        if (pendingItemsContainer) pendingItemsContainer.innerHTML = htmlStr;
                    }
                } else {
                    if (registerForm) registerForm.style.display = 'block';
                    if (pendingListBanner) {
                        if (pendingList.length > 0) {
                            pendingListBanner.style.display = 'block';
                            if (pendingCountBadge) pendingCountBadge.textContent = `${pendingList.length} đơn`;
                            if (pendingItemsContainer) {
                                pendingItemsContainer.innerHTML = pendingList.map(p => `
                                    <div style="background:#ffffff; border:1px solid #fde68a; padding:6px 8px; border-radius:6px; font-size:11px;">
                                        <strong>${escapeHtml(p.empCode)} - ${escapeHtml(p.empName)}</strong>: "${escapeHtml(p.reason || p.note || '')}"
                                    </div>
                                `).join('');
                            }
                        } else {
                            pendingListBanner.style.display = 'none';
                        }
                    }
                }
            }
        }

        // Click Day Card on Calendar Grid (Open Register / View Modal)
        if (daysListEl) {
            daysListEl.addEventListener('click', (e) => {
                const card = e.target.closest('.bento-day-card');
                if (!card) return;

                const dateFormatted = card.dataset.date;
                const titleStr = card.dataset.title;
                const isTargetConfig = card.dataset.isTarget === 'true';

                if (modalDateTitle) modalDateTitle.textContent = titleStr;
                renderDayModalContent(dateFormatted, isTargetConfig);
                renderEmployeeCardsGrid();
                openModal(registerModal);
            });
        }

        // Action Buttons inside Date Modal (for Admin)
        if (pendingItemsContainer) {
            pendingItemsContainer.addEventListener('click', async (e) => {
                const btn = e.target.closest('.btn-modal-act');
                if (!btn) return;
                const act = btn.dataset.act;
                const regId = btn.dataset.id;
                const reg = registrationsList.find(r => String(r.id) === String(regId));
                if (!reg) return;

                if (act === 'approve') {
                    reg.status = 'approved';
                    saveData();
                    if (supabaseClient) await syncDayToSupabase(reg.dateStr);
                    refreshAllUI();
                    renderDayModalContent(reg.dateStr, true);
                    showToast(`Đã DUYỆT đơn cho ${reg.empName}!`, 'success');
                } else if (act === 'reject') {
                    reg.status = 'rejected';
                    saveData();
                    if (supabaseClient) await syncDayToSupabase(reg.dateStr);
                    refreshAllUI();
                    renderDayModalContent(reg.dateStr, true);
                    showToast(`Đã TỪ CHỐI đơn của ${reg.empName}!`, 'info');
                } else if (act === 'delete') {
                    if (confirm(`Bạn có chắc chắn muốn XÓA vĩnh viễn đơn của ${reg.empName}?`)) {
                        const dStr = reg.dateStr;
                        registrationsList = registrationsList.filter(r => String(r.id) !== String(regId));
                        saveData();
                        if (supabaseClient) await syncDayToSupabase(dStr);
                        refreshAllUI();
                        renderDayModalContent(dStr, true);
                        showToast(`Đã XÓA vĩnh viễn đơn của ${reg.empName}!`, 'success');
                    }
                }
            });
        }

        // Admin Assign Submit (Silent - No loud public broadcast)
        if (btnAdminAssignSubmit) {
            btnAdminAssignSubmit.addEventListener('click', async () => {
                const dateStr = modalDateInput.value;
                const selectedVal = adminAssignEmpSelect ? adminAssignEmpSelect.value : '';
                const statusVal = adminAssignStatusSelect ? adminAssignStatusSelect.value : 'approved';
                const reasonVal = adminAssignReasonInput ? adminAssignReasonInput.value.trim() : 'Trưởng nhóm phân công';

                if (!selectedVal) {
                    showToast('Vui lòng chọn nhân viên!', 'warning');
                    return;
                }

                const [empCode, empName] = selectedVal.split('|');
                const nowStr = getCloudServerNow().toLocaleString('vi-VN');
                const tempRegId = 'reg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);

                // Remove existing if any on same day and emp
                registrationsList = registrationsList.filter(r => !(r.dateStr === dateStr && r.empCode === empCode));

                registrationsList.push({
                    id: tempRegId,
                    dateStr: dateStr,
                    empCode: empCode,
                    empName: empName,
                    reason: reasonVal || 'Trưởng nhóm phân công',
                    status: statusVal,
                    adminNote: 'Phân công bởi Trưởng nhóm',
                    createdAt: nowStr
                });

                saveData(false); // Silent save (no broadcast alert)
                refreshAllUI();
                renderDayModalContent(dateStr, true);
                showToast(`Đã lưu phân công cho ${empName}!`, 'success');

                if (supabaseClient) {
                    await syncDayToSupabase(dateStr);
                }
            });
        }

        // Select Employee Card inside Register Modal
        if (empCardGrid) {
            empCardGrid.addEventListener('click', (e) => {
                const card = e.target.closest('.emp-picker-card');
                if (card) {
                    document.querySelectorAll('.emp-picker-card').forEach(c => c.classList.remove('selected'));
                    card.classList.add('selected');
                    if (selectedEmpValue) selectedEmpValue.value = card.dataset.value;
                }
            });
        }

        if (closeRegisterModal) closeRegisterModal.addEventListener('click', () => closeModal(registerModal));
        if (btnCancelRegister) btnCancelRegister.addEventListener('click', () => closeModal(registerModal));

        // Submit Employee Registration
        if (registerForm) {
            registerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const dateStr = modalDateInput.value;
                const selectedVal = selectedEmpValue.value;
                const reasonVal = registerReason.value.trim();

                if (!selectedVal) {
                    showToast('Vui lòng chạm chọn 1 thẻ tên nhân viên!', 'warning');
                    return;
                }
                if (!reasonVal) {
                    showToast('Vui lòng nhập lý do xin nghỉ phép!', 'warning');
                    return;
                }

                const [empCode, empName] = selectedVal.split('|');
                const existing = registrationsList.find(r => r.dateStr === dateStr && r.empCode === empCode && r.status !== 'rejected');
                if (existing) {
                    showToast(`${empName} đã gửi đơn nghỉ ngày này rồi!`, 'error');
                    closeModal(registerModal);
                    return;
                }

                const nowStr = getCloudServerNow().toLocaleString('vi-VN');
                const tempRegId = 'reg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);

                registrationsList.push({
                    id: tempRegId,
                    dateStr: dateStr,
                    empCode: empCode,
                    empName: empName,
                    reason: reasonVal,
                    status: 'pending',
                    adminNote: '',
                    createdAt: nowStr
                });

                saveData();
                closeModal(registerModal);
                refreshAllUI();
                showToast(`Đã gửi đơn xin nghỉ ngày ${dateStr}!`, 'success');

                if (supabaseClient) {
                    updateCloudBadge('syncing', 'Đang gửi đơn...');
                    await syncDayToSupabase(dateStr);
                    updateCloudBadge('online', 'Cloud Realtime');
                }
            });
        }

        // Admin Approval Actions (Approve / Reject / Delete)
        if (adminRegsTableBody) {
            adminRegsTableBody.addEventListener('click', async (e) => {
                const approveBtn = e.target.closest('.btn-appr-approve');
                const rejectBtn = e.target.closest('.btn-appr-reject');
                const deleteBtn = e.target.closest('.btn-appr-delete');

                if (approveBtn) {
                    const regId = approveBtn.dataset.id;
                    const reg = registrationsList.find(r => String(r.id) === String(regId));
                    if (reg) {
                        reg.status = 'approved';
                        saveData();
                        if (supabaseClient) await syncDayToSupabase(reg.dateStr);
                        refreshAllUI();
                        showToast(`Đã DUYỆT đơn cho ${reg.empName}!`, 'success');
                    }
                } else if (rejectBtn) {
                    const regId = rejectBtn.dataset.id;
                    const reg = registrationsList.find(r => String(r.id) === String(regId));
                    if (reg) {
                        reg.status = 'rejected';
                        saveData();
                        if (supabaseClient) await syncDayToSupabase(reg.dateStr);
                        refreshAllUI();
                        showToast(`Đã TỪ CHỐI đơn của ${reg.empName}!`, 'info');
                    }
                } else if (deleteBtn) {
                    const regId = deleteBtn.dataset.id;
                    const reg = registrationsList.find(r => String(r.id) === String(regId));
                    if (reg) {
                        if (confirm(`Bạn có chắc chắn muốn XÓA vĩnh viễn đơn nghỉ ngày ${reg.dateStr} của ${reg.empName}?`)) {
                            const dStr = reg.dateStr;
                            registrationsList = registrationsList.filter(r => String(r.id) !== String(regId));
                            saveData();
                            if (supabaseClient) await syncDayToSupabase(dStr);
                            refreshAllUI();
                            showToast(`Đã XÓA vĩnh viễn đơn của ${reg.empName}!`, 'success');
                        }
                    }
                }
            });
        }

        // Admin Sunday Shifts Save
        if (btnSaveSundayShifts) {
            btnSaveSundayShifts.addEventListener('click', async () => {
                const newShifts = {};
                document.querySelectorAll('#sundayShiftsGrid .stat-box').forEach(block => {
                    const dStr = block.dataset.date;
                    const codes = Array.from(block.querySelectorAll('.cb-sunday-emp:checked')).map(cb => cb.value);
                    if (codes.length > 0) newShifts[dStr] = codes;
                });

                appConfig.sundayShifts = newShifts;
                saveData();
                if (supabaseClient) await pushConfigToSupabase();
                refreshAllUI();
                showToast('Đã lưu phân công trực Chủ Nhật!', 'success');
            });
        }

        // Admin Set Open Free Month
        if (btnSetOpenNow) {
            btnSetOpenNow.addEventListener('click', async () => {
                appConfig.targetMonth = parseInt(configMonthSelect.value, 10);
                appConfig.targetYear = parseInt(configYearSelect.value, 10);
                appConfig.isOpenAlways = true;
                appConfig.startTime = '';
                appConfig.endTime = '';
                if (startTimeInput) startTimeInput.value = '';
                if (endTimeInput) endTimeInput.value = '';

                viewingMonth = appConfig.targetMonth;
                viewingYear = appConfig.targetYear;

                saveData();
                if (supabaseClient) await pushConfigToSupabase();
                refreshAllUI();
                showToast(`Đã mở tự do Tháng ${appConfig.targetMonth + 1}/${appConfig.targetYear}!`, 'success');
            });
        }

        // Admin Set Lock Immediately
        if (btnSetLockNow) {
            btnSetLockNow.addEventListener('click', async () => {
                const now = getCloudServerNow();
                const futureStart = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                const futureEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

                appConfig.targetMonth = parseInt(configMonthSelect.value, 10);
                appConfig.targetYear = parseInt(configYearSelect.value, 10);
                appConfig.isOpenAlways = false;
                appConfig.startTime = formatForDateTimeInput(futureStart);
                appConfig.endTime = formatForDateTimeInput(futureEnd);

                if (startTimeInput) startTimeInput.value = appConfig.startTime;
                if (endTimeInput) endTimeInput.value = appConfig.endTime;

                viewingMonth = appConfig.targetMonth;
                viewingYear = appConfig.targetYear;

                saveData();
                if (supabaseClient) await pushConfigToSupabase();
                refreshAllUI();
                showToast(`Đã khóa lịch Tháng ${appConfig.targetMonth + 1}/${appConfig.targetYear}!`, 'warning');
            });
        }

        // Admin Save Countdown Timing
        if (btnSaveTimeConfig) {
            btnSaveTimeConfig.addEventListener('click', async () => {
                const startVal = startTimeInput.value;
                const endVal = endTimeInput.value;

                if (!startVal || !endVal) {
                    showToast('Vui lòng chọn cả thời gian bắt đầu và kết thúc!', 'warning');
                    return;
                }

                appConfig.targetMonth = parseInt(configMonthSelect.value, 10);
                appConfig.targetYear = parseInt(configYearSelect.value, 10);
                appConfig.isOpenAlways = false;
                appConfig.startTime = startVal;
                appConfig.endTime = endVal;

                viewingMonth = appConfig.targetMonth;
                viewingYear = appConfig.targetYear;

                saveData();
                if (supabaseClient) await pushConfigToSupabase();
                refreshAllUI();
                showToast(`Đã lưu hẹn giờ Tháng ${appConfig.targetMonth + 1}/${appConfig.targetYear}!`, 'success');
            });
        }

        // Safe Delete Registrations in Target Month Only
        if (btnClearAllRegs) {
            btnClearAllRegs.addEventListener('click', async () => {
                const mStr = String((appConfig.targetMonth ?? 8) + 1).padStart(2, '0');
                const monthPrefix = `${appConfig.targetYear ?? 2026}-${mStr}`;

                if (confirm(`Xác nhận xóa toàn bộ đơn đăng ký trong Tháng ${mStr}/${appConfig.targetYear}?`)) {
                    if (supabaseClient) {
                        await supabaseClient.from('registrations').delete().like('date_str', `${monthPrefix}%`);
                    }
                    registrationsList = registrationsList.filter(r => !r.dateStr.startsWith(monthPrefix));
                    saveData();
                    refreshAllUI();
                    showToast(`Đã xóa sạch đơn đăng ký Tháng ${mStr}/${appConfig.targetYear}!`, 'info');
                }
            });
        }

        // Add Employee
        if (btnAddEmployee) {
            btnAddEmployee.addEventListener('click', async () => {
                const code = newEmpId.value.trim().toUpperCase();
                const name = newEmpName.value.trim();

                if (!code || !name) {
                    showToast('Vui lòng nhập Mã NV và Tên NV!', 'warning');
                    return;
                }

                if (employees.some(e => e.code === code)) {
                    showToast(`Mã nhân viên ${code} đã tồn tại!`, 'error');
                    return;
                }

                employees.push({ code, name });
                newEmpId.value = '';
                newEmpName.value = '';
                saveData();
                await pushEmployeesToSupabase();
                refreshAllUI();
                showToast(`Đã thêm nhân viên ${code} - ${name}!`, 'success');
            });
        }

        // Delete Employee
        if (empTableBody) {
            empTableBody.addEventListener('click', async (e) => {
                const delBtn = e.target.closest('.btn-del-emp');
                if (delBtn) {
                    const code = delBtn.dataset.code;
                    if (confirm(`Bạn có chắc chắn muốn xóa nhân viên ${code}?`)) {
                        employees = employees.filter(e => e.code !== code);
                        saveData();
                        await pushEmployeesToSupabase();
                        refreshAllUI();
                        showToast(`Đã xóa nhân viên ${code}!`, 'info');
                    }
                }
            });
        }

        // Supabase Settings
        if (btnSaveSupabase) {
            btnSaveSupabase.addEventListener('click', () => {
                const cleanUrl = sanitizeSupabaseUrl(supabaseUrl.value);
                const keyVal = supabaseKey.value.trim();
                if (!cleanUrl || !keyVal) {
                    showToast('Vui lòng điền đủ URL và Key!', 'warning');
                    return;
                }
                supabaseConfig = { url: cleanUrl, key: keyVal };
                saveData();
                initSupabaseIfConfigured();
                showToast('Đã lưu kết nối Supabase Cloud!', 'success');
            });
        }

        if (btnDisconnectSupabase) {
            btnDisconnectSupabase.addEventListener('click', () => {
                supabaseConfig = { ...DEFAULT_SUPABASE };
                localStorage.removeItem(STORAGE_SUPABASE);
                if (supabaseUrl) supabaseUrl.value = DEFAULT_SUPABASE.url;
                if (supabaseKey) supabaseKey.value = DEFAULT_SUPABASE.key;
                initSupabaseIfConfigured();
                showToast('Đã khôi phục Supabase mặc định hệ thống.', 'info');
            });
        }

        // Export to CSV
        if (btnExportExcel) {
            btnExportExcel.addEventListener('click', () => {
                const mStr = String((appConfig.targetMonth ?? 8) + 1).padStart(2, '0');
                const monthPrefix = `${appConfig.targetYear ?? 2026}-${mStr}`;
                const currentMonthRegs = registrationsList.filter(r => r.dateStr && r.dateStr.startsWith(monthPrefix));

                if (currentMonthRegs.length === 0) {
                    showToast('Không có đơn nào trong tháng này để xuất file!', 'warning');
                    return;
                }

                let csv = "\uFEFFSTT,Ngày Đăng Ký,Mã Nhân Viên,Tên Nhân Viên,Lý Do,Trạng Thái,Thời Gian Gửi\n";
                currentMonthRegs.forEach((r, idx) => {
                    csv += `${idx + 1},"${r.dateStr}","${r.empCode}","${r.empName}","${r.reason}","${r.status}","${r.createdAt}"\n`;
                });

                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `Danh_Sach_Nghi_Phep_Thang_${mStr}_${appConfig.targetYear}.csv`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                showToast(`Đã xuất file Excel gồm ${currentMonthRegs.length} đơn!`, 'success');
            });
        }

        // Broadcast Sync
        if (syncChannel) {
            syncChannel.onmessage = (event) => {
                if (event.data && event.data.type === 'DATA_UPDATED' && !isInternalUpdate) {
                    loadData();
                    refreshAllUI();
                }
            };
        }

        // Window Focus Auto-Sync
        window.addEventListener('focus', () => { if (supabaseClient) fetchSupabaseData(true); });
        setInterval(() => { if (supabaseClient) fetchSupabaseData(true); }, 15000);
    }

    // 11. Initializer
    function init() {
        loadData();
        setupEventListeners();
        syncServerTime();
        initSupabaseIfConfigured();
        refreshAllUI();
        startCountdownTicker();
    }

    document.addEventListener('DOMContentLoaded', init);
})();
