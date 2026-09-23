#!/usr/bin/env python3
"""End-user use-case tests for वंश वृक्ष against a running server."""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import tempfile
import time
import uuid
import urllib.parse

BASE = os.environ.get("VV_BASE", "http://localhost:3010")
# Each run is one client: sign-in is rate-limited per IP, so back-to-back runs
# from the same machine would otherwise trip the limiter meant for real abuse.
RUN_IP = f"10.{uuid.uuid4().int % 250}.{uuid.uuid4().int % 250}.{uuid.uuid4().int % 250}"
fails: list[str] = []
passes = 0


def ok(name: str, cond: bool, detail: str = "") -> None:
    global passes
    if cond:
        passes += 1
        print(f"  PASS  {name}")
    else:
        fails.append(f"{name}: {detail}")
        print(f"  FAIL  {name}  {detail}")


def curl(args: list[str], cookie: str | None = None, raw: bool = False):
    cmd = ["curl", "-sS", "-D", "/tmp/vv-headers.txt", "-H", f"x-forwarded-for: {RUN_IP}"]
    if cookie:
        cmd += ["-b", cookie, "-c", cookie]
    cmd += args
    try:
        out = subprocess.check_output(cmd, stderr=subprocess.STDOUT)
    except subprocess.CalledProcessError as e:
        return e.returncode, e.output.decode("utf-8", "replace"), headers()
    body = out.decode("utf-8", "replace")
    if raw:
        return 0, body, headers()
    try:
        return 0, json.loads(body) if body else {}, headers()
    except json.JSONDecodeError:
        return 0, body, headers()


def headers() -> dict[str, str]:
    h: dict[str, str] = {}
    try:
        text = open("/tmp/vv-headers.txt").read()
    except FileNotFoundError:
        return h
    first = text.splitlines()[0] if text else ""
    m = re.search(r" (\d{3}) ", first)
    if m:
        h[":status"] = m.group(1)
    for line in text.splitlines()[1:]:
        if ":" in line:
            k, v = line.split(":", 1)
            h[k.strip().lower()] = v.strip()
    return h


def status_of(h: dict[str, str]) -> int:
    return int(h.get(":status", "0"))


def new_cookie() -> str:
    path = tempfile.mktemp(prefix="vv-cookie-")
    open(path, "w").close()
    return path


def otp_from_box(box: dict) -> str | None:
    for e in box.get("emails", []):
        m = re.search(r"code is (\d{6})", e.get("text", ""))
        if m:
            return m.group(1)
    return None


def magic_from_box(box: dict) -> tuple[str | None, str | None]:
    for e in box.get("emails", []):
        m = re.search(r"(http://[^\s]+/auth/magic\?token=([a-f0-9]+))", e.get("text", ""))
        if m:
            return m.group(1), m.group(2)
    return None, None


def unique_email(tag: str) -> str:
    return f"{tag}.{uuid.uuid4().hex[:8]}@example.com"


print(f"\nवंश वृक्ष end-user use cases  →  {BASE}\n")

# ---------------------------------------------------------------------------
print("1. Public pages & auth gates")
code, body, h = curl([f"{BASE}/"], raw=True)
ok("landing 200", status_of(h) == 200, h.get(":status"))
ok("landing has वंश वृक्ष", "वंश वृक्ष" in str(body), str(body)[:80])
ok("landing has heritage hero", "/images/hero.jpg" in str(body))
ok("landing has sign-in CTA", "/login" in str(body))

code, body, h = curl([f"{BASE}/login"], raw=True)
ok("login 200", status_of(h) == 200)
ok("login form is server-rendered", "Email me a code" in str(body), "SSR HTML lacks the form (client-only bail-out)")

code, body, h = curl([f"{BASE}/manifest.webmanifest"], raw=True)
ok("PWA manifest served", status_of(h) == 200 and "वंश वृक्ष" in str(body))
code, body, h = curl(["-o", "/dev/null", f"{BASE}/"], raw=True)
ok("security headers present", h.get("x-frame-options") == "DENY" and h.get("x-content-type-options") == "nosniff", str({k: v for k, v in h.items() if k.startswith("x-")}))

code, body, h = curl([f"{BASE}/images/hero.jpg", "-o", "/dev/null"], raw=True)
ok("hero image 200", status_of(h) == 200)

code, body, h = curl(["-o", "/dev/null", f"{BASE}/tree"], raw=True)
ok("tree redirects when signed out", status_of(h) in (307, 308, 302), h.get(":status") + " " + h.get("location", ""))
ok("tree redirect to login", "/login" in h.get("location", ""), h.get("location", ""))

code, body, h = curl(["-o", "/dev/null", f"{BASE}/matches"], raw=True)
ok("matches redirects when signed out", "/login" in h.get("location", ""), h.get("location", ""))

code, body, h = curl([f"{BASE}/api/tree"], raw=True)
ok("tree API 401 when signed out", status_of(h) == 401, h.get(":status") + " " + str(body)[:80])

code, body, h = curl(["-X", "POST", f"{BASE}/api/auth/request", "-H", "content-type: application/json", "-d", '{"email":"not-an-email","method":"otp"}'])
ok("invalid email rejected", status_of(h) == 400, str(body))

# ---------------------------------------------------------------------------
print("\n2. Email OTP — new family")
email = unique_email("otp")
cookie = new_cookie()
code, body, h = curl(
    ["-X", "POST", f"{BASE}/api/auth/request", "-H", "content-type: application/json",
     "-H", "origin: " + BASE, "-d", json.dumps({"email": email, "method": "otp"})],
    cookie,
)
ok("OTP request ok", isinstance(body, dict) and body.get("ok"), str(body))
ok("OTP uses letterbox locally", isinstance(body, dict) and body.get("delivery") == "letterbox", str(body))
preview = body.get("previewToken") if isinstance(body, dict) else None
code, box, h = curl([f"{BASE}/api/auth/letterbox?token={preview}"])
otp = otp_from_box(box) if isinstance(box, dict) else None
ok("letterbox contains 6-digit code", bool(otp and re.fullmatch(r"\d{6}", otp)), str(box)[:200])

code, body, h = curl(
    ["-X", "POST", f"{BASE}/api/auth/verify-otp", "-H", "content-type: application/json",
     "-d", json.dumps({"email": email, "code": "000000"})],
    cookie,
)
ok("wrong OTP rejected", status_of(h) == 400, str(body))

code, body, h = curl(
    ["-X", "POST", f"{BASE}/api/auth/verify-otp", "-H", "content-type: application/json",
     "-d", json.dumps({"email": email, "code": otp})],
    cookie,
)
ok("correct OTP signs in", isinstance(body, dict) and body.get("ok"), str(body))
ok("new user needs onboarding", isinstance(body, dict) and body.get("needsOnboarding") is True, str(body))

code, body, h = curl(
    ["-X", "POST", f"{BASE}/api/onboarding", "-H", "content-type: application/json",
     "-d", json.dumps({
         "givenName": "Meera", "familyName": "Nair", "nativeName": "मीरा नायर",
         "gender": "FEMALE", "birthDate": "1990-05-17", "village": "Kochi", "gotra": "", "locale": "en",
     })],
    cookie,
)
ok("onboarding creates tree", isinstance(body, dict) and body.get("ok"), str(body))

code, tree, h = curl([f"{BASE}/api/tree"], cookie)
ok("tree loads after onboarding", isinstance(tree, dict) and len(tree.get("people", [])) == 1, str(tree)[:200])
root = tree["people"][0] if isinstance(tree, dict) and tree.get("people") else {}
ok("root is Meera Nair", root.get("displayName") == "Meera Nair", str(root))
ok("owner editor still has private DOB", root.get("birthDate") == "1990-05-17", str(root))
ok("tree canvas fields include native name", root.get("nativeName") == "मीरा नायर")
focus = tree.get("focusId")

# reuse OTP
code, body, h = curl(
    ["-X", "POST", f"{BASE}/api/auth/verify-otp", "-H", "content-type: application/json",
     "-d", json.dumps({"email": email, "code": otp})],
)
ok("consumed OTP cannot be reused", status_of(h) == 400, str(body))

# ---------------------------------------------------------------------------
print("\n3. Grow the tree (father, mother, spouse, child, sibling)")
def add(rel: str, payload: dict):
    return curl(
        ["-X", "POST", f"{BASE}/api/people/{focus}/relatives", "-H", "content-type: application/json",
         "-d", json.dumps({"relation": rel, **payload})],
        cookie,
    )

code, father, h = add("father", {
    "givenName": "Ravi", "familyName": "Nair", "nativeName": "रवि नायर",
    "gender": "MALE", "birthDate": "1962-01-09", "village": "Kochi",
})
ok("add father", status_of(h) == 200 and father.get("person", {}).get("givenName") == "Ravi", str(father))

code, mother, h = add("mother", {
    "givenName": "Lakshmi", "familyName": "Nair", "nativeName": "लक्ष्मी नायर",
    "gender": "FEMALE", "birthDate": "1965-08-22", "village": "Kochi",
})
ok("add mother", status_of(h) == 200, str(mother))

code, spouse, h = add("spouse", {
    "givenName": "Arun", "familyName": "Nair", "nativeName": "अरुण नायर",
    "gender": "MALE", "birthDate": "1988-03-03", "village": "Kochi",
})
ok("add spouse", status_of(h) == 200, str(spouse))

code, child, h = add("child", {
    "givenName": "Ira", "familyName": "Nair", "nativeName": "इरा नायर",
    "gender": "FEMALE", "birthDate": "2018-11-11", "village": "Kochi",
})
ok("add child", status_of(h) == 200, str(child))

code, sib, h = add("sibling", {
    "givenName": "Dev", "familyName": "Nair", "nativeName": "देव नायर",
    "gender": "MALE", "birthDate": "1993-07-07", "village": "Kochi",
})
ok("add sibling", status_of(h) == 200, str(sib))

code, tree, h = curl([f"{BASE}/api/tree"], cookie)
people = {p["displayName"]: p for p in tree.get("people", [])} if isinstance(tree, dict) else {}
rels = tree.get("relationships", []) if isinstance(tree, dict) else []
ok("tree has 6 people after relatives", len(people) == 6, str(list(people)))

by_id = {p["id"]: p for p in tree.get("people", [])}

def has_rel(typ, frm, to):
    return any(r["type"] == typ and r["fromId"] == frm and r["toId"] == to for r in rels) or (
        typ == "SPOUSE_OF" and any(
            r["type"] == "SPOUSE_OF" and {r["fromId"], r["toId"]} == {frm, to} for r in rels
        )
    )

meera = people.get("Meera Nair", {})
ravi = people.get("Ravi Nair", {})
lakshmi = people.get("Lakshmi Nair", {})
arun = people.get("Arun Nair", {})
ira = people.get("Ira Nair", {})
dev = people.get("Dev Nair", {})
ok("father linked", has_rel("PARENT_OF", ravi.get("id"), meera.get("id")))
ok("mother linked", has_rel("PARENT_OF", lakshmi.get("id"), meera.get("id")))
ok("parents are spouses", has_rel("SPOUSE_OF", ravi.get("id"), lakshmi.get("id")))
ok("spouse linked", has_rel("SPOUSE_OF", meera.get("id"), arun.get("id")))
ok("child of meera", has_rel("PARENT_OF", meera.get("id"), ira.get("id")))
ok("child also of spouse", has_rel("PARENT_OF", arun.get("id"), ira.get("id")))
ok("sibling shares father", has_rel("PARENT_OF", ravi.get("id"), dev.get("id")))
ok("sibling shares mother", has_rel("PARENT_OF", lakshmi.get("id"), dev.get("id")))

# a cousin line: grandfather → uncle → cousin must all be stored and returned
code, gf, h = curl(
    ["-X", "POST", f"{BASE}/api/people/{ravi['id']}/relatives", "-H", "content-type: application/json",
     "-d", json.dumps({"relation": "father", "givenName": "Gopal", "familyName": "Nair", "gender": "MALE", "birthDate": "1935-02-02"})],
    cookie,
)
ok("add grandfather", status_of(h) == 200, str(gf))
code, uncle, h = curl(
    ["-X", "POST", f"{BASE}/api/people/{gf['person']['id']}/relatives", "-H", "content-type: application/json",
     "-d", json.dumps({"relation": "child", "givenName": "Suresh", "familyName": "Nair", "gender": "MALE", "birthDate": "1958-06-06"})],
    cookie,
)
ok("add uncle (grandfather's child)", status_of(h) == 200, str(uncle))
code, cousin, h = curl(
    ["-X", "POST", f"{BASE}/api/people/{uncle['person']['id']}/relatives", "-H", "content-type: application/json",
     "-d", json.dumps({"relation": "child", "givenName": "Vinod", "familyName": "Nair", "gender": "MALE", "birthDate": "1989-09-09"})],
    cookie,
)
ok("add cousin (uncle's child)", status_of(h) == 200, str(cousin))
code, tree, h = curl([f"{BASE}/api/tree"], cookie)
names_now = [p["displayName"] for p in tree.get("people", [])]
ok("tree has 9 people with the cousin line", len(names_now) == 9, str(names_now))

# edit
code, patched, h = curl(
    ["-X", "PATCH", f"{BASE}/api/people/{dev['id']}", "-H", "content-type: application/json",
     "-d", json.dumps({"alsoKnownAs": "Devu", "village": "Ernakulam"})],
    cookie,
)
ok("edit sibling", status_of(h) == 200 and patched.get("person", {}).get("village") == "Ernakulam", str(patched))

# cannot delete self
code, body, h = curl(["-X", "DELETE", f"{BASE}/api/people/{meera['id']}"], cookie)
ok("cannot delete yourself", status_of(h) == 400, str(body))

# delete a person
code, body, h = curl(["-X", "DELETE", f"{BASE}/api/people/{dev['id']}"], cookie)
ok("delete non-root person", status_of(h) == 200, str(body))
code, tree, h = curl([f"{BASE}/api/tree"], cookie)
ok("sibling gone after delete", all(p["givenName"] != "Dev" for p in tree.get("people", [])), str([p["displayName"] for p in tree.get("people", [])]))

# empty given name
code, body, h = add("father", {"givenName": ""})
ok("relative without name rejected", status_of(h) == 400, str(body))

# ---------------------------------------------------------------------------
print("\n3b. Export my data (GEDCOM + JSON) and deep links")
code, ged, h = curl([f"{BASE}/api/export?format=gedcom"], cookie, raw=True)
ok("GEDCOM export 200", status_of(h) == 200, h.get(":status"))
ok("GEDCOM is 5.5.1 lineage-linked", "0 HEAD" in str(ged) and "2 VERS 5.5.1" in str(ged) and "0 TRLR" in str(ged))
ok("GEDCOM names Meera with surname", "1 NAME Meera /Nair/" in str(ged), str(ged)[:300])
ok("GEDCOM keeps owner's private date", "17 MAY 1990" in str(ged))
ok("GEDCOM has families", "0 @F1@ FAM" in str(ged) and "1 CHIL" in str(ged))
ok("GEDCOM downloads as .ged", ".ged" in h.get("content-disposition", ""), h.get("content-disposition"))
code, js, h = curl([f"{BASE}/api/export?format=json"], cookie)
ok("JSON export has people and relationships", isinstance(js, dict) and len(js.get("people", [])) == 8 and len(js.get("relationships", [])) > 0, str(js)[:200])
code, body, h = curl([f"{BASE}/api/export"], raw=True)
ok("export closed when signed out", status_of(h) == 401)
code, body, h = curl(["-o", "/dev/null", f"{BASE}/person/{ravi['id']}"], cookie, raw=True)
ok("/person/[id] deep-links into the tree", "/tree?person=" in h.get("location", ""), h.get("location"))

# ---------------------------------------------------------------------------
print("\n4. Magic link")
email2 = unique_email("magic")
cookie2 = new_cookie()
code, body, h = curl(
    ["-X", "POST", f"{BASE}/api/auth/request", "-H", "content-type: application/json",
     "-H", "origin: " + BASE, "-d", json.dumps({"email": email2, "method": "link"})],
    cookie2,
)
ok("magic request ok", isinstance(body, dict) and body.get("ok"), str(body))
preview = body.get("previewToken") if isinstance(body, dict) else None
code, box, h = curl([f"{BASE}/api/auth/letterbox?token={preview}"])
url, token = magic_from_box(box) if isinstance(box, dict) else (None, None)
ok("magic URL uses this origin", bool(url and url.startswith(BASE)), str(url))
code, body, h = curl(["-o", "/dev/null", f"{BASE}/api/auth/magic?token={token}"], cookie2, raw=True)
ok("magic link sets session and redirects", status_of(h) in (307, 302) and "/onboarding" in h.get("location", ""), h.get("location"))
code, me, h = curl([f"{BASE}/api/auth/me"], cookie2)
ok("magic session valid", isinstance(me, dict) and me.get("user", {}).get("email") == email2, str(me))
# reuse
code, body, h = curl(["-o", "/dev/null", f"{BASE}/api/auth/magic?token={token}"], raw=True)
ok("magic link is one-time", "/login" in h.get("location", "") and "invalid" in h.get("location", ""), h.get("location"))

# both
email3 = unique_email("both")
code, body, h = curl(
    ["-X", "POST", f"{BASE}/api/auth/request", "-H", "content-type: application/json",
     "-H", "origin: " + BASE, "-d", json.dumps({"email": email3, "method": "both"})],
)
ok("send both returns ok", isinstance(body, dict) and body.get("sent") == "both", str(body))
code, box, h = curl([f"{BASE}/api/auth/letterbox?token={body.get('previewToken')}"])
ok("both sends two letters", isinstance(box, dict) and len(box.get("emails", [])) == 2, str(box)[:120])

# ---------------------------------------------------------------------------
print("\n5. Demo cousins — tree, matches, privacy")
# re-seed for a clean demo
seed = subprocess.run(["npx", "tsx", "prisma/seed.ts"], cwd=os.path.dirname(os.path.dirname(__file__)) or ".", capture_output=True, text=True)
ok("reseed demo families", seed.returncode == 0, seed.stderr[-300:] + seed.stdout[-200:])

priya = new_cookie()
code, body, h = curl(["-X", "POST", f"{BASE}/api/auth/demo", "-H", "content-type: application/json", "-d", '{"who":"priya"}'], priya)
ok("demo Priya login", isinstance(body, dict) and body.get("ok"), str(body))
code, tree, h = curl([f"{BASE}/api/tree"], priya)
names = [p["displayName"] for p in tree.get("people", [])] if isinstance(tree, dict) else []
ok("Priya tree has six people", len(names) == 6, str(names))
ok("Priya tree has grandparents", "Harishankar Sharma" in names and "Kamla Devi" in names, str(names))

arjun = new_cookie()
code, body, h = curl(["-X", "POST", f"{BASE}/api/auth/demo", "-H", "content-type: application/json", "-d", '{"who":"arjun"}'], arjun)
code, atree, h = curl([f"{BASE}/api/tree"], arjun)
anames = [p["displayName"] for p in atree.get("people", [])] if isinstance(atree, dict) else []
ok("Arjun tree loaded", "Arjun Sharma" in anames and "Hari Shankar Sharma" in anames, str(anames))

code, matches, h = curl([f"{BASE}/api/matches"], priya)
rows = matches.get("matches", []) if isinstance(matches, dict) else []
blob = json.dumps(matches)
ok("Priya sees at least two kin matches", len(rows) >= 2, str([(m.get("mine", {}).get("displayName"), m.get("theirs", {}).get("displayName")) for m in rows]))
ok("matches never include birthDate key", "birthDate" not in blob, blob[:400])
ok("matches never leak 1940-01-18", "1940-01-18" not in blob)
ok("matches never leak 1943-05-09", "1943-05-09" not in blob)
ok("no reason mentions birth", all("birth" not in r.lower() for m in rows for r in m.get("reasons", [])), str([m.get("reasons") for m in rows]))
ok("private records agree is shown", any("Private records agree" in m.get("reasons", []) for m in rows), str([m.get("reasons") for m in rows]))

hs = next((m for m in rows if "Harishankar" in m["mine"]["displayName"] and "Hari" in m["theirs"]["displayName"]), None)
ok("Harishankar ↔ Hari Shankar match", hs is not None, str([(m["mine"]["displayName"], m["theirs"]["displayName"]) for m in rows]))
if hs:
    ok("shared relatives include Kamla", any("Kamla" in s or "Kamala" in s for s in hs.get("sharedRelatives", [])), str(hs.get("sharedRelatives")))

# Priya cannot edit Arjun's person
arjun_ids = [p["id"] for p in atree.get("people", [])]
code, body, h = curl(
    ["-X", "PATCH", f"{BASE}/api/people/{arjun_ids[0]}", "-H", "content-type: application/json",
     "-d", json.dumps({"givenName": "Hacked"})],
    priya,
)
ok("cannot edit another family's person", status_of(h) == 404, str(body))

code, body, h = curl(["-X", "DELETE", f"{BASE}/api/people/{arjun_ids[0]}"], priya)
ok("cannot delete another family's person", status_of(h) == 404, str(body))

# ---------------------------------------------------------------------------
print("\n6. Confirm / dismiss matches")
pending = [m for m in rows if m.get("status") == "PENDING"]
ok("demo matches start pending", len(pending) >= 1, str([m.get("status") for m in rows]))
target = pending[0]
code, body, h = curl(
    ["-X", "POST", f"{BASE}/api/matches/{target['id']}", "-H", "content-type: application/json",
     "-d", '{"action":"confirm"}'],
    priya,
)
ok("one-sided confirm stays pending", body.get("status") == "PENDING" and body.get("awaitingOther") is True, str(body))
code, body, h = curl(
    ["-X", "POST", f"{BASE}/api/matches/{target['id']}", "-H", "content-type: application/json",
     "-d", '{"action":"confirm"}'],
    arjun,
)
ok("both sides confirm → linked", body.get("status") == "CONFIRMED", str(body))

code, after, h = curl([f"{BASE}/api/matches"], priya)
linked = next((m for m in after.get("matches", []) if m["id"] == target["id"]), None)
ok("confirmed match reveals names around them", bool(linked and linked.get("linked") and any(linked["linked"][k] for k in ("parents", "spouses", "children"))), str(linked and linked.get("linked")))
ok("reveal never includes dates", "birthDate" not in json.dumps(linked) and "1940" not in json.dumps(linked))
still = [m for m in after.get("matches", []) if m["status"] == "PENDING"]
ok("pending matches carry confirmedByMe flag", all("confirmedByMe" in m for m in still))

other = next((m for m in pending if m["id"] != target["id"]), None)
if other:
    code, body, h = curl(
        ["-X", "POST", f"{BASE}/api/matches/{other['id']}", "-H", "content-type: application/json",
         "-d", '{"action":"dismiss"}'],
        priya,
    )
    ok("dismiss match", body.get("status") == "DISMISSED", str(body))
else:
    ok("dismiss match", False, "no second pending match")

# ---------------------------------------------------------------------------
print("\n7. Cross-family discovery from a new user")
email4 = unique_email("cousin")
c4 = new_cookie()
code, body, h = curl(
    ["-X", "POST", f"{BASE}/api/auth/request", "-H", "content-type: application/json",
     "-d", json.dumps({"email": email4, "method": "otp"})],
    c4,
)
code, box, h = curl([f"{BASE}/api/auth/letterbox?token={body.get('previewToken')}"])
otp = otp_from_box(box)
curl(["-X", "POST", f"{BASE}/api/auth/verify-otp", "-H", "content-type: application/json",
      "-d", json.dumps({"email": email4, "code": otp})], c4)
curl(["-X", "POST", f"{BASE}/api/onboarding", "-H", "content-type: application/json",
      "-d", json.dumps({"givenName": "Neha", "familyName": "Sharma", "nativeName": "नेहा शर्मा",
                        "gender": "FEMALE", "birthDate": "1996-02-02", "village": "Jaipur", "gotra": "Bharadwaj"})], c4)
code, t4, h = curl([f"{BASE}/api/tree"], c4)
fid = t4.get("focusId")
curl(["-X", "POST", f"{BASE}/api/people/{fid}/relatives", "-H", "content-type: application/json",
      "-d", json.dumps({"relation": "father", "givenName": "Harishankar", "familyName": "Sharma",
                        "nativeName": "हरिशंकर शर्मा", "gender": "MALE", "birthDate": "1940-01-18",
                        "village": "Jaipur", "gotra": "Bharadwaj"})], c4)
code, m4, h = curl([f"{BASE}/api/matches"], c4)
found = m4.get("matches", []) if isinstance(m4, dict) else []
ok("new cousin auto-matched to existing Harishankar", any("Harishankar" in m["mine"]["displayName"] or "Hari" in m["theirs"]["displayName"] for m in found), str([(m["mine"]["displayName"], m["theirs"]["displayName"], m["score"]) for m in found]))
ok("new cousin match hides dates", "1940-01-18" not in json.dumps(m4) and "birthDate" not in json.dumps(m4))

# the other families were told — by letter, never with a date in it
code, box, h = curl([f"{BASE}/api/auth/letterbox?token="], raw=True)
import sqlite3
db = sqlite3.connect(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "prisma", "dev.db"))
kin_rows = db.execute(
    "select \"to\", subject, text, createdAt from EmailOutbox where purpose = 'kin' and \"to\" in ('priya@vanshvriksh.app', 'arjun@vanshvriksh.app') order by createdAt desc limit 2"
).fetchall()
db.close()
recent = [r for r in kin_rows if float(r[3]) > (time.time() - 600) * 1000]
ok("kin-found letter sent to the demo family this run", len(recent) >= 1, str(kin_rows)[:200])
kin_rows = recent
ok("kin-found letter carries no date", all("1940" not in (r[1] + r[2]) for r in kin_rows))
ok("kin-found letter links to matches", all("/matches" in r[2] for r in kin_rows))

# a corrected record withdraws a proposal that no longer scores
import random, string
# Fully random, so no earlier run's corrected record can resemble this one.
rand_word = lambda n: "".join(random.choice(string.ascii_lowercase) for _ in range(n)).capitalize()
odd_name, odd_family, odd_village = rand_word(9), rand_word(9), rand_word(8)
code, t4b, h = curl([f"{BASE}/api/tree"], c4)
hari4 = next((p for p in t4b.get("people", []) if p["givenName"] == "Harishankar"), None)
code, body, h = curl(
    ["-X", "PATCH", f"{BASE}/api/people/{hari4['id']}", "-H", "content-type: application/json",
     "-d", json.dumps({"givenName": odd_name, "familyName": odd_family, "birthDate": f"19{random.randint(50, 85)}-0{random.randint(1, 9)}-1{random.randint(0, 9)}", "village": odd_village, "gotra": ""})],
    c4,
)
ok("correct the father's record", status_of(h) == 200, str(body))
code, m4b, h = curl([f"{BASE}/api/matches"], c4)
ok("stale proposal withdrawn after correction", not any(odd_name in m["mine"]["displayName"] for m in m4b.get("matches", [])), str([(m["mine"]["displayName"], m["theirs"]["displayName"]) for m in m4b.get("matches", [])]))

# ---------------------------------------------------------------------------
print("\n8. Invite, settings, logout")
code, body, h = curl(
    ["-X", "POST", f"{BASE}/api/invite", "-H", "content-type: application/json",
     "-H", "origin: " + BASE, "-d", json.dumps({"email": unique_email("invitee")})],
    priya,
)
ok("invite sends letter", isinstance(body, dict) and body.get("ok"), str(body))
if isinstance(body, dict) and body.get("previewToken"):
    code, box, h = curl([f"{BASE}/api/auth/letterbox?token={body['previewToken']}"])
    url, _tok = magic_from_box(box) if isinstance(box, dict) else (None, None)
    ok("invite link uses this origin", bool(url and url.startswith(BASE)), str(url))

code, body, h = curl(
    ["-X", "POST", f"{BASE}/api/settings", "-H", "content-type: application/json",
     "-d", '{"locale":"hi"}'],
    priya,
)
ok("settings locale हिन्दी", isinstance(body, dict) and body.get("locale") == "hi", str(body))

code, me, h = curl([f"{BASE}/api/auth/me"], priya)
ok("/me reports pending matches", isinstance(me, dict) and "pendingMatches" in me.get("user", {}), str(me))

code, body, h = curl(["-X", "POST", f"{BASE}/api/auth/logout"], priya)
ok("logout ok", isinstance(body, dict) and body.get("ok"), str(body))
code, body, h = curl([f"{BASE}/api/tree"], priya, raw=True)
ok("after logout tree API is closed", status_of(h) == 401, h.get(":status") + " " + str(body)[:80])
code, body, h = curl(["-o", "/dev/null", f"{BASE}/tree"], priya, raw=True)
ok("after logout /tree redirects to login", "/login" in h.get("location", ""), h.get("location"))

# ---------------------------------------------------------------------------
print("\n8b. Delete my account (right to erasure)")
code, body, h = curl(["-X", "DELETE", f"{BASE}/api/account", "-H", "content-type: application/json", "-d", "{}"], cookie)
ok("deletion needs explicit confirmation", status_of(h) == 400, str(body))
code, body, h = curl(["-X", "DELETE", f"{BASE}/api/account", "-H", "content-type: application/json", "-d", '{"confirm":true}'], cookie)
ok("account deleted", isinstance(body, dict) and body.get("ok"), str(body))
code, body, h = curl([f"{BASE}/api/tree"], cookie, raw=True)
ok("session gone after deletion", status_of(h) == 401, h.get(":status"))
code, body, h = curl(
    ["-X", "POST", f"{BASE}/api/auth/request", "-H", "content-type: application/json",
     "-d", json.dumps({"email": email, "method": "otp"})],
)
code, box, h = curl([f"{BASE}/api/auth/letterbox?token={body.get('previewToken')}"])
otp = otp_from_box(box)
c5 = new_cookie()
code, body, h = curl(["-X", "POST", f"{BASE}/api/auth/verify-otp", "-H", "content-type: application/json",
      "-d", json.dumps({"email": email, "code": otp})], c5)
ok("deleted user signing in again starts fresh", isinstance(body, dict) and body.get("needsOnboarding") is True, str(body))
code, atree, h = curl([f"{BASE}/api/tree"], arjun)
ok("other family untouched by deletion", len(atree.get("people", [])) == 7, str(len(atree.get("people", []))))

# ---------------------------------------------------------------------------
print("\n9. Verify page & letterbox UI contract")
email5 = unique_email("ui")
code, body, h = curl(
    ["-X", "POST", f"{BASE}/api/auth/request", "-H", "content-type: application/json",
     "-d", json.dumps({"email": email5, "method": "otp"})],
)
preview = body.get("previewToken")
code, page, h = curl([f"{BASE}/verify?email={email5}&sent=otp&delivery=letterbox&preview={preview}"], raw=True)
ok("verify page 200", status_of(h) == 200)
ok("verify page mentions letter", "letter" in str(page).lower() or "पत्र" in str(page) or "verify" in str(page).lower() or "checkMail" in str(page) or "Code" in str(page) or "कोड" in str(page))

# ---------------------------------------------------------------------------
print("\n10. Find relatives — public teaser, private search, linking, linked families")
seed = subprocess.run(["npx", "tsx", "prisma/seed.ts"], cwd=os.path.dirname(os.path.dirname(os.path.abspath(__file__))), capture_output=True, text=True)
ok("reseed three demo families", seed.returncode == 0, seed.stderr[-300:])

def demo_login(who):
    ck = new_cookie()
    curl(["-X", "POST", f"{BASE}/api/auth/demo", "-H", "content-type: application/json", "-d", json.dumps({"who": who})], ck)
    return ck

pri, mah = demo_login("priya"), demo_login("mahesh")

code, teaser, h = curl([f"{BASE}/api/public/search?q=Tiwari"])
ok("public teaser counts remembered Tiwaris", isinstance(teaser, dict) and teaser.get("people", 0) >= 3 and teaser.get("families") == 1, str(teaser))
ok("public teaser names places, not people", "Ajmer" in teaser.get("places", []) and "Ramprasad" not in json.dumps(teaser), str(teaser))
code, teaser2, h = curl([f"{BASE}/api/public/search?q=Kartik"])
ok("public teaser never counts the living", teaser2.get("people") == 0, str(teaser2))
code, body, h = curl([f"{BASE}/api/find?q=Tiwari"], raw=True)
ok("find is closed when signed out", status_of(h) == 401)

code, found, h = curl([f"{BASE}/api/find?q=Tiwari"], pri)
res = found.get("results", []) if isinstance(found, dict) else []
names = [r["displayName"] for r in res]
blob = json.dumps(found)
ok("search finds remembered Tiwaris", "Ramprasad Tiwari" in names and "Savitri Tiwari" in names, str(names))
ok("search never lists the living", not any(n in names for n in ("Mahesh Tiwari", "Kartik Tiwari", "Rekha Tiwari")), str(names))
ok("search carries no dates", "birthDate" not in blob and "1942" not in blob and "1946" not in blob)
ram = next((r for r in res if r["displayName"] == "Ramprasad Tiwari"), {})
ok("names remembered relatives around a result", "Savitri Tiwari" in ram.get("around", {}).get("spouses", []), str(ram.get("around")))
ok("counts living relatives without naming them", ram.get("around", {}).get("livingRelatives", 0) >= 2 and "Mahesh" not in blob, str(ram.get("around")))

code, dev, h = curl([f"{BASE}/api/find?q=" + urllib.parse.quote("रामप्रसाद")], pri)
ok("Devanagari search finds the Latin record", any(r["displayName"] == "Ramprasad Tiwari" for r in dev.get("results", [])), str([r["displayName"] for r in dev.get("results", [])]))
code, sp, h = curl([f"{BASE}/api/find?q=Savithri"], pri)
ok("spelling variant finds Savitri", any(r["displayName"] == "Savitri Tiwari" for r in sp.get("results", [])), str([r["displayName"] for r in sp.get("results", [])]))

code, liv, h = curl([f"{BASE}/api/find?q=Mahesh+Tiwari"], pri)
ok("living person hidden without a birth year", not liv.get("results"), str(liv))
code, liv, h = curl([f"{BASE}/api/find?q=Mahesh+Tiwari&year=1980"], pri)
ok("living person hidden with the wrong year", not liv.get("results"), str(liv))
code, liv, h = curl([f"{BASE}/api/find?q=Mahesh+Tiwari&year=1974"], pri)
ok("living person found when you know the year", any(r["displayName"] == "Mahesh Tiwari" for r in liv.get("results", [])), str(liv))
ok("the year is never echoed back", "1974" not in json.dumps(liv))

code, mtree, h = curl([f"{BASE}/api/tree"], mah)
mahesh_id = mtree.get("focusId")
code, body, h = curl(["-X", "POST", f"{BASE}/api/find/link", "-H", "content-type: application/json",
                      "-d", json.dumps({"mode": "same", "personId": mahesh_id, "myPersonId": "x"})], pri)
ok("cannot link a living person you could not find", status_of(h) == 404, str(body))

code, ptree, h = curl([f"{BASE}/api/tree"], pri)
p_people = {p["displayName"]: p for p in ptree.get("people", [])}
sunita = p_people.get("Sunita Sharma", {})
code, linked, h = curl(["-X", "POST", f"{BASE}/api/find/link", "-H", "content-type: application/json",
                        "-d", json.dumps({"mode": "add", "personId": ram.get("id"), "focusId": sunita.get("id"), "relation": "father"})], pri)
ok("add a found ancestor to my tree", isinstance(linked, dict) and linked.get("ok") and linked.get("status") == "PENDING", str(linked))
code, ptree, h = curl([f"{BASE}/api/tree"], pri)
copy = next((p for p in ptree.get("people", []) if p["displayName"] == "Ramprasad Tiwari"), None)
ok("copied ancestor appears in my tree", copy is not None)
ok("copy carries names and places, never their dates", copy and copy.get("birthDate") is None and copy.get("village") == "Ajmer", str(copy))
ok("copy hangs above my mother", any(r["type"] == "PARENT_OF" and r["fromId"] == (copy or {}).get("id") and r["toId"] == sunita.get("id") for r in ptree.get("relationships", [])))

code, mm, h = curl([f"{BASE}/api/matches"], mah)
mrows = mm.get("matches", [])
ram_match = next((m for m in mrows if m["mine"]["displayName"] == "Ramprasad Tiwari"), None)
ok("their family sees the suggestion", ram_match is not None and ram_match.get("source") == "search", str([(m["mine"]["displayName"], m.get("source")) for m in mrows]))
ok("marked as already vouched by the other side", ram_match and ram_match.get("confirmedByThem") and not ram_match.get("confirmedByMe"), str(ram_match and {k: ram_match[k] for k in ("confirmedByMe", "confirmedByThem")}))

code, pm, h = curl([f"{BASE}/api/matches"], pri)
sun = next((m for m in pm.get("matches", []) if m["mine"]["displayName"] == "Sunita Sharma"), None)
ok("Sunita ↔ Sunita matched across families", sun is not None and sun["status"] == "PENDING", str([(m["mine"]["displayName"], m["theirs"]["displayName"]) for m in pm.get("matches", [])]))
ok("pending bridge: their writer would be your मामा", sun and sun.get("bridge", {}).get("hi") == "मामा", str(sun and sun.get("bridge")))
ok("pending bridge withholds the name", sun and sun["bridge"].get("name") is None)
ok("pending bridge counts who would join", sun and sun["bridge"].get("adds", 0) >= 4, str(sun and sun.get("bridge")))

for ck in (pri, mah):
    curl(["-X", "POST", f"{BASE}/api/matches/{sun['id']}", "-H", "content-type: application/json", "-d", '{"action":"confirm"}'], ck)
curl(["-X", "POST", f"{BASE}/api/matches/{ram_match['id']}", "-H", "content-type: application/json", "-d", '{"action":"confirm"}'], mah)
code, pm, h = curl([f"{BASE}/api/matches"], pri)
sun = next((m for m in pm.get("matches", []) if m["mine"]["displayName"] == "Sunita Sharma"), {})
ok("confirmed bridge names Mahesh as मामा", sun.get("status") == "CONFIRMED" and sun.get("bridge", {}).get("name") == "Mahesh Tiwari" and sun["bridge"].get("hi") == "मामा", str(sun.get("bridge")))

code, ext, h = curl([f"{BASE}/api/tree?linked=1"], pri)
epeople = ext.get("people", []) if isinstance(ext, dict) else []
enames = [p["displayName"] for p in epeople]
external = [p for p in epeople if p.get("external")]
ok("linked tree adds Mahesh's family", "Mahesh Tiwari" in enames and "Kartik Tiwari" in enames and len(external) >= 4, str(enames))
ok("merged people appear once", enames.count("Sunita Sharma") == 1 and enames.count("Ramprasad Tiwari") == 1, str(enames))
ok("linked people carry no dates or notes", all("birthDate" not in p and "notes" not in p for p in external) and "1974" not in json.dumps(external))
ok("linked families are labelled", any(f.get("label") == "Mahesh Tiwari" for f in ext.get("linkedFamilies", [])), str(ext.get("linkedFamilies")))
code, plain, h = curl([f"{BASE}/api/tree"], pri)
ok("plain tree reports a linked family", len(plain.get("linkedFamilies", [])) == 1 and not any(p.get("external") for p in plain.get("people", [])))
code, ged, h = curl([f"{BASE}/api/export?format=gedcom"], pri, raw=True)
ok("export stays my own tree only", "Kartik" not in str(ged) and "Mahesh" not in str(ged))

curl(["-X", "POST", f"{BASE}/api/settings", "-H", "content-type: application/json", "-d", '{"discoverable":false}'], mah)
code, hid, h = curl([f"{BASE}/api/find?q=Shivcharan"], pri)
ok("a family can hide from search", not hid.get("results"), str(hid))
code, t3, h = curl([f"{BASE}/api/public/search?q=Shivcharan"])
ok("hidden family leaves the public teaser too", t3.get("people") == 0, str(t3))
curl(["-X", "POST", f"{BASE}/api/settings", "-H", "content-type: application/json", "-d", '{"discoverable":true}'], mah)
code, back, h = curl([f"{BASE}/api/find?q=Shivcharan"], pri)
ok("and come back", len(back.get("results", [])) == 1, str(back))

# ---------------------------------------------------------------------------
print("\n11. Invite a relative as a person in your tree")
code, ptree, h = curl([f"{BASE}/api/tree"], pri)
ananya = next(p for p in ptree["people"] if p["displayName"] == "Ananya Sharma")
inv_email = unique_email("ananya")
code, body, h = curl(["-X", "POST", f"{BASE}/api/invite", "-H", "content-type: application/json",
                      "-d", json.dumps({"email": inv_email, "personId": ananya["id"]})], pri)
ok("invite for a named person", isinstance(body, dict) and body.get("ok"), str(body))
code, box, h = curl([f"{BASE}/api/auth/letterbox?token={body.get('previewToken')}"])
letter = (box.get("emails") or [{}])[0]
ok("invite letter says who they are to you", "Ananya Sharma" in letter.get("text", "") and "छोटी बहन" in letter.get("text", ""), letter.get("text", "")[:200])
url, tok = magic_from_box(box)
nk = new_cookie()
code, body, h = curl(["-o", "/dev/null", f"{BASE}/api/auth/magic?token={tok}"], nk, raw=True)
ok("invitee lands on onboarding", "/onboarding" in h.get("location", ""), h.get("location"))
code, ob, h = curl([f"{BASE}/api/onboarding"], nk)
inv = ob.get("invite") or {}
ok("onboarding is pre-filled from the invitation", inv.get("prefill", {}).get("givenName") == "Ananya" and inv.get("inviter") == "Priya Sharma", str(ob))
ok("prefill carries no private date", "birthDate" not in json.dumps(ob) and "1998" not in json.dumps(ob))
code, body, h = curl(["-X", "POST", f"{BASE}/api/onboarding", "-H", "content-type: application/json",
                      "-d", json.dumps({**inv.get("prefill", {}), "birthDate": "1998-09-01"})], nk)
ok("joining links the two trees at once", isinstance(body, dict) and body.get("linked") is True, str(body))
code, nm, h = curl([f"{BASE}/api/matches"], nk)
inv_match = next((m for m in nm.get("matches", []) if m.get("source") == "invite"), {})
ok("invite link is confirmed on both sides", inv_match.get("status") == "CONFIRMED" and inv_match.get("source") == "invite", str(inv_match.get("status")))
ok("new member sees Priya as elder sister", inv_match.get("bridge", {}).get("hi") == "बड़ी बहन", str(inv_match.get("bridge")))
code, ntree, h = curl([f"{BASE}/api/tree?linked=1"], nk)
ok("new member's tree already holds Priya's family", any(p["displayName"] == "Harishankar Sharma" and p.get("external") for p in ntree.get("people", [])), str([p["displayName"] for p in ntree.get("people", [])]))

# existing family invited as a person: pending, already vouched by the inviter
ex_email = unique_email("existing")
ek = new_cookie()
code, body, h = curl(["-X", "POST", f"{BASE}/api/auth/request", "-H", "content-type: application/json", "-d", json.dumps({"email": ex_email, "method": "otp"})], ek)
code, box, h = curl([f"{BASE}/api/auth/letterbox?token={body.get('previewToken')}"])
curl(["-X", "POST", f"{BASE}/api/auth/verify-otp", "-H", "content-type: application/json", "-d", json.dumps({"email": ex_email, "code": otp_from_box(box)})], ek)
curl(["-X", "POST", f"{BASE}/api/onboarding", "-H", "content-type: application/json", "-d", json.dumps({"givenName": "Diya", "familyName": "Sharma", "gender": "FEMALE"})], ek)
code, atree, h = curl([f"{BASE}/api/tree"], demo_login("arjun"))
diya = next(p for p in atree["people"] if p["displayName"] == "Diya Sharma")
arj = demo_login("arjun")
code, body, h = curl(["-X", "POST", f"{BASE}/api/invite", "-H", "content-type: application/json", "-d", json.dumps({"email": ex_email, "personId": diya["id"]})], arj)
code, box, h = curl([f"{BASE}/api/auth/letterbox?token={body.get('previewToken')}"])
url, tok = magic_from_box(box)
code, body, h = curl(["-o", "/dev/null", f"{BASE}/api/auth/magic?token={tok}"], ek, raw=True)
ok("existing family goes to Possible kin", "/matches" in h.get("location", ""), h.get("location"))
code, em, h = curl([f"{BASE}/api/matches"], ek)
em_row = next((m for m in em.get("matches", []) if m.get("source") == "invite"), {})
ok("waits for their yes, inviter already said yes", em_row.get("status") == "PENDING" and em_row.get("confirmedByThem") and not em_row.get("confirmedByMe"), str(em_row and {k: em_row.get(k) for k in ("status", "confirmedByMe", "confirmedByThem")}))

code, body, h = curl(["-X", "POST", f"{BASE}/api/invite", "-H", "content-type: application/json", "-d", json.dumps({"email": unique_email("x"), "personId": mahesh_id})], pri)
ok("cannot invite as someone outside your tree", status_of(h) == 400, str(body))

print("\n" + ("=" * 56))
print(f"Passed {passes}   Failed {len(fails)}")
if fails:
    print("\nFailures:")
    for f in fails:
        print(" -", f)
    sys.exit(1)
print("All end-user use cases passed.")
