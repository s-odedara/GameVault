import os

file_path = 'd:/HOPE18/GameVault_Project_FIXED/GameVault_Project/frontend/src/pages/MyOrders.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add processingOrderId state
old_state = """  const [loading, setLoading] = useState(true);

  const [disputeModal, setDisputeModal] = useState({ isOpen: false, type: '', orderId: null });"""
new_state = """  const [loading, setLoading] = useState(true);
  const [processingOrderId, setProcessingOrderId] = useState(null);

  const [disputeModal, setDisputeModal] = useState({ isOpen: false, type: '', orderId: null });"""
content = content.replace(old_state, new_state)

# Update handleUpdateStatus
old_handle = """  const handleUpdateStatus = async (type, orderId, newStatus, otp = null) => {
    try {"""
new_handle = """  const handleUpdateStatus = async (type, orderId, newStatus, otp = null) => {
    setProcessingOrderId(orderId);
    try {"""
content = content.replace(old_handle, new_handle)

old_catch = """      }
    } catch { 
      toast.error('Server error.'); 
    }
  };"""
new_catch = """      }
    } catch { 
      toast.error('Server error.'); 
    } finally {
      setProcessingOrderId(null);
    }
  };"""
content = content.replace(old_catch, new_catch)

# Now update the disabled props of buttons using regex or string replace.
# The buttons use handleUpdateStatus. Let's just find `disabled={` and add `processingOrderId === o.id || `
import re

content = re.sub(
    r'<button\s+([^>]*onClick=\{\(\)\s*=>\s*handleUpdateStatus\([^>]*)(disabled=\{.*?\})?([^>]*)>',
    lambda m: f'<button {m.group(1)} disabled={{processingOrderId === o.id || {m.group(2)[10:-1] if m.group(2) else "false"}}} {m.group(3)}>',
    content
)

# And submit dispute
old_submit_dispute = """  const submitDispute = async () => {
    if (!disputeReason.trim()) {"""
new_submit_dispute = """  const submitDispute = async () => {
    if (!disputeReason.trim()) {"""

content = content.replace(old_submit_dispute, new_submit_dispute)

# Add isSubmitting state to DisputeModal
old_submit_try = """    try {
      const res = await fetch(`${API_BASE_URL}/disputes/raise/`, {"""
new_submit_try = """    setProcessingOrderId('dispute');
    try {
      const res = await fetch(`${API_BASE_URL}/disputes/raise/`, {"""
content = content.replace(old_submit_try, new_submit_try)

old_submit_catch = """      }
    } catch {
      toast.error("Server error while raising dispute.");
    }
  };"""
new_submit_catch = """      }
    } catch {
      toast.error("Server error while raising dispute.");
    } finally {
      setProcessingOrderId(null);
    }
  };"""
content = content.replace(old_submit_catch, new_submit_catch)

old_submit_button = """<button className="btn-gv-primary" onClick={submitDispute}>Submit</button>"""
new_submit_button = """<button className="btn-gv-primary" onClick={submitDispute} disabled={processingOrderId === 'dispute'}>{processingOrderId === 'dispute' ? 'Submitting...' : 'Submit'}</button>"""
content = content.replace(old_submit_button, new_submit_button)


with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated MyOrders.jsx")
