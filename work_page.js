const url = document.URL;
const urlArr = url.split("/");

if (typeof browser === "undefined") {
  var browser = chrome;
}

browser.storage.local.get("settings", results => {
  let settings = results["settings"];
  if (settings === undefined) {
    settings = {"timeDelay": 10};
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
      const timeout_sec = 10 > settings["timeDelay"] ? 10 : settings["timeDelay"];
      doArchiveDelay(workId, updated, timeout_sec * 1000);
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

  const requestJson = JSON.stringify({work_id: workId, updated_time: updated});

  //Report the work to the backend
  fetch(`https://ao3.themimegas.com/report_work`, {
    method: "POST",
    headers: {
      'Content-Type': 'application/json'
    },
    body: requestJson
  }).then(response => {
    if (!response.ok) {
      //Record work details, but set updated time to -1 so archive will be retried later
      console.log("archive unsuccessful");
      displayArchiveStatus("❌ unsuccessful. The server may be down or unable to reach ao3. If this continues please contact mail@themimegas.com");
      const objectStore = {};
      objectStore[`work_${workId}`] = {
        "updated": -1,
        "accessed": Date.now(),
        "author": getAuthor(),
        "title": getTitle(),
        "id": workId
      };
      browser.storage.local.set(objectStore);
      return;
    }

    //Record work details
    console.log("archive success");
    displayArchiveStatus("✅ archived!");
    const objectStore = {};
    objectStore[`work_${workId}`] = {
      "updated": updated,
      "accessed": Date.now(),
      "author": getAuthor(),
      "title": getTitle(),
      "id": workId
    };
    browser.storage.local.set(objectStore);
  }).catch(() => {
    displayArchiveStatus("❌ unsuccessful. A network error has occurred. If this continues please contact mail@themimegas.com");
  });
}

function insertFindButtons() {
  const workId = getWorkId();
  const main = document.querySelector("#main");
  const container = document.createElement("div");
  const ao3Saver = createButton("Check on ao3 saver", `https://ao3.themimegas.com/works/${workId}`);
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
