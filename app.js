const defaultRecords = [
    { id: 'EMP-1042', name: 'A.Roop Sri Sagar', dept: 'AI & Machine Learning', loc: 'HITEC City Campus', cert: 'AWS Certified Machine Learning', expiry: '2027-11-15' },
    { id: 'EMP-1088', name: 'N.Ram Lokesh', dept: 'Data Engineering', loc: 'Gachibowli Phase 2', cert: 'Azure Data Engineer Associate', expiry: '2026-08-10' },
    { id: 'EMP-1102', name: 'P.Sputhnik', dept: 'Infrastructure Solutions', loc: 'Cyberabad GCC', cert: 'Cisco CCNA', expiry: '2024-03-22' },
    { id: 'EMP-0945', name: 'SV Karthik', dept: 'HR Operations', loc: 'Hyderabad HQ', cert: 'SHRM Certified Professional', expiry: '2028-05-30' }
];

document.addEventListener('DOMContentLoaded', () => {
    if (!localStorage.getItem('certRecords')) {
        localStorage.setItem('certRecords', JSON.stringify(defaultRecords));
    }

    if (!document.getElementById('toast-container')) {
        const toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        document.body.appendChild(toastContainer);
    }

    if (document.getElementById('certTableBody')) {
        renderTable();
        setupSearchFilter();
    }

    if (document.getElementById('recordForm')) {
        setupFormHandler();
    }
});

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icon = type === 'success' ? '<i class="fas fa-check-circle" style="color: var(--success-text)"></i>' : '<i class="fas fa-exclamation-circle" style="color: var(--danger-text)"></i>';
    toast.innerHTML = `${icon} <span>${message}</span>`;
    
    container.appendChild(toast);
    
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function renderTable() {
    const tbody = document.getElementById('certTableBody');
    const records = JSON.parse(localStorage.getItem('certRecords')) || [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let validCount = 0, warningCount = 0, expiredCount = 0;
    tbody.innerHTML = '';

    records.forEach((record, index) => {
        const expiryDate = new Date(record.expiry);
        const timeDiff = expiryDate.getTime() - today.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

        let statusBadge = '';
        if (daysDiff < 0) {
            statusBadge = '<span class="badge expired"><i class="fas fa-times-circle"></i> Expired</span>';
            expiredCount++;
        } else if (daysDiff <= 30) {
            statusBadge = '<span class="badge warning"><i class="fas fa-exclamation-triangle"></i> Expiring Soon</span>';
            warningCount++;
        } else {
            statusBadge = '<span class="badge valid"><i class="fas fa-check-circle"></i> Valid</span>';
            validCount++;
        }

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <div style="font-weight: 500; color: var(--text-main);">${record.name}</div>
                <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">${record.id}</div>
            </td>
            <td>
                <div style="color: var(--text-main);">${record.loc}</div>
                <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">${record.dept}</div>
            </td>
            <td style="font-weight: 500;">${record.cert}</td>
            <td>${record.expiry}</td>
            <td>${statusBadge}</td>
            <td>
                <button class="action-btn" onclick="deleteRecord(${index})">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });

    document.getElementById('stat-total').innerText = records.length;
    document.getElementById('stat-valid').innerText = validCount;
    document.getElementById('stat-warning').innerText = warningCount;
    document.getElementById('stat-expired').innerText = expiredCount;
}

function setupFormHandler() {
    const form = document.getElementById('recordForm');
    form.addEventListener('submit', function(e) {
        e.preventDefault();

        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        submitBtn.disabled = true;

        const newRecord = {
            id: document.getElementById('empId').value.trim(),
            name: document.getElementById('empName').value.trim(),
            dept: document.getElementById('empDept').value.trim(),
            loc: document.getElementById('empLoc').value.trim(),
            cert: document.getElementById('certName').value.trim(),
            expiry: document.getElementById('expiryDate').value
        };

        setTimeout(() => {
            const records = JSON.parse(localStorage.getItem('certRecords')) || [];
            records.push(newRecord);
            localStorage.setItem('certRecords', JSON.stringify(records));
            
            showToast('Record saved successfully!');
            form.reset();
            
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Save to Database';
            submitBtn.disabled = false;
        }, 600);
    });
}

window.deleteRecord = function(index) {
    if (confirm('Permanently delete this compliance record?')) {
        let records = JSON.parse(localStorage.getItem('certRecords'));
        records.splice(index, 1);
        localStorage.setItem('certRecords', JSON.stringify(records));
        renderTable();
        showToast('Record deleted.', 'error');
    }
};

function setupSearchFilter() {
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', function(e) {
        const term = e.target.value.toLowerCase();
        const rows = document.querySelectorAll('#certTableBody tr');
        
        rows.forEach(row => {
            const textContent = row.textContent.toLowerCase();
            row.style.display = textContent.includes(term) ? '' : 'none';
        });
    });
}