# Swati App — UI Alpha 33

## Critical PWA Splash Branding Fix

This build refreshes the installed PWA identity so Android does not keep reusing the original WebAPK label.

Changes:
- New manifest identity: `swati-mini-oil-mill-v2`
- App name: **Swati Mini Oil Mill**
- Short name: **Swati Mini Oil Mill**
- New start URL identity token
- New manifest cache/version token
- New icon URL versions
- New service-worker cache generation
- Explicit HTML application-name and Apple mobile title metadata

Important: an already-installed Android PWA can keep its old package label because that label belongs to the installed WebAPK package. Deploy this build, remove the old installed app once, then install again from Chrome. Business localStorage on the website origin is not intentionally cleared by this build.

Alpha 33 Data Integrity Audit is postponed until this critical stabilization issue is confirmed fixed.
