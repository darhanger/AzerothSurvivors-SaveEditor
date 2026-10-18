export class SaveModel {
  constructor(text) {
    this.setText(text);
  }

  setText(text) {
    this.newline = text.includes("\r\n") ? "\r\n" : "\n";
    this.lines = text.split(/\r\n|\n|\r/);
  }

  toString() {
    return this.lines.join(this.newline);
  }

  find(type, classId) {
    const prefix = `${type}|`;
    return this.lines.findIndex(line => line.startsWith(prefix) &&
      (classId === undefined || line.split("|", 3)[1] === String(classId)));
  }

  fields(type, classId) {
    const index = this.find(type, classId);
    return index < 0 ? null : this.lines[index].split("|");
  }

  value(type, classId) {
    const fields = this.fields(type, classId);
    return fields ? fields.slice(classId === undefined ? 1 : 2).join("|") : "";
  }

  set(type, values, classId) {
    const index = this.find(type, classId);
    const line = [type, ...values].join("|");
    if (index >= 0) {
      this.lines[index] = line;
    } else {
      const at = this.lines.at(-1) === "" ? this.lines.length - 1 : this.lines.length;
      this.lines.splice(at, 0, line);
    }
  }

  remove(type, classId) {
    const index = this.find(type, classId);
    if (index >= 0) this.lines.splice(index, 1);
  }

  list(type) {
    const value = this.value(type);
    return value ? value.split(",").filter(Boolean) : [];
  }

  setList(type, list) {
    this.set(type, [list.join(",")]);
  }

  keyed(type, separator = "=") {
    return new Map(this.list(type).map(entry => {
      const at = entry.lastIndexOf(separator);
      return at < 0 ? [entry, ""] : [entry.slice(0, at), entry.slice(at + 1)];
    }));
  }

  setKeyed(type, map, separator = "=") {
    this.setList(type, [...map].map(([key, value]) => `${key}${separator}${value}`));
  }

  toggleList(type, key, enabled) {
    const set = new Set(this.list(type));
    if (enabled) set.add(key);
    else set.delete(key);
    this.setList(type, [...set]);
  }

  setKey(type, key, value, separator = "=") {
    const map = this.keyed(type, separator);
    if (value === null || value === "") map.delete(key);
    else map.set(key, String(value));
    this.setKeyed(type, map, separator);
  }
}
