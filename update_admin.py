import os

file_path = 'd:/HOPE18/GameVault_Project_FIXED/GameVault_Project/frontend/src/pages/AdminDashboard.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add Payout details in disputes
old_item_details_end = """                      </div>
                    )}

                    <div style={{ marginTop: 8, padding: 8, background: 'var(--bg-default)', borderRadius: 4, fontSize: '0.85rem' }}>"""

new_payout_details = """                      </div>
                    )}

                    {d.payout_details && (
                      <div style={{ marginTop: 8, padding: 12, background: 'rgba(255,193,7,0.05)', border: '1px solid rgba(255,193,7,0.2)', borderRadius: 8 }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--accent-glow)', fontWeight: 600, marginBottom: 8 }}>🏦 Seller Payout Details (Masked)</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: '0.85rem' }}>
                          <div><strong>Bank:</strong> {d.payout_details.bank_name || 'Not provided'}</div>
                          <div><strong>Holder:</strong> {d.payout_details.account_holder_name || 'Not provided'}</div>
                          <div><strong>Account:</strong> {d.payout_details.bank_account_number ? `****${d.payout_details.bank_account_number.slice(-4)}` : 'Not provided'}</div>
                          <div><strong>IFSC:</strong> {d.payout_details.ifsc_code || 'Not provided'}</div>
                        </div>
                      </div>
                    )}

                    <div style={{ marginTop: 8, padding: 8, background: 'var(--bg-default)', borderRadius: 4, fontSize: '0.85rem' }}>"""

if "🏦 Seller Payout Details" not in content:
    content = content.replace(old_item_details_end, new_payout_details)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated AdminDashboard.jsx")
