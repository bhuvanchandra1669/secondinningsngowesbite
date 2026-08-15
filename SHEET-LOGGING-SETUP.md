# Logging form submissions to a Google Sheet

Every form on the site already emails submissions to `second.innings456@gmail.com`
via FormSubmit. This adds a **second, silent copy** of each submission as a row in
a Google Sheet — one tab per form, plain column headers, nothing technical to look
at. It doesn't touch or slow down the email that already works.

This takes about 5 minutes, once. You don't need to know how to code — just
copy, paste, and click through a few menus exactly as written below.

## 1. Create the Sheet

1. Go to [sheets.google.com](https://sheets.google.com) and create a new blank
   spreadsheet.
2. Name it something like **"Second Innings — Form Submissions"** (top-left,
   click the title to rename).
3. Leave it empty otherwise — the script below creates its own tabs and headers
   automatically the first time each form is used.

## 2. Add the script

1. In that Sheet, click **Extensions → Apps Script**. A new tab opens with an
   empty code editor.
2. Delete whatever's in the editor (usually a few lines starting with
   `function myFunction() {`) and paste in the entire block below instead.
3. Click the **save icon** (or `Ctrl+S` / `Cmd+S`). Give the project any name
   when asked, e.g. "Form logger".

```javascript
function doPost(e) {
  try {
    var params = e.parameter;
    var multi = e.parameters; // arrays, for checkbox groups (sport, interest)
    var formType = params.formType || 'Other';
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    var configs = {
      'Contact': {
        headers: ['Date', 'Name', 'Email', 'Phone', 'Subject', 'Message'],
        row: function () {
          return [new Date(), params.name || '', params.email || '', params.phone || '',
            mapLabel('subject', params.subject), params.message || ''];
        }
      },
      'Donate Gear': {
        headers: ['Date', 'Name', 'Email', 'Phone', 'Area', 'Sports', 'Quantity', 'Handover method', 'Notes'],
        row: function () {
          return [new Date(), params.name || '', params.email || '', params.phone || '', params.area || '',
            (multi.sport || []).map(function (v) { return mapLabel('sport', v); }).join(', '),
            mapLabel('count', params.count), mapLabel('method', params.method), params.notes || ''];
        }
      },
      'Request Equipment': {
        headers: ['Date', 'Organisation type', 'Organisation name', 'Your role', 'Address', 'Children', 'Ages',
          'Sports needed', 'What they need', 'Current situation', 'Name', 'Email', 'Phone'],
        row: function () {
          return [new Date(), mapLabel('type', params.type), params.organisation || '', params.role || '',
            params.address || '', params.children || '', params.ages || '',
            (multi.sport || []).map(function (v) { return mapLabel('sport', v); }).join(', '),
            params.needs || '', params.current || '', params.name || '', params.email || '', params.phone || ''];
        }
      },
      'Get Involved': {
        headers: ['Date', 'Name', 'Email', 'Phone', 'City', 'Interested in', 'Notes'],
        row: function () {
          return [new Date(), params.name || '', params.email || '', params.phone || '', params.city || '',
            (multi.interest || []).map(function (v) { return mapLabel('interest', v); }).join(', '),
            params.notes || ''];
        }
      }
    };

    var config = configs[formType];
    var sheet = ss.getSheetByName(formType);

    if (!config) {
      // Unrecognised form — logged raw rather than silently dropped.
      sheet = ss.getSheetByName('Other') || ss.insertSheet('Other');
      if (sheet.getLastRow() === 0) sheet.appendRow(['Date', 'Raw data']);
      sheet.appendRow([new Date(), JSON.stringify(params)]);
      return jsonOutput({ status: 'ok', note: 'logged to Other' });
    }

    if (!sheet) sheet = ss.insertSheet(formType);
    if (sheet.getLastRow() === 0) sheet.appendRow(config.headers);
    sheet.appendRow(config.row());

    return jsonOutput({ status: 'ok' });
  } catch (err) {
    return jsonOutput({ status: 'error', message: err.message });
  }
}

function mapLabel(field, value) {
  var labels = {
    subject: { donate: 'Donating equipment', request: 'Requesting equipment', volunteer: 'Volunteering',
      store: 'Partnering as a store', csr: 'Corporate / CSR', press: 'Press or media', other: 'Something else' },
    sport: { cricket: 'Cricket', football: 'Football', badminton: 'Badminton', basketball: 'Basketball',
      volleyball: 'Volleyball', other: 'Something else' },
    count: { '1-3': '1 to 3', '4-10': '4 to 10', '11-30': '11 to 30', '30+': 'More than 30' },
    method: { dropoff: 'Drop it off', pickup: 'Pick it up', drive: 'Collection drive', unsure: 'Not sure' },
    type: { 'govt-school': 'Government school', 'lowfee-school': 'Low-fee private school', academy: 'Sports academy',
      coach: 'Independent coach', ngo: 'NGO / community programme', other: 'Other' },
    interest: { volunteer: 'Volunteer', drive: 'Run a collection drive', store: 'Partner as a store',
      csr: 'Talk about CSR', intro: 'Make an introduction', other: 'Something else' }
  };
  if (!value) return '';
  var map = labels[field];
  return (map && map[value]) || value;
}

function jsonOutput(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  return jsonOutput({ status: 'ok', message: 'Second Innings form logger is running.' });
}
```

## 3. Deploy it as a Web App

1. Top-right of the Apps Script editor, click **Deploy → New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Fill in:
   - **Execute as:** Me (your Google account)
   - **Who has access:** Anyone
     (This has to be "Anyone" so the website can reach it — the script only
     ever writes to this one Sheet, it can't do anything else.)
4. Click **Deploy**.
5. Google will ask you to authorise it — click **Authorize access**, pick your
   Google account, click **Advanced → Go to [project name] (unsafe)**, then
   **Allow**. This warning is normal for any script you write yourself; it's
   just Google being cautious about scripts it didn't write.
6. You'll get a **Web app URL** ending in `/exec`. Copy the whole thing.

## 4. Send me that URL

Paste it back to me in chat and I'll drop it into `SHEET_LOGGER_URL` at the top
of `assets/js/main.js`, then redeploy the site. From then on, every form
submission lands both in the inbox (via FormSubmit, as it does today) and as a
new row in the matching tab of your Sheet.

## If you ever need to redeploy the script

Any time you edit the code in the Apps Script editor, the live URL only picks
up the change after you go **Deploy → Manage deployments → the pencil/edit
icon → Version: New version → Deploy** again. Editing the code alone isn't
enough on its own.
