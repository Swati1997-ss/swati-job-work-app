(() => {
  'use strict';

  // Runs only once for UI Alpha 4 on each browser/device.
  const RESET_MARKER = 'swati_ui_alpha5_fresh_test_reset_done';

  if (localStorage.getItem(RESET_MARKER) === '1') return;

  // Clear BUSINESS / TEST data only.
  // Keep settings, operators, current operator, device ID and sync credentials.
  const CLEAR_KEYS = [
    'swati_oil_transactions_v1',
    'swati_batches_v1',
    'swati_audit_v1',
    'swati_sync_queue_v2',
    'swati_last_sync_v2',
    'swati_master_updated_v1',
    'swati_company_raw_purchases_v1',
    'swati_company_production_batches_v1',
    'swati_company_sales_v1'
  ];

  CLEAR_KEYS.forEach(k => localStorage.removeItem(k));

  // Keep the existing shared-sync credentials, but pause Auto Sync so an old
  // Google master cannot immediately repopulate the freshly-cleared test device.
  try {
    const key = 'swati_sync_config_v1';
    const raw = localStorage.getItem(key);
    if (raw) {
      const cfg = JSON.parse(raw);
      cfg.autoSync = false;
      localStorage.setItem(key, JSON.stringify(cfg));
    }
  } catch {}

  localStorage.setItem(RESET_MARKER, '1');
})();
