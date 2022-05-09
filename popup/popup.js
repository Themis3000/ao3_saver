//if (typeof browser === "undefined") {
//  var browser = chrome;
//}

const works = document.getElementById("works");

const test_set = [
  {"title": "a new day", "author": "kelil", "accessed": "5-4-21", "id": 493687},
  {"title": "as the time goes by", "author": "mama", "accessed": "4-7-22", "id": 53765},
  {"title": "very long titles make great stories I heard said no one ever", "author": "astec giant", "accessed": "8-7-22", "id": 34683}
];

listItems(test_set);

function listItem(item) {
  const container = document.createElement("a");
  container.className = "work";
  container.href = `https://archiveofourown.org/works/${item['id']}`;
  container.target = "_blank";
  const leftContainer = document.createElement("div");
  const title = document.createElement("span");
  title.className = "title";
  title.innerText = item["title"];
  const author = document.createElement("i");
  author.innerText = item["author"];
  leftContainer.appendChild(title);
  leftContainer.appendChild(document.createElement("br"));
  leftContainer.appendChild(author);
  const rightContainer = document.createElement("div");
  rightContainer.innerText = item["accessed"];
  container.appendChild(leftContainer);
  container.appendChild(rightContainer);
  works.appendChild(container);
}

function listItems(items) {
  works.innerHTML = "";
  for (item of items) {
    listItem(item);
  }
}
