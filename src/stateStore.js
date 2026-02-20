const fs = require('fs');
const path = require('path');

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

class StateStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.state = { users: {} };
    ensureDir(this.filePath);
    this._load();
  }

  _load() {
    if (!fs.existsSync(this.filePath)) {
      this._save();
      return;
    }
    try {
      const raw = fs.readFileSync(this.filePath, 'utf8');
      this.state = raw ? JSON.parse(raw) : { users: {} };
    } catch (err) {
      console.error('Failed to read state file:', err);
      this.state = { users: {} };
    }
  }

  _save() {
    ensureDir(this.filePath);
    fs.writeFileSync(this.filePath, JSON.stringify(this.state, null, 2));
  }

  _getUser(userId) {
    if (!this.state.users[userId]) {
      this.state.users[userId] = {
        heightCm: null,
        weightKg: null,
        bmi: null,
        updatedAt: null,
      };
    }
    return this.state.users[userId];
  }

  setUserBmi(userId, data) {
    const user = this._getUser(userId);
    user.heightCm = data.heightCm;
    user.weightKg = data.weightKg;
    user.bmi = data.bmi;
    user.updatedAt = data.updatedAt;
    this._save();
    return { ...user };
  }

  getUserBmi(userId) {
    const user = this.state.users[userId];
    if (!user || !Number.isFinite(user.bmi)) return null;
    return { ...user };
  }
}

module.exports = {
  StateStore,
};
