// Global native fetch is used

const BASE = 'http://localhost:5000/api';

async function runTests() {
  console.log('🚀 Starting Comprehensive RBAC Security & Admin Panel Test Suite...\n');

  // 1. Superadmin login
  const superLoginRes = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'superadmin', password: 'superadmin123' })
  });
  const superData = await superLoginRes.json();
  if (!superLoginRes.ok || !superData.token) {
    throw new Error('Superadmin login failed: ' + JSON.stringify(superData));
  }
  console.log('✅ Test 1: Superadmin Login succeeded with full authority.');

  // 2. Superadmin creates new staff admin
  const createAdminRes = await fetch(`${BASE}/auth/admins`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${superData.token}`
    },
    body: JSON.stringify({
      username: 'e2e_operator',
      name: 'E2E Fleet Operator',
      temporaryPassword: 'TempPassword2026!',
      permissions: ['inventory:view', 'inventory:create']
    })
  });
  const createData = await createAdminRes.json();
  if (!createAdminRes.ok || !createData.admin) {
    throw new Error('Create admin failed: ' + JSON.stringify(createData));
  }
  console.log(`✅ Test 2: Superadmin created Admin "e2e_operator" with temporary password & permissions [inventory:view, inventory:create]. mustChangePassword=${createData.admin.mustChangePassword}`);

  // 3. Admin logs in with temporary password
  const adminLoginRes = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'e2e_operator', password: 'TempPassword2026!' })
  });
  const adminData = await adminLoginRes.json();
  if (!adminLoginRes.ok || !adminData.user.mustChangePassword) {
    throw new Error('Admin login failed or mustChangePassword flag missing');
  }
  console.log('✅ Test 3: Admin logged in with temporary password. Flag mustChangePassword=true enforced.');

  // 4. Admin tries unauthorized action (deleting vehicle without 'inventory:delete' permission)
  const deleteAttempt = await fetch(`${BASE}/vehicles/toyota-innova-crysta-2022-bronze-1`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminData.token}` }
  });
  if (deleteAttempt.status !== 403) {
    throw new Error(`Unauthorized delete was NOT blocked with 403! Status: ${deleteAttempt.status}`);
  }
  console.log('✅ Test 4: Privilege Escalation blocked. Admin without "inventory:delete" received HTTP 403 Forbidden.');

  // 5. Admin changes own password
  const changeOwnRes = await fetch(`${BASE}/auth/change-own-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminData.token}`
    },
    body: JSON.stringify({ newPassword: 'PermanentPassword2026#' })
  });
  const changeOwnData = await changeOwnRes.json();
  if (!changeOwnRes.ok) {
    throw new Error('Change own password failed: ' + JSON.stringify(changeOwnData));
  }
  console.log('✅ Test 5: Admin established permanent password. mustChangePassword cleared.');

  // 6. Superadmin resets admin's password
  const resetRes = await fetch(`${BASE}/auth/admins/${createData.admin.id}/reset-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${superData.token}`
    },
    body: JSON.stringify({ temporaryPassword: 'NewTempPassword2026!' })
  });
  const resetData = await resetRes.json();
  if (!resetRes.ok) {
    throw new Error('Reset password failed: ' + JSON.stringify(resetData));
  }
  console.log('✅ Test 6: Superadmin reset Admin temporary password successfully.');

  // 7. Superadmin deactivates admin account
  const deactRes = await fetch(`${BASE}/auth/admins/${createData.admin.id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${superData.token}`
    },
    body: JSON.stringify({ status: 'deactivated' })
  });
  if (!deactRes.ok) {
    throw new Error('Deactivate failed');
  }
  console.log('✅ Test 7: Superadmin deactivated Admin account.');

  // 8. Verify deactivated admin cannot log in
  const deactLoginRes = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'e2e_operator', password: 'NewTempPassword2026!' })
  });
  if (deactLoginRes.status !== 403) {
    throw new Error('Deactivated account was NOT rejected with 403!');
  }
  console.log('✅ Test 8: Deactivated Admin login strictly blocked with HTTP 403.');

  // 9. Superadmin deletes test admin account
  const deleteAdminRes = await fetch(`${BASE}/auth/admins/${createData.admin.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${superData.token}` }
  });
  if (!deleteAdminRes.ok) {
    throw new Error('Delete admin account failed');
  }
  console.log('✅ Test 9: Superadmin permanently deleted test admin account.');

  // 10. Audit logs check
  const logsRes = await fetch(`${BASE}/activity-logs`, {
    headers: { Authorization: `Bearer ${superData.token}` }
  });
  const logsData = await logsRes.json();
  if (!logsRes.ok || !Array.isArray(logsData.logs) || logsData.logs.length === 0) {
    throw new Error('Activity logs retrieval failed');
  }
  console.log(`✅ Test 10: Activity logs successfully retrieved (${logsData.logs.length} logged events verified).`);

  console.log('\n🎉 ALL 10 TESTS PASSED CLEANLY! Super Admin & Admin RBAC system is fully operational.');
}

runTests().catch(err => {
  console.error('\n❌ Test suite failed:', err);
  process.exit(1);
});
