The remaining item is the **DNS fix for domain machines**. Let me provide you the instructions to run on the domain controller when you're ready.

## DNS Fix for Domain Machines (To Run on the Domain Controller)

When you RDP to `HBERC.HBERC-DOMAIN.com` (`10.10.100.100`), open PowerShell as Administrator and run:

```powershell
# Option A: Add a conditional forwarder zone for aldauselect.com (preferred — forwards all *.aldauselect.com to public DNS)
Add-DnsServerConditionalForwarderZone -Name "aldauselect.com" -MasterServers 8.8.8.8,8.8.4.4

# OR Option B: Add just the single A record (simpler, but only covers this one subdomain)
Add-DnsServerResourceRecordA -ZoneName "HBERC-DOMAIN.com" -Name "invitees.aldauselect.com" -IPv4Address "10.10.100.116"
```

**Option A** is better because:
- It makes ALL `*.aldauselect.com` domains resolvable from domain machines (future-proof)
- It forwards to Google DNS for resolution, then domain machines can reach the public IP for other subdomains too

**However**, for your app specifically, you want domain machines to reach the **internal IP** (`10.10.100.116`) directly, not the public IP (which would require NAT hairpin). So the best approach is actually:

```powershell
# Best: Create a stub zone + override just the invitees record
# Step 1: Add conditional forwarder for the parent domain
Add-DnsServerConditionalForwarderZone -Name "aldauselect.com" -MasterServers 8.8.8.8,8.8.4.4

# Step 2: Or alternatively, add a primary zone just for the host record pointing internally:
# On the DC, open DNS Manager → Forward Lookup Zones → Right-click → New Zone → "aldauselect.com" (Primary)
# Then add an A record: Name = "invitees", IP = 10.10.100.116
```

**Simplest single-command approach** (just adds a host entry in the existing domain zone):
```powershell
Add-DnsServerResourceRecordA -ZoneName "HBERC-DOMAIN.com" -Name "invitees.aldauselect.com" -IPv4Address "10.10.100.116"
```

After running the command, verify from any domain machine:
```powershell
nslookup invitees.aldauselect.com
# Should return: 10.10.100.116
```

---

## Summary of What's Done

| Fix | Status |
|-----|--------|
| **Hosts file** on server (`127.0.0.1 invitees.aldauselect.com`) | ✅ Done |
| **HTTPS canonical redirect** (`https://any-IP` → `https://domain`) | ✅ Done & deployed |
| **HTTP redirect** (`http://any` → `https://domain`) | ✅ Already existed |
| **Firewall** (ports 80/443 open for all profiles) | ✅ Already correct |
| **IIS bindings** (catch-all `*:80:` and `*:443:` exist) | ✅ Already correct |
| **DNS for domain machines** (A record on DC) | ⏳ Pending — run command above on DC |

All changes are committed and pushed (`fb12f0c3`). No app code, APIs, or functionality were modified — only infrastructure (hosts file + web.config redirect rule).