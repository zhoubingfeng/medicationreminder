# 💊 药丸日记 - Medication Reminder

一个简洁美观的周期性服药记录与提醒 Web App，帮助你管理用药计划、记录服药情况。

## ✨ 功能

- **今日视图** — 一目了然查看今天需要吃的药物，一键标记已服药
- **周期用药** — 支持自定义"吃 N 天停 M 天"的周期性用药方案
- **日历视图** — 按周查看用药安排，直观追踪每一天
- **服药统计** — 过去 7 天服药完成率统计，了解自己的用药习惯
- **数据持久化** — 数据保存在浏览器本地，刷新不丢失

## 🚀 部署到 GitHub Pages

### 第一步：创建 GitHub 仓库

1. 登录 [GitHub](https://github.com)，点击右上角 **+** → **New repository**
2. 仓库名填 `medication-reminder`（需与 `vite.config.js` 中的 `base` 一致）
3. 选择 **Public**，点击 **Create repository**

### 第二步：推送代码

```bash
cd medication-reminder
git init
git add .
git commit -m "🎉 初始化药丸日记"
git branch -M main
git remote add origin https://github.com/你的用户名/medication-reminder.git
git push -u origin main
```

### 第三步：启用 GitHub Pages

1. 进入仓库 → **Settings** → **Pages**
2. **Source** 选择 **GitHub Actions**
3. 推送代码后 GitHub Actions 会自动构建并部署

### 第四步：访问

部署完成后访问：`https://你的用户名.github.io/medication-reminder/`

## 🛠 本地开发

```bash
npm install
npm run dev
```

浏览器打开 `http://localhost:5173` 即可预览。

## 📝 自定义仓库名

如果你的仓库名不是 `medication-reminder`，需要修改 `vite.config.js` 中的 `base` 字段：

```js
base: '/你的仓库名/',
```

## 技术栈

- React 18
- Vite 6
- GitHub Actions CI/CD
