const url = document.URL;
const urlArr = url.split("/");

if (is404()) {
  insertFindButtons();
} else if (isWork()) {
  if (isWarning()) {
    console.log("This is a warning page: did not archive.");
  } else {
    setTimeout(archiveIfNotSaved, 5000);
  }
} else {
  console.log("This page does not contain a work");
}

if (typeof browser === "undefined") {
  var browser = chrome;
}

function archiveIfNotSaved() {
  const workId = getWorkId();
  const updated = getUpdated();
  const dbKey = `work_${workId}`;
  browser.storage.local.get(dbKey, result => {
    const storedData = result[dbKey];
    //check if current version of work has been archived already
    if (storedData === undefined || storedData["updated"] !== updated) {
      archive(workId, updated);
    } else {
      console.log("Stored date was equal to the last updated date: did not archive.");
      //record last accessed time
      const objectStore = {};
      objectStore[dbKey] = storedData;
      objectStore[dbKey]["accessed"] = Date.now();
      browser.storage.local.set(objectStore);
    }
  });
}

function archive(workId, updated) {
  console.log("archiving...");

  const requestJson = JSON.stringify({work_id: workId, updated_time: updated});

  //Report the work to the backend
  fetch(`https://ao3.themimegas.com/report_work`, {
    method: "POST",
    headers: {
      'Content-Type': 'application/json'
    },
    body: requestJson
  }).then(() => {
    //Record work details
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
    //Record work details, but set updated time to 0 so archive will be retried later
    const objectStore = {};
    objectStore[`work_${workId}`] = {
      "updated": 0,
      "accessed": Date.now(),
      "author": getAuthor(),
      "title": getTitle(),
      "id": workId
    };
    browser.storage.local.set(objectStore);
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
  const dateElement = document.querySelector("dd.status");
  if (dateElement === null) {
    return 0
  }
  return Date.parse(dateElement.textContent);
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

function isWork() {
  return urlArr.length >= 5;
}

function isWarning() {
  return document.querySelector("p.caution") !== null;
}
