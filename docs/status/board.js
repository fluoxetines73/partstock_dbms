const members = [
  { id: "A", name: "Đạt", scope: "UC01 · Storage", reviewer: "Tuấn" },
  { id: "B", name: "Tuấn", scope: "UC02–03 · Indexing", reviewer: "Khánh" },
  { id: "C", name: "Khánh", scope: "UC05–06–11 · Query processing", reviewer: "Đạt" },
  { id: "D", name: "Nam", scope: "UC04–07–08 · Transaction", reviewer: "Hải" },
  { id: "E", name: "Hải", scope: "UC09–10–12 · Concurrency", reviewer: "Nam" },
];

const stages = new Map([
  ["working", "Đang làm"],
  ["review", "Đã bàn giao / Chờ review"],
  ["fix", "Cần sửa"],
  ["accepted", "Đã nghiệm thu"],
]);

function element(tag, content, className) {
  const node = document.createElement(tag);
  node.textContent = content;
  node.className = className || "";
  return node;
}

const list = document.querySelector("#members");

for (const { id, name, scope, reviewer } of members) {
  const file = `${id.toLowerCase()}.js`;
  const update = partstockStatus[id];
  const member = element("article", "", "member");
  const identity = element("div", "");
  identity.append(element("h2", `${id} · ${name}`), element("p", scope, "scope"));
  identity.append(element("p", `Review: ${reviewer} · ${file}`, "meta"));
  member.append(identity);
  list.append(member);

  if (!update || !stages.has(update.stage) || typeof update.updated !== "string"
      || typeof update.summary !== "string" || typeof update.next !== "string"
      || !Array.isArray(update.links)) {
    member.append(element("p", `Không đọc được trạng thái. Kiểm tra ${file}.`));
    continue;
  }

  const current = element("div", "");
  const badge = element("span", stages.get(update.stage), "tag");
  badge.dataset.stage = update.stage;
  current.append(badge, element("p", update.summary));
  current.append(element("p", `Ghi ngày ${update.updated.split("-").reverse().join("/")}`, "meta"));

  const next = element("div", "", "next");
  const action = element("p", "");
  action.append(element("strong", "Tiếp theo "), update.next);
  next.append(action);

  const links = element("div", "", "links");
  for (const { label, path } of update.links) {
    const link = element("a", label);
    link.href = path;
    links.append(link);
  }
  next.append(links);
  member.append(current, next);
}
