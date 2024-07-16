const url = document.URL;
const urlArr = url.split("/");

if (typeof browser === "undefined") {
  var browser = chrome;
}

let settings;

// Add recents_index if it doesn't exist (this happens if updating from an older version.)
browser.storage.local.get("recentsIndex", results => {
  console.log("index detected")
}).catch(async () => {
  console.log("building index");

  const works_results = await browser.storage.local.get(null);
  let worksData = [];
  for (const key in works_results) {
    if (key.startsWith("work_")) {
      worksData.push(results[key]);
    }
  }
  let recentsIndex;
  if (worksData.length !== 0) {
    worksData.sort((a, b) => b["accessed"] - a["accessed"]);
    recentsIndex = worksData.splice(0, 200);
  } else {
    recentsIndex = [];
  }
  browser.storage.local.set({"recentsIndex": recentsIndex});
});

browser.storage.local.get("settings", results => {
  settings = results["settings"];
  let do_settings_update = false;
  if (settings === undefined) {
    settings = {};
  }
  if (!("timeDelay" in settings)) {
    settings = {"timeDelay": 5};
    do_settings_update = true;
  }
  if (!("clientId" in settings)) {
    settings["clientId"] = generateUUID();
    do_settings_update = true;
  }
  if (!("displayLimit" in settings)) {
    settings["displayLimit"] = 100;
    do_settings_update = true;
  }
  if (!("serverAddress" in settings)) {
    settings["serverAddress"] = "https://ao3saver.com";
    do_settings_update = true;
  }
  if (do_settings_update) {
    console.log("updating settings default value");
    browser.storage.local.set({"settings": settings});
  }

  if (is404() || is503()) {
    console.log("This is a 404/503 page: did not archive.");
    insertFindButtons();
  } else if (isWork()) {
    if (isWarning()) {
      console.log("This is a warning page: did not archive.");
    } else if (isHidden()) {
      console.log("Work is hidden: did not archive");
      insertFindButtons();
    } else {
      buildArchiveStatus();
      const workId = getWorkId();
      const updated = getUpdated();
      console.log(`timeout for ${settings['timeDelay'] * 1000}ms`)
      doArchiveDelay(workId, updated, settings["timeDelay"] * 1000);
    }
  } else {
    console.log("This page does not contain a work: did not archive.");
  }
});

function doArchiveDelay(workId, updated, delay, retry = true) {
  console.log(`timeout for ${delay}ms`);
  setTimeout(() => {
    if (!document.hasFocus()) {
      console.log("Window wasn't focused, cancelling archive.");
      if (retry) {
        console.log("retrying...");
        doArchiveDelay(workId, updated, delay, retry);
      }
      return;
    }

    archive(workId, updated);
  }, delay);
}

function buildArchiveStatus() {
  const statsContainer = document.querySelector("dl.stats");
  const title = document.createElement("dt");
  title.innerText = "Backup status:";
  const value = document.createElement("dd");
  value.innerText = "Waiting for delay...";
  value.id = "ao3saverValue";
  statsContainer.appendChild(title);
  statsContainer.appendChild(value);
}

function displayArchiveStatus(status) {
  const value = document.getElementById("ao3saverValue");
  value.innerText = status;
}

function archive(workId, updated) {
  console.log("archiving...");
  displayArchiveStatus("Loading...");
  const title = getTitle();
  const author = getAuthor();

  const requestJson = JSON.stringify({work_id: workId, updated_time: updated, reporter: settings["clientId"], title: title, author: author});

  //Report the work to the backend
  fetch(`${settings["serverAddress"]}/report_work`, {
    method: "POST",
    headers: {
      'Content-Type': 'application/json'
    },
    body: requestJson
  }).then(async response => {
    if (!response.ok) {
      //Record work details, but set updated time to -1 so archive will be retried later
      console.log("archive unsuccessful");
      displayArchiveStatus("❌ unsuccessful. The server may be down or unable to reach ao3. If this continues please contact mail@ao3saver.com");
      const objectStore = {};
      objectStore[`work_${workId}`] = {
        "updated": -1,
        "accessed": Date.now(),
        "author": author,
        "title": title,
        "id": workId
      };
      browser.storage.local.set(objectStore);
      return;
    }

    const resData = await response.json();

    //Record work details
    const objectStore = {};
    const objectKey = `work_${workId}`
    objectStore[objectKey] = {
      "updated": updated,
      "accessed": Date.now(),
      "author": getAuthor(),
      "title": getTitle(),
      "id": workId
    };
    browser.storage.local.set(objectStore);

    //Record work in index
    const recentsResults = await browser.storage.local.get("recentsIndex");
    let recents = recentsResults["recentsIndex"];
    const oldIndex = recents.indexOf(objectKey);
    if (oldIndex !== -1) {
      recents.splice(oldIndex, 1);
    }
    recents.unshift(objectKey);
    if (recents.length > 200) {
      recents = recents.slice(0, 200);
    }
    browser.storage.local.set({"recentsIndex": recents});

    if (resData["status"] === "already fetched") {
      displayArchiveStatus("✅ archived!");
      return;
    }

    if(resData["status"] !== "queued") {
      displayArchiveStatus("An unexpected error occurred while checking initial status.");
    }

    displayArchiveStatus("⏳ In archival queue");
    console.log("Hit archival queue");

    const jobId = resData["job_id"];
    const delays = [6, 3, 5, 5, 8, 10, 10, 15, 20, 20, 20, 20, 30, 60, 60, 60, 60, 60, 60];
    for (const delay of delays) {
      displayArchiveStatus("Fetching status...");
      const jobStatus = await fetch(`${settings["serverAddress"]}/job_status?job_id=${jobId}`, {method: "GET"});
      if (!jobStatus.ok) {
        displayArchiveStatus("There was an error fetching status...");
        continue;
      }
      const jobStatusData = await jobStatus.json();
      if (jobStatusData["status"] === "queued") {
        displayArchiveStatus("⏳ In archival queue");
      } else if (jobStatusData["status"] === "failed") {
        displayArchiveStatus("❌ Failed archival!");
        break;
      } else if (jobStatusData["status"] === "completed") {
        displayArchiveStatus("✅ archived!");
        break;
      } else {
        displayArchiveStatus("An unexpected error occurred while checking followup status.");
      }
      await sleep(delay*1000);
    }

  }).catch(() => {
    displayArchiveStatus("❌ unsuccessful. A network error has occurred (are you offline?). If this continues please contact mail@ao3saver.com");
  });
}

function insertFindButtons() {
  const workId = getWorkId();
  const main = document.querySelector("#main");
  const container = document.createElement("div");
  const ao3Saver = createButton("Check on ao3 saver", `${settings["serverAddress"]}/works/${workId}`);
  const archivePdf = createButton("Check for pdf on archive.org", `https://web.archive.org/web/*/https://archiveofourown.org/downloads/${workId}/*`);
  const archive = createButton("Check on archive.org", `https://web.archive.org/web/*/https://archiveofourown.org/works/${workId}/*`);
  container.appendChild(ao3Saver);
  container.appendChild(archivePdf);
  container.appendChild(archive);
  main.appendChild(container);
}

function createButton(text, url) {
  const button = document.createElement("input");
  button.value = text;
  button.class = "button";
  button.type = "submit";
  button.onclick = () => window.open(url, "_blank");
  return button;
}

function getWorkId() {
  return parseInt(urlArr[4]).toString();
}

function getUpdated() {
  const downloadButton = document.querySelector("li.download a[href*='.pdf?updated_at=']");
  if (downloadButton === null) {
    return 0;
  }
  const dlLink = downloadButton.href
  const updatedRegex = /\?updated_at=(\d*)/;
  const results = dlLink.match(updatedRegex);
  return parseInt(results[1]);
}

function getTitle() {
  return document.querySelector("div.preface.group > h2.title.heading").textContent.trim();
}

function getAuthor() {
  const authorElement = document.querySelector("a[rel=author]");
  if (authorElement === null) {
    return "Anonymous";
  }
  return authorElement.textContent;
}

function is404() {
  return document.querySelector(".error-404") !== null;
}

function is503() {
  return document.querySelector(".error-503") !== null;
}

function isWork() {
  const isWorkRegex = /^https:\/\/archiveofourown\.org\/works\/\d*(\/|$|\?)/;
  return isWorkRegex.test(url);
}

function isWarning() {
  return document.querySelector("p.caution") !== null;
}

function isHidden() {
  return document.querySelector("p.notice > a[href='/collections/cog_Private']") !== null;
}

//https://stackoverflow.com/a/8809472/5813879
function generateUUID() { // Public Domain/MIT
    var d = new Date().getTime();//Timestamp
    var d2 = ((typeof performance !== 'undefined') && performance.now && (performance.now()*1000)) || 0;//Time in microseconds since page-load or 0 if unsupported
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16;//random number between 0 and 16
        if(d > 0){//Use timestamp until depleted
            r = (d + r)%16 | 0;
            d = Math.floor(d/16);
        } else {//Use microseconds since page-load if supported
            r = (d2 + r)%16 | 0;
            d2 = Math.floor(d2/16);
        }
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
