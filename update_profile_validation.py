import os
import re

file_path = 'd:/HOPE18/GameVault_Project_FIXED/GameVault_Project/frontend/src/pages/Profile.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add setActiveTab('analytics') on success
old_success = """        toast.success(data.message || 'Payout details saved!');
      } else {"""
new_success = """        toast.success(data.message || 'Payout details saved!');
        setActiveTab('analytics');
      } else {"""
content = content.replace(old_success, new_success)

# 2. Add basic validation
old_submit = """  const handlePayoutSubmit = async (e) => {
    e.preventDefault();
    setIsSavingPayout(true);
    try {"""
new_submit = """  const handlePayoutSubmit = async (e) => {
    e.preventDefault();
    
    if (!/^\d{9,18}$/.test(payoutDetails.bank_account_number)) {
      toast.error('Account number must be 9-18 digits.');
      return;
    }
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(payoutDetails.ifsc_code)) {
      toast.error('Invalid IFSC Code format (e.g. SBIN0001234).');
      return;
    }
    if (payoutDetails.account_holder_name.trim().length < 3) {
      toast.error('Enter a valid Account Holder Name.');
      return;
    }

    setIsSavingPayout(true);
    try {"""
content = content.replace(old_submit, new_submit)

# 3. Change input styles
content = content.replace('className="form-control bg-dark text-light border-secondary"', 'className="gv-form-input"')
content = content.replace('className="btn btn-warning fw-bold w-100 rounded-pill"', 'className="btn-gv-primary w-100"')
content = content.replace('className="text-secondary"', 'style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "8px" }}')

# Add a subtle background to the form area
old_form_start = """                <form onSubmit={handlePayoutSubmit}>"""
new_form_start = """                <form onSubmit={handlePayoutSubmit} className="glass-card" style={{ padding: '24px', background: 'rgba(255,193,7,0.03)', border: '1px solid rgba(255,193,7,0.1)' }}>"""
content = content.replace(old_form_start, new_form_start)

# Add title styling
old_title = """<h3 className="text-warning fw-bold mb-4">Payout Settings</h3>
                <p className="text-muted mb-4">Configure your bank details to receive payments for sales and rentals.</p>"""
new_title = """<h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--accent-glow)' }} className="mb-2">Payout Settings</h3>
                <p style={{ color: 'var(--text-muted)' }} className="mb-4">Configure your bank details to receive payments for sales and rentals.</p>"""
content = content.replace(old_title, new_title)


with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated Profile.jsx validation and styling.")
