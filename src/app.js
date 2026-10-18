import { decodeSave, encodeSave, isSealed } from "./codec.js";
import { className, currentLanguage, equipmentSlotName, localizeStatic, localized, setLanguage, setName, slotName, t, zoneName } from "./i18n.js";
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
let visuals;
let gameData;
let model;
let activeTab = "zones";
let selectedClass = "11";
let codexGroup = "amulets";
let itemQuery = "";
let itemScope = "class";
let sourceName = "AzerothSurvivors-edited.sav";
let loadedFormat = "";
const classSlugs = { "1": "warrior", "2": "paladin", "3": "hunter", "4": "rogue", "5": "priest", "7": "shaman", "8": "mage", "9": "warlock", "11": "druid" };
const slotSlugs = ["head", "shoulder", "chest", "waist", "legs", "feet", "wrist", "hands", "main-hand", "off-hand"];

function icon(name) {
  if (name.startsWith("game/")) {
    const atlas = visuals?.atlas;
    const index = atlas?.index[name.slice(5)];
    if (index !== undefined) {
      const element = node("span", { className: "game-icon atlas-icon", ariaHidden: "true" });
      element.style.backgroundSize = `${atlas.columns * 100}% ${atlas.rows * 100}%`;
      element.style.backgroundPosition = `${index % atlas.columns / (atlas.columns - 1) * 100}% ${Math.floor(index / atlas.columns) / (atlas.rows - 1) * 100}%`;
      return element;
    }
  }
  return node("img", { className: "game-icon", src: `./assets/icons/${name}.png`, alt: "" });
}

function node(tag, options = {}, ...children) {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(options)) {
    if (key === "className") element.className = value;
    else if (key === "text") element.textContent = t(value);
    else if (key === "value") element.value = value;
    else if (key === "checked") element.checked = value;
    else if (key === "dataset") Object.assign(element.dataset, value);
    else element[key] = key === "placeholder" || key === "title" ? t(value) : value;
  }
  element.append(...children);
  return element;
}

function showMessage(text, kind = "") {
  message.textContent = t(text);
  message.className = `message ${kind}`;
}

function labelFor(id) {
  if (id === "legendary:shred") return t("Shred · амулет друида");
  const legendary = id.startsWith("legendary:");
  const name = id.replace(/^legendary:/, "").replace(/_/g, " ").replace(/\b\w/g, letter => letter.toUpperCase());
  return legendary ? `${t("Легендарный")} · ${name}` : name;
}

function gameText(pair) {
  return pair?.[currentLanguage() === "ru" ? 1 : 0] || "";
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
  for (const [id] of catalog.classes) select.append(node("option", { value: id, text: className(id) }));
  select.value = selectedClass;
  select.addEventListener("change", () => { selectedClass = select.value; render(); });
  return field("Класс", node("div", { className: "picker-with-icon" }, icon(`class-${classSlugs[selectedClass]}`), select));
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
  for (const [id] of catalog.zones) select.append(node("option", { value: id, text: zoneName(id) }));
  if (current && !catalog.zones.some(([id]) => id === current)) select.append(node("option", { value: current, text: `${current} · ${t("неизвестная зона")}` }));
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
  for (const [id] of catalog.zones) {
    const check = node("input", { type: "checkbox", checked: beaten.has(id) });
    check.addEventListener("change", () => {
      if (check.checked) beaten.add(id); else beaten.delete(id);
      setClassCsv("beat", [...beaten]);
    });
    list.append(node("label", { className: "check-row" }, check, node("span", { text: zoneName(id) }), node("small", { text: id })));
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

const maxTalentPoints = 51;

function experienceForPoints(points) {
  return points * 80 + 15 * points * (points - 1) / 2;
}

function talentProgress(experience) {
  let earned = 0;
  while (earned < maxTalentPoints && experience >= experienceForPoints(earned + 1)) earned++;
  return { earned, previous: experienceForPoints(earned), next: earned < maxTalentPoints ? experienceForPoints(earned + 1) : null };
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
  const progress = talentProgress(Number(xp));
  const spent = [...ranks.values()].reduce((sum, rank) => sum + (Number(rank) || 0), 0);
  const free = Math.max(0, progress.earned - spent);
  const summary = node("div", { className: "talent-summary" },
    node("div", { className: "talent-stat" }, node("small", { text: "Получено очков" }), node("strong", { text: `${progress.earned} / ${maxTalentPoints}` })),
    node("div", { className: "talent-stat" }, node("small", { text: "Потрачено" }), node("strong", { text: String(spent) })),
    node("div", { className: "talent-stat" }, node("small", { text: "Свободно" }), node("strong", { text: String(free) })));
  const xpStep = progress.next === null ? 1 : progress.next - progress.previous;
  const xpInStep = progress.next === null ? 1 : Math.max(0, Number(xp) - progress.previous);
  const xpLabel = progress.next === null
    ? localized("Maximum reached", "Достигнут максимум")
    : localized(`${xpInStep} / ${xpStep} XP toward next point`, `${xpInStep} / ${xpStep} опыта на следующее очко`);
  body.append(summary, node("div", { className: "talent-xp" },
    node("span", { text: xpLabel }), node("span", { text: `${xp} XP` }),
    node("progress", { max: xpStep, value: xpInStep })));
  const xpNumber = Number(xp);
  const maxXp = experienceForPoints(maxTalentPoints);
  const numberFormat = new Intl.NumberFormat(currentLanguage() === "ru" ? "ru-RU" : "en-US");
  const number = value => numberFormat.format(value);
  const xpMetrics = node("div", { className: "talent-xp-metrics" },
    node("div", {}, node("small", { text: "Опыт для 51 очка" }), node("strong", { text: `${number(maxXp)} XP` })),
    progress.next === null
      ? node("div", {}, node("small", { text: "Опыт сверх максимума" }), node("strong", { text: `${number(Math.max(0, xpNumber - maxXp))} XP` }))
      : node("div", {}, node("small", { text: "До следующего очка" }), node("strong", { text: `${number(progress.next - xpNumber)} XP` })),
    progress.next === null
      ? node("div", {}, node("small", { text: "Следующих очков" }), node("strong", { text: "0" }))
      : node("div", {}, node("small", { text: "До максимума" }), node("strong", { text: `${number(maxXp - xpNumber)} XP` })));
  body.append(xpMetrics);
  if (spent > progress.earned) body.append(node("p", { className: "hint talent-warning", text: "Потрачено больше очков, чем даёт текущий опыт. Игра может сбросить или отклонить таланты." }));
  const talentInput = id => {
    const input = node("input", { type: "number", min: "0", max: "99", step: "1", value: ranks.get(id) || "0", title: id });
    input.addEventListener("change", () => {
      const rank = Number(input.value);
      if (!Number.isInteger(rank) || rank < 0 || rank > 99) return render();
      if (rank) ranks.set(id, String(rank)); else ranks.delete(id);
      saveTalents(xpInput.value, ranks);
    });
    return input;
  };
  const trees = gameData?.talents?.[selectedClass];
  const known = new Set();
  if (trees) {
    const layout = node("div", { className: "talent-trees" });
    for (const tree of trees) {
      const treeSpent = tree.talents.reduce((total, talent) => total + (Number(ranks.get(talent.id)) || 0), 0);
      const section = node("section", { className: "talent-tree" },
        node("div", { className: "talent-tree-heading" },
          icon(tree.icon ? `game/${tree.icon}` : `class-${classSlugs[selectedClass]}`),
          node("h4", { text: gameText(tree.name) }), node("small", { text: `${treeSpent}` })));
      for (const talent of tree.talents) {
        known.add(talent.id);
        const description = gameText(talent.description);
        section.append(node("div", { className: `talent-node${Number(ranks.get(talent.id)) ? " selected" : ""}`, title: talent.id },
          icon(talent.icon ? `game/${talent.icon}` : `class-${classSlugs[selectedClass]}`),
          node("div", { className: "talent-copy" }, node("strong", { text: gameText(talent.name) }),
            ...(description ? [node("details", { className: "talent-description" },
              node("summary", { text: description.replaceAll("{v}", "…"), title: description.replaceAll("{v}", "…") }))] : [])),
          talentInput(talent.id)));
      }
      layout.append(section);
    }
    body.append(node("p", { className: "hint", text: "В описаниях талантов … означает значение, которое игра рассчитывает по рангу." }), layout);
  }
  const extras = [...new Set([...(trees ? [] : catalog.talents[selectedClass] || []), ...ranks.keys()])].filter(id => !known.has(id));
  if (extras.length) {
    if (trees) body.append(node("h4", { className: "subheading", text: "Дополнительные ID талантов" }));
    const list = node("div", { className: "grid-list" });
    for (const id of extras) list.append(node("div", { className: "rank-row" }, node("span", { text: labelFor(id) }), talentInput(id)));
    body.append(list);
  }
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

function codexIcon(id) {
  const name = visuals?.codex[id];
  if (!name) return icon(`codex-${codexGroup}`);
  if (!id.startsWith("legendary:")) return icon(`game/${name}`);
  return node("span", { className: "codex-icon" }, icon(`game/${name}`), icon("codex-legendary"));
}

function renderCodex() {
  const groupSelect = node("select");
  for (const [id, name] of [["amulets", "Обычные амулеты"], ["legendary", "Легендарные амулеты"], ["other", "Кольца и аксессуары"]]) groupSelect.append(node("option", { value: id, text: name }));
  groupSelect.value = codexGroup;
  groupSelect.addEventListener("change", () => { codexGroup = groupSelect.value; render(); });
  body.append(node("div", { className: "toolbar" }, field("Категория", groupSelect)));
  body.append(node("p", { className: "hint", text: "Скрыт удаляет запись из кодекса. Значения 0–4 отмечают предмет найденным и задают сохранённое качество: обычное, необычное, редкое, эпическое или легендарное." }));
  const seen = model.keyed("seen");
  if (codexGroup === "legendary" && !seen.has("legendary:shred")) {
    body.append(node("div", { className: "inline-form" },
      node("p", { className: "hint", text: "В этой версии игры есть легендарный амулет Shred друида, которого нет в исходном сейве." }),
      button("Открыть амулет Shred", () => { model.setKey("seen", "legendary:shred", "4"); render(); }, "primary")));
  }
  const keys = [...new Set([...catalog.codex, ...seen.keys()])].filter(id => codexCategory(id) === codexGroup);
  const codexRow = id => {
    const current = seen.get(id);
    const select = node("select", { title: id });
    select.append(node("option", { value: "", text: "Скрыт" }));
    for (let rarity = 0; rarity <= 4; rarity++) select.append(node("option", { value: String(rarity), text: `${setName(rarity)} · ${rarity}` }));
    select.value = current ?? "";
    select.addEventListener("change", () => { model.setKey("seen", id, select.value || null); render(); });
    return node("div", { className: "rank-row" }, codexIcon(id), node("span", { text: labelFor(id), title: id }), select);
  };
  if (codexGroup === "legendary" && gameData?.codexClasses) {
    const grouped = new Set();
    for (const [classId] of catalog.classes) {
      const classKeys = gameData.codexClasses[classId] || [];
      for (const id of classKeys) grouped.add(id);
      const section = node("section", { className: "codex-class-section" });
      section.append(node("div", { className: "codex-class-heading" }, icon(`class-${classSlugs[classId]}`),
        node("strong", { text: className(classId) }),
        node("small", { text: `${classKeys.filter(id => seen.has(id)).length} / ${classKeys.length}` })));
      const list = node("div", { className: "grid-list" });
      for (const id of classKeys) list.append(codexRow(id));
      section.append(list);
      body.append(section);
    }
    const unknown = keys.filter(id => !grouped.has(id));
    if (unknown.length) {
      body.append(node("h4", { className: "subheading", text: "Другие амулеты" }));
      const list = node("div", { className: "grid-list" });
      for (const id of unknown) list.append(codexRow(id));
      body.append(list);
    }
  } else {
    const list = node("div", { className: "grid-list" });
    for (const id of keys) list.append(codexRow(id));
    body.append(list);
  }
  body.append(addForm("ID кодекса, например legendary:shred", id => {
    model.setKey("seen", id, id.startsWith("legendary:") ? "4" : "0");
  }));
}

function renderAchievements() {
  const achieved = new Set(model.list("ach"));
  const unlockTimes = model.keyed("achat");
  const keys = [...new Set([...catalog.achievements, ...achieved])];
  body.append(node("p", { className: "achievement-total", text: localized(
    `${keys.filter(id => achieved.has(id)).length} / ${keys.length} achievements earned`,
    `Получено достижений: ${keys.filter(id => achieved.has(id)).length} / ${keys.length}`) }));
  const groups = [
    ["classes", "Победы классов"], ["collection", "Коллекция"],
    ["challenges", "Испытания"], ["counts", "Общий прогресс"],
    ["zones", "Зоны"], ["other", "Другие достижения"],
  ];
  for (const [category, heading] of groups) {
    const categoryKeys = keys.filter(id => (gameData?.achievements?.[id]?.category || "other") === category);
    if (!categoryKeys.length) continue;
    const list = node("div", { className: "grid-list achievement-list" });
    for (const id of categoryKeys) {
      const entry = gameData?.achievements?.[id];
      const check = node("input", { type: "checkbox", checked: achieved.has(id) });
      check.addEventListener("change", () => {
        model.toggleList("ach", id, check.checked);
        if (check.checked) model.setKey("achat", id, String(Math.floor(Date.now() / 1000)));
        else model.setKey("achat", id, null);
        render();
      });
      const image = id.startsWith("class:") ? icon(`class-${id.split(":")[1]}`)
        : entry?.icon ? icon(`game/${entry.icon}`) : icon("codex-other");
      const timestamp = Number(unlockTimes.get(id));
      const date = achieved.has(id) && Number.isFinite(timestamp) && timestamp > 0
        ? new Date(timestamp * 1000).toLocaleDateString(currentLanguage() === "ru" ? "ru-RU" : "en-US") : "";
      list.append(node("label", { className: `check-row achievement-card${achieved.has(id) ? " earned" : ""}`, title: id },
        check, image, node("span", { className: "achievement-copy" },
          node("strong", { text: entry ? gameText(entry.name) : labelFor(id) }),
          ...(entry?.description ? [node("small", { text: gameText(entry.description) })] : []),
          ...(date ? [node("small", { className: "achievement-date", text: date })] : []))));
    }
    body.append(node("h4", { className: "subheading", text: heading }), list);
  }
  body.append(addForm("ID достижения, например zone:ab", id => {
    model.toggleList("ach", id, true);
    model.setKey("achat", id, String(Math.floor(Date.now() / 1000)));
  }));
  body.append(node("p", { className: "hint", text: "При включении ставится текущее время получения. Некоторые достижения игра может пересчитать по статистике." }));
}

function itemDetails(id) {
  const match = /^1(\d{2})(\d)(\d)0$/.exec(id);
  if (!match || !classSlugs[String(Number(match[1]))] || Number(match[3]) > 5) return null;
  return { classId: String(Number(match[1])), slot: Number(match[2]), set: Number(match[3]) };
}

function availableItems(collected) {
  const ids = new Set([...catalog.items, ...collected]);
  for (const [classId] of catalog.classes) {
    const slots = classId === "4" || classId === "7" ? 10 : 9;
    for (let slot = 0; slot < slots; slot++) ids.add(`1${classId.padStart(2, "0")}${slot}50`);
  }
  return [...ids].sort();
}

function renderItems() {
  const search = node("input", { type: "search", placeholder: "Поиск по ID предмета", value: itemQuery });
  search.addEventListener("input", () => {
    const wasSearching = Boolean(itemQuery);
    itemQuery = search.value.trim().toLocaleLowerCase();
    if (itemScope === "class" && wasSearching !== Boolean(itemQuery)) {
      const caret = search.selectionStart;
      render();
      const next = body.querySelector('input[type="search"]');
      next.focus();
      next.setSelectionRange(caret, caret);
      return;
    }
    const cards = body.querySelectorAll("[data-item-search]");
    for (const card of cards) card.hidden = !card.dataset.itemSearch.includes(itemQuery);
  });
  const scope = node("select");
  scope.append(node("option", { value: "class", text: "Выбранный класс" }), node("option", { value: "all", text: "Все классы" }));
  scope.value = itemScope;
  scope.addEventListener("change", () => { itemScope = scope.value; render(); });
  body.append(node("div", { className: "toolbar" }, field("Предметы аккаунта", search, true), classPicker(), field("Показывать", scope)));
  const items = new Set(model.list("items"));
  if (itemScope === "class" && !itemQuery) {
    const slots = selectedClass === "4" || selectedClass === "7" ? 10 : 9;
    const equipped = new Set(classCsv("equip").map(entry => entry.split(":")[1]));
    const grid = node("div", { className: "collection-grid" });
    grid.style.gridTemplateColumns = `minmax(120px, 1fr) repeat(${slots}, 54px)`;
    grid.append(node("div", { className: "collection-corner", text: "Комплект" }));
    for (let slot = 0; slot < slots; slot++) grid.append(node("div", { className: "collection-slot", text: slotName(slot) }));
    for (let set = 0; set <= 5; set++) {
      const setIds = Array.from({ length: slots }, (_, slot) => `1${selectedClass.padStart(2, "0")}${slot}${set}0`);
      const setTitle = gameText(gameData?.sets?.[selectedClass]?.[set]);
      grid.append(node("div", { className: `collection-set tier-${set}` },
        node("strong", { text: setName(set) }),
        ...(setTitle ? [node("small", { text: setTitle })] : []),
        node("small", { text: `${setIds.filter(id => items.has(id)).length} / ${slots}` })));
      for (let slot = 0; slot < slots; slot++) {
        const id = setIds[slot];
        const name = visuals?.gear?.[selectedClass]?.[set]?.[slot];
        const title = `${className(selectedClass)} · ${setName(set)} · ${slotName(slot)} · ${id}`;
        const check = node("input", { type: "checkbox", checked: items.has(id), title });
        check.addEventListener("change", () => { model.toggleList("items", id, check.checked); render(); });
        grid.append(node("label", { className: `collection-cell tier-${set}${items.has(id) ? " collected" : " uncollected"}`, title },
          icon(name ? `game/${name}` : set === 5 ? "pvp" : `slot-${slotSlugs[slot]}`),
          check, ...(equipped.has(id) ? [node("span", { className: "equipped-mark", text: "E" })] : [])));
      }
    }
    const total = slots * 6;
    const collected = Array.from({ length: total }, (_, index) => `1${selectedClass.padStart(2, "0")}${index % slots}${Math.floor(index / slots)}0`)
      .filter(id => items.has(id)).length;
    body.append(node("p", { className: "collection-summary", text: localized(
      `${className(selectedClass)} · ${collected} / ${total} pieces collected. Check an icon to change the collection. E = equipped.`,
      `${className(selectedClass)} · собрано ${collected} / ${total}. Отмечайте предметы нажатием на иконку. E = надето.`) }),
      node("div", { className: "collection-scroll" }, grid));
  } else {
    const itemList = node("div", { className: "grid-list item-list" });
    for (const id of availableItems(items)) {
      const details = itemDetails(id);
      if (itemScope === "class" && details?.classId !== selectedClass) continue;
      const check = node("input", { type: "checkbox", checked: items.has(id) });
      check.addEventListener("change", () => { model.toggleList("items", id, check.checked); render(); });
      const label = details ? `${className(details.classId)} · ${setName(details.set)} · ${slotName(details.slot)}` : localized(`Item ${id}`, `Предмет ${id}`);
      const setTitle = details ? gameText(gameData?.sets?.[details.classId]?.[details.set]) : "";
      const row = node("label", { className: `check-row item-row${items.has(id) ? "" : " uncollected"}`, dataset: { itemSearch: `${id} ${label} ${setTitle}`.toLocaleLowerCase() } }, check,
        ...(details ? [icon(visuals?.gear?.[details.classId]?.[details.set]?.[details.slot]
          ? `game/${visuals.gear[details.classId][details.set][details.slot]}`
          : details.set === 5 ? "pvp" : `slot-${slotSlugs[details.slot]}`)] : []),
        node("span", { text: label }), node("small", { text: id }));
      row.hidden = !row.dataset.itemSearch.includes(itemQuery);
      itemList.append(row);
    }
    body.append(itemList);
  }
  body.append(addForm("Числовой ID предмета", id => {
    if (!/^\d+$/.test(id)) return showMessage("ID предмета должен быть числом.", "error");
    model.toggleList("items", id, true);
    if (itemDetails(id)?.classId !== selectedClass) itemScope = "all";
  }));
  body.append(node("h4", { className: "subheading", text: "Экипировка класса" }));
  const equip = classCsv("equip");
  const equipList = node("div", { className: "stack" });
  for (const entry of equip) {
    const [slot, id] = entry.split(":");
    equipList.append(node("div", { className: "rank-row" },
      node("span", { text: `${equipmentSlotName(Number(slot))} · ${id}` }),
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
  body.append(node("p", { className: "hint", text: "ID найденных предметов взяты из сейва. ID PvP-набора выведены из той же схемы и по умолчанию не отмечены. Слоты и совместимость проверяет игра." }));
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
  const lines = model.lines.filter(Boolean).length;
  const items = model.list("items").length;
  const entries = model.keyed("seen").size;
  $("#save-summary").textContent = localized(
    `${lines} lines · ${items} items · ${entries} codex entries`,
    `${lines} строк · ${items} предметов · ${entries} записей кодекса`,
  );
  for (const tab of document.querySelectorAll(".tab")) tab.classList.toggle("active", tab.dataset.tab === activeTab);
}

async function load(value, filename) {
  try {
    if (value.length > 2_000_000) throw new Error("Файл превышает 2 МБ.");
    showMessage("Проверяю подпись и читаю сохранение…");
    const plaintext = await decodeSave(value);
    model = new SaveModel(plaintext);
    sourceName = filename ? filename.replace(/\.(sav|txt)$/i, "") + "-edited.sav" : "AzerothSurvivors-edited.sav";
    loadedFormat = isSealed(value) ? "RSE1 проверен" : "Открытый текст";
    $("#format-status").textContent = t(loadedFormat);
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
      showMessage(localized(`Downloaded ${sourceName}.`, `Скачан файл ${sourceName}.`), "success");
    }
  } catch (error) {
    showMessage(error.message || "Не удалось экспортировать сохранение.", "error");
  } finally {
    target.disabled = false;
  }
}

async function start() {
  const languageSelect = $("#language-select");
  languageSelect.value = currentLanguage();
  localizeStatic();
  languageSelect.addEventListener("change", () => {
    setLanguage(languageSelect.value);
    localizeStatic();
    if (model) {
      $("#format-status").textContent = t(loadedFormat);
      render();
      showMessage("Сохранение открыто. Оригинал не изменён.", "success");
    }
  });
  try {
    const [response, visualResponse, gameResponse] = await Promise.all([
      fetch("./data/catalog.json"),
      fetch("./data/visuals.json").catch(() => null),
      fetch("./data/game.json").catch(() => null),
    ]);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    catalog = await response.json();
    visuals = visualResponse?.ok ? await visualResponse.json() : null;
    gameData = gameResponse?.ok ? await gameResponse.json() : null;
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
