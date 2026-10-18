import { decodeSave, encodeSave, isSealed } from "./codec.js";
import { SaveModel } from "./model.js";

const $ = selector => document.querySelector(selector);
const workspace = $("#workspace");
const body = $("#panel-body");
const header = $("#panel-header");
const message = $("#message");
const tabNames = {
  zones: ["Зоны", "Победы и текущая открытая зона хранятся отдельно для каждого класса."],
  talents: ["Таланты", "Опыт класса и ранги талантов. Неизвестный игре ID может быть проигнорирован."],
  codex: ["Кодекс украшений", "Здесь хранятся увиденные кольца, аксессуары и амулеты. Число 0–4 — записанное качество."],
  achievements: ["Достижения", "Флаги достижений и время получения — отдельные поля сохранения."],
  items: ["Предметы и экипировка", "Список найденных предметов аккаунта и экипировка выбранного класса."],
  other: ["Прочее", "Статистика, награды и спутники из известных строк сейва."],
  raw: ["Открытый текст", "Правьте любые строки напрямую. Неизвестные поля сохраняются при экспорте."]
};
let catalog;
let model;
let activeTab = "zones";
let selectedClass = "11";
let codexGroup = "amulets";
let itemQuery = "";
let sourceName = "AzerothSurvivors-edited.sav";

function node(tag, options = {}, ...children) {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(options)) {
    if (key === "className") element.className = value;
    else if (key === "text") element.textContent = value;
    else if (key === "value") element.value = value;
    else if (key === "checked") element.checked = value;
    else if (key === "dataset") Object.assign(element.dataset, value);
    else element[key] = value;
  }
  element.append(...children);
  return element;
}

function showMessage(text, kind = "") {
  message.textContent = text;
  message.className = `message ${kind}`;
}

function labelFor(id) {
  if (id === "legendary:shred") return "Shred · амулет друида";
  return id.replace(/^legendary:/, "Легендарный · ").replace(/_/g, " ");
}

function field(label, control, grow = false) {
  return node("div", { className: `field${grow ? " grow" : ""}` }, node("label", { text: label }), control);
}

function button(text, onClick, style = "secondary") {
  const result = node("button", { type: "button", className: `button ${style}`, text });
  result.addEventListener("click", onClick);
  return result;
}

function addForm(placeholder, action) {
  const input = node("input", { type: "text", placeholder, autocomplete: "off" });
  const form = node("form", { className: "inline-form" }, input, node("button", { type: "submit", className: "button secondary", text: "Добавить" }));
  form.addEventListener("submit", event => {
    event.preventDefault();
    const value = input.value.trim();
    if (!value || /[|,\r\n]/.test(value)) return showMessage("ID не должен содержать |, запятую или перевод строки.", "error");
    action(value);
    render();
  });
  return form;
}

function classPicker() {
  const select = node("select", { value: selectedClass });
  for (const [id, name] of catalog.classes) select.append(node("option", { value: id, text: `${name} · ${id}` }));
  select.value = selectedClass;
  select.addEventListener("change", () => { selectedClass = select.value; render(); });
  return field("Класс", select);
}

function classCsv(type) {
  const fields = model.fields(type, selectedClass);
  return fields?.[2] ? fields[2].split(",").filter(Boolean) : [];
}

function setClassCsv(type, values) {
  model.set(type, [selectedClass, values.join(",")], selectedClass);
  render();
}

function renderZones() {
  const toolbar = node("div", { className: "toolbar" }, classPicker());
  const current = model.fields("open", selectedClass)?.[2] || "";
  const select = node("select");
  select.append(node("option", { value: "", text: "Не задана" }));
  for (const [id, name] of catalog.zones) select.append(node("option", { value: id, text: name }));
  if (current && !catalog.zones.some(([id]) => id === current)) select.append(node("option", { value: current, text: `${current} · неизвестная зона` }));
  select.value = current;
  select.addEventListener("change", () => {
    if (select.value) model.set("open", [selectedClass, select.value], selectedClass);
    else model.remove("open", selectedClass);
    render();
  });
  toolbar.append(field("Открытая зона", select));
  body.append(toolbar, node("h4", { className: "subheading", text: "Пройденные зоны" }));
  const beaten = new Set(classCsv("beat"));
  const list = node("div", { className: "grid-list" });
  for (const [id, name] of catalog.zones) {
    const check = node("input", { type: "checkbox", checked: beaten.has(id) });
    check.addEventListener("change", () => {
      if (check.checked) beaten.add(id); else beaten.delete(id);
      setClassCsv("beat", [...beaten]);
    });
    list.append(node("label", { className: "check-row" }, check, node("span", { text: name }), node("small", { text: id })));
  }
  body.append(list, node("p", { className: "hint", text: "Игра может требовать согласованности открытой зоны и списка побед. Проверьте результат после импорта." }));
}

function talentRanks() {
  const entries = model.fields("talent", selectedClass)?.[3] || "";
  return new Map(entries.split(",").filter(Boolean).map(entry => {
    const at = entry.lastIndexOf(":");
    return [entry.slice(0, at), entry.slice(at + 1)];
  }));
}

function saveTalents(xp, ranks) {
  model.set("talent", [selectedClass, xp, [...ranks].map(([id, rank]) => `${id}:${rank}`).join(",")], selectedClass);
  render();
}

function renderTalents() {
  const fields = model.fields("talent", selectedClass);
  const xp = fields?.[2] || "0";
  const ranks = talentRanks();
  const xpInput = node("input", { type: "number", min: "0", max: "999999999", step: "1", value: xp });
  xpInput.addEventListener("change", () => {
    if (!/^\d+$/.test(xpInput.value)) return render();
    saveTalents(xpInput.value, ranks);
  });
  body.append(node("div", { className: "toolbar" }, classPicker(), field("Опыт талантов", xpInput)));
  const keys = [...new Set([...(catalog.talents[selectedClass] || []), ...ranks.keys()])];
  const list = node("div", { className: "grid-list" });
  for (const id of keys) {
    const input = node("input", { type: "number", min: "0", max: "99", step: "1", value: ranks.get(id) || "0", title: id });
    input.addEventListener("change", () => {
      const rank = Number(input.value);
      if (!Number.isInteger(rank) || rank < 0 || rank > 99) return render();
      if (rank) ranks.set(id, String(rank)); else ranks.delete(id);
      saveTalents(xpInput.value, ranks);
    });
    list.append(node("div", { className: "rank-row" }, node("span", { text: labelFor(id) }), input));
  }
  body.append(list);
  body.append(addForm("ID таланта, например imp_wrath", id => {
    if (!/^[a-z][a-z0-9_]*$/.test(id)) return showMessage("Ожидался ID вида imp_wrath.", "error");
    ranks.set(id, "1");
    saveTalents(xpInput.value, ranks);
  }));
  body.append(node("p", { className: "hint", text: "ID талантов извлечены из текущего исполняемого файла игры. Игра задаёт ограничения по максимальному рангу и очкам." }));
}

function codexCategory(id) {
  if (catalog.amulets.includes(id)) return "amulets";
  if (id.startsWith("legendary:")) return "legendary";
  return "other";
}

function renderCodex() {
  const groupSelect = node("select");
  for (const [id, name] of [["amulets", "Обычные амулеты"], ["legendary", "Легендарные амулеты"], ["other", "Кольца и аксессуары"]]) groupSelect.append(node("option", { value: id, text: name }));
  groupSelect.value = codexGroup;
  groupSelect.addEventListener("change", () => { codexGroup = groupSelect.value; render(); });
  body.append(node("div", { className: "toolbar" }, field("Категория", groupSelect)));
  const seen = model.keyed("seen");
  if (codexGroup === "legendary" && !seen.has("legendary:shred")) {
    body.append(node("div", { className: "inline-form" },
      node("p", { className: "hint", text: "В этой версии игры есть легендарный амулет Shred друида, которого нет в исходном сейве." }),
      button("Открыть амулет Shred", () => { model.setKey("seen", "legendary:shred", "4"); render(); }, "primary")));
  }
  const keys = [...new Set([...catalog.codex, ...seen.keys()])].filter(id => codexCategory(id) === codexGroup);
  const list = node("div", { className: "grid-list" });
  for (const id of keys) {
    const current = seen.get(id);
    const select = node("select", { title: id });
    select.append(node("option", { value: "", text: "Скрыт" }));
    for (let rarity = 0; rarity <= 4; rarity++) select.append(node("option", { value: String(rarity), text: `Открыт · ${rarity}` }));
    select.value = current ?? "";
    select.addEventListener("change", () => { model.setKey("seen", id, select.value || null); render(); });
    list.append(node("div", { className: "rank-row" }, node("span", { text: labelFor(id), title: id }), select));
  }
  body.append(list, addForm("ID кодекса, например legendary:shred", id => {
    model.setKey("seen", id, id.startsWith("legendary:") ? "4" : "0");
  }));
}

function renderAchievements() {
  const achieved = new Set(model.list("ach"));
  const keys = [...new Set([...catalog.achievements, ...achieved])].sort();
  const list = node("div", { className: "grid-list" });
  for (const id of keys) {
    const check = node("input", { type: "checkbox", checked: achieved.has(id) });
    check.addEventListener("change", () => {
      model.toggleList("ach", id, check.checked);
      if (check.checked) model.setKey("achat", id, String(Math.floor(Date.now() / 1000)));
      else model.setKey("achat", id, null);
      render();
    });
    list.append(node("label", { className: "check-row" }, check, node("span", { text: labelFor(id) })));
  }
  body.append(list, addForm("ID достижения, например zone:ab", id => {
    model.toggleList("ach", id, true);
    model.setKey("achat", id, String(Math.floor(Date.now() / 1000)));
  }));
  body.append(node("p", { className: "hint", text: "При включении ставится текущее время получения. Некоторые достижения игра может пересчитать по статистике." }));
}

function renderItems() {
  const search = node("input", { type: "search", placeholder: "Поиск по ID предмета", value: itemQuery });
  search.addEventListener("input", () => {
    itemQuery = search.value.trim();
    const cards = body.querySelectorAll("[data-item-id]");
    for (const card of cards) card.hidden = !card.dataset.itemId.includes(itemQuery);
  });
  body.append(node("div", { className: "toolbar" }, field("Предметы аккаунта", search, true), classPicker()));
  const items = new Set(model.list("items"));
  const itemList = node("div", { className: "grid-list item-list" });
  const classNames = new Map(catalog.classes);
  for (const id of [...new Set([...catalog.items, ...items])].sort()) {
    const check = node("input", { type: "checkbox", checked: items.has(id) });
    check.addEventListener("change", () => { model.toggleList("items", id, check.checked); render(); });
    const itemClass = classNames.get(String(Number(id.slice(1, 3))));
    const row = node("label", { className: "check-row", dataset: { itemId: id } }, check,
      node("span", { text: itemClass ? `${itemClass} · ${id}` : id }));
    row.hidden = !id.includes(itemQuery);
    itemList.append(row);
  }
  body.append(itemList, addForm("Числовой ID предмета", id => {
    if (!/^\d+$/.test(id)) return showMessage("ID предмета должен быть числом.", "error");
    model.toggleList("items", id, true);
  }));
  body.append(node("h4", { className: "subheading", text: "Экипировка класса" }));
  const equip = classCsv("equip");
  const equipList = node("div", { className: "stack" });
  for (const entry of equip) {
    const [slot, id] = entry.split(":");
    equipList.append(node("div", { className: "rank-row" },
      node("span", { text: `Слот ${slot} · ${id}` }),
      button("Убрать", () => setClassCsv("equip", equip.filter(value => value !== entry)), "danger small-button")));
  }
  const slotInput = node("input", { type: "number", min: "0", step: "1", placeholder: "Слот" });
  const itemInput = node("input", { type: "text", inputMode: "numeric", placeholder: "ID предмета" });
  const form = node("form", { className: "inline-form" }, slotInput, itemInput, node("button", { type: "submit", className: "button secondary", text: "Установить" }));
  form.addEventListener("submit", event => {
    event.preventDefault();
    if (!/^\d+$/.test(slotInput.value) || !/^\d+$/.test(itemInput.value)) return showMessage("Введите числовой слот и ID предмета.", "error");
    const next = equip.filter(entry => !entry.startsWith(`${slotInput.value}:`));
    next.push(`${slotInput.value}:${itemInput.value}`);
    model.toggleList("items", itemInput.value, true);
    setClassCsv("equip", next);
  });
  body.append(equipList, form);
  body.append(node("p", { className: "hint", text: "Каталог числовых ID извлечён из предоставленного сейва. Слоты и совместимость предметов проверяет игра." }));
}

function renderOther() {
  const stats = model.keyed("stat");
  body.append(node("h4", { className: "subheading", text: "Статистика" }));
  const statGrid = node("div", { className: "stat-grid" });
  for (const [id, value] of stats) {
    const input = node("input", { type: "number", min: "0", step: "1", value });
    input.addEventListener("change", () => {
      if (/^\d+$/.test(input.value)) model.setKey("stat", id, input.value);
      render();
    });
    statGrid.append(field(id, input));
  }
  body.append(statGrid);
  body.append(node("h4", { className: "subheading", text: "Награды / перки" }));
  const perks = model.keyed("perk", ":");
  const perkList = node("div", { className: "grid-list" });
  for (const [id, value] of perks) {
    const input = node("input", { type: "number", min: "0", max: "99", step: "1", value });
    input.addEventListener("change", () => { model.setKey("perk", id, Number(input.value) ? input.value : null, ":"); render(); });
    perkList.append(node("div", { className: "rank-row" }, node("span", { text: labelFor(id) }), input));
  }
  body.append(perkList, addForm("ID перка", id => model.setKey("perk", id, "1", ":")));
  body.append(node("h4", { className: "subheading", text: "Спутники" }));
  const pets = model.list("pets");
  const petList = node("div", { className: "grid-list" });
  for (const id of pets) petList.append(node("div", { className: "rank-row" }, node("span", { text: labelFor(id) }), button("Убрать", () => { model.toggleList("pets", id, false); render(); }, "danger small-button")));
  body.append(petList, addForm("ID спутника", id => model.toggleList("pets", id, true)));
}

function renderRaw() {
  const textarea = node("textarea", { className: "raw-editor", spellcheck: false, value: model.toString() });
  body.append(textarea, node("div", { className: "inline-form" }, button("Применить открытый текст", () => {
    if (!/^[A-Za-z][A-Za-z0-9_]*\|/m.test(textarea.value)) return showMessage("В тексте не найдено строк формата key|value.", "error");
    model.setText(textarea.value);
    showMessage("Открытый текст применён.", "success");
    render();
  }, "primary")));
  body.append(node("p", { className: "hint", text: "Поля разделены символом |, списки — запятыми. Изменения в этом поле вступают в силу после нажатия кнопки." }));
}

function render() {
  if (!model) return;
  header.replaceChildren(node("h3", { text: tabNames[activeTab][0] }), node("p", { text: tabNames[activeTab][1] }));
  body.replaceChildren();
  ({ zones: renderZones, talents: renderTalents, codex: renderCodex, achievements: renderAchievements,
    items: renderItems, other: renderOther, raw: renderRaw })[activeTab]();
  $("#save-summary").textContent = `${model.lines.filter(Boolean).length} строк · ${model.list("items").length} предметов · ${model.keyed("seen").size} записей кодекса`;
  for (const tab of document.querySelectorAll(".tab")) tab.classList.toggle("active", tab.dataset.tab === activeTab);
}

async function load(value, filename) {
  try {
    if (value.length > 2_000_000) throw new Error("Файл превышает 2 МБ.");
    showMessage("Проверяю подпись и читаю сохранение…");
    const plaintext = await decodeSave(value);
    model = new SaveModel(plaintext);
    sourceName = filename ? filename.replace(/\.(sav|txt)$/i, "") + "-edited.sav" : "AzerothSurvivors-edited.sav";
    $("#format-status").textContent = isSealed(value) ? "RSE1 проверен" : "Открытый текст";
    $("#format-status").classList.add("good");
    workspace.hidden = false;
    render();
    showMessage("Сохранение открыто. Оригинал не изменён.", "success");
    workspace.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    showMessage(error.message, "error");
  }
}

async function exportSave(copy) {
  const target = $(copy ? "#copy-save" : "#download-save");
  target.disabled = true;
  try {
    const sealed = await encodeSave(model.toString());
    if (copy) {
      await navigator.clipboard.writeText(sealed);
      showMessage("Новая строка RSE1 скопирована в буфер обмена.", "success");
    } else {
      const url = URL.createObjectURL(new Blob([sealed], { type: "text/plain;charset=utf-8" }));
      const link = node("a", { href: url, download: sourceName });
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      showMessage(`Скачан файл ${sourceName}.`, "success");
    }
  } catch (error) {
    showMessage(error.message || "Не удалось экспортировать сохранение.", "error");
  } finally {
    target.disabled = false;
  }
}

async function start() {
  try {
    const response = await fetch("./data/catalog.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    catalog = await response.json();
  } catch {
    showMessage("Не удалось загрузить каталог. Откройте страницу через веб-сервер или GitHub Pages.", "error");
    return;
  }
  $("#load-text").addEventListener("click", () => load($("#save-input").value));
  $("#save-file").addEventListener("change", async event => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 2_000_000) return showMessage("Файл превышает 2 МБ.", "error");
      await load(await file.text(), file.name);
    }
  });
  const drop = $("#drop-zone");
  for (const type of ["dragenter", "dragover"]) drop.addEventListener(type, event => { event.preventDefault(); drop.classList.add("dragging"); });
  for (const type of ["dragleave", "drop"]) drop.addEventListener(type, event => { event.preventDefault(); drop.classList.remove("dragging"); });
  drop.addEventListener("drop", async event => {
    const file = event.dataTransfer.files[0];
    if (file) {
      if (file.size > 2_000_000) return showMessage("Файл превышает 2 МБ.", "error");
      await load(await file.text(), file.name);
    }
  });
  for (const tab of document.querySelectorAll(".tab")) tab.addEventListener("click", () => { activeTab = tab.dataset.tab; render(); });
  $("#copy-save").addEventListener("click", () => exportSave(true));
  $("#download-save").addEventListener("click", () => exportSave(false));
}

start();
