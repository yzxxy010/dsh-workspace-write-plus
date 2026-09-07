# dsh-workspace-write-plus

给 DeepSeek Harness 增加第四档权限 **`workspace-write++`**，和 `read-only` / `workspace-write` / `danger-full-access` 出现在同一个权限选择器里。

## 它是什么

| 预设 | 文件 | 进程沙箱 | 审批 |
|---|---|---|---|
| read-only | 只读 | 包裹 | ask |
| workspace-write | 工作区可写 | 包裹（Windows 上 Git Bash/MSYS 会内存映射失败） | ask |
| **workspace-write++** | 工作区可写 | **放行项跳过**（默认 Git Bash + PowerShell） | never |
| danger-full-access | 无限制 | 不包裹 | never |

Windows ACL 受限令牌会让 Git for Windows / MSYS 报内存映射错误，也会让子进程管道 `EPERM`。`workspace-write++` 只跳过**进程**沙箱，文件工具默认仍锁在工作区。

## 安装

```sh
dsh plugin --profile web add https://github.com/yzxxy010/dsh-workspace-write-plus
```

本地开发也可以：

```sh
dsh plugin --profile web add /d/TEMP/dsh/dsh-workspace-write-plus
```

然后**重启 DSH**。重启后：

1. 输入框权限选择器会出现 `workspace-write++`
2. 设置 → **工作区修改++** 用通配符配置放行规则
3. 设置 → 插件 里也有一张对应卡片

## 放行规则（设置页）

默认两条：`bash`、`pwsh`。

- 不带斜杠：只比文件名。`bash` 匹配任意目录的 `bash.exe`；要放行别的程序就加一行 `aa`。
- 带斜杠或通配符：比完整路径。`*` 不跨目录，`**` 跨任意多层。
- 例如：`**/Git/bin/bash.exe`、`C:/Program Files/Git/**`
- 工作区外写文件仍是单独开关（默认关）

配置走 DSH 设置文档，重启后仍在。
