# Logging form submissions to a Google Sheet

Every form on the site already emails submissions to `second.innings456@gmail.com`
via FormSubmit. This adds a **second, silent copy** of each submission as a row in
a Google Sheet. It doesn't touch or slow down the email that already works.

Each of the 4 forms gets its **own separate script and its own deployment URL** —
they don't share code or a routing step. Set one up, confirm it works, then repeat
for the next. About 5 minutes per form.

You don't need to know how to code — just copy, paste, and click through the same
few menus each time, exactly as written below.

## For each form: create its Sheet

1. Go to [sheets.google.com](https://sheets.google.com) and create a new blank
   spreadsheet.
2. Name it after the form, e.g. **"Second Innings — Contact form"**. Do this once
   per form (4 separate spreadsheets in total), or reuse one spreadsheet and just
   give each form's sheet a different tab name if you'd rather keep them together
   — either works, the script below only ever touches the sheet you paste it into.
3. Leave it empty otherwise — the script creates its own header row automatically
   the first time the form is used.

## For each form: add its script

1. In that Sheet, click **Extensions → Apps Script**.
2. Delete whatever's in the editor and paste in the code block for that form
   (below).
3. Click the **save icon** (or `Ctrl+S` / `Cmd+S`), give the project a name when
   asked, e.g. "Contact form logger".

### Contact

```javascript
function doPost(e) {
  try {
    var p = e.parameter;
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Date', 'Name', 'Email', 'Phone', 'Subject', 'Message']);
    }
    sheet.appendRow([new Date(), p.name || '', p.email || '', p.phone || '', mapSubject(p.subject), p.message || '']);
    return output({ status: 'ok' });
  } catch (err) {
    return output({ status: 'error', message: err.message });
  }
}
function mapSubject(v) {
  var m = { donate: 'Donating equipment', request: 'Requesting equipment', volunteer: 'Volunteering',
    store: 'Partnering as a store', csr: 'Corporate / CSR', press: 'Press or media', other: 'Something else' };
  return (v && m[v]) || v || '';
}
function output(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function doGet(e) { return output({ status: 'ok', message: 'Contact form logger is running.' }); }
```

### Donate Gear

```javascript
function doPost(e) {
  try {
    var p = e.parameter;
    var multi = e.parameters;
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Date', 'Name', 'Email', 'Phone', 'Area', 'Sports', 'Quantity', 'Handover method', 'Notes']);
    }
    sheet.appendRow([
      new Date(), p.name || '', p.email || '', p.phone || '', p.area || '',
      (multi.sport || []).map(mapSport).join(', '),
      mapCount(p.count), mapMethod(p.method), p.notes || ''
    ]);
    return output({ status: 'ok' });
  } catch (err) {
    return output({ status: 'error', message: err.message });
  }
}
function mapSport(v) {
  var m = { cricket: 'Cricket', football: 'Football', badminton: 'Badminton', basketball: 'Basketball',
    volleyball: 'Volleyball', other: 'Something else' };
  return (v && m[v]) || v || '';
}
function mapCount(v) {
  var m = { '1-3': '1 to 3', '4-10': '4 to 10', '11-30': '11 to 30', '30+': 'More than 30' };
  return (v && m[v]) || v || '';
}
function mapMethod(v) {
  var m = { dropoff: 'Drop it off', pickup: 'Pick it up', drive: 'Collection drive', unsure: 'Not sure' };
  return (v && m[v]) || v || '';
}
function output(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function doGet(e) { return output({ status: 'ok', message: 'Donate Gear form logger is running.' }); }
```

### Request Equipment

```javascript
function doPost(e) {
  try {
    var p = e.parameter;
    var multi = e.parameters;
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Date', 'Organisation type', 'Organisation name', 'Your role', 'Address', 'Children',
        'Ages', 'Sports needed', 'What they need', 'Current situation', 'Name', 'Email', 'Phone']);
    }
    sheet.appendRow([
      new Date(), mapType(p.type), p.organisation || '', p.role || '', p.address || '',
      p.children || '', p.ages || '',
      (multi.sport || []).map(mapSport).join(', '),
      p.needs || '', p.current || '', p.name || '', p.email || '', p.phone || ''
    ]);
    return output({ status: 'ok' });
  } catch (err) {
    return output({ status: 'error', message: err.message });
  }
}
function mapSport(v) {
  var m = { cricket: 'Cricket', football: 'Football', badminton: 'Badminton', basketball: 'Basketball',
    volleyball: 'Volleyball', other: 'Something else' };
  return (v && m[v]) || v || '';
}
function mapType(v) {
  var m = { 'govt-school': 'Government school', 'lowfee-school': 'Low-fee private school',
    academy: 'Sports academy', coach: 'Independent coach', ngo: 'NGO / community programme', other: 'Other' };
  return (v && m[v]) || v || '';
}
function output(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function doGet(e) { return output({ status: 'ok', message: 'Request Equipment form logger is running.' }); }
```

### Get Involved

```javascript
function doPost(e) {
  try {
    var p = e.parameter;
    var multi = e.parameters;
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Date', 'Name', 'Email', 'Phone', 'City', 'Interested in', 'Notes']);
    }
    sheet.appendRow([
      new Date(), p.name || '', p.email || '', p.phone || '', p.city || '',
      (multi.interest || []).map(mapInterest).join(', '),
      p.notes || ''
    ]);
    return output({ status: 'ok' });
  } catch (err) {
    return output({ status: 'error', message: err.message });
  }
}
function mapInterest(v) {
  var m = { volunteer: 'Volunteer', drive: 'Run a collection drive', store: 'Partner as a store',
    csr: 'Talk about CSR', intro: 'Make an introduction', other: 'Something else' };
  return (v && m[v]) || v || '';
}
function output(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function doGet(e) { return output({ status: 'ok', message: 'Get Involved form logger is running.' }); }
```

## For each form: deploy it as a Web App

1. Top-right of the Apps Script editor, click **Deploy → New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Fill in:
   - **Execute as:** Me (your Google account)
   - **Who has access:** Anyone
     (Has to be "Anyone" so the website can reach it — the script only ever
     writes to this one Sheet, it can't do anything else.)
4. Click **Deploy**.
5. Google will ask you to authorise it — click **Authorize access**, pick your
   Google account, click **Advanced → Go to [project name] (unsafe)**, then
   **Allow**. This warning is normal for any script you write yourself.
6. You'll get a **Web app URL** ending in `/exec`. Copy the whole thing — this
   one is specific to this form.

Repeat the whole thing (new Sheet or tab, new script, new deployment) for each
of the 4 forms.

## Send me the 4 URLs

Paste all 4 back to me — tell me which is which (Contact / Donate Gear / Request
Equipment / Get Involved) — and I'll drop each into its own slot in
`SHEET_LOGGER_URLS` at the top of `assets/js/main.js`, then redeploy the site.
You don't have to do all 4 at once — send me whichever ones are ready and I'll
wire those up; the rest just stay dormant until you do.

## If you ever need to redeploy a script

Any time you edit a script's code, its live URL only picks up the change after
you go **Deploy → Manage deployments → the pencil/edit icon → Version: New
version → Deploy** again. Editing the code alone isn't enough on its own.
