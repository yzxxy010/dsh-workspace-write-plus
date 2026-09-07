/**
 * dsh-workspace-write-plus — browser half (hand-written ModuleLoader bundle).
 *
 * Registers a first-class Settings page (settings.section) and a Plugins-tab
 * card. Hard-injects only slots + locale so the nav row appears even if the
 * settingsScope service is late.
 */
window.__ModuleLoader__.load({
  id: "dsh-workspace-write-plus",
  factory: function (require) {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" })

    var React = require("react")
    var E = React.createElement
    var useState = React.useState
    var useEffect = React.useEffect

    var TAG = "[workspace-write-plus/client]"
    var NS = "workspaceWritePlus"
    var SETTINGS_NAMESPACE = "workspace-write-plus"
    var STYLE_ID = "dsh-workspace-write-plus-style"
    var DISPLAY_NAME = "工作区修改++"

    var zh = {
      nav: DISPLAY_NAME,
      title: DISPLAY_NAME,
      lead: "第四档权限，和只读 / 工作区写入 / 完全访问出现在同一个选择器。文件仍锁工作区；命中规则的程序跳过进程沙箱，用来修 Git Bash / MSYS 的内存映射错误。",
      "allow.title": "进程沙箱放行规则（仅在选中「工作区修改++」时生效）",
      "allow.help": "不带斜杠只比文件名：bash 能匹配任意目录的 bash.exe。带斜杠或通配符比完整路径：* 不跨目录，** 跨任意多层。",
      "allow.add": "添加规则",
      "allow.remove": "删除",
      "allow.placeholder": "例如 bash、pwsh、aa、**/Git/bin/bash.exe",
      "allow.empty": "没有规则时，所有程序仍走进程沙箱。",
      "allow.fs": "工作区外写文件",
      "allow.fsHint": "危险：让 write/edit 也按 full 放行。默认保留工作区边界。",
      cardDesc: "用通配符配置「工作区修改++」放行的进程沙箱",
      error: "写入失败",
      hint: "在输入框权限选择器里选「工作区修改++」，或使用 /permission workspace-write++。",
      loading: "正在读取设置…",
    }

    var en = {
      nav: DISPLAY_NAME,
      title: DISPLAY_NAME,
      lead: "A fourth permission preset in the same picker as read-only / workspace-write / danger-full-access. File tools stay workspace-bound; executables matching a rule skip the process sandbox so Git Bash / MSYS mmap works.",
      "allow.title": "Process-sandbox rules (only while 工作区修改++ is selected)",
      "allow.help": "No slash: match the executable basename (bash matches any bash.exe). With slashes or wildcards: match the full path. * stays in one segment; ** crosses directories.",
      "allow.add": "Add rule",
      "allow.remove": "Remove",
      "allow.placeholder": "e.g. bash, pwsh, aa, **/Git/bin/bash.exe",
      "allow.empty": "With no rules, every process still goes through the sandbox.",
      "allow.fs": "Write outside the workspace",
      "allow.fsHint": "Dangerous: also treat write/edit as full access. Off by default.",
      cardDesc: "Wildcard process-sandbox bypasses for 工作区修改++",
      error: "write failed",
      hint: "Pick 工作区修改++ in the composer permission control, or run /permission workspace-write++.",
      loading: "Loading settings…",
    }

    var CSS = [
      ".wwp-page{display:flex;flex-direction:column;gap:16px;padding:4px 2px 24px;max-width:720px;color:var(--dsw-alias-label-primary)}",
      ".wwp-lead{font-size:13px;line-height:1.55;color:var(--dsw-alias-label-secondary);margin:0}",
      ".wwp-card{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);border-radius:12px;padding:14px 16px;display:flex;flex-direction:column;gap:4px}",
      ".wwp-card h3{margin:0 0 8px;font-size:13px;font-weight:600}",
      ".wwp-row{display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-top:1px solid var(--dsw-alias-border-l1)}",
      ".wwp-row:first-of-type{border-top:none;padding-top:0}",
      ".wwp-row label{display:flex;flex-direction:column;gap:2px;font-size:13px;cursor:pointer;flex:1}",
      ".wwp-row .hint{font-size:12px;color:var(--dsw-alias-label-secondary);line-height:1.45}",
      ".wwp-row input[type=checkbox]{margin-top:3px}",
      ".wwp-rule{display:flex;align-items:center;gap:8px;padding:6px 0}",
      ".wwp-rule input[type=text]{flex:1;min-width:0;font:inherit;font-size:13px;padding:6px 8px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}",
      ".wwp-ruleBtn,.wwp-addBtn{appearance:none;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;padding:6px 10px;cursor:pointer}",
      ".wwp-addBtn{margin-top:8px;align-self:flex-start}",
      ".wwp-error{margin:0;font-size:12px;color:var(--dsw-alias-status-danger,#e5484d)}",
      ".wwp-plugin{list-style:none;border:1px solid var(--dsw-alias-border-l2);border-radius:12px;background:var(--dsw-alias-bg-layer-3);padding:14px 16px;display:flex;flex-direction:column;gap:8px}",
      ".wwp-plugin .name{font-size:15px;font-weight:600}",
      ".wwp-plugin .desc{font-size:13px;color:var(--dsw-alias-label-tertiary)}",
    ].join("\n")

    function ensureStyles() {
      try {
        if (typeof document === "undefined" || typeof document.getElementById !== "function") return function () {}
        if (document.getElementById(STYLE_ID)) return function () {}
        var style = document.createElement("style")
        style.id = STYLE_ID
        style.textContent = CSS
        document.head.appendChild(style)
        return function () {
          try { if (style.parentNode) style.parentNode.removeChild(style) } catch (error) { /* best effort */ }
        }
      } catch (error) {
        return function () {}
      }
    }

    function translator(locale) {
      try {
        if (locale && typeof locale.bind === "function") return locale.bind(NS)
      } catch (error) { /* fall through */ }
      return function (key) { return zh[key] || key }
    }

    function bindScope(ctx) {
      try {
        var settingsScope = ctx.get("settingsScope")
        if (settingsScope && typeof settingsScope.bind === "function") {
          return settingsScope.bind({ namespace: SETTINGS_NAMESPACE })
        }
      } catch (error) {
        console.warn(TAG + " settingsScope.bind failed:", error && error.message ? error.message : error)
      }
      return null
    }

    function useScope(scope) {
      var tickState = useState(0)
      var tick = tickState[0]
      var bump = tickState[1]
      var errorState = useState("")
      var error = errorState[0]
      var setError = errorState[1]
      void tick
      var snap = { status: "unavailable", value: {} }
      try {
        if (scope && typeof scope.getSnapshot === "function") snap = scope.getSnapshot()
      } catch (error_) { /* keep unavailable */ }
      useEffect(function () {
        if (!scope || typeof scope.subscribe !== "function") return
        try {
          return scope.subscribe(function () { bump(function (n) { return n + 1 }) })
        } catch (error_) { return undefined }
      }, [scope])
      function write(field, next) {
        if (!scope || typeof scope.set !== "function") return
        setError("")
        scope.set(field, next)
          .then(function () { bump(function (n) { return n + 1 }) })
          .catch(function (err) {
            bump(function (n) { return n + 1 })
            setError(String(err && err.message ? err.message : err))
          })
      }
      return { snap: snap, error: error, write: write }
    }

    function CheckRow(props) {
      return E("div", { className: "wwp-row" },
        E("input", {
          id: props.id,
          type: "checkbox",
          checked: !!props.checked,
          onChange: function (event) { props.onToggle(event.target.checked) },
        }),
        E("label", { htmlFor: props.id },
          E("span", null, props.title),
          E("span", { className: "hint" }, props.hint)
        )
      )
    }

    function rulesFromValue(value) {
      if (value && Array.isArray(value.rules)) {
        return value.rules.map(function (item) { return String(item || "") })
      }
      var rules = []
      if (!value || value.allowBash !== false) rules.push("bash")
      if (!value || value.allowPwsh !== false) rules.push("pwsh")
      if (value && value.allowCmd === true) rules.push("cmd")
      return rules.length > 0 ? rules : ["bash", "pwsh"]
    }

    function AllowList(props) {
      var t = props.t
      var value = props.value || {}
      var write = props.write
      var rules = rulesFromValue(value)
      var draftState = useState(null)
      var draft = draftState[0]
      var setDraft = draftState[1]
      var shown = draft || rules

      function commit(next) {
        var cleaned = next.map(function (item) { return String(item || "").trim() }).filter(function (item) { return item.length > 0 })
        setDraft(null)
        write("rules", cleaned)
      }

      function changeAt(index, text) {
        var next = shown.slice()
        next[index] = text
        setDraft(next)
      }

      function removeAt(index) {
        var next = shown.slice()
        next.splice(index, 1)
        commit(next)
      }

      return E("div", { className: "wwp-card" },
        E("h3", null, t("allow.title")),
        E("p", { className: "wwp-lead" }, t("allow.help")),
        shown.length === 0 ? E("p", { className: "wwp-lead" }, t("allow.empty")) : null,
        shown.map(function (rule, index) {
          return E("div", { className: "wwp-rule", key: "rule-" + index },
            E("input", {
              type: "text",
              value: rule,
              placeholder: t("allow.placeholder"),
              onChange: function (event) { changeAt(index, event.target.value) },
              onBlur: function () { commit(shown) },
              onKeyDown: function (event) {
                if (event.key === "Enter") {
                  event.preventDefault()
                  commit(shown)
                }
              },
            }),
            E("button", {
              type: "button",
              className: "wwp-ruleBtn",
              onClick: function () { removeAt(index) },
            }, t("allow.remove"))
          )
        }),
        E("button", {
          type: "button",
          className: "wwp-addBtn",
          onClick: function () {
            var next = shown.concat([""])
            setDraft(next)
          },
        }, t("allow.add")),
        E(CheckRow, {
          id: props.idPrefix + "-fs",
          checked: value.allowFsOutside === true,
          title: t("allow.fs"),
          hint: t("allow.fsHint"),
          onToggle: function (on) { write("allowFsOutside", on) },
        })
      )
    }

    function SettingsPage(props) {
      var t = typeof props.t === "function" ? props.t : function (key) { return zh[key] || key }
      var bound = useScope(props.scope)
      var ready = bound.snap.status === "ready"
      var value = ready ? (bound.snap.value || {}) : { rules: ["bash", "pwsh"], allowFsOutside: false }
      return E("div", { className: "wwp-page" },
        E("p", { className: "wwp-lead" }, t("lead")),
        E(AllowList, { t: t, value: value, write: bound.write, idPrefix: "wwp-page" }),
        ready ? null : E("p", { className: "wwp-lead" }, t("loading")),
        bound.error ? E("p", { className: "wwp-error" }, t("error") + ": " + bound.error) : null,
        E("p", { className: "wwp-lead" }, t("hint"))
      )
    }

    function PluginCard(props) {
      var t = typeof props.t === "function" ? props.t : function (key) { return zh[key] || key }
      var bound = useScope(props.scope)
      var ready = bound.snap.status === "ready"
      var value = ready ? (bound.snap.value || {}) : { rules: ["bash", "pwsh"], allowFsOutside: false }
      return E("li", { className: "wwp-plugin" },
        E("span", { className: "name" }, t("title")),
        E("span", { className: "desc" }, t("cardDesc")),
        E(AllowList, { t: t, value: value, write: bound.write, idPrefix: "wwp-plugin" }),
        ready ? null : E("p", { className: "wwp-lead" }, t("loading")),
        bound.error ? E("p", { className: "wwp-error" }, t("error") + ": " + bound.error) : null
      )
    }

    exports.name = "dsh-workspace-write-plus/client"
    exports.inject = ["slots", "locale"]

    exports.apply = function (ctx) {
      var scope = bindScope(ctx)
      var t = translator(ctx.locale)

      ctx.effect(function () {
        var disposeStyle = ensureStyles()
        var disposeDict
        try {
          disposeDict = ctx.locale.register(NS, { zh: zh, en: en })
        } catch (error) {
          console.warn(TAG + " dictionary registration failed:", error && error.message ? error.message : error)
        }
        return function () {
          try { if (typeof disposeStyle === "function") disposeStyle() } catch (error) { /* best effort */ }
          try { if (typeof disposeDict === "function") disposeDict() } catch (error) { /* best effort */ }
        }
      }, "dsh-workspace-write-plus: styles, dictionaries")

      var slots = ctx.slots
      var disposeSection = slots.inject("settings.section", function () {
        return slots.register({
          name: "settings.section",
          id: "workspace-write-plus",
          order: 24,
          locale: NS,
          label: DISPLAY_NAME,
        }, function Page() {
          return E(SettingsPage, { t: t, scope: bindScope(ctx) || scope })
        })
      })

      var disposeCard = slots.inject("settings.plugin.item", function () {
        return slots.register({
          name: "settings.plugin.item",
          key: SETTINGS_NAMESPACE,
          locale: NS,
          inject: function () { return { scope: bindScope(ctx) || scope } },
        }, function Card(props) {
          return E(PluginCard, props)
        })
      })

      ctx.effect(function () {
        return function () {
          try { if (typeof disposeSection === "function") disposeSection() } catch (error) { /* best effort */ }
          try { if (typeof disposeCard === "function") disposeCard() } catch (error) { /* best effort */ }
        }
      }, "dsh-workspace-write-plus: slots")
    }

    return module.exports
  },
})
