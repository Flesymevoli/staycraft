# 可选本地实验服务

这个 FastAPI / SQLite 目录保留早期本地实验实现，不是当前桌面端的启动依赖。当前经营链路在 [frontend/](../frontend/README.md) 和 Supabase 中运行。

## 单独运行

在仓库根目录创建独立 Python 虚拟环境，按 [requirements.txt](requirements.txt) 安装依赖：

```sh
python -m pip install -r backend/requirements.txt
python -m uvicorn app.main:app --app-dir backend --reload
```

服务入口为 [app/main.py](app/main.py)，配置名称见 [.env.example](.env.example)。该服务从进程环境读取配置，不自动加载 `.env`。本地 SQLite 路径由 `HOMESTAY_LOCAL_DB` 指定；测试使用单独的新数据库路径。

在 `backend/` 中执行 `python -m unittest discover -s tests` 可运行该目录测试，先设置 `MODEL_ENABLED=0`、`FORMAL_MODEL_ENABLED=0`。不要把已有 `.vendor` 中的平台扩展直接用于不同 Python 版本。

本地实验接口不代表已接入真实 OTA、发送或收付款。可选模型调用、对外暴露服务或写入真实数据均需当前任务授权，不照搬历史演示配置。
